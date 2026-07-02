import { describe, it, expect } from 'vitest';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { MANAGED_PATHS, PROTECTED_PATHS, APP_SOURCE_PATHS } from '../cli/core/file-plan.js';
import { detectConflicts, printConflictReport } from '../cli/core/conflicts.js';
import { getVersion } from '../cli/core/version.js';

describe('version', () => {
  it('returns a semver-compliant version', () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('resolveWithDefaults', () => {
  it('fills in defaulted values when flags are empty', () => {
    const { resolved, defaulted } = resolveWithDefaults({});
    expect(resolved.projectType).toBe('SaaS');
    expect(resolved.frontendStack).toBe('None');
    expect(resolved.database).toBe('N/A');
    expect(resolved.multiTenant).toBe(false);
    expect(resolved.complianceScope).toBe('N/A');
    expect(resolved.profile).toBe('generic');
    expect(defaulted).toContain('projectType');
    expect(defaulted).toContain('profile');
  });

  it('preserves user-provided values', () => {
    const { resolved, defaulted } = resolveWithDefaults({
      projectType: 'API',
      frontendStack: 'React',
      database: 'PostgreSQL 16',
      multiTenant: true,
      complianceScope: 'GDPR',
      profile: 'laravel',
    });
    expect(resolved.projectType).toBe('API');
    expect(resolved.frontendStack).toBe('React');
    expect(resolved.database).toBe('PostgreSQL 16');
    expect(resolved.multiTenant).toBe(true);
    expect(resolved.complianceScope).toBe('GDPR');
    expect(resolved.profile).toBe('laravel');
    expect(defaulted).toHaveLength(0);
  });
});

describe('MANAGED_PATHS', () => {
  it('includes .claude/**, .cursor/**, and key scaffold files', () => {
    expect(MANAGED_PATHS.some(p => p.includes('.claude'))).toBe(true);
    expect(MANAGED_PATHS.some(p => p.includes('.cursor'))).toBe(true);
    expect(MANAGED_PATHS.some(p => p.includes('CLAUDE.md'))).toBe(true);
  });
});

describe('PROTECTED_PATHS', () => {
  it('includes .env, package.json, and CI workflows', () => {
    expect(PROTECTED_PATHS.some(p => p.includes('.env'))).toBe(true);
    expect(PROTECTED_PATHS.some(p => p.includes('package.json'))).toBe(true);
    expect(PROTECTED_PATHS.some(p => p.includes('.github/workflows'))).toBe(true);
  });
});

describe('APP_SOURCE_PATHS', () => {
  it('includes apps/, src/, packages/', () => {
    expect(APP_SOURCE_PATHS.some(p => p.includes('apps/'))).toBe(true);
    expect(APP_SOURCE_PATHS.some(p => p.includes('src/'))).toBe(true);
    expect(APP_SOURCE_PATHS.some(p => p.includes('packages/'))).toBe(true);
  });
});

describe('buildFilePlan', () => {
  it('throws when template directory does not exist', async () => {
    await expect(buildFilePlan('/nonexistent/template', '/tmp/out')).rejects.toThrow('Template profile not found');
  });
});

describe('detectConflicts', () => {
  it('returns conflict report with expected keys', async () => {
    // Empty plan — tests the report structure
    const report = await detectConflicts(process.cwd(), { copy: [], generate: [], skipProtected: [], skipAppSource: [] });
    expect(report).toHaveProperty('protectedExists');
    expect(report).toHaveProperty('managedModified');
    expect(report).toHaveProperty('managedMissing');
    expect(report).toHaveProperty('claudDirExists');
    expect(Array.isArray(report.protectedExists)).toBe(true);
  });
});
