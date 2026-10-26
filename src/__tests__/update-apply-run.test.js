/**
 * Item 25 slice 4, S6: `ais update --apply` end to end on generated projects
 * in real git repositories (criteria 4.1, 4.2, 5.2, 5.3, 6.1, 6.2).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { hashRaw } from '../cli/core/hashing.js';
import { runApply } from '../cli/core/update-apply-run.js';
import { emptyApplyDocument } from '../cli/core/update-apply-run.js';
import { scaffoldSubset } from '../cli/core/settings-merge.js';
import { applyTransaction } from '../cli/core/update-apply.js';
import { buildApplyOps } from '../cli/core/update-apply-ops.js';
import { readManifestObserved } from '../cli/core/update-manifest.js';
import { computePlan } from '../cli/core/update-pipeline.js';
import { checkFlags, checkVersions } from '../cli/core/update-policy.js';
import { defaultIo } from '../cli/core/update-state.js';
import { nativeFs } from '../cli/core/write-ops.js';
import { resolveProjectRoot } from '../cli/core/containment.js';

const GIT = resolveOnPath('git');
const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const NEXT = '99.0.0';
let tmpDir;
let counter = 0;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

async function install({ repo = true } = {}) {
  const target = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, `p${counter++}-`)));
  const bootstrap = resolveWithDefaults({ projectName: 'apply-run', purpose: 'Apply', ownerEmail: 'a@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  if (repo) {
    git(target, 'init', '-q');
    git(target, 'config', 'user.email', 't@example.com');
    git(target, 'config', 'user.name', 'Test');
    git(target, 'config', 'core.autocrlf', 'false');
    commit(target);
  }
  return target;
}

function commit(target) {
  git(target, 'add', '-A');
  git(target, 'commit', '-q', '--no-verify', '-m', 'state');
}

const at = (target, rel) => path.join(target, ...rel.split('/'));
const manifestOf = (target) => JSON.parse(fs.readFileSync(at(target, '.ai-scaffold.json'), 'utf-8'));

function editManifest(target, change) {
  fs.writeFileSync(at(target, '.ai-scaffold.json'), `${JSON.stringify(change(manifestOf(target)), null, 2)}\n`);
}

/** Make a managed file look like an older pristine scaffold version. */
function makeOlderPristine(target, rel, content) {
  fs.writeFileSync(at(target, rel), content);
  editManifest(target, (m) => ({ ...m, managedFiles: m.managedFiles.map((r) => (r.path === rel ? { path: rel, hash: hashRaw(content) } : r)) }));
}

function tree(target) {
  const out = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(at(target, rel || '.'), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.git' || child === '.ai-scaffold/backups') continue;
      if (entry.isDirectory()) walk(child);
      else out[child] = hashRaw(fs.readFileSync(at(target, child)));
    }
  };
  walk('');
  return out;
}

