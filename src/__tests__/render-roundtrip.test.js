/**
 * Item 25 slice 2, BRD FR-29: every file `update` would own re-renders
 * byte-for-byte from `.ai-scaffold.json` alone, for every profile in both
 * install modes and for a fully non-default value set.
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { renderPlannedFile } from '../cli/core/render.js';
import { valuesFromManifest } from '../cli/core/manifest-values.js';
import { classifyPath } from '../cli/core/ownership.js';
import { recordFor } from '../cli/core/hashing.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';

const PROFILES = ['generic', 'node', 'python', 'laravel', 'golang'];
const INSTALL_NOW = new Date(Date.UTC(2026, 9, 15, 23, 59, 0));
const RE_RENDERED = ['managed', 'merged', 'seeded'];
const ADOPTER_CLAUDE = '# My own CLAUDE.md\r\n';

const NON_DEFAULT = {
  displayName: 'Full House',
  purpose: 'Every value set',
  projectType: 'internal-tool',
  lifecycleStage: 'production',
  frontendStack: 'react',
  database: 'PostgreSQL',
  multiTenant: true,
  dataSensitivity: 'confidential',
  complianceScope: ['GDPR', 'ISO27001'],
  requirementsSource: 'existing-docs',
  requirementsPath: 'docs/requirements.md',
  testCommand: 'run-tests',
  lintCommand: 'run-lint',
  typecheckCommand: 'run-typecheck',
  buildCommand: 'run-build',
  installCommand: 'run-install',
  devCommand: 'run-dev',
  migrationCommand: 'run-migrate',
};

async function install(target, { profile, mode, overrides = {} }) {
  if (mode === 'init') {
    await fs.outputFile(path.join(target, 'README.md'), '# Existing project\n');
    await fs.outputFile(path.join(target, 'CLAUDE.md'), ADOPTER_CLAUDE);
    await fs.outputFile(path.join(target, '.gitignore'), 'node_modules/\n');
  }
  const bootstrap = resolveWithDefaults({
    projectName: `rt-${profile}`, purpose: 'Round trip', ownerEmail: 'rt@example.com', profile, ...overrides,
  });
  const plan = await buildFilePlan(templatePath(profile), target, { existingTarget: mode === 'init' });
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: INSTALL_NOW, installMode: mode });
}

/** Re-render every planned file using only the manifest. Returns rel → Buffer. */
async function rerenderFromManifest(target) {
  const manifest = await fs.readJson(path.join(target, '.ai-scaffold.json'));
  const values = valuesFromManifest(manifest);
  // The clock rule (HLD §3): update renders with the manifest's installedAt.
  const now = new Date(`${manifest.installedAt}T00:00:00Z`);
  const plan = await buildFilePlan(templatePath(manifest.profile), target, {
    existingTarget: values.installMode === 'init',
    ignoreDisk: true,
  });
  const renders = new Map();
  const groups = [['copy', plan.copy], ['generate', plan.generate],
    ...plan.skipProtected.map((file) => [file.src ? 'copy' : 'generate', [file]])];
  for (const [kind, files] of groups) {
    for (const file of files) {
      const bytes = await renderPlannedFile(file, values, { kind, now });
      if (bytes !== null) renders.set(file.rel, bytes);
    }
  }
  return { manifest, renders };
}

function compare(manifest, renders) {
  const installMode = manifest.install.mode;
  const recorded = new Map(manifest.managedFiles.map((record) => [record.path, record]));
  const mismatches = [];
  const unrecorded = [];
  let compared = 0;
  for (const [rel, bytes] of renders) {
    const cls = classifyPath(rel, { installMode, recorded: recorded.has(rel) });
    if (!RE_RENDERED.includes(cls)) continue;
    const record = recorded.get(rel);
    if (!record) {
      unrecorded.push(rel);
      continue;
    }
    compared++;
    if (recordFor(bytes).hash !== record.hash) mismatches.push(rel);
  }
  return { compared, mismatches, unrecorded };
}

describe('render round-trip from the manifest alone (FR-29)', { timeout: 60_000 }, () => {
  let tmpDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-roundtrip-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fs.remove(tmpDir);
  });

  const cases = [
    ...PROFILES.flatMap((profile) => ['create', 'init'].map((mode) => ({ profile, mode }))),
    { profile: 'laravel', mode: 'create', overrides: NON_DEFAULT, label: 'non-default' },
    { profile: 'node', mode: 'init', overrides: NON_DEFAULT, label: 'non-default' },
  ];

  for (const testCase of cases) {
    const name = `${testCase.profile} ${testCase.mode}${testCase.label ? ` (${testCase.label})` : ''}`;
    it(`${name}: 0 mismatches, every owned render recorded`, async () => {
      const target = path.join(tmpDir, name.replace(/[^a-z0-9]+/gi, '-'));
      await install(target, testCase);
      const { manifest, renders } = await rerenderFromManifest(target);
      expect(manifest.install).toEqual({ mode: testCase.mode });

      const { compared, mismatches, unrecorded } = compare(manifest, renders);
      expect(mismatches).toEqual([]);
      expect(unrecorded).toEqual([]);
      expect(compared).toBeGreaterThan(50);
      expect(manifest.managedFiles.every((record) => record.hashLf === undefined)).toBe(true);

      if (testCase.mode === 'init') {
        expect(classifyPath('CLAUDE.md', { installMode: 'init', recorded: false })).toBe('unowned');
        expect(manifest.managedFiles.some((record) => record.path === 'CLAUDE.md')).toBe(false);
        expect(await fs.readFile(path.join(target, 'CLAUDE.md'), 'utf-8')).toBe(ADOPTER_CLAUDE);
      }
    });
  }
});
