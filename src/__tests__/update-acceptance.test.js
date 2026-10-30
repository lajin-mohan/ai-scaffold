/**
 * Item 25 criterion 7.1: BRD acceptance criteria AC-02/03/04/05/06/08/09/12/
 * 13/15/16/17/18/19/20/21, each on a generated node project in a real git
 * repository. AC-16 and AC-17 kill the real CLI with SIGKILL.
 */
import { spawnSync } from 'child_process';
import diagnosticsChannel from 'diagnostics_channel';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { hashRaw } from '../cli/core/hashing.js';
import { scaffoldSubset } from '../cli/core/settings-merge.js';
import { runApply } from '../cli/core/update-apply-run.js';
import { runPreview } from '../cli/core/update-preview.js';
import { formatReport } from '../cli/core/update-report.js';
import { nativeFs } from '../cli/core/write-ops.js';
import { hookScript } from '../cli/core/settings-hooks.js';

const GIT = resolveOnPath('git');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(HERE, '..', '..', 'bin', 'ai-scaffold.js');
const HOOK = pathToFileURL(path.join(HERE, 'fixtures', 'crash-hook.mjs')).href;
const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const NEXT = '99.0.0';
const SETTINGS = '.claude/settings.json';
let tmpDir;
let counter = 0;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function commit(target) {
  git(target, 'add', '-A');
  git(target, 'commit', '-q', '--no-verify', '--allow-empty', '-m', 'state');
}

async function install() {
  const target = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, `ac${counter++}-`)));
  const bootstrap = resolveWithDefaults({ projectName: 'acceptance', purpose: 'Acceptance', ownerEmail: 'a@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  git(target, 'init', '-q');
  git(target, 'config', 'user.email', 't@example.com');
  git(target, 'config', 'user.name', 'Test');
  git(target, 'config', 'core.autocrlf', 'false');
  commit(target);
  return target;
}

const at = (target, rel) => path.join(target, ...rel.split('/'));
const read = (target, rel) => fs.readFileSync(at(target, rel), 'utf-8');
const readJson = (target, rel) => JSON.parse(read(target, rel));
const writeJson = (target, rel, value) => fs.writeFileSync(at(target, rel), `${JSON.stringify(value, null, 2)}\n`);
const editManifest = (target, change) => writeJson(target, '.ai-scaffold.json', change(readJson(target, '.ai-scaffold.json')));
const older = (target) => editManifest(target, (m) => ({ ...m, version: '0.0.1' }));

function makeOlderPristine(target, rel, content) {
  fs.writeFileSync(at(target, rel), content);
  editManifest(target, (m) => ({ ...m, managedFiles: m.managedFiles.map((r) => (r.path === rel ? { ...r, path: rel, hash: hashRaw(content) } : r)) }));
}

function tree(target, { backups = false } = {}) {
  const out = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(at(target, rel || '.'), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.git' || (!backups && child === '.ai-scaffold/backups')) continue;
      if (entry.isDirectory()) walk(child);
      else out[child] = hashRaw(fs.readFileSync(at(target, child)));
    }
  };
  walk('');
  return out;
}

const apply = (target, options = {}, extra = {}) => runApply({
  target, options: { apply: true, ...options }, cliVersion: NEXT, today: NOW, now: NOW, ...extra,
});
const preview = (target, extra = {}) => runPreview({ target, options: {}, cliVersion: NEXT, today: NOW, ...extra });