const apply = (target, options = {}) => runApply({ target, options: { apply: true, ...options }, cliVersion: NEXT, today: NOW, now: NOW });

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-apply-run-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe.runIf(GIT)('ais update --apply', { timeout: 120_000 }, () => {
  it('applies an older pristine install, records the new manifest, and a second run changes nothing (5.2, 5.3, 6.1)', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older scaffold claude\n');
    commit(target);
    const doc = await apply(target);
    expect(Object.keys(doc).sort()).toEqual(Object.keys(emptyApplyDocument()).sort());
    expect(doc).toMatchObject({ schema: 'ais-update-apply/1', status: 'applied', exitCode: 0, gitSafety: 'clean', error: null });
    expect(doc.entries.find((e) => e.path === 'CLAUDE.md').action).toBe('replace');
    expect(fs.readFileSync(at(target, 'CLAUDE.md'), 'utf-8')).not.toBe('older scaffold claude\n');
    const manifest = manifestOf(target);
    expect(manifest).toMatchObject({ version: NEXT, manifestSchema: 2, updatedAt: '2026-10-15' });
    expect(manifest.managedFiles.find((r) => r.path === 'CLAUDE.md').hash).toBe(hashRaw(fs.readFileSync(at(target, 'CLAUDE.md'))));
    const settings = JSON.parse(fs.readFileSync(at(target, '.claude/settings.json'), 'utf-8'));
    expect(manifest.settingsBase).toEqual(scaffoldSubset(settings));
    expect(fs.existsSync(at(target, `${doc.backup}/complete`))).toBe(true);
    expect(fs.existsSync(at(target, '.ai-scaffold/update.lock'))).toBe(false);

    commit(target);
    const before = tree(target);
    const second = await apply(target);
    expect(second).toMatchObject({ status: 'current', exitCode: 0 });
    expect(tree(target)).toEqual(before);
  });

  it('backups are ignored by git, so git add -A never commits them (BRD Q-01, #159 review W3)', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    commit(target);
    const doc = await apply(target);
    expect(doc.status).toBe('applied');
    expect(fs.readFileSync(at(target, '.ai-scaffold/backups/.gitignore'), 'utf-8')).toBe('*\n');
    git(target, 'add', '-A');
    expect(git(target, 'diff', '--cached', '--name-only')).not.toContain('.ai-scaffold/backups');
  });

  it.each([
    ['permissions is not an object', { permissions: 'x' }],
    ['a rule list is not an array', { permissions: { deny: 'rm' } }],
    ['a rule is not a string', { permissions: { allow: [1] } }],
    ['hooks is not an object of arrays', { hooks: { PreToolUse: 'x' } }],
  ])('settings.json whose %s is a conflict, never merged or rewritten (FR-24, #159 review)', async (_name, settings) => {
    const target = await install();
    fs.writeFileSync(at(target, '.claude/settings.json'), `${JSON.stringify(settings)}\n`);
    commit(target);
    const before = fs.readFileSync(at(target, '.claude/settings.json'), 'utf-8');
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'applied', exitCode: 2, settings: null });
    expect(doc.entries.find((e) => e.path === '.claude/settings.json')).toMatchObject({ action: 'conflict', reason: 'invalid-shape' });
    expect(fs.readFileSync(at(target, '.claude/settings.json'), 'utf-8')).toBe(before);
    expect(fs.existsSync(at(target, '.claude/settings.json.ais-new'))).toBe(true);
  });

  it('keeps an edited file, writes the new version beside it, and exits 2 (6.2)', async () => {
    const target = await install();
    fs.appendFileSync(at(target, 'AGENTS.md'), '\nadopter edit\n');
    commit(target);
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'applied', exitCode: 2 });
    expect(fs.readFileSync(at(target, 'AGENTS.md'), 'utf-8')).toContain('adopter edit');
    expect(fs.existsSync(at(target, 'AGENTS.md.ais-new'))).toBe(true);
    expect(doc.notices.join(' ')).toContain('AGENTS.md.ais-new');
  });

  it('leaves an identical sidecar and refuses a differing one (6.2)', async () => {
    const target = await install();
    fs.appendFileSync(at(target, 'AGENTS.md'), '\nadopter edit\n');
    commit(target);
    await apply(target);
    editManifest(target, (m) => ({ ...m, version: '0.0.1' }));
    commit(target);
    const again = await apply(target);
    expect(again).toMatchObject({ status: 'applied', exitCode: 2 });
    editManifest(target, (m) => ({ ...m, version: '0.0.1' }));
    fs.appendFileSync(at(target, 'AGENTS.md.ais-new'), 'half merged\n');
    commit(target);
    const refused = await apply(target);
    expect(refused).toMatchObject({ status: 'error', exitCode: 1, error: { code: 'SIDECAR_EXISTS' } });
    expect(fs.readFileSync(at(target, 'AGENTS.md.ais-new'), 'utf-8')).toContain('half merged');
  });

  it('removes a pristine file the new version no longer ships', async () => {
    const target = await install();
    fse.outputFileSync(at(target, '.claude/rules/retired.md'), 'retired rule\n');
    editManifest(target, (m) => ({ ...m, managedFiles: [...m.managedFiles, { path: '.claude/rules/retired.md', hash: hashRaw('retired rule\n') }] }));
    commit(target);
    const doc = await apply(target);
    expect(doc.status).toBe('applied');
    expect(fs.existsSync(at(target, '.claude/rules/retired.md'))).toBe(false);
    expect(manifestOf(target).managedFiles.some((r) => r.path === '.claude/rules/retired.md')).toBe(false);
  });

  it('refuses uncommitted changes in planned paths unless --allow-dirty (4.2)', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    const refused = await apply(target);
    expect(refused).toMatchObject({ status: 'error', error: { code: 'UNCOMMITTED_CHANGES' } });
    expect(refused.error.message).toContain('CLAUDE.md');
    expect(fs.readFileSync(at(target, 'CLAUDE.md'), 'utf-8')).toBe('older\n');
    const allowed = await apply(target, { allowDirty: true });
    expect(allowed).toMatchObject({ status: 'applied', gitSafety: 'dirty-allowed' });
  });

  it('outside a repository needs --allow-no-git (4.1)', async () => {
    const target = await install({ repo: false });
    const refused = await apply(target);
    expect(refused).toMatchObject({ status: 'error', error: { code: 'GIT_UNAVAILABLE' } });
    expect(fs.existsSync(at(target, '.ai-scaffold/backups'))).toBe(false);
    const allowed = await apply(target, { allowNoGit: true });
    expect(allowed).toMatchObject({ status: 'applied', gitSafety: 'acknowledged-no-repository' });
  });

  it('a held lock is reported and left alone (6.1, FR-52)', async () => {
    const target = await install();
    const lock = at(target, '.ai-scaffold/update.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: NOW.toISOString(), token: 'other' }));
    const doc = await apply(target);
    expect(doc).toMatchObject({ status: 'locked', exitCode: 1, lock: { liveness: 'running' } });
    expect(fs.existsSync(lock)).toBe(true);
  });

  it('completes an apply that finished but lost its marker, then is current', async () => {
    const target = await install();
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    commit(target);
    const first = await apply(target);
    fs.rmSync(at(target, `${first.backup}/complete`));
    commit(target);
    const second = await apply(target);
    expect(second).toMatchObject({ status: 'current', exitCode: 0 });
    expect(second.notices.join(' ')).toContain('completed (all-final)');
    expect(fs.existsSync(at(target, `${first.backup}/complete`))).toBe(true);
  });
});

