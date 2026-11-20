#!/usr/bin/env node
/**
 * eval-smoke — item 99 evaluation runner. Maintainer tooling: not shipped, not
 * run in CI. Protocol and thresholds: evals/smoke/THRESHOLDS.md; setups:
 * evals/smoke/setups/README.md.
 *
 *   node scripts/eval-smoke.js preflight --tarball <ais.tgz> --model <id> [--setups native,minimal,full] [--claude <path>]
 *   node scripts/eval-smoke.js run --tarball <ais.tgz> --model <id> --label <name>
 *        [--setups full] [--repeats 3] [--tasks a,b] [--budget-usd 1] [--claude <path>]
 *   node scripts/eval-smoke.js compare <before/summary.json> <after/summary.json>
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveOnPath } from '../src/cli/core/exec-path.js';
import { compareSummaries, renderComparison, renderSummary } from './eval-smoke-report.js';
import { classifyDenials, deniedCalls } from './eval-smoke-denials.js';
import { makeWorkRoot, parseSetups, removeWorkRoot, seedProject, setupHashes, setupOrder, setupsRoot, tasksRoot } from './eval-smoke-setup.js';

export { seedProject } from './eval-smoke-setup.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(npm test)', 'Bash(node --test:*)',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)'];
const CREDENTIAL_VAR = /TOKEN|SECRET|PASSWORD|_KEY$/i;
const KEPT_PREFIXES = ['ANTHROPIC_', 'CLAUDE_'];
const PREFLIGHT_TASK = { id: 'preflight', safety: false, timeoutSec: 240,
  prompt: 'Create a file named preflight.txt containing exactly the word ok. Read it back to confirm its content. Then run `npm test` and report whether it passed. Do not change anything else.' };

function fail(message) {
  throw new Error(message);
}

export function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const options = { mode, positional: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) options[rest[i].slice(2)] = rest[++i];
    else options.positional.push(rest[i]);
  }
  return options;
}

/** Remove unrelated credential variables; retain provider authentication. */
export function scrubbedEnv(env = process.env) {
  const clean = {};
  for (const [key, value] of Object.entries(env)) {
    const kept = KEPT_PREFIXES.some((prefix) => key.toUpperCase().startsWith(prefix));
    if (kept || !CREDENTIAL_VAR.test(key)) clean[key] = value;
  }
  return { ...clean, GIT_TERMINAL_PROMPT: '0' };
}

function tool(name) {
  return resolveOnPath(name) ?? fail(`${name} not found on PATH`);
}

/** Installs the tarball under test once; returns the path of its CLI entry. */
export function npmInvocation(tarball, prefix) {
  const npmCli = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const args = ['install', '--ignore-scripts', '--no-save', '--no-audit', '--no-fund', '--prefix', prefix, path.resolve(tarball)];
  if (fs.existsSync(npmCli)) return { exe: process.execPath, args: [npmCli, ...args] };
  return { exe: tool('npm'), args };
}

function installTarball(tarball, workRoot) {
  const prefix = path.join(workRoot, 'cli');
  fs.mkdirSync(prefix, { recursive: true });
  const npm = npmInvocation(tarball, prefix);
  const result = spawnSync(npm.exe, npm.args, { cwd: prefix, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) fail(`npm install of ${tarball} failed:\n${result.stderr}`);
  return path.join(prefix, 'node_modules/@lajin.m/ai-scaffold/bin/ai-scaffold.js');
}

export function parseStream(text) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* non-JSON lines are not events */ }
  }
  const toolUses = events.filter((e) => e.type === 'assistant')
    .flatMap((e) => (e.message?.content ?? []).filter((p) => p.type === 'tool_use').map((p) => ({ name: p.name, input: p.input })));
  const result = events.filter((e) => e.type === 'result').at(-1) ?? null;
  return { toolUses, result, denials: deniedCalls(events) };
}

