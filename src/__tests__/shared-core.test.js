import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { resolvePlaceholders } from '../cli/core/content-templates.js';
import { importTargets } from '../cli/core/startup-context.js';
import { templatePath, SUPPORTED_PROFILES } from '../cli/core/paths.js';

const read = (profile, rel) => readFileSync(templatePath(profile, rel), 'utf-8');
const render = (profile, overrides = {}) => {
  const values = resolveWithDefaults({ projectName: 'acme-billing', profile, ...overrides }).resolved;
  return resolvePlaceholders(read(profile, 'AGENTS.md'), values);
};

describe('shared core: AGENTS.md is canonical, CLAUDE.md imports it (item 84)', () => {
  it('ships byte-identical AGENTS.md and CLAUDE.md in every profile', () => {
    for (const rel of ['AGENTS.md', 'CLAUDE.md']) {
      const generic = read('generic', rel);
      for (const profile of SUPPORTED_PROFILES) expect(read(profile, rel)).toBe(generic);
    }
  });

  it('CLAUDE.md imports AGENTS.md outside any code span or fence', () => {
    expect(importTargets(read('generic', 'CLAUDE.md'))).toEqual(['AGENTS.md']);
  });

  it('retires the duplicate .claude/AGENTS.md pointer', () => {
    for (const profile of SUPPORTED_PROFILES) expect(existsSync(templatePath(profile, '.claude/AGENTS.md'))).toBe(false);
  });

  it('resolves every project placeholder in every profile', () => {
    for (const profile of SUPPORTED_PROFILES) {
      expect(render(profile)).not.toMatch(/\{\{[^}]+\}\}/);
      expect(resolvePlaceholders(read(profile, 'CLAUDE.md'), {})).not.toMatch(/\{\{[^}]+\}\}/);
    }
  });

  it('lists each profile its own test command, not another stack\'s', () => {
    const python = render('python');
    const golang = render('golang');
    expect(python).toMatch(/pytest/);
    expect(python).not.toMatch(/go test|npm test/);
    expect(golang).toMatch(/go test/);
    expect(golang).not.toMatch(/pytest/);
  });

  it('carries no emphasis words, model names or lifecycle stage numbers', () => {
    const text = read('generic', 'AGENTS.md') + read('generic', 'CLAUDE.md');
    expect(text).not.toMatch(/\b(MUST|NEVER|ALWAYS|IMPORTANT|CRITICAL|Non-Negotiable)\b/);
    expect(text).not.toMatch(/\b(Opus|Sonnet|Haiku|GPT-\d)/);
    expect(text).not.toMatch(/\bStage \d/);
  });

  it('keeps tenant isolation conditional and the universal boundaries unconditional', () => {
    for (const multiTenant of [true, false]) {
      const text = render('node', { multiTenant });
      expect(text).toContain(`| Multi-tenant | ${multiTenant} |`);
      expect(text).toContain('If this project uses tenant isolation');
      expect(text).toContain('Parameterized queries only');
      expect(text).toContain('Do not read `.env` files');
    }
  });

  it('names the outward actions that need approval', () => {
    const text = read('generic', 'AGENTS.md');
    for (const phrase of ['pushing', 'pull request', 'releasing', 'deploying', 'schema migration']) {
      expect(text).toContain(phrase);
    }
  });
});
