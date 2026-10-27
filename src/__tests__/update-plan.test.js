/**
 * Item 25 slice 3: the integrated planner (HLD §4, FR-03, FR-06 to FR-11,
 * FR-42, FR-43) on real generated projects.
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { hashRaw, recordFor } from '../cli/core/hashing.js';
import { checkContained, readContained, resolveProjectRoot } from '../cli/core/containment.js';
import { runMigrations } from '../cli/core/migrations/index.js';
import { renderClock, renderManagedSet } from '../cli/core/update-render.js';
import { buildUpdatePlan, managedAction } from '../cli/core/update-plan.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const B = (text) => Buffer.from(text);

describe('managedAction: HLD §4 rows', () => {
  const R = recordFor('old\n');
  it.each([
    ['1 unchanged', { current: B('new\n'), record: R, render: B('new\n') }, 'unchanged'],
    ['2 replace', { current: B('old\n'), record: R, render: B('new\n') }, 'replace'],
    ['2 replace (CRLF checkout)', { current: B('old\r\n'), record: R, render: B('new\n') }, 'replace'],
    ['3 conflict', { current: B('edited\n'), record: R, render: B('new\n') }, 'conflict'],
    ['4 user-deleted', { current: null, record: R, render: B('new\n') }, 'user-deleted'],
    ['5 add', { current: null, record: undefined, render: B('new\n') }, 'add'],
    ['6 conflict (unrecorded)', { current: B('mine\n'), record: undefined, render: B('new\n') }, 'conflict'],
    ['7 remove', { current: B('old\n'), record: R, render: undefined }, 'remove'],
    ['8 orphan-kept', { current: B('edited\n'), record: R, render: undefined }, 'orphan-kept'],
    ['9 drop-record', { current: null, record: R, render: undefined }, 'drop-record'],
  ])('row %s', (_row, input, action) => {
    expect(managedAction(input).action).toBe(action);
  });

  it('records the new render after a conflict (B3) and drops removed records', () => {
    expect(managedAction({ current: B('edited\n'), record: R, render: B('new\n') }).recordAfter).toBe(hashRaw('new\n'));
    expect(managedAction({ current: B('old\n'), record: R, render: undefined }).recordAfter).toBe('drop');
  });

  it('explains a legacy CRLF record that cannot prove the LF direction', () => {
    const legacy = { hash: hashRaw('a\r\n') };
    expect(managedAction({ current: B('a\n'), record: legacy, render: B('b\r\n') }).reason).toBe('legacy-crlf-unprovable');
  });
});

describe('renderClock', () => {
  it.each([
    [{ installedAt: '2026-01-02' }, 'installedAt'],
    [{ installedAt: 'bad', bootstrapCompletedAt: '2026-01-02' }, 'bootstrapCompletedAt'],
    [{ updatedAt: '2026-01-02' }, 'updatedAt'],
    [{}, 'today'],
  ])('%j uses %s', (manifest, source) => {
    expect(renderClock(manifest, NOW).source).toBe(source);
  });
});

describe('buildUpdatePlan on generated projects', { timeout: 60_000 }, () => {
  let tmpDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-plan-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fs.remove(tmpDir);
  });

  async function install(name, { profile = 'node', mode = 'create', seed } = {}) {
    const target = path.join(tmpDir, name);
    if (seed) await seed(target);
    const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'Plan', ownerEmail: 'p@example.com', profile });
    const plan = await buildFilePlan(templatePath(profile), target, { existingTarget: mode === 'init' });
    await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: mode });
    return target;
  }

  async function preview(target, mutateManifest = (m) => m) {
    const root = await resolveProjectRoot(target);
    const raw = mutateManifest(await fs.readJson(path.join(target, '.ai-scaffold.json')));
    const reads = [];
    const reader = {
      checkContained: (r, rel) => checkContained(r, rel),
      readContained: async (r, rel, maxBytes) => {
        reads.push(rel);
        return readContained(r, rel, { maxBytes });
      },
    };
    const { manifest } = runMigrations(raw, { from: raw.version, to: raw.version, settingsPristine: null });
    const { renders } = await renderManagedSet(manifest, root);
    const plan = await buildUpdatePlan({ root, manifest, renders, reader });
    const by = (rel) => plan.entries.find((e) => e.path === rel);
    return { plan, reads, by };
  }

  it('an untouched project plans no changes and never reads unowned or user-data files', async () => {
    const target = await install('untouched');
    const { plan, reads, by } = await preview(target);
    expect(Object.keys(plan.counts).sort()).toEqual(['merge', 'skip-seeded', 'skip-unowned', 'skip-user-data', 'unchanged']);
    expect(by('README.md').action).toBe('skip-unowned');
    expect(by('.claude/MEMORY.md').action).toBe('skip-user-data');
    expect(by('.claude/settings.json').action).toBe('merge');
    expect(reads).not.toContain('README.md');
    expect(reads).not.toContain('.claude/MEMORY.md');
    expect(reads).not.toContain('tasks/lessons.md');
  });

  it('classifies edits, line-ending changes, deletions, removals and unrecorded files', async () => {
    const target = await install('mutated');
    const fakeOld = '.claude/rules/retired-rule.md';
    await fs.outputFile(path.join(target, fakeOld), 'retired\n');
    await fs.appendFile(path.join(target, 'CLAUDE.md'), '\nlocal edit\n');
    const agents = await fs.readFile(path.join(target, 'AGENTS.md'), 'utf-8');
    await fs.writeFile(path.join(target, 'AGENTS.md'), agents.replace(/\n/g, '\r\n'));
    await fs.remove(path.join(target, 'constitution.md'));
    const { by } = await preview(target, (m) => ({
      ...m,
      managedFiles: [
        ...m.managedFiles.filter((r) => r.path !== '.claude/AGENTS.md'),
        { path: fakeOld, ...recordFor('retired\n') },
      ],
    }));
    expect(by('CLAUDE.md')).toMatchObject({ action: 'conflict', reason: 'edited' });
    expect(by('AGENTS.md').action).toBe('replace');
    expect(by('constitution.md').action).toBe('user-deleted');
    expect(by(fakeOld).action).toBe('remove');
    expect(by('.claude/AGENTS.md').action).toBe('unchanged');
  });

  it('init: the adopter CLAUDE.md is unowned and never read', async () => {
    const target = await install('init-proj', {
      mode: 'init',
      seed: (dir) => fs.outputFile(path.join(dir, 'CLAUDE.md'), '# Mine\n'),
    });
    const { by, reads } = await preview(target);
    expect(by('CLAUDE.md')).toMatchObject({ class: 'unowned', action: 'skip-unowned' });
    expect(reads).not.toContain('CLAUDE.md');
  });

  it('rejects a managed path that passes through a link, without reading it', async () => {
    const target = await install('linked');
    const outside = path.join(tmpDir, 'outside-dir');
    await fs.outputFile(path.join(outside, 'x.md'), 'outside\n');
    await fs.remove(path.join(target, '.claude', 'rules'));
    fs.symlinkSync(outside, path.join(target, '.claude', 'rules'), process.platform === 'win32' ? 'junction' : 'dir');
    const { plan, reads } = await preview(target);
    const rejected = plan.entries.filter((e) => e.action === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((e) => e.path.startsWith('.claude/rules/') && e.reason === 'symlink')).toBe(true);
    expect(reads.some((rel) => rel.startsWith('.claude/rules/'))).toBe(false);
  });

  it('a manifest without managedFiles: no hashes, nothing replaced or removed, and the report says so (FR-03)', async () => {
    const target = await install('legacy');
    await fs.appendFile(path.join(target, 'CLAUDE.md'), '\nedit\n');
    const { plan } = await preview(target, (m) => {
      const { managedFiles: _managedFiles, install: _install, manifestSchema: _schema, settingsBase: _base, ...rest } = m;
      return rest;
    });
    expect(plan.hashed).toBe(false);
    expect(plan.installMode).toBe('unknown');
    expect(plan.counts.replace ?? 0).toBe(0);
    expect(plan.counts.remove ?? 0).toBe(0);
    expect(plan.notices.join(' ')).toMatch(/No file hashes are recorded/);
    // Every inspected release records hashes, so no version is named (slice 5).
    expect(plan.notices.join(' ')).not.toMatch(/0\.8\.6/);
    expect(plan.notices.join(' ')).toMatch(/CLAUDE\.md.*will never be updated/);
  });

  it('seeded files are added only when absent', async () => {
    const target = await install('seeded');
    await fs.remove(path.join(target, 'CHANGELOG.md'));
    const { by } = await preview(target);
    expect(by('CHANGELOG.md').action).toBe('add');
    expect(by('tasks/todo/.gitkeep').action).toBe('skip-seeded');
  });

  it('entries are sorted by path in code-unit order', async () => {
    const target = await install('sorted');
    const { plan } = await preview(target);
    const paths = plan.entries.map((e) => e.path);
    expect(paths).toEqual([...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });
});
