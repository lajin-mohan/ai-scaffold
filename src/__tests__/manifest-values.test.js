/**
 * Item 25 slice 2: manifest fidelity (FR-05, FR-28), install.mode recording
 * (FR-37) and conditional hashLf records (FR-09).
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { valuesFromManifest } from '../cli/core/manifest-values.js';
import { buildManagedFileRecords, buildManifestData } from '../cli/core/manifest.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { hashRaw } from '../cli/core/hashing.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const RENDER_KEYS = [
  'profile', 'projectName', 'displayName', 'purpose', 'projectType', 'lifecycleStage', 'ownerEmail',
  'backendStack', 'frontendStack', 'database', 'multiTenant', 'dataSensitivity', 'complianceScope',
  'requirementsSource', 'requirementsPath', 'installCommand', 'devCommand', 'migrationCommand',
  'testCommand', 'lintCommand', 'typecheckCommand', 'buildCommand',
];

function pick(values) {
  return Object.fromEntries(RENDER_KEYS.map((key) => [key, values[key]]));
}

const DEFAULT_SET = resolveWithDefaults({ projectName: 'plain', purpose: 'Plain', ownerEmail: 'a@example.com' });
const NON_DEFAULT_SET = resolveWithDefaults({
  projectName: 'full-house',
  displayName: 'Full House',
  purpose: 'Every value set',
  ownerEmail: 'b@example.com',
  profile: 'laravel',
  projectType: 'internal-tool',
  lifecycleStage: 'production',
  frontendStack: 'react',
  database: 'PostgreSQL',
  multiTenant: true,
  dataSensitivity: 'confidential',
  complianceScope: ['GDPR', 'ISO27001'],
  requirementsSource: 'existing-docs',
  requirementsPath: 'docs/requirements.md',
  testCommand: 'php artisan test',
  lintCommand: 'vendor/bin/pint --test',
  typecheckCommand: 'vendor/bin/phpstan',
  buildCommand: 'npm run build',
  installCommand: 'composer install',
  devCommand: 'php artisan serve',
  migrationCommand: 'php artisan migrate',
});

describe('valuesFromManifest inverts buildManifestData', () => {
  it.each([['default', DEFAULT_SET], ['non-default', NON_DEFAULT_SET]])('%s values round-trip', (_label, set) => {
    const values = { ...set.resolved, defaulted: set.defaulted };
    const manifest = JSON.parse(JSON.stringify(buildManifestData(values, { now: NOW })));
    const back = valuesFromManifest(manifest);
    expect(pick(back)).toEqual(pick(values));
    expect(back.defaulted).toEqual(set.defaulted);
  });

  it('maps an empty requirements path stored as [] back to an empty string (spike F1)', () => {
    expect(valuesFromManifest({ requirements: { source: 'create-later', paths: [] } }).requirementsPath).toBe('');
    expect(valuesFromManifest({}).requirementsPath).toBe('');
  });

  it('reads install.mode when present and leaves it undefined otherwise', () => {
    expect(valuesFromManifest({ install: { mode: 'init' } }).installMode).toBe('init');
    expect(valuesFromManifest({}).installMode).toBeUndefined();
  });

  it('copies arrays rather than aliasing the manifest', () => {
    const manifest = { risk: { complianceScope: ['GDPR'] }, defaultedValues: ['purpose'] };
    const values = valuesFromManifest(manifest);
    values.complianceScope.push('X');
    values.defaulted.push('Y');
    expect(manifest.risk.complianceScope).toEqual(['GDPR']);
    expect(manifest.defaultedValues).toEqual(['purpose']);
  });

  it.each([null, undefined, 'x', 42, []])('throws for a non-object manifest %s', (manifest) => {
    expect(() => valuesFromManifest(manifest)).toThrow(TypeError);
  });
});

describe('install.mode in the manifest (FR-37)', () => {
  const values = DEFAULT_SET.resolved;

  it.each(['create', 'init'])('records install.mode %s when given', (installMode) => {
    expect(buildManifestData({ ...values, installMode }, { now: NOW }).install).toEqual({ mode: installMode });
  });

  it('adds no install key when no mode is given', () => {
    expect(buildManifestData(values, { now: NOW })).not.toHaveProperty('install');
  });

  it('keeps commands.install, which is a different field', () => {
    const manifest = buildManifestData({ ...values, installMode: 'create', installCommand: 'npm ci' }, { now: NOW });
    expect(manifest.commands.install).toBe('npm ci');
  });
});

describe('buildManagedFileRecords hashLf (FR-09)', () => {
  it('adds hashLf only for content containing CRLF', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-records-'));
    try {
      await fs.writeFile(path.join(dir, 'lf.md'), 'a\nb\n');
      await fs.writeFile(path.join(dir, 'crlf.ps1'), 'a\r\nb\r\n');
      const records = await buildManagedFileRecords(dir, ['lf.md', 'crlf.ps1', 'missing.md']);
      expect(records).toEqual([
        { path: 'crlf.ps1', hash: hashRaw('a\r\nb\r\n'), hashLf: hashRaw('a\nb\n') },
        { path: 'lf.md', hash: hashRaw('a\nb\n') },
      ]);
    } finally {
      await fs.remove(dir);
    }
  });
});
