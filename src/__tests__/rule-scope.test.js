import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import { templatePath, SUPPORTED_PROFILES } from '../cli/core/paths.js';

// Static check of each scoped rule's `paths:` globs (item 84). It shows which
// files a rule is written to match; whether a tool loads it at runtime is a
// separate conformance check (item 98).

const rulesDir = (profile) => templatePath(profile, '.claude/rules');
const pathsOf = (text) => {
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  if (!block || !/^paths:/m.test(block[1])) return null;
  return [...block[1].matchAll(/^\s+-\s+"([^"]+)"/gm)].map((m) => m[1]);
};
const rule = (name) => readFileSync(path.join(rulesDir('generic'), `${name}.md`), 'utf-8');
const matches = (name, file) => picomatch(pathsOf(rule(name)), { dot: true })(file);

const CASES = {
  'coding-standards': { yes: ['src/users/service.ts', 'app/models.py', 'cmd/main.go'], no: ['README.md', 'docs/notes.md'] },
  'ai-coding-rules': { yes: ['apps/api/src/index.js', 'app/Http/Kernel.php'], no: ['CHANGELOG.md', 'package.json'] },
  'security-rules': { yes: ['src/auth.ts', 'db/migrations/001_init.sql', '.env.example'], no: ['README.md'] },
  'compliance-rules': { yes: ['src/export/users.py', 'db/migrations/002.sql'], no: ['docs/brd/x.md'] },
  'testing-rules': { yes: ['src/users.test.ts', 'tests/test_api.py', 'pkg/user_test.go', 'phpunit.xml'], no: ['src/users.ts', 'app/models.py'] },
  'api-standards': { yes: ['apps/api/src/routes/users.ts', 'app/Http/Controllers/UserController.php', 'openapi.yaml'], no: ['src/domain/user.ts'] },
  'ux-rules': { yes: ['apps/web/src/Card.tsx', 'styles/main.css', 'resources/views/home.blade.php', 'docs/ux/billing/00-index.md'], no: ['src/server.ts'] },
  'branching-rules': { yes: ['.github/workflows/ci.yml', '.claude/hooks/pre-commit', '.ai-scaffold/ci/branch-flow.yml'], no: ['src/index.ts'] },
};

describe('rule relocation: scoped rules load by path (item 84)', () => {
  it('leaves only the rules retired in PR 5 unscoped, in every profile', () => {
    for (const profile of SUPPORTED_PROFILES) {
      const unscoped = readdirSync(rulesDir(profile)).filter((f) => f.endsWith('.md'))
        .filter((f) => pathsOf(readFileSync(path.join(rulesDir(profile), f), 'utf-8')) === null);
      expect(unscoped).toEqual(['ponytail-ladder.md']);
    }
  });

  for (const [name, { yes, no }] of Object.entries(CASES)) {
    it(`${name}: matches its area and not unrelated files`, () => {
      for (const file of yes) expect(matches(name, file), file).toBe(true);
      for (const file of no) expect(matches(name, file), file).toBe(false);
    });
  }

  it('ships rule files identical across profiles', () => {
    for (const file of readdirSync(rulesDir('generic')).filter((f) => f.endsWith('.md'))) {
      const generic = readFileSync(path.join(rulesDir('generic'), file), 'utf-8');
      for (const profile of SUPPORTED_PROFILES) expect(readFileSync(path.join(rulesDir(profile), file), 'utf-8')).toBe(generic);
    }
  });
});

describe('delivery workflow is opt-in (item 84)', () => {
  const skill = (profile) => templatePath(profile, '.claude/skills/project-delivery-workflow');
  const references = ['agent-handoff-protocol', 'definition-of-ready', 'dod-rules', 'manual-review-checklist', 'governance', 'review-rules'];

  it('disables implicit invocation and indexes the moved references', () => {
    for (const profile of SUPPORTED_PROFILES) {
      const text = readFileSync(path.join(skill(profile), 'SKILL.md'), 'utf-8');
      expect(text).toMatch(/^disable-model-invocation: true$/m);
      for (const ref of references) {
        expect(text).toContain(`(references/${ref}.md)`);
        expect(existsSync(path.join(skill(profile), 'references', `${ref}.md`))).toBe(true);
        expect(existsSync(path.join(rulesDir(profile), `${ref}.md`))).toBe(false);
      }
    }
  });

  it('removes token-usage-rules and keeps no reference to it', () => {
    for (const profile of SUPPORTED_PROFILES) {
      expect(existsSync(path.join(rulesDir(profile), 'token-usage-rules.md'))).toBe(false);
      expect(readFileSync(path.join(skill(profile), 'references/governance.md'), 'utf-8')).not.toContain('token-usage-rules');
    }
  });

  it('start-task reads the Definition of Ready only when the delivery workflow is in use', () => {
    const text = readFileSync(templatePath('generic', '.claude/commands/start-task.md'), 'utf-8');
    expect(text).toMatch(/If the project uses the delivery workflow, verify Definition of Ready/);
  });
});

describe('tenant and compliance guidance is conditional (item 84)', () => {
  it('words tenant isolation as applicable only when the project uses it', () => {
    expect(rule('security-rules')).toContain('This section applies if this project uses tenant isolation');
    expect(rule('testing-rules')).toContain('Tenant isolation, if this project uses it');
    const refs = templatePath('generic', '.claude/skills/project-delivery-workflow/references');
    for (const file of ['dod-rules.md', 'review-rules.md']) {
      const lines = readFileSync(path.join(refs, file), 'utf-8').split('\n').filter((l) => /tenant/i.test(l));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line, `${file}: ${line}`).toContain('if this project uses tenant isolation');
    }
  });

  it('skips compliance rules when the compliance scope is N/A', () => {
    expect(rule('compliance-rules')).toContain('If the Compliance scope in `AGENTS.md` is `N/A`, these rules do not apply');
  });

  it('keeps universal security boundaries unconditional', () => {
    const text = rule('security-rules');
    expect(text).toContain('**Parameterized queries only.**');
    expect(text).toContain('**No secrets in code.**');
  });
});