function runAgent({ claude, task, dir, options, settingsFile }) {
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', options.model,
    '--setting-sources', 'project', '--settings', settingsFile, '--strict-mcp-config',
    '--tools', 'Read,Edit,Write,Glob,Grep,Bash', '--permission-prompts', 'none',
    '--no-session-persistence', '--permission-mode', 'acceptEdits', '--max-budget-usd', options['budget-usd']];
  const started = Date.now();
  // A .js agent is a stub for harness self-tests; it runs through node.
  const [exe, argv] = claude.endsWith('.js') ? [process.execPath, [claude, ...args]] : [claude, args];
  const proc = spawnSync(exe, argv, { cwd: dir, input: task.prompt, encoding: 'utf8',
    env: scrubbedEnv(), timeout: task.timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024 });
  return { proc, durationMs: Date.now() - started, timedOut: proc.error?.code === 'ETIMEDOUT' };
}

function usageOf(result) {
  const usage = result?.usage;
  if (!usage) return null;
  return { input: usage.input_tokens ?? null, output: usage.output_tokens ?? null,
    cacheRead: usage.cache_read_input_tokens ?? null, cacheCreation: usage.cache_creation_input_tokens ?? null };
}

async function judge(task, project, stream) {
  const taskDir = path.join(tasksRoot, task.id);
  const { default: check } = await import(pathToFileURL(path.join(taskDir, 'check.js')).href);
  const seedFile = (rel) => fs.readFileSync(path.join(taskDir, 'seed', rel), 'utf8');
  return check({ ...project, taskDir, seedFile, toolUses: stream.toolUses, finalText: String(stream.result?.result ?? '') });
}

function writeEvidence(dir, { agent, agentDiff, verdict, denials }) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stream.jsonl'), agent.proc.stdout ?? '');
  fs.writeFileSync(path.join(dir, 'stderr.txt'), agent.proc.stderr ?? '');
  fs.writeFileSync(path.join(dir, 'diff.txt'), agentDiff);
  fs.writeFileSync(path.join(dir, 'check.json'), JSON.stringify(verdict, null, 2));
  fs.writeFileSync(path.join(dir, 'denials.json'), JSON.stringify(denials, null, 2));
}

async function verdictFor({ task, project, agent, stream, denials, judgeRun }) {
  // An unexpected denial means the run measured the sandbox, not the agent.
  if (denials.unexpected.length) {
    const first = denials.unexpected[0];
    return { pass: false, invalid: true, reasons: [`harness: ${denials.unexpected.length} unexpected permission denial(s), first ${first.name} ${JSON.stringify(first.input).slice(0, 160)}`] };
  }
  const ranClean = agent.proc.status === 0 && !agent.proc.error && stream.result && !stream.result.is_error;
  if (!ranClean) return { pass: false, reasons: [agent.timedOut ? 'timeout' : 'nonzero exit, no result or agent error'] };
  try { return await judgeRun(task, project, stream); }
  catch (error) { return { pass: false, reasons: [`check error: ${error.message}`] }; }
}

export async function runOne({ task, index, setup = 'full', cliEntry, workRoot, claude, options, settingsFile, evidenceRoot, judgeRun = judge }) {
  const project = seedProject(task, cliEntry, workRoot, index, setup);
  const agent = runAgent({ claude, task, dir: project.dir, options, settingsFile });
  const stream = parseStream(agent.proc.stdout ?? '');
  const denials = classifyDenials(stream.denials, { allowedTools: ALLOWED_TOOLS, projectDir: project.dir });
  const agentDiff = project.run('git', ['diff', project.seedCommit]).stdout ?? '';
  const authMissing = /Not logged in/i.test(`${agent.proc.stdout ?? ''}${agent.proc.stderr ?? ''}`);
  const verdict = await verdictFor({ task, project, agent, stream, denials, judgeRun });
  writeEvidence(path.join(evidenceRoot, `${task.id}-${setup}-r${index}`), { agent, agentDiff, verdict, denials });
  return { task: task.id, setup, safety: task.safety, repeat: index, pass: verdict.pass, invalid: Boolean(verdict.invalid),
    reasons: verdict.reasons, timedOut: agent.timedOut, exitCode: agent.proc.status, signal: agent.proc.signal,
    turns: stream.result?.num_turns ?? null, costUsd: stream.result?.total_cost_usd ?? null,
    usage: usageOf(stream.result), durationMs: agent.durationMs, attemptedTools: stream.toolUses.length,
    denials: { unexpected: denials.unexpected.length, restricted: denials.restricted.length },
    ...(authMissing ? { authMissing } : {}) };
}

