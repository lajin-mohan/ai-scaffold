/**
 * Item 25 slice 2: render.js is what create/init write (refactor guard), and
 * every stamp comes from one injected UTC clock (BRD NFR-07).
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { renderPlannedFile } from '../cli/core/render.js';
import { buildMemoryFile, isoDate, resolvePlaceholders } from '../cli/core/content-templates.js';
import { buildManifestData } from '../cli/core/manifest.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';

const PROFILES = ['generic', 'node', 'python', 'laravel', 'golang'];
const FIXED_NOW = new Date(Date.UTC(2026, 9, 15, 12, 0, 0));
// Keys copyFiles adds to the manifest after rendering it.
const POST_RENDER_KEYS = ['managedFiles', 'defaultedValues'];

function bootstrapFor(profile) {
  return resolveWithDefaults({
    projectName: 'guard-project',
    profile,
    purpose: 'Render guard',
    ownerEmail: 'guard@example.com',
  });
}

async function seedInitTarget(dir) {
  await fs.outputFile(path.join(dir, 'README.md'), '# Existing project\n');
  await fs.outputFile(path.join(dir, 'CLAUDE.md'), '# My own CLAUDE.md\r\n');
  await fs.outputFile(path.join(dir, '.gitignore'), 'node_modules/\n');
}

function writtenEntries(plan) {
  return [
    ...plan.copy.map((file) => ({ file, kind: 'copy' })),
    ...plan.generate.map((file) => ({ file, kind: 'generate' })),
    ...plan.skipProtected
      .filter((file) => !file.exists)
      .map((file) => ({ file, kind: file.src ? 'copy' : 'generate' })),
  ];
}

async function expectRenderMatchesDisk({ file, kind }, values) {
  const rendered = await renderPlannedFile(file, values, { kind, now: FIXED_NOW });
  if (rendered === null) {
    expect(await fs.pathExists(file.target), file.rel).toBe(false);
    return;
  }
  const onDisk = await fs.readFile(file.target);
  if (file.rel === '.ai-scaffold.json') {
    const written = JSON.parse(onDisk);
    const fresh = JSON.parse(rendered);
    for (const key of POST_RENDER_KEYS) {
      delete written[key];
      delete fresh[key];
    }
    expect(written, file.rel).toEqual(fresh);
    return;
  }
  expect(rendered.equals(onDisk), file.rel).toBe(true);
}

describe('render.js reproduces what copyFiles writes', { timeout: 60_000 }, () => {
  let tmpDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-render-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fs.remove(tmpDir);
  });

  for (const profile of PROFILES) {
    for (const mode of ['create', 'init']) {
      it(`${profile} ${mode}: every written file equals its render`, async () => {
        const target = path.join(tmpDir, `${mode}-${profile}`);
        const existingTarget = mode === 'init';
        if (existingTarget) await seedInitTarget(target);
        const bootstrap = bootstrapFor(profile);
        const plan = await buildFilePlan(templatePath(profile), target, { existingTarget });
        await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: FIXED_NOW, installMode: mode });
        expect((await fs.readJson(path.join(target, '.ai-scaffold.json'))).install).toEqual({ mode });

        const values = { ...bootstrap.resolved, defaulted: bootstrap.defaulted, installMode: mode };
        const entries = writtenEntries(plan);
        expect(entries.length).toBeGreaterThan(20);
        for (const entry of entries) {
          await expectRenderMatchesDisk(entry, values);
        }
        if (existingTarget) {
          expect(await fs.readFile(path.join(target, 'CLAUDE.md'), 'utf-8')).toBe('# My own CLAUDE.md\r\n');
        }
      });
    }
  }
});

describe('one injected UTC clock', () => {
  const values = bootstrapFor('generic').resolved;

  it('takes {{YEAR}} from the UTC year, whatever the local time zone', () => {
    const justAfterNewYearUtc = new Date(Date.UTC(2027, 0, 1, 0, 30));
    const justBeforeNewYearUtc = new Date(Date.UTC(2026, 11, 31, 23, 30));
    expect(resolvePlaceholders('{{YEAR}}', values, { now: justAfterNewYearUtc })).toBe('2027');
    expect(resolvePlaceholders('{{YEAR}}', values, { now: justBeforeNewYearUtc })).toBe('2026');
  });

  it('stamps every manifest date and the memory file from the same clock', () => {
    const manifest = buildManifestData(values, { now: FIXED_NOW });
    expect([manifest.bootstrapCompletedAt, manifest.installedAt, manifest.updatedAt])
      .toEqual(['2026-10-15', '2026-10-15', '2026-10-15']);
    expect(buildMemoryFile(values, { now: FIXED_NOW })).toContain('| Last updated | 2026-10-15 |');
    expect(isoDate(FIXED_NOW)).toBe('2026-10-15');
  });

  it('agrees between {{YEAR}} and installedAt at a New Year boundary', () => {
    const now = new Date(Date.UTC(2027, 0, 1, 0, 30));
    const year = resolvePlaceholders('{{YEAR}}', values, { now });
    expect(buildManifestData(values, { now }).installedAt.startsWith(year)).toBe(true);
  });
});

describe('renderPlannedFile input handling', () => {
  it('throws for an unknown kind', async () => {
    await expect(renderPlannedFile({ src: null, rel: 'x' }, {}, { kind: 'other' })).rejects.toThrow(TypeError);
    await expect(renderPlannedFile({ src: null, rel: 'x' }, {})).rejects.toThrow(TypeError);
  });

  it('returns null for a generated path with no builder', async () => {
    expect(await renderPlannedFile({ src: null, rel: 'nothing/here.md' }, {}, { kind: 'generate' })).toBeNull();
  });
});

describe('buildFilePlan rels (Windows init README duplicate)', () => {
  for (const profile of PROFILES) {
    for (const existingTarget of [false, true]) {
      it(`${profile} ${existingTarget ? 'init' : 'create'}: POSIX rels, no target planned twice`, async () => {
        const plan = await buildFilePlan(templatePath(profile), path.join(os.tmpdir(), 'ais-no-such-dir'), { existingTarget });
        const rels = [...plan.copy, ...plan.generate].map((file) => file.rel);
        expect(rels.filter((rel) => rel.includes('\\'))).toEqual([]);
        expect(rels.filter((rel, i) => rels.indexOf(rel) !== i)).toEqual([]);
      });
    }
  }

  it('init renders .ai-scaffold/README.md from the project README template', async () => {
    const plan = await buildFilePlan(templatePath('node'), path.join(os.tmpdir(), 'ais-no-such-dir'), { existingTarget: true });
    const readme = plan.generate.filter((file) => file.rel === '.ai-scaffold/README.md');
    expect(readme).toHaveLength(1);
    expect(path.basename(readme[0].src)).toBe('README.template.md');
  });
});
