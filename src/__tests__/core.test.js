import { describe, it, expect } from 'vitest';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { MANAGED_PATHS, PROTECTED_PATHS, APP_SOURCE_PATHS } from '../cli/core/file-plan.js';
import { detectConflicts, printConflictReport } from '../cli/core/conflicts.js';
import { getVersion } from '../cli/core/version.js';
import { normalizeProfile, templatePath } from '../cli/core/paths.js';

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

  it('auto-derives displayName and purpose from projectName', () => {
    const { resolved, defaulted } = resolveWithDefaults({ projectName: 'billing-api' });
    expect(resolved.displayName).toBe('Billing Api');
    expect(resolved.purpose).toBe('Billing Api — scaffold-managed project');
    expect(defaulted).toContain('displayName');
    expect(defaulted).toContain('purpose');
  });

  it('preserves user-provided values', () => {
    const { resolved, defaulted } = resolveWithDefaults({
      projectType: 'API',
      backendStack: 'PHP/Laravel',
      frontendStack: 'React',
      database: 'PostgreSQL 16',
      multiTenant: true,
      complianceScope: 'GDPR',
      profile: 'laravel',
    });
    expect(resolved.projectType).toBe('API');
    expect(resolved.backendStack).toBe('PHP/Laravel');
    expect(resolved.frontendStack).toBe('React');
    expect(resolved.database).toBe('PostgreSQL 16');
    expect(resolved.multiTenant).toBe(true);
    expect(resolved.complianceScope).toBe('GDPR');
    expect(resolved.profile).toBe('laravel');
    expect(defaulted).toHaveLength(0);
  });

  it('normalizes JavaScript aliases to the node profile', () => {
    expect(normalizeProfile('js')).toBe('node');
    expect(normalizeProfile('javascript')).toBe('node');
    expect(normalizeProfile('nodejs')).toBe('node');
  });

  it('applies Node.js defaults for the node profile', () => {
    const { resolved, defaulted } = resolveWithDefaults({
      projectName: 'node-api',
      profile: 'javascript',
    });

    expect(resolved.profile).toBe('node');
    expect(resolved.backendStack).toBe('Node.js');
    expect(defaulted).toContain('backendStack');
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
  it('includes .env and .ai-scaffold.json', () => {
    expect(PROTECTED_PATHS.some(p => p.includes('.env'))).toBe(true);
    expect(PROTECTED_PATHS.some(p => p.includes('.ai-scaffold.json'))).toBe(true);
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

  it('finds the node template through the JavaScript alias', async () => {
    const plan = await buildFilePlan(templatePath('javascript'), '/tmp/out');
    expect(plan.generate.map(f => f.rel)).toContain('README.md');
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