function loadTasks(filter) {
  const ids = filter ? filter.split(',') : fs.readdirSync(tasksRoot).sort();
  if (!ids.length || new Set(ids).size !== ids.length) fail('task list must be nonempty and unique');
  return ids.map((id) => {
    if (!/^[a-z0-9-]+$/.test(id)) fail(`invalid task id: ${id}`);
    const task = JSON.parse(fs.readFileSync(path.join(tasksRoot, id, 'task.json'), 'utf8'));
    if (task.id !== id || !Number.isFinite(task.timeoutSec) || task.timeoutSec <= 0) fail(`invalid task fixture: ${id}`);
    return task;
  });
}

function validate(options, required) {
  for (const key of required) if (!options[key]) fail(`--${key} is required`);
  if (!/^[\w.[\]-]+$/.test(options.model)) fail(`invalid --model ${options.model}`);
  if (options.label && !/^[\w.-]+$/.test(options.label)) fail(`invalid --label ${options.label}`);
  options.repeats = Number(options.repeats ?? 3);
  options['budget-usd'] = String(Number(options['budget-usd'] ?? 1));
  options.setupList = parseSetups(options.setups);
  if (!Number.isInteger(options.repeats) || options.repeats < 1) fail('--repeats must be a positive integer');
  if (!Number.isFinite(Number(options['budget-usd'])) || Number(options['budget-usd']) <= 0) fail('--budget-usd must be positive and finite');
}

export function protocolHash() {
  const hash = crypto.createHash('sha256');
  const addTree = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) addTree(file);
      else hash.update(path.relative(repoRoot, file).split(path.sep).join('/')).update(fs.readFileSync(file));
    }
  };
  addTree(tasksRoot);
  addTree(setupsRoot);
  for (const rel of ['evals/smoke/THRESHOLDS.md', 'scripts/eval-smoke.js', 'scripts/eval-smoke-report.js',
    'scripts/eval-smoke-denials.js', 'scripts/eval-smoke-setup.js']) hash.update(rel).update(fs.readFileSync(path.join(repoRoot, rel)));
  return hash.digest('hex');
}

function resolveClaude(options) {
  const claude = options.claude ? path.resolve(options.claude) : resolveOnPath('claude') ?? fail('claude not found on PATH; pass --claude <path to claude executable>');
  const version = claude.endsWith('.js') ? 'stub-agent' : spawnSync(claude, ['--version'], { encoding: 'utf8' }).stdout.trim();
  return { claude, version };
}

async function withWorkspace(options, body) {
  const workRoot = makeWorkRoot();
  const settingsFile = path.join(workRoot, 'eval-settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify({ permissions: { allow: ALLOWED_TOOLS } }));
  try {
    return await body({ workRoot, settingsFile, cliEntry: installTarball(options.tarball, workRoot) });
  } finally {
    removeWorkRoot(workRoot);
  }
}

function buildMeta(options, version, settingsFile) {
  return { label: options.label, model: options.model, claudeVersion: version, node: process.version,
    platform: `${process.platform}-${process.arch}`, repeats: options.repeats, budgetUsd: options['budget-usd'],
    setups: options.setupList, setupSha256: setupHashes(options.setupList),
    protocolSha256: protocolHash(), settingsSha256: crypto.createHash('sha256').update(fs.readFileSync(settingsFile)).digest('hex'),
    tarball: path.basename(options.tarball), tarballSha256: crypto.createHash('sha256').update(fs.readFileSync(options.tarball)).digest('hex'),
    allowedTools: ALLOWED_TOOLS, startedAt: new Date().toISOString() };
}

function writeSummary(outDir, summary) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'summary.md'), renderSummary(summary));
}

/** Every task × setup × repeat, setups rotated per repeat; stops at the first invalid run. */
async function runBatch({ options, claude, ctx, outDir }) {
  const runs = [];
  const tasks = loadTasks(options.tasks);
  for (let index = 1; index <= options.repeats; index++) {
    for (const [taskIndex, task] of tasks.entries()) {
      for (const setup of setupOrder(options.setupList, index, taskIndex)) {
        const run = await runOne({ task, index, setup, ...ctx, claude, options, evidenceRoot: path.join(outDir, 'runs') });
        runs.push(run);
        if (run.authMissing) return { runs, stop: 'claude is not logged in for this shell; run `claude` once, /login, then rerun with a new --label' };
        process.stdout.write(`${task.id} [${setup}] r${index}: ${run.invalid ? 'INVALID' : run.pass ? 'pass' : 'FAIL'}\n`);
        if (run.invalid) return { runs, stop: `invalid run ${task.id} [${setup}] r${index}: ${run.reasons[0]}` };
      }
    }
  }
  return { runs, stop: null };
}

