/**
 * Item 25 slice 3: preview orchestration (FR-44 check order, FR-45 document,
 * FR-46) and the report text.
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
import { emptyDocument, runPreview } from '../cli/core/update-preview.js';
import { formatReport } from '../cli/core/update-report.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const NEXT = '99.0.0';
const FIELDS = Object.keys(emptyDocument()).sort();
let tmpDir;
let installed;

async function install(name, { mode = 'create' } = {}) {
  const target = path.join(tmpDir, name);
  const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'Preview', ownerEmail: 'p@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, { existingTarget: mode === 'init' });
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: mode });
  installed = (await fse.readJson(path.join(target, '.ai-scaffold.json'))).version;
  return target;
}

function preview(target, options = {}, extra = {}) {
  return runPreview({ target, options, cliVersion: NEXT, today: NOW, ...extra });
}

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-preview-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe('the FR-45 document', { timeout: 60_000 }, () => {
  it('a planned preview has every field, sorted entries and no conflicts on an untouched project', async () => {
    const doc = await preview(await install('planned'));
    expect(Object.keys(doc).sort()).toEqual(FIELDS);
    expect(doc).toMatchObject({
      schema: 'ais-update-preview/1', status: 'planned', exitCode: 0, error: null,
      from: installed, to: NEXT, profile: 'node', installMode: 'create', hashed: true,
      gitSafety: 'not-assessed', applyAvailable: false, migrations: ['schema-2'],
    });
    expect(doc.settings.base).toBe('derived');
    expect(doc.entries.every((e) => Object.keys(e).sort().join() === 'action,class,path,reason')).toBe(true);
    expect(JSON.stringify(doc)).not.toMatch(/"permissions"|"hooks"/);
  });

  it('an edited settings.json without a recorded base is unknown, never empty', async () => {
    const target = await install('edited-settings');
    const file = path.join(target, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(file, 'utf-8'));
    settings.permissions.deny = settings.permissions.deny.slice(1);
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
    const doc = await preview(target);
    expect(doc.settings.base).toBe('unknown');
    expect(doc.settings.added).toEqual([]);
    expect(doc.settings.missingNoBase).toHaveLength(1);
    expect(doc.notices.join(' ')).toContain('deliberate removals cannot be determined');
  });

  it('a conflict exits 2', async () => {
    const target = await install('conflict');
    fs.appendFileSync(path.join(target, 'CLAUDE.md'), '\nmine\n');
    const doc = await preview(target);
    expect(doc).toMatchObject({ status: 'planned', exitCode: 2 });
    expect(doc.counts.conflict).toBe(1);
  });

  it('invalid settings.json is a conflict, never merged (FR-24)', async () => {
    const target = await install('bad-settings');
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'), '{ not json');
    const doc = await preview(target);
    expect(doc.entries.find((e) => e.path === '.claude/settings.json')).toMatchObject({ action: 'conflict', reason: 'invalid-json' });
    expect(doc.settings).toBeNull();
    expect(doc.exitCode).toBe(2);
  });
});

describe('FR-44 check order', { timeout: 60_000 }, () => {
  it('current: already at the CLI version exits 0', async () => {
    const target = await install('current');
    expect(await preview(target, {}, { cliVersion: installed })).toMatchObject({ status: 'current', exitCode: 0, entries: null });
  });

  it('exception flags at the installed version fail instead of being discarded', async () => {
    const target = await install('current-flags');
    const doc = await preview(target, { keepRemoved: 'Read(.env)' }, { cliVersion: installed });
    expect(doc.error.code).toBe('EXCEPTIONS_AT_CURRENT');
  });

  it('a lock wins over a journal, and no backup is read while locked', async () => {
    const target = await install('locked');
    fse.outputFileSync(path.join(target, '.ai-scaffold', 'update.lock'), '123');
    fse.outputFileSync(path.join(target, '.ai-scaffold', 'backups', 'b1', 'journal.json'), '{}');
    const reads = [];
    const spyFs = {
      lstat: (p) => fs.promises.lstat(p),
      realpath: (p) => fs.promises.realpath(p),
      readFile: (p, e) => { reads.push(p); return fs.promises.readFile(p, e); },
      readdir: (p, o) => { reads.push(p); return fs.promises.readdir(p, o); },
    };
    const doc = await preview(target, {}, { fsApi: spyFs });
    expect(doc).toMatchObject({ status: 'locked', exitCode: 1, entries: null });
    expect(reads.some((p) => p.includes('backups'))).toBe(false);
  });

  it.each([
    ['readable', '{"to":"x"}'],
    ['malformed', '{ broken'],
    ['missing', null],
  ])('an unmarked backup is interrupted (journal %s)', async (journal, content) => {
    const target = await install(`interrupted-${journal}`);
    const dir = path.join(target, '.ai-scaffold', 'backups', '2026-10-16T00-00-00Z');
    fse.ensureDirSync(dir);
    if (content !== null) fs.writeFileSync(path.join(dir, 'journal.json'), content);
    const doc = await preview(target);
    expect(doc).toMatchObject({ status: 'interrupted', exitCode: 1, entries: null });
    expect(doc.notices[0]).toContain(`journal ${journal}`);
  });

  it('a completed backup is not an interruption', async () => {
    const target = await install('completed');
    fse.outputFileSync(path.join(target, '.ai-scaffold', 'backups', 'b1', 'complete'), '');
    expect((await preview(target)).status).toBe('planned');
  });
});

describe('errors keep the full document', { timeout: 60_000 }, () => {
  it.each([
    ['FLAG_REMOVED', { force: true }],
    ['APPLY_UNAVAILABLE', { apply: true }],
    ['UNKNOWN_OPTION', { bogus: true }],
    ['TARGET_VERSION_MISMATCH', { targetVersion: '1.2.3' }],
    ['EXCEPTION_UNKNOWN_RULE', { keepRemoved: 'not-a-rule' }],
  ])('%s', async (code, options) => {
    const doc = await preview(await install(`err-${code}`), options);
    expect(Object.keys(doc).sort()).toEqual(FIELDS);
    expect(doc).toMatchObject({ status: 'error', exitCode: 1, error: { code } });
  });

  it('a downgrade fails', async () => {
    const doc = await preview(await install('downgrade'), {}, { cliVersion: '0.0.1' });
    expect(doc.error.code).toBe('DOWNGRADE');
  });

  it('a missing project, a missing manifest and an invalid manifest fail with nulls', async () => {
    const missing = await preview(path.join(tmpDir, 'nope'));
    expect(missing).toMatchObject({ error: { code: 'TARGET_NOT_FOUND' }, from: null, profile: null });
    const empty = path.join(tmpDir, 'empty');
    fse.ensureDirSync(empty);
    expect((await preview(empty)).error.code).toBe('MANIFEST_MISSING');
    fs.writeFileSync(path.join(empty, '.ai-scaffold.json'), '[1]');
    expect((await preview(empty)).error.code).toBe('MANIFEST_INVALID');
  });

  it('a manifest reached through a link is refused before it is read', async () => {
    const real = await install('real');
    const linked = path.join(tmpDir, 'linked-project');
    fse.ensureDirSync(linked);
    const manifestDir = path.join(tmpDir, 'manifest-dir');
    fse.outputFileSync(path.join(manifestDir, 'x'), '');
    fs.symlinkSync(real, path.join(linked, '.ai-scaffold.json'), process.platform === 'win32' ? 'junction' : 'dir');
    expect((await preview(linked)).error.code).toBe('MANIFEST_UNSAFE');
  });
});

describe('formatReport', { timeout: 60_000 }, () => {
  it('never suggests applying and says git safety was not assessed', async () => {
    const target = await install('report');
    fs.appendFileSync(path.join(target, 'CLAUDE.md'), '\nmine\n');
    const text = formatReport(await preview(target));
    expect(text).toContain('conflict: 1');
    expect(text).toContain('git safety was not assessed');
    expect(text).toContain('applying is not available in this version');
    expect(text).not.toMatch(/--apply|ais update --apply/);
  });

  it('reports errors with their message', async () => {
    const text = formatReport(await preview(await install('report-err'), { force: true }));
    expect(text).toContain('--force was removed in 0.17.0');
  });
});
