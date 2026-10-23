/**
 * Item 25 slice 4, criteria 6.3 and 6.4: `doctor` hashes with hashing.js and
 * warns while `.ais-new` files exist (FR-31); `create`/`init` write a
 * schema-2 manifest (FR-34, FR-37). No `.git`, so doctor never reaches `gh`.
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
import { scaffoldSubset } from '../cli/core/settings-merge.js';
import { runDiagnostics } from '../cli/commands/doctor.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const SIDECAR_CHECK = 'No unmerged update files (.ais-new)';
let tmpDir;

async function install(name, mode = 'create') {
  const target = path.join(tmpDir, name);
  const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'Doctor', ownerEmail: 'd@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, { existingTarget: mode === 'init' });
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: mode });
  return target;
}

const check = (diagnostics, name) => diagnostics.checks.find((c) => c.name === name);

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-doctor-update-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe('doctor after an update', { timeout: 60_000 }, () => {
  it('warns while an .ais-new file exists, and passes once it is gone (FR-31)', async () => {
    const target = await install('sidecar');
    expect(check(await runDiagnostics(target, {}), SIDECAR_CHECK).state).toBe('pass');
    fs.writeFileSync(path.join(target, 'AGENTS.md.ais-new'), 'new version\n');
    const warned = check(await runDiagnostics(target, {}), SIDECAR_CHECK);
    expect(warned).toMatchObject({ state: 'fail', severity: 'medium' });
    expect(warned.message).toContain('AGENTS.md.ais-new');
  });

  it('a CRLF checkout of a managed file is not reported as modified (FR-09)', async () => {
    const target = await install('crlf');
    const file = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf-8').replace(/\n/g, '\r\n'));
    expect(check(await runDiagnostics(target, {}), 'Managed files unmodified').state).toBe('pass');
    fs.appendFileSync(file, 'edit\r\n');
    expect(check(await runDiagnostics(target, {}), 'Managed files unmodified').message).toContain('CLAUDE.md');
  });
});

describe('a new install is born at manifest schema 2', { timeout: 60_000 }, () => {
  it.each(['create', 'init'])('%s records manifestSchema, classes and settingsBase', async (mode) => {
    const target = await install(`schema-${mode}`, mode);
    const manifest = fse.readJsonSync(path.join(target, '.ai-scaffold.json'));
    expect(manifest).toMatchObject({ manifestSchema: 2, install: { mode } });
    expect(manifest.managedFiles.length).toBeGreaterThan(0);
    expect(manifest.managedFiles.every((r) => typeof r.class === 'string')).toBe(true);
    const settings = fse.readJsonSync(path.join(target, '.claude', 'settings.json'));
    expect(manifest.settingsBase).toEqual(scaffoldSubset(settings));
  });
});