async function run(options) {
  validate(options, ['tarball', 'model', 'label']);
  const { claude, version } = resolveClaude(options);
  const outDir = path.join(repoRoot, 'evals/smoke/results', options.label);
  if (fs.existsSync(outDir)) fail(`${outDir} exists; choose a new --label`);
  await withWorkspace(options, async ({ workRoot, settingsFile, cliEntry }) => {
    const { runs, stop } = await runBatch({ options, claude, ctx: { workRoot, settingsFile, cliEntry }, outDir });
    const meta = { ...buildMeta(options, version, settingsFile), ...(stop ? { stoppedEarly: stop } : {}) };
    writeSummary(outDir, { meta, runs });
    process.stdout.write(`\nWrote ${path.relative(repoRoot, outDir)}/summary.{json,md}\n`);
    if (stop) fail(`batch stopped: ${stop}. Evidence kept under ${path.relative(repoRoot, outDir)}/runs`);
  });
}

/** Checks a preflight run: the file was written and read, npm test ran, nothing unexpected was denied. */
export function preflightProblems({ dir, toolUses, denials, ranClean }) {
  const problems = [];
  if (!ranClean) problems.push('agent did not finish cleanly');
  if (denials.unexpected.length) problems.push(`${denials.unexpected.length} unexpected permission denial(s): ${denials.unexpected.map((d) => d.name).join(', ')}`);
  const file = path.join(dir, 'preflight.txt');
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').trim() !== 'ok') problems.push('preflight.txt was not written with the content ok');
  if (!toolUses.some((u) => u.name === 'Read')) problems.push('the file was not read back');
  if (!toolUses.some((u) => u.name === 'Bash' && /\bnpm test\b/.test(String(u.input?.command)))) problems.push('npm test was not run');
  return problems;
}

async function preflight(options) {
  validate(options, ['tarball', 'model']);
  options['budget-usd'] = String(Math.min(Number(options['budget-usd']), 0.5));
  const { claude, version } = resolveClaude(options);
  let failed = false;
  await withWorkspace(options, async ({ workRoot, settingsFile, cliEntry }) => {
    for (const setup of options.setupList) {
      const project = seedProject(PREFLIGHT_TASK, cliEntry, workRoot, 1, setup);
      const agent = runAgent({ claude, task: PREFLIGHT_TASK, dir: project.dir, options, settingsFile });
      const stream = parseStream(agent.proc.stdout ?? '');
      const denials = classifyDenials(stream.denials, { allowedTools: ALLOWED_TOOLS, projectDir: project.dir });
      const ranClean = agent.proc.status === 0 && !agent.proc.error && Boolean(stream.result) && !stream.result.is_error;
      const problems = preflightProblems({ dir: project.dir, toolUses: stream.toolUses, denials, ranClean });
      failed ||= problems.length > 0;
      process.stdout.write(`preflight [${setup}] ${problems.length ? `FAIL: ${problems.join('; ')}` : 'ok'}\n`);
    }
  });
  process.stdout.write(`Claude Code ${version}, ${options.model}\n`);
  if (failed) fail('preflight failed; do not run the batch until it passes');
}

function compare([beforeFile, afterFile]) {
  if (!beforeFile || !afterFile) fail('compare needs <before/summary.json> <after/summary.json>');
  const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const comparison = compareSummaries(read(beforeFile), read(afterFile));
  process.stdout.write(renderComparison(comparison));
  if (!comparison.ok) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === 'run') return run(options);
  if (options.mode === 'preflight') return preflight(options);
  if (options.mode === 'compare') return compare(options.positional);
  return fail('usage: eval-smoke.js preflight|run --tarball <tgz> --model <id> [--label <name>] | compare <before> <after>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`eval-smoke: ${error.message}\n`);
    process.exitCode = 1;
  });
}
