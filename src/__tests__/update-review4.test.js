/**
 * Item 25 slice 3, review of #158: path identity in the planner, rejected
 * settings targets, and migration defaults recorded in defaultedValues.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { runPreview } from '../cli/core/update-preview.js';
import { runMigrations } from '../cli/core/migrations/index.js';
import { buildManifestData } from '../cli/core/manifest.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const CASE_INSENSITIVE = process.platform === 'win32' || process.platform === 'darwin';
let tmpDir;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-review4-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

async function install(name) {
  const target = path.join(tmpDir, name);
  const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'Review', ownerEmail: 'r@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  return target;
}

function editManifest(target, change) {
  const file = path.join(target, '.ai-scaffold.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf-8'));
  fs.writeFileSync(file, JSON.stringify({ ...change(manifest), version: '0.0.1' }, null, 2));
}

function preview(target) {
  return runPreview({ target, cliVersion: '99.0.0', today: NOW });
}

function respell(target, from, to) {
  editManifest(target, (m) => ({ ...m, managedFiles: m.managedFiles.map((r) => (r.path === from ? { ...r, path: to } : r)) }));
}

describe('one file, one entry: path identity is canonical', { timeout: 60_000 }, () => {
  it.each([
    ['./CLAUDE.md'],
    ['.claude\\rules\\security-rules.md'],
    ['.claude//rules/./security-rules.md'],
  ])('a record spelled %s plans as the canonical file, once', async (spelling) => {
    const target = await install(`spell-${spelling.replace(/[^a-z]+/gi, '-')}`);
    const canonical = path.posix.normalize(spelling.replace(/\\/g, '/'));
    respell(target, canonical, spelling);
    const doc = await preview(target);
    expect(doc.entries.filter((e) => e.path === canonical)).toHaveLength(1);
    expect(doc.entries.find((e) => e.path === canonical).action).toBe('unchanged');
    expect(doc.entries.some((e) => e.path === spelling && spelling !== canonical)).toBe(false);
  });

  it('two records for the same file are rejected, not resolved by picking one', async () => {
    const target = await install('duplicate-records');
    editManifest(target, (m) => {
      const record = m.managedFiles.find((r) => r.path === 'CLAUDE.md');
      return { ...m, managedFiles: [...m.managedFiles, { ...record, path: './CLAUDE.md', hash: 'sha256:00' }] };
    });
    const doc = await preview(target);
    expect(doc.entries.filter((e) => e.path === 'CLAUDE.md')).toEqual([
      { path: 'CLAUDE.md', class: 'managed', action: 'rejected', reason: 'duplicate-record' },
    ]);
    expect(doc.exitCode).toBe(1);
  });

  it.runIf(CASE_INSENSITIVE)('a case alias is the same file on a case-insensitive file system', async () => {
    const target = await install('case-alias');
    respell(target, 'CLAUDE.md', 'claude.md');
    const doc = await preview(target);
    expect(doc.entries.filter((e) => e.path.toLowerCase() === 'claude.md')).toHaveLength(1);
    expect(doc.entries.find((e) => e.path === 'CLAUDE.md').action).toBe('unchanged');
  });
});

describe('a settings target that cannot be read is rejected, exit 1', { timeout: 60_000 }, () => {
  it('a directory at .claude/settings.json', async () => {
    const target = await install('settings-dir');
    editManifest(target, (m) => m);
    fs.rmSync(path.join(target, '.claude', 'settings.json'));
    fs.mkdirSync(path.join(target, '.claude', 'settings.json'));
    const doc = await preview(target);
    expect(doc.entries.find((e) => e.path === '.claude/settings.json')).toMatchObject({ action: 'rejected', reason: 'not-a-file' });
    expect(doc.settings).toBeNull();
    expect(doc.exitCode).toBe(1);
  });

  it('an oversized settings.json', async () => {
    const target = await install('settings-big');
    editManifest(target, (m) => m);
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'), Buffer.alloc(5 * 1024 * 1024 + 1, 0x20));
    const doc = await preview(target);
    expect(doc.entries.find((e) => e.path === '.claude/settings.json')).toMatchObject({ action: 'rejected', reason: 'too-large' });
    expect(doc.exitCode).toBe(1);
  });

  it('a settings.json that changes identity between check and open', async () => {
    const target = await install('settings-swap');
    editManifest(target, (m) => m);
    const real = {
      lstat: (p, o) => fs.promises.lstat(p, o),
      realpath: (p) => fs.promises.realpath(p),
      readdir: (p, o) => fs.promises.readdir(p, o),
      open: (p, f) => fs.promises.open(p, f),
    };
    const swapping = {
      ...real,
      lstat: async (p, o) => {
        const stat = await fs.promises.lstat(p, o);
        return o?.bigint && p.endsWith('settings.json') ? { ...stat, ino: stat.ino + 1n } : stat;
      },
    };
    const doc = await runPreview({ target, cliVersion: '99.0.0', today: NOW, fsApi: swapping });
    expect(doc.entries.find((e) => e.path === '.claude/settings.json')).toMatchObject({ action: 'rejected', reason: 'changed' });
    expect(doc.exitCode).toBe(1);
  });
});

describe('migration defaults are recorded in defaultedValues (FR-05)', () => {
  function manifestWithout(fields) {
    const { resolved } = resolveWithDefaults({ projectName: 'd', purpose: 'D', ownerEmail: 'd@example.com', profile: 'node' });
    const manifest = JSON.parse(JSON.stringify(buildManifestData({ ...resolved, defaulted: [] }, { now: NOW })));
    for (const [section, key] of fields) delete manifest[section][key];
    return manifest;
  }

  it('each supplied default is added once', () => {
    const input = manifestWithout([['project', 'kind'], ['commands', 'lint']]);
    delete input.requirements;
    const { manifest } = runMigrations(input, { from: '0.0.1', to: '99.0.0', settingsPristine: null });
    expect(manifest.project.kind).toBe('saas');
    expect(manifest.defaultedValues).toEqual(['projectType', 'requirementsSource', 'lintCommand', 'requirementsPath']);
  });

  it('keeps earlier entries and never duplicates on repeated migration', () => {
    const input = manifestWithout([['project', 'kind']]);
    input.defaultedValues = ['purpose', 'projectType'];
    const once = runMigrations(input, { from: '0.0.1', to: '99.0.0', settingsPristine: null }).manifest;
    const twice = runMigrations({ ...once, manifestSchema: 1 }, { from: '0.0.1', to: '99.0.0', settingsPristine: null }).manifest;
    expect(once.defaultedValues).toEqual(['purpose', 'projectType']);
    expect(twice.defaultedValues).toEqual(['purpose', 'projectType']);
  });
});
