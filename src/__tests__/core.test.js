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
    expect(resolved.projectType).toBe('saas');
    expect(resolved.lifecycleStage).toBe('active-development');
    expect(resolved.frontendStack).toBe('none');
    expect(resolved.database).toBe('none');
    expect(resolved.multiTenant).toBe(false);
    expect(resolved.dataSensitivity).toBe('internal');
    expect(resolved.complianceScope).toEqual([]);
    expect(resolved.requirementsSource).toBe('create-later');
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
      projectType: 'api',
      backendStack: 'PHP/Laravel',
      frontendStack: 'react',
      database: 'PostgreSQL 16',
      multiTenant: true,
      dataSensitivity: 'confidential',
      complianceScope: 'GDPR,SOC2',
      requirementsSource: 'existing-docs',
      requirementsPath: 'docs/requirements/brd.md',
      profile: 'laravel',
    });
    expect(resolved.projectType).toBe('api');
    expect(resolved.backendStack).toBe('PHP/Laravel');
    expect(resolved.frontendStack).toBe('react');
    expect(resolved.database).toBe('PostgreSQL 16');
    expect(resolved.multiTenant).toBe(true);
    expect(resolved.dataSensitivity).toBe('confidential');
    expect(resolved.complianceScope).toEqual(['GDPR', 'SOC2']);
    expect(resolved.requirementsSource).toBe('existing-docs');
    expect(resolved.requirementsPath).toBe('docs/requirements/brd.md');
    expect(resolved.profile).toBe('laravel');
    expect(defaulted).not.toContain('projectType');
    expect(defaulted).not.toContain('frontendStack');
    expect(defaulted).not.toContain('complianceScope');
    expect(defaulted).not.toContain('profile');
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
  it('includes the default core scaffold paths', () => {
    expect(MANAGED_PATHS.some(p => p.includes('.claude'))).toBe(true);
    expect(MANAGED_PATHS.some(p => p.includes('.ai-scaffold'))).toBe(true);
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

  it('keeps generic create core-only by default', async () => {
    const plan = await buildFilePlan(templatePath('generic'), '/tmp/out', { existingTarget: false });
    const rels = [...plan.copy.map(f => f.rel), ...plan.generate.map(f => f.rel)];

    expect(rels).toContain('README.md');
    expect(rels).toContain('CLAUDE.md');
    expect(rels).toContain('AGENTS.md');
    expect(rels).toContain('.gitignore');
    expect(rels).toContain('.ai-scaffold/README.md');
    expect(rels).toContain('.ai-scaffold/context.md');

    expect(rels).not.toContain('HOW-TO-USE.md');
    expect(rels).not.toContain('CONTRIBUTING.md');
    expect(rels).not.toContain('package.json');
    expect(rels.some(r => r.startsWith('.ai-scaffold/docs/'))).toBe(false);
    expect(rels.some(r => r.startsWith('.ai-scaffold/tasks/'))).toBe(false);
    expect(rels.some(r => r.startsWith('.ai-scaffold/_ai/'))).toBe(false);
    expect(rels.some(r => r.startsWith('docs/'))).toBe(false);
    expect(rels.some(r => r.startsWith('tasks/'))).toBe(false);
    expect(rels.some(r => r.startsWith('_ai/'))).toBe(false);
    expect(rels.some(r => r.startsWith('apps/'))).toBe(false);
    expect(rels).not.toContain('.ai-scaffold/tasks/ponytail-debt.md');
  });

  it('keeps Node profile package.json at root for new project creation', async () => {
    const plan = await buildFilePlan(templatePath('node'), '/tmp/out', { existingTarget: false });
    const rels = [...plan.copy.map(f => f.rel), ...plan.generate.map(f => f.rel)];
    expect(rels).toContain('package.json');
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