/** Settings helpers: the first single-hook group that has a matcher. */
function singleHookGroup(settings) {
  for (const [event, groups] of Object.entries(settings.hooks)) {
    const index = groups.findIndex((g) => g.matcher && g.hooks?.length === 1);
    if (index !== -1) return { event, index, group: groups[index] };
  }
  throw new Error('no single-hook group with a matcher');
}
const scriptOf = hookScript;
const hookCommands = (settings) => Object.values(settings.hooks ?? {}).flat().flatMap((g) => g.hooks.map((h) => h.command));

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-acceptance-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe.runIf(GIT)('BRD acceptance criteria (item 25, criterion 7.1)', { timeout: 180_000 }, () => {
  it('AC-02: an edited CLAUDE.md and filled lessons: CLAUDE.md kept, .ais-new written, lessons identical, 1 conflict, exit 2', async () => {
    const target = await install();
    fs.appendFileSync(at(target, 'CLAUDE.md'), '\nadopter edit\n');
    fs.appendFileSync(at(target, 'tasks/lessons.md'), '\n## A lesson\n');
    commit(target);
    const lessons = read(target, 'tasks/lessons.md');
    const claude = read(target, 'CLAUDE.md');
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'applied', exitCode: 2 });
    expect(doc.counts.conflict).toBe(1);
    expect(read(target, 'CLAUDE.md')).toBe(claude);
    expect(fs.existsSync(at(target, 'CLAUDE.md.ais-new'))).toBe(true);
    expect(read(target, 'tasks/lessons.md')).toBe(lessons);
  });

  it('AC-03: a pristine hook removed upstream and retired by a migration is deleted with its settings entry; adopter hooks are kept', async () => {
    const target = await install();
    const oldScript = '.claude/hooks/old-hook.sh';
    const oldBody = '#!/bin/sh\nexit 0\n';
    fs.writeFileSync(at(target, oldScript), oldBody);
    const settings = readJson(target, SETTINGS);
    settings.hooks.PreToolUse ??= [];
    settings.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: `bash ${oldScript}` }] });
    const base = scaffoldSubset(settings);
    settings.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'bash .claude/hooks/my-hook.sh' }] });
    writeJson(target, SETTINGS, settings);
    fs.writeFileSync(at(target, '.claude/hooks/my-hook.sh'), '#!/bin/sh\n');
    editManifest(target, (m) => ({
      ...m, settingsBase: base,
      managedFiles: [...m.managedFiles, { path: oldScript, hash: hashRaw(oldBody), class: 'managed' }],
    }));
    commit(target);
    const migrations = [{ version: NEXT, run: () => ['retire old-hook'], retired: { hooks: [`PreToolUse ${oldScript}`] } }];
    const doc = await apply(target, {}, { migrations });
    expect(doc.status).toBe('applied');
    expect(doc.entries.find((e) => e.path === oldScript).action).toBe('remove');
    expect(doc.settings.removed).toContain(`hook: PreToolUse ${oldScript}`);
    expect(fs.existsSync(at(target, oldScript))).toBe(false);
    const after = hookCommands(readJson(target, SETTINGS));
    expect(after.some((c) => c.includes('old-hook.sh'))).toBe(false);
    expect(after).toContain('bash .claude/hooks/my-hook.sh');
    expect(fs.existsSync(at(target, '.claude/hooks/my-hook.sh'))).toBe(true);
  });

  it('AC-04: new deny rules are added; the adopter allow rule and hook are kept; no allow rule is removed', async () => {
    const target = await install();
    const settings = readJson(target, SETTINGS);
    const newDeny = settings.permissions.deny[0];
    settings.permissions.deny = settings.permissions.deny.slice(1);
    settings.permissions.allow.push('Bash(make test)');
    settings.hooks.PreToolUse ??= [];
    settings.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'bash .claude/hooks/my-hook.sh' }] });
    writeJson(target, SETTINGS, settings);
    editManifest(target, (m) => ({
      ...m, settingsBase: { ...m.settingsBase, permissions: { ...m.settingsBase.permissions, deny: m.settingsBase.permissions.deny.slice(1) } },
    }));
    commit(target);
    const doc = await apply(target);
    expect(doc.settings.added).toContain(`deny: ${newDeny}`);
    const after = readJson(target, SETTINGS);
    expect(after.permissions.deny).toContain(newDeny);
    expect(after.permissions.allow).toEqual(expect.arrayContaining(settings.permissions.allow));
    expect(hookCommands(after)).toContain('bash .claude/hooks/my-hook.sh');
  });

  it('AC-05: a write failure after half the files leaves the project byte-identical, exit 1, backup reported', async () => {
    const target = await install();
    const rules = readJson(target, '.ai-scaffold.json').managedFiles
      .filter((r) => r.path.startsWith('.claude/rules/')).slice(0, 4).map((r) => r.path);
    for (const rel of rules) makeOlderPristine(target, rel, `older ${rel}\n`);
    commit(target);
    const before = tree(target);
    let renames = 0;
    const fsApi = {
      ...nativeFs,
      readdir: (p, o) => fs.promises.readdir(p, o),
      rename: async (from, to) => {
        if (!to.includes(`${path.sep}backups${path.sep}`) && ++renames === 3) throw Object.assign(new Error('injected'), { code: 'EIO' });
        return nativeFs.rename(from, to);
      },
    };
    const doc = await apply(target, {}, { fsApi });
    expect(doc).toMatchObject({ status: 'rolled-back', exitCode: 1 });
    expect(doc.backup).toMatch(/^\.ai-scaffold\/backups\//);
    expect(formatReport(doc)).toContain(doc.backup);
    expect(tree(target)).toEqual(before);
  });

  it('AC-06: a preview changes nothing on disk and prints the plan', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    const before = tree(target, { backups: true });
    const doc = await preview(target);
    expect(doc.status).toBe('planned');
    expect(formatReport(doc)).toContain('replace: 1');
    expect(tree(target, { backups: true })).toEqual(before);
  });

  it('AC-08: an uncommitted edit to a planned path is refused, named, and nothing is written', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    const before = tree(target, { backups: true });
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'error', exitCode: 1, error: { code: 'UNCOMMITTED_CHANGES' } });
    expect(doc.error.message).toContain('CLAUDE.md');
    expect(tree(target, { backups: true })).toEqual(before);
  });

  it('AC-09: the same update run twice: the second reports already current and changes nothing', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    commit(target);
    expect((await apply(target)).status).toBe('applied');
    commit(target);
    const before = tree(target, { backups: true });
    const second = await apply(target);
    expect(second).toMatchObject({ status: 'current', exitCode: 0 });
    expect(formatReport(second)).toContain(`Already at ${NEXT}`);
    expect(tree(target, { backups: true })).toEqual(before);
  });

  it('AC-12: a removed allow rule stays removed, a locally modified hook is reported not replaced, new deny rules are added', async () => {
    const target = await install();
    const settings = readJson(target, SETTINGS);
    const droppedAllow = settings.permissions.allow[0];
    const newDeny = settings.permissions.deny[0];
    settings.permissions.allow = settings.permissions.allow.slice(1);
    settings.permissions.deny = settings.permissions.deny.slice(1);
    const { group } = singleHookGroup(settings);
    const command = group.hooks[0].command;
    const key = scriptOf(command);
    group.hooks[0].command = `ECC_FACT_CHECK_STRICT=1 ${command}`;
    writeJson(target, SETTINGS, settings);
    // The new version also changes that hook, so a plain update would replace it.
    editManifest(target, (m) => ({
      ...m,
      settingsBase: {
        permissions: { ...m.settingsBase.permissions, deny: m.settingsBase.permissions.deny.slice(1) },
        hooks: m.settingsBase.hooks.map((h) => (h.script === key ? { ...h, entry: { ...h.entry, timeout: 1 } } : h)),
      },
    }));
    commit(target);
    const doc = await apply(target);
    expect(doc.settings.reported.some((r) => r.includes(key) && r.includes('locally modified'))).toBe(true);
    const after = readJson(target, SETTINGS);
    expect(after.permissions.allow).not.toContain(droppedAllow);
    expect(after.permissions.deny).toContain(newDeny);
    expect(hookCommands(after)).toContain(`ECC_FACT_CHECK_STRICT=1 ${command}`);
  });

  it('AC-13: a pre-settingsBase project with an edited settings.json plans only deny/ask additions; allow rules are suggestions', async () => {
    const target = await install();
    const settings = readJson(target, SETTINGS);
    const deny = settings.permissions.deny[0];
    const allow = settings.permissions.allow[0];
    settings.permissions.deny = settings.permissions.deny.slice(1);
    settings.permissions.allow = settings.permissions.allow.slice(1);
    writeJson(target, SETTINGS, settings);
    editManifest(target, ({ manifestSchema: _s, settingsBase: _b, ...m }) => ({
      ...m, managedFiles: m.managedFiles.map(({ class: _c, ...r }) => r),
    }));
    const doc = await preview(target);
    expect(doc.settings.base).toBe('unknown');
    expect(doc.settings.added).toEqual([]);
    expect(doc.settings.missingNoBase).toEqual([`deny: ${deny}`]);
    expect(doc.settings.suggestions).toContain(`allow: ${allow}`);
  });

  it('AC-15: an edit left as a conflict by update N is untouched and still a conflict at update N+1', async () => {
    const target = await install();
    fs.appendFileSync(at(target, 'CLAUDE.md'), '\nkept edit\n');
    commit(target);
    const edited = read(target, 'CLAUDE.md');
    expect((await apply(target)).exitCode).toBe(2);
    fs.rmSync(at(target, 'CLAUDE.md.ais-new'));
    older(target);
    commit(target);
    const next = await apply(target);
    expect(next.entries.find((e) => e.path === 'CLAUDE.md').action).toBe('conflict');
    expect(read(target, 'CLAUDE.md')).toBe(edited);
  });

  it('AC-18: a second apply while the lock is held exits 1 naming the lock and writes nothing', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    commit(target);
    fs.writeFileSync(at(target, '.ai-scaffold/update.lock'), JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: NOW.toISOString(), token: 't' }));
    const before = tree(target, { backups: true });
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'locked', exitCode: 1, lock: { liveness: 'running' } });
    expect(doc.notices.join(' ')).toContain('.ai-scaffold/update.lock');
    expect(tree(target, { backups: true })).toEqual(before);
  });

  it('AC-19: a file edited after planning and before its write stops the apply, rolls back, names the file, exit 1', async () => {
    const target = await install();
    makeOlderPristine(target, 'AGENTS.md', 'older agents\n');
    makeOlderPristine(target, 'CLAUDE.md', 'older claude\n');
    commit(target);
    const onStage = (event) => {
      if (event.stage === 'write-done' && event.index === 0) fs.writeFileSync(at(target, 'CLAUDE.md'), 'edited mid-apply\n');
    };
    diagnosticsChannel.subscribe('ais:update:apply', onStage);
    let doc;
    try {
      doc = await apply(target);
    } finally {
      diagnosticsChannel.unsubscribe('ais:update:apply', onStage);
    }
    expect(doc).toMatchObject({ status: 'rolled-back', exitCode: 1, error: { code: 'CONCURRENT_EDIT' } });
    expect(doc.error.message).toContain('CLAUDE.md');
    expect(read(target, 'AGENTS.md')).toBe('older agents\n');
    expect(read(target, 'CLAUDE.md')).toBe('edited mid-apply\n');
  });

  it('AC-20: a changed matcher is replaced as one entry; two local entries for one hook are ambiguous and left unchanged', async () => {
    const target = await install();
    const settings = readJson(target, SETTINGS);
    const { event, index, group } = singleHookGroup(settings);
    const shipped = group.matcher;
    const key = `${event} ${scriptOf(group.hooks[0].command)}`;
    settings.hooks[event][index] = { ...group, matcher: 'OldMatcher' };
    writeJson(target, SETTINGS, settings);
    editManifest(target, (m) => ({
      ...m, settingsBase: { ...m.settingsBase, hooks: m.settingsBase.hooks.map((h) => (`${h.event} ${h.script}` === key ? { ...h, entry: { ...h.entry, matcher: 'OldMatcher' } } : h)) },
    }));
    commit(target);
    expect((await preview(target)).settings.replaced).toContain(`hook: ${key}`);
    await apply(target);
    const replaced = readJson(target, SETTINGS).hooks[event].filter((g) => g.hooks.some((h) => h.command === group.hooks[0].command));
    expect(replaced.map((g) => g.matcher)).toEqual([shipped]);

    const second = await install();
    const dup = readJson(second, SETTINGS);
    dup.hooks[event].push(JSON.parse(JSON.stringify(dup.hooks[event][index])));
    writeJson(second, SETTINGS, dup);
    commit(second);
    const before = read(second, SETTINGS);
    expect((await preview(second)).settings.ambiguous).toContain(`hook: ${key}`);
    await apply(second);
    expect(read(second, SETTINGS)).toBe(before);
  });

  it('AC-21: a removed deny rule is restored, then kept with --keep-removed, honoured later, and restored with --restore-removed', async () => {
    const target = await install();
    const dropDeny = (rule) => {
      const s = readJson(target, SETTINGS);
      s.permissions.deny = s.permissions.deny.filter((r) => r !== rule);
      writeJson(target, SETTINGS, s);
    };
    const rule = readJson(target, SETTINGS).permissions.deny[0];
    const denies = () => readJson(target, SETTINGS).permissions.deny;
    dropDeny(rule);
    commit(target);

    const restored = await apply(target);
    expect(restored.settings.restored).toContain(`deny: ${rule}`);
    expect(denies()).toContain(rule);

    dropDeny(rule);
    older(target);
    commit(target);
    const kept = await apply(target, { keepRemoved: rule });
    expect(kept.settings.exceptions).toContain(`deny: ${rule}`);
    expect(denies()).not.toContain(rule);
    expect(readJson(target, '.ai-scaffold.json').settingsExceptions.deny).toEqual([rule]);

    older(target);
    commit(target);
    const honoured = await apply(target);
    expect(honoured.settings.exceptions).toContain(`deny: ${rule}`);
    expect(denies()).not.toContain(rule);

    older(target);
    commit(target);
    const back = await apply(target, { restoreRemoved: rule });
    expect(back.settings.restored).toContain(`deny: ${rule}`);
    expect(denies()).toContain(rule);
    expect(readJson(target, '.ai-scaffold.json').settingsExceptions.deny).toEqual([]);
  });
});

