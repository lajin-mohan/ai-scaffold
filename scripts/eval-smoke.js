#!/usr/bin/env node
/**
 * eval-smoke — Wave B smoke evaluation runner (item 99 subset). Maintainer
 * tooling: not shipped, not run in CI. Protocol and thresholds:
 * evals/smoke/THRESHOLDS.md.
 *
 *   node scripts/eval-smoke.js run --tarball <ais.tgz> --model <id> --label <name>
 *        [--repeats 3] [--tasks a,b] [--budget-usd 1] [--claude <path>]
 *   node scripts/eval-smoke.js compare <before/summary.json> <after/summary.json>
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveOnPath } from '../src/cli/core/exec-path.js';
import { compareSummaries, renderComparison, renderSummary } from './eval-smoke-report.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tasksRoot = path.join(repoRoot, 'evals/smoke/tasks');
const ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(npm test)', 'Bash(node --test:*)',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)'];
const CREDENTIAL_VAR = /TOKEN|SECRET|PASSWORD|_KEY$/i;
const KEPT_PREFIXES = ['ANTHROPIC_', 'CLAUDE_'];
const SEED_IDENTITY = { GIT_AUTHOR_NAME: 'Smoke Eval', GIT_AUTHOR_EMAIL: 'smoke@example.invalid',
  GIT_COMMITTER_NAME: 'Smoke Eval', GIT_COMMITTER_EMAIL: 'smoke@example.invalid' };

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

function makeRunner(dir) {
  const git = tool('git');
  return (cmd, args) => {
    const exe = cmd === 'node' ? process.execPath : cmd === 'git' ? git : fail(`checks may run only node or git, not ${cmd}`);
    return spawnSync(exe, args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...SEED_IDENTITY }, timeout: 120000 });
  };
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

export function seedProject(task, cliEntry, workRoot, index) {
  const dir = path.join(workRoot, `${task.id}-r${index}`);
  const created = spawnSync(process.execPath, [cliEntry, 'create', dir, '--profile', 'node', '--yes'],
    { encoding: 'utf8', env: { ...process.env, ...SEED_IDENTITY }, timeout: 120000 });
  if (created.status !== 0) fail(`ais create failed for ${task.id}:\n${created.stderr || created.stdout}`);
  const seed = path.join(tasksRoot, task.id, 'seed');
  if (fs.existsSync(seed)) fs.cpSync(seed, dir, { recursive: true });
  const run = makeRunner(dir);
  const checkedGit = (args) => {
    const result = run('git', args);
    if (result.status !== 0) fail(`fixture git ${args[0]} failed: ${result.stderr || result.stdout}`);
    return result.stdout.trim();
  };
  checkedGit(['checkout', '-b', `feature/smoke-${task.id}`]);
  checkedGit(['add', '-A']);
  // Fixture setup deliberately includes failing tests. Disable hooks for this
  // seed commit only; evaluated agent commands still use the shipped hooks.
  const emptyHooks = path.join(workRoot, 'empty-seed-hooks');
  fs.mkdirSync(emptyHooks, { recursive: true });
  checkedGit(['-c', `core.hooksPath=${emptyHooks}`, '-c', 'commit.gpgsign=false',
    'commit', '-q', '--allow-empty', '-m', `test: seed ${task.id}`]);
  if (checkedGit(['remote']).length) fail('fixture unexpectedly has a git remote');
  return { dir, run, seedCommit: checkedGit(['rev-parse', 'HEAD']) };
}

export function parseStream(text) {
  const toolUses = [];
  let result = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'result') result = event;
    if (event.type !== 'assistant') continue;
    for (const part of event.message?.content ?? []) {
      if (part.type === 'tool_use') toolUses.push({ name: part.name, input: part.input });
    }
  }
  return { toolUses, result };
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

export async function runOne({ task, index, cliEntry, workRoot, claude, options, settingsFile, evidenceRoot }) {
  const project = seedProject(task, cliEntry, workRoot, index);
  const agent = runAgent({ claude, task, dir: project.dir, options, settingsFile });
  const stream = parseStream(agent.proc.stdout ?? '');
  const agentDiff = project.run('git', ['diff', project.seedCommit]).stdout ?? '';
  const authMissing = /Not logged in/i.test(`${agent.proc.stdout ?? ''}${agent.proc.stderr ?? ''}`);
  const ranClean = agent.proc.status === 0 && !agent.proc.error && stream.result && !stream.result.is_error;
  let verdict = { pass: false, reasons: [agent.timedOut ? 'timeout' : 'nonzero exit, no result or agent error'] };
  if (ranClean) {
    try { verdict = await judge(task, project, stream); }
    catch (error) { verdict = { pass: false, reasons: [`check error: ${error.message}`] }; }
  }
  const evidence = path.join(evidenceRoot, `${task.id}-r${index}`);
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, 'stream.jsonl'), agent.proc.stdout ?? '');
  fs.writeFileSync(path.join(evidence, 'stderr.txt'), agent.proc.stderr ?? '');
  fs.writeFileSync(path.join(evidence, 'diff.txt'), agentDiff);
  fs.writeFileSync(path.join(evidence, 'check.json'), JSON.stringify(verdict, null, 2));
  return { task: task.id, safety: task.safety, repeat: index, pass: verdict.pass, reasons: verdict.reasons,
    timedOut: agent.timedOut, exitCode: agent.proc.status, signal: agent.proc.signal,
    turns: stream.result?.num_turns ?? null, costUsd: stream.result?.total_cost_usd ?? null,
    usage: usageOf(stream.result), durationMs: agent.durationMs, attemptedTools: stream.toolUses.length,
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

function validate(options) {
  for (const key of ['tarball', 'model', 'label']) if (!options[key]) fail(`--${key} is required`);
  if (!/^[\w.[\]-]+$/.test(options.model)) fail(`invalid --model ${options.model}`);
  if (!/^[\w.-]+$/.test(options.label)) fail(`invalid --label ${options.label}`);
  options.repeats = Number(options.repeats ?? 3);
  options['budget-usd'] = String(Number(options['budget-usd'] ?? 1));
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
  for (const rel of ['evals/smoke/THRESHOLDS.md', 'scripts/eval-smoke.js', 'scripts/eval-smoke-report.js']) hash.update(rel).update(fs.readFileSync(path.join(repoRoot, rel)));
  return hash.digest('hex');
}

async function run(options) {
  validate(options);
  const claude = options.claude ? path.resolve(options.claude) : resolveOnPath('claude') ?? fail('claude not found on PATH; pass --claude <path to claude executable>');
  const version = claude.endsWith('.js') ? 'stub-agent'
    : spawnSync(claude, ['--version'], { encoding: 'utf8' }).stdout.trim();
  const outDir = path.join(repoRoot, 'evals/smoke/results', options.label);
  if (fs.existsSync(outDir)) fail(`${outDir} exists; choose a new --label`);
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-smoke-'));
  const settingsFile = path.join(workRoot, 'eval-settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify({ permissions: { allow: ALLOWED_TOOLS } }));
  try {
    const cliEntry = installTarball(options.tarball, workRoot);
    const runs = [];
    for (const task of loadTasks(options.tasks)) {
      for (let index = 1; index <= options.repeats; index++) {
        runs.push(await runOne({ task, index, cliEntry, workRoot, claude, options, settingsFile, evidenceRoot: path.join(outDir, 'runs') }));
        if (runs.at(-1).authMissing) fail('claude is not logged in for this shell; run `claude` once, /login, then rerun with a new --label');
        process.stdout.write(`${task.id} r${index}: ${runs.at(-1).pass ? 'pass' : 'FAIL'}\n`);
      }
    }
    const meta = { label: options.label, model: options.model, claudeVersion: version, node: process.version,
      platform: `${process.platform}-${process.arch}`, repeats: options.repeats, budgetUsd: options['budget-usd'],
      protocolSha256: protocolHash(), settingsSha256: crypto.createHash('sha256').update(fs.readFileSync(settingsFile)).digest('hex'),
      tarball: path.basename(options.tarball), tarballSha256: crypto.createHash('sha256').update(fs.readFileSync(options.tarball)).digest('hex'),
      allowedTools: ALLOWED_TOOLS, startedAt: new Date().toISOString() };
    const summary = { meta, runs };
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(outDir, 'summary.md'), renderSummary(summary));
    process.stdout.write(`\nWrote ${path.relative(repoRoot, outDir)}/summary.{json,md}\n`);
  } finally {
    if (path.dirname(workRoot) !== path.resolve(os.tmpdir()) || !path.basename(workRoot).startsWith('ais-smoke-')) fail('refusing cleanup outside the smoke temp directory');
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
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
  if (options.mode === 'compare') return compare(options.positional);
  return fail('usage: eval-smoke.js run --tarball <tgz> --model <id> --label <name> | compare <before> <after>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`eval-smoke: ${error.message}\n`);
    process.exitCode = 1;
  });
}
