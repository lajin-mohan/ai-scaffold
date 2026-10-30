/**
 * Item 25 slice 3: migration framework and the schema-2 migration
 * (FR-25 to FR-27, FR-35, W3).
 */
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../cli/core/migrations/index.js';
import { buildManifestData } from '../cli/core/manifest.js';
import { resolveWithDefaults, CREATE_DEFAULTS } from '../cli/core/prompts.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const VERSIONS = { from: '0.16.1', to: '0.17.0' };

function manifestFor({ profile = 'node', installMode, records = [] } = {}) {
  const { resolved, defaulted } = resolveWithDefaults({ projectName: 'm', purpose: 'M', ownerEmail: 'm@example.com', profile });
  const manifest = JSON.parse(JSON.stringify(buildManifestData({ ...resolved, defaulted, installMode }, { now: NOW })));
  manifest.managedFiles = records.map((path) => ({ path, hash: 'sha256:00' }));
  return manifest;
}

describe('schema-2 migration', () => {
  it('never modifies the input manifest', () => {
    const manifest = manifestFor({ records: ['CLAUDE.md'] });
    const before = JSON.stringify(manifest);
    runMigrations(manifest, { ...VERSIONS, settingsPristine: null });
    expect(JSON.stringify(manifest)).toBe(before);
  });

  it('keeps a recorded install.mode', () => {
    const { manifest } = runMigrations(manifestFor({ installMode: 'init' }), { ...VERSIONS, settingsPristine: null });
    expect(manifest.install.mode).toBe('init');
  });

  it.each([
    ['laravel', ['composer.json', 'CLAUDE.md'], 'create'],
    ['node', ['.gitattributes', 'CLAUDE.md'], 'create'],
    ['python', ['pyproject.toml'], 'create'],
    ['generic', ['AGENTS.md', 'CLAUDE.md', 'README.md'], 'create'],
    ['node', ['CLAUDE.md', '.claude/rules/a.md', '.ai-scaffold/README.md'], 'init'],
  ])('infers install.mode for %s from %j as %s', (profile, records, expected) => {
    const { manifest, intents } = runMigrations(manifestFor({ profile, records }), { ...VERSIONS, settingsPristine: null });
    expect(manifest.install.mode).toBe(expected);
    expect(intents).toContain(`inferred install.mode: ${expected}`);
  });

  it('records unknown when the manifest has no managedFiles', () => {
    const manifest = manifestFor();
    delete manifest.managedFiles;
    expect(runMigrations(manifest, { ...VERSIONS, settingsPristine: null }).manifest.install.mode).toBe('unknown');
  });

  it('classifies recorded files and keeps stored classes', () => {
    const input = manifestFor({ installMode: 'create', records: ['CLAUDE.md', 'README.md', '.claude/settings.json'] });
    input.managedFiles[0].class = 'user-data';
    const { manifest } = runMigrations(input, { ...VERSIONS, settingsPristine: null });
    expect(manifest.managedFiles.map((r) => r.class)).toEqual(['user-data', 'unowned', 'merged']);
  });

  it('fills missing render inputs with the create defaults and leaves set ones', () => {
    const input = manifestFor({ installMode: 'create' });
    delete input.requirements;
    delete input.commands.lint;
    input.stack.database = 'PostgreSQL';
    const { manifest, intents } = runMigrations(input, { ...VERSIONS, settingsPristine: null });
    expect(manifest.requirements).toEqual({ source: CREATE_DEFAULTS.requirementsSource, paths: [] });
    expect(manifest.commands.lint).toBe('none');
    expect(manifest.stack.database).toBe('PostgreSQL');
    expect(intents).toEqual(expect.arrayContaining(['defaulted requirements.source', 'defaulted commands.lint']));
  });

  it.each([
    ['laravel', { install: 'composer install', dev: 'php artisan serve', migration: 'php artisan migrate --force' }],
    ['golang', { install: 'go mod download', test: 'go test ./...' }],
    ['generic', { install: 'none', test: 'none' }],
  ])('fills missing %s commands with what create gives that profile', (profile, expected) => {
    const input = manifestFor({ profile, installMode: 'create' });
    delete input.commands;
    const { manifest } = runMigrations(input, { ...VERSIONS, settingsPristine: null });
    expect(manifest.commands).toMatchObject(expected);
  });

  it('marks the manifest as schema 2 and records the migration', () => {
    const { manifest, applied } = runMigrations(manifestFor(), { ...VERSIONS, settingsPristine: null });
    expect(manifest.manifestSchema).toBe(2);
    expect(manifest.appliedMigrations).toEqual(['schema-2']);
    expect(applied).toEqual(['schema-2']);
  });

  it('is idempotent: a second run changes nothing (FR-27)', () => {
    const first = runMigrations(manifestFor({ records: ['CLAUDE.md'] }), { ...VERSIONS, settingsPristine: null });
    const second = runMigrations(first.manifest, { ...VERSIONS, settingsPristine: null });
    expect(second.manifest).toEqual(first.manifest);
    expect(second.applied).toEqual([]);
    expect(second.intents).toEqual([]);
  });
});

describe('settings base state (FR-35)', () => {
  it.each([
    [true, 'derived'],
    [false, 'unknown'],
    [null, 'unknown'],
  ])('without settingsBase, settingsPristine %s gives %s', (settingsPristine, expected) => {
    expect(runMigrations(manifestFor(), { ...VERSIONS, settingsPristine }).settingsBase).toBe(expected);
  });

  it('a recorded settingsBase is recorded, never replaced', () => {
    const input = manifestFor();
    input.settingsBase = { permissions: { allow: [], deny: [], ask: [] }, hooks: [] };
    expect(runMigrations(input, { ...VERSIONS, settingsPristine: false }).settingsBase).toBe('recorded');
  });

  it('an empty recorded base is still recorded, not unknown', () => {
    const input = manifestFor();
    input.settingsBase = {};
    expect(runMigrations(input, { ...VERSIONS, settingsPristine: null }).settingsBase).toBe('recorded');
  });
});

describe('version-keyed migrations (FR-25)', () => {
  const calls = [];
  const migrations = ['0.18.0', '0.17.0', '0.16.0'].map((version) => ({
    version,
    run: (manifest) => {
      calls.push(version);
      manifest[`ran${version}`] = true;
      return [`ran ${version}`];
    },
  }));

  it('runs only crossed versions, ascending, once', () => {
    calls.length = 0;
    const first = runMigrations(manifestFor(), { from: '0.16.0', to: '0.18.0', settingsPristine: null, migrations });
    expect(calls).toEqual(['0.17.0', '0.18.0']);
    expect(first.applied).toEqual(['schema-2', '0.17.0', '0.18.0']);
    calls.length = 0;
    runMigrations(first.manifest, { from: '0.16.0', to: '0.18.0', settingsPristine: null, migrations });
    expect(calls).toEqual([]);
  });
});