/** Run the real CLI apply, killed with SIGKILL at `stage`. */
function killedCliApply(target, stage, index = '') {
  const env = { ...process.env, AIS_TEST_CRASH_STAGE: stage, AIS_TEST_CRASH_INDEX: String(index) };
  return spawnSync(process.execPath, ['--import', HOOK, BIN, 'update', target, '--apply', '--json'], { env, encoding: 'utf-8', timeout: 120_000 });
}

const cliVersion = () => JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'package.json'), 'utf-8')).version;

async function killedProject(stage, index) {
  const target = await install();
  makeOlderPristine(target, 'AGENTS.md', 'older agents\n');
  makeOlderPristine(target, 'CLAUDE.md', 'older claude\n');
  older(target);
  commit(target);
  const child = killedCliApply(target, stage, index);
  expect(child.signal ?? child.status).not.toBe(0);
  expect(fs.existsSync(at(target, '.ai-scaffold/update.lock'))).toBe(true);
  return target;
}

describe.runIf(GIT)('BRD AC-16 and AC-17: the real CLI killed mid-apply', { timeout: 240_000 }, () => {
  const local = (target, extra = {}) => ({ target, options: {}, cliVersion: cliVersion(), today: NOW, ...extra });

  it('AC-16: after a kill mid-write, every later run reports and exits 1 and nothing in the project or backup changes', async () => {
    const target = await killedProject('write-done', 0);
    const frozen = tree(target, { backups: true });
    const locked = await runApply({ ...local(target), options: { apply: true } });
    expect(locked).toMatchObject({ status: 'locked', exitCode: 1, lock: { liveness: 'not-running' } });
    expect(tree(target, { backups: true })).toEqual(frozen);

    fs.rmSync(at(target, '.ai-scaffold/update.lock'));
    const unlocked = tree(target, { backups: true });
    const previewed = await runPreview(local(target));
    expect(previewed).toMatchObject({ status: 'interrupted', exitCode: 1, entries: null });
    expect(previewed.notices.join(' ')).toMatch(/\.ai-scaffold\/backups\/\S+ \(mixed\)/);
    const applied = await runApply({ ...local(target), options: { apply: true } });
    expect(applied).toMatchObject({ status: 'interrupted', exitCode: 1, entries: null });
    expect(tree(target, { backups: true })).toEqual(unlocked);
  });

  it('AC-17: killed before the marker, preview reports and writes nothing; --apply completes it and plans normally', async () => {
    const target = await killedProject('before-marker');
    fs.rmSync(at(target, '.ai-scaffold/update.lock'));
    const frozen = tree(target, { backups: true });
    const previewed = await runPreview(local(target));
    expect(previewed).toMatchObject({ status: 'interrupted', exitCode: 1 });
    expect(previewed.notices.join(' ')).toContain('(all-final)');
    expect(tree(target, { backups: true })).toEqual(frozen);
    const applied = await runApply({ ...local(target), options: { apply: true } });
    expect(applied).toMatchObject({ status: 'current', exitCode: 0 });
    expect(applied.notices.join(' ')).toContain('completed (all-final)');
  });

  it('AC-17: if a journaled path changed after the kill, --apply exits 1 instead', async () => {
    const target = await killedProject('before-marker');
    fs.rmSync(at(target, '.ai-scaffold/update.lock'));
    fs.appendFileSync(at(target, 'CLAUDE.md'), 'edited after the crash\n');
    const applied = await runApply({ ...local(target), options: { apply: true, allowDirty: true } });
    expect(applied).toMatchObject({ status: 'interrupted', exitCode: 1, error: { code: 'INTERRUPTED_APPLY' } });
  });
});
