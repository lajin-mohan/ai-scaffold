/**
 * Item 25 criterion 7.3 (FR-49): a full `ais update --apply` on a generated
 * project writes only inside its journaled set. Two layers: every mutating
 * call through fsApi is recorded, and the whole tree is diffed, so a write
 * that bypasses fsApi is caught too.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { hashRaw } from '../cli/core/hashing.js';
import { runApply } from '../cli/core/update-apply-run.js';
import { nativeFs } from '../cli/core/write-ops.js';
import { resolveProjectRoot } from '../cli/core/containment.js';

const GIT = resolveOnPath('git');
const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const LOCK = '.ai-scaffold/update.lock';
const BACKUPS = '.ai-scaffold/backups';
let tmpDir;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
}

const at = (root, rel) => path.join(root, ...rel.split('/'));
const readJson = (root, rel) => JSON.parse(fs.readFileSync(at(root, rel), 'utf-8'));
const writeJson = (root, rel, value) => fs.writeFileSync(at(root, rel), `${JSON.stringify(value, null, 2)}\n`);

/** Every path under root except .git, files as hashes and directories as 'dir'. */
function tree(root) {
  const out = new Map();
  const walk = (rel) => {
    for (const entry of fs.readdirSync(at(root, rel || '.'), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.git') continue;
      if (entry.isDirectory()) {
        out.set(child, 'dir');
        walk(child);
      } else {
        out.set(child, hashRaw(fs.readFileSync(at(root, child))));
      }
    }
  };
  walk('');
  return out;
}

function changedPaths(before, after) {
  const changed = [];
  for (const [rel, value] of after) if (before.get(rel) !== value) changed.push(rel);
  for (const rel of before.keys()) if (!after.has(rel)) changed.push(rel);
  return changed;
}

/** A project whose update replaces, adds into a new directory, removes, conflicts and merges settings. */
async function busyProject() {
  // The native real path, as the CLI resolves it, so recorded paths compare.
  const root = await resolveProjectRoot(fse.mkdtempSync(path.join(tmpDir, 'scope-')));
  const bootstrap = resolveWithDefaults({ projectName: 'scope', purpose: 'Scope', ownerEmail: 's@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), root, {});
  await copyFiles(plan, bootstrap, { targetDir: root, yes: true, now: NOW, installMode: 'create' });
  const manifest = readJson(root, '.ai-scaffold.json');
  const records = new Map(manifest.managedFiles.map((r) => [r.path, r]));

  fs.writeFileSync(at(root, 'CLAUDE.md'), 'older claude\n');
  records.set('CLAUDE.md', { ...records.get('CLAUDE.md'), hash: hashRaw('older claude\n') });
  fs.appendFileSync(at(root, 'AGENTS.md'), '\nadopter edit\n');
  fse.outputFileSync(at(root, '.claude/rules/retired.md'), 'retired\n');
  records.set('.claude/rules/retired.md', { path: '.claude/rules/retired.md', hash: hashRaw('retired\n'), class: 'managed' });
  const addDir = path.posix.dirname([...records.keys()].find((rel) => rel.startsWith('.claude/hooks/')));
  for (const rel of [...records.keys()].filter((r) => path.posix.dirname(r) === addDir)) records.delete(rel);
  fs.rmSync(at(root, addDir), { recursive: true });
  const settings = readJson(root, '.claude/settings.json');
  settings.permissions.deny = settings.permissions.deny.slice(1);
  writeJson(root, '.claude/settings.json', settings);

  writeJson(root, '.ai-scaffold.json', { ...manifest, version: '0.0.1', managedFiles: [...records.values()] });
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 't@example.com');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '--no-verify', '-m', 'state');
  return { root, addDir };
}

function recordingFs(root, touched) {
  const record = (p) => touched.push(path.relative(root, p).split(path.sep).join('/'));
  return {
    ...nativeFs,
    readdir: (p, o) => fs.promises.readdir(p, o),
    open: async (p, flags) => { if (/[wa+x]/.test(String(flags))) record(p); return nativeFs.open(p, flags); },
    rename: async (from, to) => { record(from); record(to); return nativeFs.rename(from, to); },
    unlink: async (p) => { record(p); return nativeFs.unlink(p); },
    mkdir: async (p) => { record(p); return nativeFs.mkdir(p); },
    rmdir: async (p) => { record(p); return nativeFs.rmdir(p); },
  };
}

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-write-scope-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe.runIf(GIT)('a full CLI apply writes only inside its journaled set (7.3, FR-49)', { timeout: 120_000 }, () => {
  it('every recorded write and every changed path is journaled, the lock or the backup', async () => {
    const { root, addDir } = await busyProject();
    const before = tree(root);
    const touched = [];
    const doc = await runApply({
      target: root, options: { apply: true }, cliVersion: '99.0.0', today: NOW, now: NOW, fsApi: recordingFs(root, touched),
    });
    expect(doc).toMatchObject({ status: 'applied', exitCode: 2 });
    const actions = new Set(doc.entries.map((e) => e.action));
    for (const action of ['replace', 'add', 'remove', 'conflict', 'merge']) expect(actions).toContain(action);

    const journal = readJson(root, `${doc.backup}/journal.json`);
    const journaled = new Set([...journal.dirs, ...journal.entries.flatMap((e) => [e.rel, e.tmp, e.rollbackTmp])]);
    expect(journal.dirs).toContain(addDir);
    expect(journaled).toContain('AGENTS.md.ais-new');
    const allowed = (rel) => journaled.has(rel) || rel === LOCK || rel === BACKUPS || rel.startsWith(`${BACKUPS}/`);

    expect(touched.filter((rel) => !allowed(rel))).toEqual([]);
    const changed = changedPaths(before, tree(root));
    expect(changed.filter((rel) => !allowed(rel))).toEqual([]);
    expect(changed).toEqual(expect.arrayContaining(['CLAUDE.md', 'AGENTS.md.ais-new', '.claude/rules/retired.md', '.claude/settings.json', '.ai-scaffold.json', addDir]));
  });
});
