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
import { scaffoldOwnedRecords } from '../cli/core/manifest.js';

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

describe('doctor verifies only the files the scaffold owns (ADR-002)', { timeout: 60_000 }, () => {
  const MODIFIED = 'Managed files unmodified';

  it('an adopter edit to an unowned, user-data, seeded or merged file is not a modified managed file', async () => {
    const target = await install('owned-only');
    for (const rel of ['README.md', '.claude/MEMORY.md', 'CHANGELOG.md', '.claude/settings.json']) {
      fs.appendFileSync(path.join(target, ...rel.split('/')), '\n');
    }
    expect(check(await runDiagnostics(target, {}), MODIFIED).state).toBe('pass');
    fs.appendFileSync(path.join(target, 'CLAUDE.md'), 'edit\n');
    const modified = check(await runDiagnostics(target, {}), MODIFIED);
    expect(modified.message).toBe('Modified: CLAUDE.md');
    // A core file edit also points to PROJECT.md (item 112), in the note.
    expect(modified.note).toContain('PROJECT.md');
  });

  it('still warns about a .ais-new beside a file it does not verify (settings.json, merged)', async () => {
    const target = await install('merged-sidecar');
    fs.writeFileSync(path.join(target, '.claude', 'settings.json.ais-new'), '{}\n');
    const warned = check(await runDiagnostics(target, {}), 'No unmerged update files (.ais-new)');
    expect(warned.message).toContain('.claude/settings.json.ais-new');
  });

  it('a removed unowned file is not reported missing', async () => {
    const target = await install('owned-missing');
    fs.rmSync(path.join(target, 'README.md'));
    expect(check(await runDiagnostics(target, {}), 'Managed files present').state).toBe('pass');
  });

  it('an unclassified (schema 1) manifest still checks every record', async () => {
    const target = await install('schema-1');
    const file = path.join(target, '.ai-scaffold.json');
    const manifest = fse.readJsonSync(file);
    manifest.managedFiles = manifest.managedFiles.map(({ class: _class, ...record }) => record);
    delete manifest.manifestSchema;
    fse.writeJsonSync(file, manifest, { spaces: 2 });
    fs.appendFileSync(path.join(target, 'README.md'), '\n');
    expect(check(await runDiagnostics(target, {}), MODIFIED).message).toContain('README.md');
  });

  it('scaffoldOwnedRecords keeps managed records, or every record when none is classed', () => {
    const classed = [{ path: 'a', class: 'managed' }, { path: 'b', class: 'unowned' }, { path: 'c', class: 'user-data' }];
    expect(scaffoldOwnedRecords({ managedFiles: classed }).map((r) => r.path)).toEqual(['a']);
    expect(scaffoldOwnedRecords({ managedFiles: [{ path: 'a' }, { path: 'b' }] })).toHaveLength(2);
    expect(scaffoldOwnedRecords({})).toEqual([]);
    expect(scaffoldOwnedRecords(null)).toEqual([]);
  });
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

describe('doctor in a fresh clone or worktree (0.20.1)', { timeout: 60_000 }, () => {
  const MEMORY = 'Project memory (.claude/MEMORY.md)';
  const SETTINGS = 'Settings overrides (.claude/settings-overrides.json)';
  const CONTEXT = 'Setup context values are meaningful';
  const removeLocalFiles = (target) => {
    fs.rmSync(path.join(target, '.claude', 'MEMORY.md'));
    fs.rmSync(path.join(target, '.claude', 'settings-overrides.json'));
  };

  it('gitignored local files that are absent are unavailable, not a HIGH failure', async () => {
    const target = await install('fresh-clone');
    removeLocalFiles(target);
    const diagnostics = await runDiagnostics(target, {});
    for (const name of [MEMORY, SETTINGS]) {
      expect(check(diagnostics, name)).toMatchObject({ state: 'unavailable', reason: 'local-file-absent' });
      expect(check(diagnostics, name).remedy).toContain('.gitignore');
    }
    expect(diagnostics.highFailed).toBe(0);
    expect(check(diagnostics, CONTEXT).note).toContain('settings-overrides.json is not in this checkout');
  });

  it('still fails HIGH when an absent local file is not gitignored', async () => {
    const target = await install('not-ignored');
    removeLocalFiles(target);
    const gitignore = path.join(target, '.gitignore');
    const kept = fs.readFileSync(gitignore, 'utf-8').split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('.claude/MEMORY.md')).join('\n');
    fs.writeFileSync(gitignore, kept);
    const diagnostics = await runDiagnostics(target, {});
    expect(check(diagnostics, MEMORY)).toMatchObject({ state: 'fail', severity: 'high' });
    expect(check(diagnostics, SETTINGS).state).toBe('unavailable');
    expect(diagnostics.highFailed).toBe(1);
  });

  it('names the invalid setup value and the allowed set', async () => {
    const target = await install('bad-scope');
    const file = path.join(target, '.ai-scaffold.json');
    const manifest = fse.readJsonSync(file);
    manifest.risk.complianceScope = ['BOGUSSCOPE'];
    fse.writeJsonSync(file, manifest);
    const context = check(await runDiagnostics(target, {}), CONTEXT);
    expect(context.state).toBe('fail');
    expect(context.message).toContain('.ai-scaffold.json risk.complianceScope="BOGUSSCOPE" (allowed: ');
    expect(context.note).toBeUndefined();
  });
});
