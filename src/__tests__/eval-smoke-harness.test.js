/**
 * Item 99 harness repair (2026-11-20): every coding run of the earlier smoke
 * evaluation was contaminated by permission denials under a Windows short-name
 * temporary path. These tests pin the repair.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { classifyDenials, deniedCalls, onAllowList } from '../../scripts/eval-smoke-denials.js';
import { canonicalTmpRoot, makeWorkRoot, parseSetups, removeWorkRoot, seedProject, setupHashes, setupOrder } from '../../scripts/eval-smoke-setup.js';
import { agentDiagnosis, ALLOWED_TOOLS, LOGIN_HINT, preflightProblems, runOne } from '../../scripts/eval-smoke.js';
import { compareSummaries, renderComparison, renderSummary, taskStats } from '../../scripts/eval-smoke-report.js';

const CLI = path.resolve(import.meta.dirname, '../../bin/ai-scaffold.js');
const DENIED = 'Permission for this tool use was denied. It requires approval, and this session has no approval surface';
const call = (id, name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const denial = (id) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content: DENIED }] } });

describe('denial classification', () => {
  const project = path.join(os.tmpdir(), 'proj');
  const classify = (events) => classifyDenials(deniedCalls(events), { allowedTools: ALLOWED_TOOLS, projectDir: project });

  it('finds denied calls by tool_use id and ignores ordinary tool errors', () => {
    const events = [call('a', 'Bash', { command: 'npm test' }),
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', is_error: true, content: 'exit code 1' }] } },
      call('b', 'Write', { file_path: 'x.js' }), denial('b')];
    expect(deniedCalls(events)).toEqual([expect.objectContaining({ name: 'Write', input: { file_path: 'x.js' } })]);
  });

  it('an edit inside the project, a read, or an allow-listed command denied is unexpected', () => {
    const result = classify([call('1', 'Edit', { file_path: path.join(project, 'src/a.js') }), denial('1'),
      call('2', 'Read', { file_path: 'src/a.js' }), denial('2'),
      call('3', 'Bash', { command: 'git log --oneline -3' }), denial('3')]);
    expect(result.unexpected.map((d) => d.name)).toEqual(['Edit', 'Read', 'Bash']);
    expect(result.restricted).toEqual([]);
  });

  it('a destructive, unlisted or compound command, or an edit outside the project, is the intended restriction', () => {
    const result = classify([call('1', 'Bash', { command: 'git push --force origin main' }), denial('1'),
      call('2', 'Bash', { command: 'git config core.hooksPath' }), denial('2'),
      call('3', 'Bash', { command: 'git log && rm -rf .' }), denial('3'),
      call('4', 'Write', { file_path: path.join(os.tmpdir(), 'elsewhere.txt') }), denial('4')]);
    expect(result.unexpected).toEqual([]);
    expect(result.restricted).toHaveLength(4);
  });

  it.each([['npm test', true], ['npm test --watch', false], ['node --test test/a.test.js', true], ['git status', true],
    ['git statuses', false], ['git diff $(whoami)', false], ['', false]])('onAllowList(%j) is %s', (command, expected) => {
    expect(onAllowList(command, ALLOWED_TOOLS)).toBe(expected);
  });
});

describe('canonical temporary root', () => {
  it('has no short-name segment, and cleanup refuses anything outside it', () => {
    expect(canonicalTmpRoot()).not.toMatch(/~\d/);
    const dir = makeWorkRoot('ais-smoke-');
    expect(path.dirname(dir)).toBe(canonicalTmpRoot());
    expect(() => removeWorkRoot(path.join(dir, 'nested'))).toThrow(/refusing cleanup/);
    removeWorkRoot(dir);
    expect(fs.existsSync(dir)).toBe(false);
  });
});

describe('setups', { timeout: 120000 }, () => {
  let workRoot;
  beforeEach(() => { workRoot = makeWorkRoot('ais-smoke-'); });
  afterEach(() => removeWorkRoot(workRoot));

  it('parses, rotates and hashes setups', () => {
    expect(parseSetups()).toEqual(['full']);
    expect(() => parseSetups('full,full')).toThrow();
    expect(() => parseSetups('hooks')).toThrow(/unknown setup/);
    const all = ['native', 'minimal', 'full'];
    expect([1, 2, 3].map((r) => setupOrder(all, r, 0)[0])).toEqual(['native', 'minimal', 'full']);
    expect(setupHashes(all)).toMatchObject({ native: 'none', full: 'tarball', minimal: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it('gives every setup the same package.json, test folder and seed, and only the setup guidance differs', () => {
    const task = { id: 'bugfix-slugify' };
    const [native, minimal, full] = ['native', 'minimal', 'full'].map((s) => seedProject(task, CLI, workRoot, 1, s));
    const read = (p, rel) => fs.readFileSync(path.join(p.dir, rel), 'utf8');
    for (const rel of ['package.json', 'test/smoke.test.js', 'src/slugify.js', 'test/slugify.test.js']) {
      expect(read(native, rel)).toBe(read(full, rel));
      expect(read(minimal, rel)).toBe(read(full, rel));
    }
    expect(fs.existsSync(path.join(native.dir, 'AGENTS.md'))).toBe(false);
    expect(fs.existsSync(path.join(native.dir, '.claude'))).toBe(false);
    expect(read(minimal, 'CLAUDE.md').trim()).toBe('@AGENTS.md');
    expect(fs.existsSync(path.join(minimal.dir, '.claude'))).toBe(false);
    expect(fs.existsSync(path.join(full.dir, '.claude/settings.json'))).toBe(true);
    for (const p of [native, minimal, full]) {
      expect(p.run('git', ['branch', '--show-current']).stdout.trim()).toBe('feature/smoke-bugfix-slugify');
      expect(p.run('git', ['status', '--porcelain']).stdout.trim()).toBe('');
    }
  });

  it('marks a run with an unexpected denial invalid, keeps its evidence and never calls the check', async () => {
    const stub = path.join(workRoot, 'stub.js');
    const events = [call('w', 'Write', { file_path: 'src/slugify.js' }), denial('w'), { type: 'result', result: 'blocked', is_error: false, num_turns: 2 }];
    fs.writeFileSync(stub, `process.stdout.write(${JSON.stringify(events.map((e) => JSON.stringify(e)).join('\n'))});\n`);
    let judged = false;
    const result = await runOne({ task: { id: 'bugfix-slugify', safety: false, timeoutSec: 30, prompt: 'stub' }, index: 1, setup: 'native',
      cliEntry: CLI, workRoot, claude: stub, options: { model: 'stub', 'budget-usd': '1' }, settingsFile: path.join(workRoot, 's.json'),
      evidenceRoot: path.join(workRoot, 'evidence'), judgeRun: () => { judged = true; return { pass: true, reasons: [] }; } });
    expect(result).toMatchObject({ invalid: true, pass: false, setup: 'native', denials: { unexpected: 1, restricted: 0 } });
    expect(result.reasons[0]).toMatch(/^harness: 1 unexpected permission denial/);
    expect(judged).toBe(false);
    const kept = JSON.parse(fs.readFileSync(path.join(workRoot, 'evidence/bugfix-slugify-native-r1/denials.json'), 'utf8'));
    expect(kept.unexpected[0].name).toBe('Write');
  });
});

describe('report', () => {
  const meta = { label: 'x', model: 'm', claudeVersion: 'v', repeats: 1, budgetUsd: '1', node: 'v24', platform: 'test',
    protocolSha256: 'p', settingsSha256: 's', tarball: 't.tgz', tarballSha256: 'a'.repeat(64), setups: ['native', 'full'] };
  const runOf = (setup, extra = {}) => ({ task: 'a', setup, pass: true, safety: false, repeat: 1, reasons: [], usage: null, turns: 3, ...extra });

  it('groups by task and setup, and never counts an invalid run as a pass or a fail', () => {
    const stats = taskStats({ meta, runs: [runOf('native'), runOf('full', { pass: false, invalid: true, reasons: ['harness: x'] })] });
    expect(stats.map((s) => [s.task, s.passes, s.valid, s.invalid.length])).toEqual([['a [native]', 1, 1, 0], ['a [full]', 0, 0, 1]]);
    expect(renderSummary({ meta, runs: [runOf('full', { pass: false, invalid: true, reasons: ['harness: x'] })] })).toMatch(/## Invalid runs[\s\S]*harness: x/);
  });

  it('refuses a verdict when any run is invalid, even if no threshold is broken', () => {
    const good = { meta, runs: [runOf('native')] };
    const bad = { meta, runs: [runOf('native', { pass: false, invalid: true, reasons: ['harness: x'] })] };
    const comparison = compareSummaries(good, bad);
    expect(comparison.ok).toBe(false);
    expect(renderComparison(comparison)).toMatch(/^No verdict: 1 invalid run/m);
    expect(renderComparison(comparison)).not.toMatch(/No regression observed/);
  });

  it('refuses a verdict on a batch that stopped early', () => {
    const stopped = { meta: { ...meta, stoppedEarly: 'invalid run' }, runs: [runOf('native')] };
    expect(compareSummaries(stopped, { meta, runs: [runOf('native')] }).violations.join(' ')).toMatch(/stopped early/);
  });
});

describe('preflight check', () => {
  let dir;
  beforeEach(() => { dir = makeWorkRoot('ais-smoke-'); });
  afterEach(() => removeWorkRoot(dir));
  const none = { unexpected: [], restricted: [] };
  const uses = [{ name: 'Write', input: {} }, { name: 'Read', input: {} }, { name: 'Bash', input: { command: 'npm test' } }];

  it('passes only when the file was written and read, npm test ran and nothing unexpected was denied', () => {
    fs.writeFileSync(path.join(dir, 'preflight.txt'), 'ok\n');
    expect(preflightProblems({ dir, toolUses: uses, denials: none, ranClean: true })).toEqual([]);
    expect(preflightProblems({ dir, toolUses: uses, denials: { unexpected: [{ name: 'Write' }], restricted: [] }, ranClean: true })).toHaveLength(1);
    expect(preflightProblems({ dir, toolUses: uses.slice(0, 2), denials: none, ranClean: true })).toEqual(['npm test was not run']);
    fs.rmSync(path.join(dir, 'preflight.txt'));
    expect(preflightProblems({ dir, toolUses: uses, denials: none, ranClean: false })).toHaveLength(2);
  });

  it('says why the agent did not finish: exit, missing result, login and the last stderr line', () => {
    const agent = { timedOut: false, proc: { status: 1, signal: null, error: null, stdout: '', stderr: 'warn\nNot logged in · Please run /login\n' } };
    expect(agentDiagnosis(agent, { toolUses: [], result: null }))
      .toBe(`exit 1, no result event, 0 tool call(s), ${LOGIN_HINT}, stderr: warn | Not logged in · Please run /login`);
  });

  it('points a missing login at the user-settings env block that project-only runs skip', () => {
    expect(LOGIN_HINT).toMatch(/env block of ~\/\.claude\/settings\.json/);
    expect(LOGIN_HINT).toMatch(/evals\/smoke\/README\.md/);
  });

  it('reports a timeout and an error result instead of an exit code', () => {
    const agent = { timedOut: true, proc: { status: null, signal: 'SIGTERM', error: { code: 'ETIMEDOUT' }, stdout: '', stderr: '' } };
    const stream = { toolUses: [{ name: 'Write' }], result: { subtype: 'error_max_budget_usd', is_error: true } };
    expect(agentDiagnosis(agent, stream)).toBe('timed out, signal SIGTERM, result error_max_budget_usd (error), 1 tool call(s)');
  });
});
