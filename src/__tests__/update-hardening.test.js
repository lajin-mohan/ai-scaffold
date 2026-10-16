/**
 * Item 25 slice 3: regressions for the security and backend review findings
 * (Windows path aliases, non-file reads, size caps, check-to-read identity,
 * manifest-supplied classes, malformed manifests, terminal escapes).
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
import { normaliseRel, readContained, resolveProjectRoot } from '../cli/core/containment.js';
import { classifyPath } from '../cli/core/ownership.js';
import { validateManifest } from '../cli/core/update-manifest.js';
import { runPreview } from '../cli/core/update-preview.js';
import { formatReport } from '../cli/core/update-report.js';
import { hashRaw } from '../cli/core/hashing.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
let tmpDir;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-harden-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

async function install(name) {
  const target = path.join(tmpDir, name);
  const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'Harden', ownerEmail: 'h@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  return target;
}

function editManifest(target, change) {
  const file = path.join(target, '.ai-scaffold.json');
  fs.writeFileSync(file, JSON.stringify(change(JSON.parse(fs.readFileSync(file, 'utf-8'))), null, 2));
}

describe('Windows path aliases are rejected lexically', () => {
  it.each([
    '.claude/memory::$INDEX_ALLOCATION/notes.md', 'CLAUDE.md:stream', '.claude/MEMORY~1/x',
    'CLAUDE.md.', '.claude/rules /a.md', 'CON', 'nul.txt', '.claude/com1/x', 'LPT9.md',
  ])('%s', (rel) => {
    expect(() => normaliseRel(rel)).toThrow(TypeError);
  });

  it('ordinary names still pass', () => {
    expect(normaliseRel('.claude/commands/console.md')).toBe('.claude/commands/console.md');
    expect(normaliseRel('tasks/todo/.gitkeep')).toBe('tasks/todo/.gitkeep');
  });

  it.runIf(process.platform === 'win32' || process.platform === 'darwin')(
    'case-insensitive file systems classify by folded case',
    () => {
      expect(classifyPath('.claude/MEMORY/notes.md', { installMode: 'create', recorded: true })).toBe('user-data');
      expect(classifyPath('TASKS/LESSONS.md', { installMode: 'create', recorded: true })).toBe('user-data');
    },
  );
});

describe('readContained', () => {
  let root;

  beforeAll(async () => {
    const dir = path.join(tmpDir, 'reads');
    await fse.outputFile(path.join(dir, 'small.md'), 'abc');
    await fse.ensureDir(path.join(dir, 'a-dir'));
    root = await resolveProjectRoot(dir);
  });

  it('reads a regular file', async () => {
    const read = await readContained(root, 'small.md', { maxBytes: 10 });
    expect(read.data.toString()).toBe('abc');
  });

  it('reports a missing file as absent', async () => {
    expect(await readContained(root, 'nope.md', { maxBytes: 10 })).toMatchObject({ ok: true, exists: false });
  });

  it('refuses a directory and an oversized file without reading', async () => {
    expect(await readContained(root, 'a-dir', { maxBytes: 10 })).toMatchObject({ ok: false, reason: 'not-a-file' });
    expect(await readContained(root, 'small.md', { maxBytes: 2 })).toMatchObject({ ok: false, reason: 'too-large' });
  });

  it('refuses when the opened file is not the checked file', async () => {
    const real = { lstat: fs.promises.lstat, realpath: fs.promises.realpath, open: fs.promises.open };
    let calls = 0;
    const swapped = {
      ...real,
      lstat: async (p, o) => {
        const stat = await fs.promises.lstat(p, o);
        calls++;
        return o?.bigint ? { ...stat, ino: stat.ino + 1n, dev: stat.dev } : stat;
      },
    };
    expect(await readContained(root, 'small.md', { maxBytes: 10, fsApi: swapped })).toMatchObject({ ok: false, reason: 'changed' });
    expect(calls).toBeGreaterThan(0);
  });
});

describe('manifest validation (MANIFEST_INVALID, never INTERNAL)', () => {
  const base = { version: '0.16.1', profile: 'node' };
  it.each([
    ['install as a string', { ...base, install: 'create' }],
    ['an unknown install mode', { ...base, install: { mode: 'create;' } }],
    ['a null record', { ...base, managedFiles: [null] }],
    ['a record without a string path', { ...base, managedFiles: [{ path: 1, hash: 'x' }] }],
    ['too many records', { ...base, managedFiles: Array.from({ length: 10_001 }, (_, i) => ({ path: `f${i}`, hash: 'x' })) }],
    ['a non-object section', { ...base, settingsBase: [] }],
  ])('%s', (_label, manifest) => {
    expect(() => validateManifest(manifest)).toThrow(/is not valid/);
  });
});

describe('the planner on hostile manifests', { timeout: 60_000 }, () => {
  it('a stored class can restrict but never unlock a read', async () => {
    const target = await install('stored-class');
    editManifest(target, (m) => ({
      ...m,
      version: '0.0.1',
      managedFiles: [
        ...m.managedFiles.map((r) => (r.path === 'CLAUDE.md' ? { ...r, class: 'user-data' } : r)),
        { path: 'tasks/lessons.md', hash: hashRaw('guess'), class: 'managed' },
        { path: '.env.local', hash: hashRaw('guess'), class: 'managed' },
      ].filter((r, i, all) => all.findIndex((x) => x.path === r.path) === i),
    }));
    const doc = await runPreview({ target, cliVersion: '99.0.0', today: NOW });
    const by = (rel) => doc.entries.find((e) => e.path === rel);
    expect(by('tasks/lessons.md')).toMatchObject({ class: 'user-data', action: 'skip-user-data' });
    expect(by('.env.local')).toMatchObject({ class: 'unowned', action: 'skip-unowned' });
    expect(by('CLAUDE.md')).toMatchObject({ class: 'user-data', action: 'skip-user-data' });
  });

  it('a record path escaping the project becomes a rejected entry and exits 1', async () => {
    const target = await install('escaping-record');
    editManifest(target, (m) => ({ ...m, version: '0.0.1', managedFiles: [...m.managedFiles, { path: '../outside.md', hash: 'x' }] }));
    const doc = await runPreview({ target, cliVersion: '99.0.0', today: NOW });
    expect(doc.entries.find((e) => e.path === '../outside.md')).toMatchObject({ action: 'rejected', reason: 'outside' });
    expect(doc.exitCode).toBe(1);
  });

  it('an oversized managed file is rejected, not read', async () => {
    const target = await install('oversized');
    editManifest(target, (m) => ({ ...m, version: '0.0.1' }));
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), Buffer.alloc(10 * 1024 * 1024 + 1, 0x61));
    const doc = await runPreview({ target, cliVersion: '99.0.0', today: NOW });
    expect(doc.entries.find((e) => e.path === 'CLAUDE.md')).toMatchObject({ action: 'rejected', reason: 'too-large' });
  });

  it('a malformed manifest is MANIFEST_INVALID', async () => {
    const target = await install('malformed');
    editManifest(target, (m) => ({ ...m, install: 'create' }));
    expect((await runPreview({ target, cliVersion: '99.0.0' })).error.code).toBe('MANIFEST_INVALID');
  });

  it('a --target-version without a version is INVALID_OPTION', async () => {
    const target = await install('bad-target');
    expect((await runPreview({ target, options: { targetVersion: true }, cliVersion: '99.0.0' })).error.code).toBe('INVALID_OPTION');
  });
});

describe('human report escapes terminal control sequences', () => {
  it('shows escape and newline characters escaped', () => {
    const doc = {
      status: 'planned', exitCode: 2, from: '0.1.0', to: '0.2.0', profile: 'node\u001b[2J', installMode: 'create',
      entries: [{ path: 'CLAUDE.md\u001b]8;;http://x\u0007', class: 'managed', action: 'conflict', reason: 'edited' }],
      counts: { conflict: 1 }, settings: null, notices: ['line\nbreak'],
    };
    const text = formatReport(doc);
    expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/); // eslint-disable-line no-control-regex
    expect(text).toContain('node\\x1b[2J');
    expect(text).toContain('line\\x0abreak');
  });
});