describe('unowned settings.json is never written (#159 review)', { timeout: 120_000 }, () => {
  it('a settings.json recorded as unowned keeps its removed deny rule through preview and apply', async () => {
    const target = await install();
    const file = at(target, '.claude/settings.json');
    const settings = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const removed = settings.permissions.deny[0];
    settings.permissions.deny = settings.permissions.deny.slice(1);
    fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}
`);
    editManifest(target, (m) => ({
      ...m, version: '0.0.1',
      managedFiles: m.managedFiles.map((r) => (r.path === '.claude/settings.json' ? { ...r, class: 'unowned' } : r)),
    }));
    commit(target);
    const before = fs.readFileSync(file, 'utf-8');
    const doc = await apply(target);
    expect(doc.entries.find((e) => e.path === '.claude/settings.json').action).toBe('skip-unowned');
    expect(doc.settings).toBeNull();
    expect(doc.status).toBe('applied');
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8')).permissions.deny).not.toContain(removed);
  });
});

describe('apply writes only over the state the plan decided on (P1, #159 review)', { timeout: 120_000 }, () => {
  const io = defaultIo({ ...nativeFs, readdir: (p, o) => fs.promises.readdir(p, o) });

  async function planned(target) {
    const root = await resolveProjectRoot(target);
    const { manifest, observed } = await readManifestObserved(root, io);
    const versions = checkVersions({ installed: manifest.version, cli: NEXT });
    const computed = await computePlan({ root, manifest, versions, flags: checkFlags({}), io, today: NOW });
    return { root, computed, versions, manifestObserved: observed };
  }

  async function buildThenApply(plan) {
    const { ops, dirs } = await buildApplyOps({ ...plan, now: NOW });
    try {
      return await applyTransaction({ root: plan.root, ops, dirs, now: NOW });
    } catch (error) {
      return { status: 'refused', error: { code: error.code } };
    }
  }

  it('the reviewer repro: a pristine file edited after planning keeps the edit', async () => {
    const target = await install({ repo: false });
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    const plan = await planned(target);
    expect(plan.computed.entries.find((e) => e.path === 'CLAUDE.md').action).toBe('replace');
    fs.writeFileSync(at(target, 'CLAUDE.md'), 'edited after planning\n');
    const result = await buildThenApply(plan);
    expect(result.status).not.toBe('applied');
    expect(fs.readFileSync(at(target, 'CLAUDE.md'), 'utf-8')).toBe('edited after planning\n');
  });

  it('settings.json edited after planning is not overwritten by the earlier merge', async () => {
    const target = await install({ repo: false });
    editManifest(target, (m) => ({ ...m, version: '0.0.1' }));
    const file = at(target, '.claude/settings.json');
    const settings = JSON.parse(fs.readFileSync(file, 'utf-8'));
    settings.permissions.deny = settings.permissions.deny.slice(1);
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
    const plan = await planned(target);
    fs.writeFileSync(file, `${JSON.stringify({ ...settings, mine: true }, null, 2)}\n`);
    const edited = fs.readFileSync(file, 'utf-8');
    const result = await buildThenApply(plan);
    expect(result.status).not.toBe('applied');
    expect(fs.readFileSync(file, 'utf-8')).toBe(edited);
  });

  it('a file created where the plan saw none is not overwritten by an add', async () => {
    const target = await install({ repo: false });
    fs.rmSync(at(target, 'AGENTS.md'));
    editManifest(target, (m) => ({ ...m, version: '0.0.1', managedFiles: m.managedFiles.filter((r) => r.path !== 'AGENTS.md') }));
    const plan = await planned(target);
    expect(plan.computed.entries.find((e) => e.path === 'AGENTS.md').action).toBe('add');
    fs.writeFileSync(at(target, 'AGENTS.md'), 'created after planning\n');
    const result = await buildThenApply(plan);
    expect(result.status).not.toBe('applied');
    expect(fs.readFileSync(at(target, 'AGENTS.md'), 'utf-8')).toBe('created after planning\n');
  });

  it('a manifest edited after planning is not overwritten', async () => {
    const target = await install({ repo: false });
    makeOlderPristine(target, 'CLAUDE.md', 'older\n');
    const plan = await planned(target);
    fs.appendFileSync(at(target, '.ai-scaffold.json'), '\n');
    const edited = fs.readFileSync(at(target, '.ai-scaffold.json'), 'utf-8');
    const result = await buildThenApply(plan);
    expect(result.status).not.toBe('applied');
    expect(fs.readFileSync(at(target, '.ai-scaffold.json'), 'utf-8')).toBe(edited);
    expect(fs.readFileSync(at(target, 'CLAUDE.md'), 'utf-8')).toBe('older\n');
  });

  it('a file planned for removal and edited after planning is kept (backend review)', async () => {
    const target = await install({ repo: false });
    fse.outputFileSync(at(target, '.claude/rules/retired.md'), 'retired rule\n');
    editManifest(target, (m) => ({ ...m, managedFiles: [...m.managedFiles, { path: '.claude/rules/retired.md', hash: hashRaw('retired rule\n') }] }));
    const plan = await planned(target);
    expect(plan.computed.entries.find((e) => e.path === '.claude/rules/retired.md').action).toBe('remove');
    fs.writeFileSync(at(target, '.claude/rules/retired.md'), 'kept by the adopter\n');
    const result = await buildThenApply(plan);
    expect(result.status).not.toBe('applied');
    expect(fs.readFileSync(at(target, '.claude/rules/retired.md'), 'utf-8')).toBe('kept by the adopter\n');
  });

  it('a sidecar that appears after the operations are built is not overwritten (backend review)', async () => {
    const target = await install({ repo: false });
    fs.appendFileSync(at(target, 'AGENTS.md'), '\nadopter edit\n');
    const plan = await planned(target);
    const { ops, dirs } = await buildApplyOps({ ...plan, now: NOW });
    expect(ops.some((op) => op.rel === 'AGENTS.md.ais-new')).toBe(true);
    fs.writeFileSync(at(target, 'AGENTS.md.ais-new'), 'the adopter got here first\n');
    const result = await applyTransaction({ root: plan.root, ops, dirs, now: NOW });
    expect(result).toMatchObject({ status: 'rolled-back', error: { code: 'CONCURRENT_EDIT' } });
    expect(fs.readFileSync(at(target, 'AGENTS.md.ais-new'), 'utf-8')).toBe('the adopter got here first\n');
  });
});

describe('a value on a switch is refused before anything runs (#159 review)', { timeout: 180_000 }, () => {
  const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'ai-scaffold.js');

  it.each([
    ['--apply=foo', 'ais-update-apply/1'],
    ['--apply=false', 'ais-update-apply/1'],
    ['--allow-no-git=yes --apply', 'ais-update-apply/1'],
    ['--allow-dirty=1 --apply', 'ais-update-apply/1'],
    ['--dry-run=no', 'ais-update-preview/1'],
    ['--json=x', 'ais-update-preview/1'],
  ])('%s exits 1 with INVALID_OPTION and writes nothing', async (flags, schema) => {
    const target = await install({ repo: false });
    editManifest(target, (m) => ({ ...m, version: '0.0.1' }));
    const before = tree(target);
    const child = spawnSync(process.execPath, [BIN, 'update', target, ...flags.split(' '), '--json'], { encoding: 'utf-8', timeout: 120_000 });
    expect(child.status).toBe(1);
    const doc = JSON.parse(child.stdout);
    expect(doc).toMatchObject({ schema, status: 'error', exitCode: 1, error: { code: 'INVALID_OPTION' } });
    expect(doc.error.message).toContain(flags.split(' ')[0].split('=')[0]);
    expect(tree(target)).toEqual(before);
    expect(fs.existsSync(at(target, '.ai-scaffold/backups'))).toBe(false);
  });
});
