import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildTokenReport } from '../cli/core/token-report.js';
import { applyInteractiveDefaults, resolveWithDefaults, validateBootstrapValues } from '../cli/core/prompts.js';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { buildCliReference } from '../cli/core/content-templates.js';
import { MANAGED_PATHS, PROTECTED_PATHS, APP_SOURCE_PATHS } from '../cli/core/file-plan.js';
import { detectConflicts } from '../cli/core/conflicts.js';
import { buildDryRunPlan, emptyConflicts } from '../cli/core/dry-run-plan.js';
import { getVersion } from '../cli/core/version.js';
import { normalizeProfile, templatePath, toPosixPath, SUPPORTED_PROFILES, isSupportedProfile, profileHelpLine } from '../cli/core/paths.js';
import { buildConstitution } from '../cli/core/content-templates.js';

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

  it('normalizes php to the laravel profile (laravel is the PHP profile)', () => {
    expect(normalizeProfile('php')).toBe('laravel');
    expect(normalizeProfile('PHP')).toBe('laravel');
    expect(normalizeProfile('laravel8')).toBe('laravel');
  });

  it('recognizes supported profiles and aliases, rejects unknown ones', () => {
    expect(isSupportedProfile('php')).toBe(true);
    expect(isSupportedProfile('go')).toBe(true);
    expect(isSupportedProfile('laravel')).toBe(true);
    expect(isSupportedProfile('rust')).toBe(false);
    expect(isSupportedProfile('')).toBe(false);
    // The unknown-profile error must name the valid set + aliases, not crash.
    expect(profileHelpLine()).toContain('generic, laravel, node, python, golang');
    expect(profileHelpLine()).toContain('php');
  });

  it('applies Node.js defaults for the node profile', () => {
    const { resolved, defaulted } = resolveWithDefaults({
      projectName: 'node-api',
      profile: 'javascript',
    });

    expect(resolved.profile).toBe('node');
    expect(resolved.backendStack).toBe('Node.js');
    expect(resolved.testCommand).toBe('npm test');
    // `none`, not `npm run lint`: the profile ships no lint/typecheck/build
    // configuration, and the scripts behind those were `echo` stubs exiting 0.
    // Advertising a capability the profile does not implement is what FR-02/
    // FR-05 forbid — a gate that runs them sees passes and proves nothing.
    expect(resolved.lintCommand).toBe('none');
    expect(resolved.typecheckCommand).toBe('none');
    expect(resolved.buildCommand).toBe('none');
    expect(defaulted).toContain('backendStack');
  });

  it('applies profile command defaults for interactive prompt values', () => {
    const resolved = applyInteractiveDefaults({
      projectName: 'node-api',
      profile: 'javascript',
      testCommand: 'none',
      lintCommand: 'none',
      typecheckCommand: 'none',
      buildCommand: 'none',
    });

    expect(resolved.profile).toBe('node');
    expect(resolved.testCommand).toBe('npm test');
    // `none`, not `npm run lint`: the profile ships no lint/typecheck/build
    // configuration, and the scripts behind those were `echo` stubs exiting 0.
    // Advertising a capability the profile does not implement is what FR-02/
    // FR-05 forbid — a gate that runs them sees passes and proves nothing.
    expect(resolved.lintCommand).toBe('none');
    expect(resolved.typecheckCommand).toBe('none');
    expect(resolved.buildCommand).toBe('none');
  });

  it('rejects invalid choice-valued flags', () => {
    expect(() => resolveWithDefaults({
      projectName: 'bad-context',
      projectType: 'Platform',
      ownerEmail: 'test@example.com',
    })).toThrow(/projectType/);

    expect(() => resolveWithDefaults({
      projectName: 'bad-compliance',
      complianceScope: 'ISO 27001,PCI DSS,bogusscope',
      ownerEmail: 'test@example.com',
    })).toThrow(/complianceScope/);
  });

  it('validates normalized choice values', () => {
    expect(validateBootstrapValues({
      projectType: 'api',
      lifecycleStage: 'active-development',
      frontendStack: 'none',
      dataSensitivity: 'internal',
      requirementsSource: 'create-later',
      profile: 'node',
      complianceScope: ['GDPR', 'SOC2'],
    })).toEqual([]);
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
    expect(rels).toContain('.gitattributes');
    expect(rels).toContain('.ai-scaffold/README.md');
    expect(rels).toContain('.ai-scaffold/context.md');

    expect(rels).not.toContain('HOW-TO-USE.md');
    expect(rels).not.toContain('CONTRIBUTING.md');
    expect(rels).not.toContain('package.json');
    expect(rels.some(r => r.startsWith('.ai-scaffold/docs/'))).toBe(false);
    expect(rels.some(r => r.startsWith('.ai-scaffold/tasks/'))).toBe(false);
    expect(rels.some(r => r.startsWith('.ai-scaffold/_ai/'))).toBe(false);
    expect(rels.some(r => r.startsWith('docs/'))).toBe(false);
    expect(rels.some(r => r.startsWith('_ai/'))).toBe(false);
    expect(rels.some(r => r.startsWith('apps/'))).toBe(false);

    // Governance skeleton ships on create so the shipped CLAUDE.md workflow
    // references resolve; the rest of tasks/ (e.g. ponytail-debt) does not.
    expect(rels).toContain('tasks/lessons.md');
    expect(rels).toContain('tasks/todo/.gitkeep');
    expect(rels).toContain('tasks/done/.gitkeep');
    expect(rels).toContain('CHANGELOG.md');
    expect(rels).not.toContain('tasks/ponytail-debt.md');
  });

  it('keeps Node profile package.json at root for new project creation', async () => {
    const plan = await buildFilePlan(templatePath('node'), '/tmp/out', { existingTarget: false });
    const rels = [...plan.copy.map(f => f.rel), ...plan.generate.map(f => f.rel)];
    expect(rels).toContain('package.json');
  });

  // These were the two HIGH doctor failures reported on Windows: the .template
  // sources must resolve to generated .claude/MEMORY.md and
  // .claude/settings-overrides.json for every profile, on both create and init.
  for (const profile of SUPPORTED_PROFILES) {
    it(`generates .claude/MEMORY.md and settings-overrides.json for ${profile} (create + init)`, async () => {
      for (const existingTarget of [false, true]) {
        const plan = await buildFilePlan(templatePath(profile), '/tmp/out-gen', { existingTarget });
        const generated = plan.generate.map((f) => f.rel);
        expect(generated).toContain('.claude/MEMORY.md');
        expect(generated).toContain('.claude/settings-overrides.json');
      }
    });
  }
});

describe('buildFilePlan with Windows-style path separators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Reproduces the Windows bug: path.relative() emits backslashes there, which
  // must not break the forward-slash GENERATED_FILE_MAP lookups. Simulate it by
  // making path.relative return backslash paths and assert generation survives.
  it('still generates .claude/MEMORY.md and settings-overrides.json', async () => {
    const realRelative = path.relative.bind(path);
    vi.spyOn(path, 'relative').mockImplementation((from, to) =>
      realRelative(from, to).replace(/\//g, '\\'),
    );

    const plan = await buildFilePlan(templatePath('golang'), '/tmp/out-win', { existingTarget: false });
    const generated = plan.generate.map((f) => f.rel);

    expect(generated).toContain('.claude/MEMORY.md');
    expect(generated).toContain('.claude/settings-overrides.json');
    expect(generated).toContain('README.md');
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

describe('buildDryRunPlan', () => {
  it('serializes create/init file plans for automation', async () => {
    const bootstrap = resolveWithDefaults({ projectName: 'json-plan', profile: 'node' });
    const plan = await buildFilePlan(templatePath('node'), '/tmp/json-plan', { existingTarget: false });
    const dryRunPlan = buildDryRunPlan({
      command: 'create',
      targetDir: '/tmp/json-plan',
      profile: 'node',
      plan,
      conflicts: emptyConflicts(),
      values: bootstrap.resolved,
      defaultedValues: bootstrap.defaulted,
      existingTarget: false,
    });

    expect(dryRunPlan.command).toBe('create');
    expect(dryRunPlan.dryRun).toBe(true);
    expect(dryRunPlan.profile).toBe('node');
    expect(dryRunPlan.optionalPacks).toEqual([]);
    expect(dryRunPlan.defaultedValues).toContain('projectType');
    expect(dryRunPlan.counts.copy).toBe(plan.copy.length);
    expect(dryRunPlan.counts.generate).toBe(plan.generate.length);
    expect(dryRunPlan.files.generate.map((file) => file.path)).toContain('README.md');
    expect(dryRunPlan.files.copy.some((file) => file.path === '.claude/settings.json')).toBe(true);
  });
});

describe('toPosixPath', () => {
  it('normalizes OS-native separators to posix', () => {
    const native = ['.claude', 'settings.json'].join(path.sep);
    expect(toPosixPath(native)).toBe('.claude/settings.json');
  });

  it('leaves posix paths unchanged', () => {
    expect(toPosixPath('.claude/rules/ai-coding-rules.md')).toBe('.claude/rules/ai-coding-rules.md');
  });

  it('normalizes literal Windows backslashes on any OS', () => {
    expect(toPosixPath('.claude\\settings.json')).toBe('.claude/settings.json');
    expect(toPosixPath('tasks\\todo\\.gitkeep')).toBe('tasks/todo/.gitkeep');
  });
});

describe('template gitignore ships hook wiring', () => {
  // Templates ship the ignore file as `gitignore` (no dot) because npm pack
  // hard-excludes `.gitignore` from tarballs; file-plan renames it to
  // `.gitignore` on copy. A bare `settings.json` rule would also match
  // .claude/settings.json at any depth and drop the hook wiring — anchor to
  // root (/settings.json) instead.
  for (const profile of SUPPORTED_PROFILES) {
    it(`${profile}: ships gitignore (not .gitignore) without ignoring settings.json`, () => {
      const gitignore = readFileSync(templatePath(profile, 'gitignore'), 'utf-8');
      const lines = gitignore.split('\n').map((line) => line.trim());
      expect(lines).not.toContain('settings.json');
    });
  }
});

describe('Claude Code skill packaging', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const skillRoots = [
    path.join(repoRoot, '.claude/skills'),
    ...SUPPORTED_PROFILES.map((profile) => path.join(repoRoot, 'templates', profile, '.claude/skills')),
  ];
  const convertedSkills = [
    'accessibility-check',
    'backend-api-design',
    'cloud-deployment',
    'database-optimization',
    'design-system',
    'frontend-patterns',
    'iac-best-practices',
    'project-delivery-workflow',
    'ux-audit',
  ];

  it.each(skillRoots)('%s contains only valid skill directories with metadata', (skillsDir) => {
    const entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'));

    expect(entries).toHaveLength(13);
    for (const entry of entries) {
      expect(entry.isDirectory(), `${entry.name} must be a skill directory`).toBe(true);
      expect(entry.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      const contents = readFileSync(skillFile, 'utf-8');
      const frontmatter = contents.match(/^---\n([\s\S]*?)\n---\n/);

      expect(frontmatter, `${skillFile} must start with YAML frontmatter`).not.toBeNull();
      expect(frontmatter[1]).toMatch(new RegExp(`^name: ${entry.name}$`, 'm'));
      expect(frontmatter[1]).toMatch(/^description: \S.+$/m);
    }
  });

  it('keeps converted skills identical across the root and every shipped profile', () => {
    for (const skill of convertedSkills) {
      const canonical = readFileSync(path.join(repoRoot, '.claude/skills', skill, 'SKILL.md'), 'utf-8');
      for (const profile of SUPPORTED_PROFILES) {
        const shipped = readFileSync(
          path.join(repoRoot, 'templates', profile, '.claude/skills', skill, 'SKILL.md'),
          'utf-8',
        );
        expect(shipped).toBe(canonical);
      }
    }
  });

  it('keeps the legacy ux-audit skill manual-only and redirects new work', () => {
    const legacySkill = readFileSync(path.join(repoRoot, '.claude/skills/ux-audit/SKILL.md'), 'utf-8');
    expect(legacySkill).toContain('disable-model-invocation: true');
    expect(legacySkill).toContain('Use `ux-review` instead.');
  });
});

describe('python and golang profiles', () => {
  it('python create ships pyproject.toml, not package.json', async () => {
    const plan = await buildFilePlan(templatePath('python'), '/tmp/out-py', { existingTarget: false });
    const rels = [...plan.copy.map((f) => f.rel), ...plan.generate.map((f) => f.rel)];
    expect(rels).toContain('pyproject.toml');
    expect(rels).not.toContain('package.json');
  });

  it('golang create ships go.mod, not package.json', async () => {
    const plan = await buildFilePlan(templatePath('golang'), '/tmp/out-go', { existingTarget: false });
    const rels = [...plan.copy.map((f) => f.rel), ...plan.generate.map((f) => f.rel)];
    expect(rels).toContain('go.mod');
    expect(rels).not.toContain('package.json');
  });

  it('applies python defaults and resolves the go alias to golang', () => {
    const py = resolveWithDefaults({ profile: 'python' });
    expect(py.resolved.backendStack).toBe('Python');
    // venv-relative: the previous bare `pytest` assumed an already-activated
    // virtualenv the README never told the reader to create, so the documented
    // command failed on a clean machine.
    expect(py.resolved.testCommand).toBe('.venv/bin/pytest');

    const go = resolveWithDefaults({ profile: 'go' });
    expect(go.resolved.profile).toBe('golang');
    expect(go.resolved.testCommand).toBe('go test ./...');
  });

  it('sets install/dev/migration command defaults per profile', () => {
    const py = resolveWithDefaults({ profile: 'python' }).resolved;
    // Self-contained: creates the venv it then installs into. Bare `pip`
    // fails "command not found" on a system python and PEP 668
    // "externally-managed-environment" on Homebrew/Debian.
    expect(py.installCommand).toBe(
      'python3 -m venv .venv && .venv/bin/python -m pip install -e ".[dev]"',
    );
    expect(py.devCommand).toBe('none');
    expect(py.migrationCommand).toBe('none');

    const go = resolveWithDefaults({ profile: 'golang' }).resolved;
    expect(go.installCommand).toBe('go mod download');

    const laravel = resolveWithDefaults({ profile: 'laravel' }).resolved;
    expect(laravel.installCommand).toBe('composer install');
    expect(laravel.devCommand).toBe('php artisan serve');
    expect(laravel.migrationCommand).toBe('php artisan migrate --force') // --force: no .env means Laravel sees production and cancels;

    // Generic has no defaults; install renders as N/A in the generated README.
    expect(resolveWithDefaults({ profile: 'generic' }).resolved.installCommand).toBe('none');
  });

  it('wires shared profile quality gates to Go-aware stack commands', () => {
    const canonicalFiles = [
      '.claude/hooks/pre-commit',
      '.claude/hooks/pre-review.sh',
      '.claude/settings.json',
      '.claude/settings.local.example.json',
      '.claude/commands/start-task.md',
      '.claude/commands/review.md',
      '.github/workflows/ci.yml',
    ];

    for (const rel of canonicalFiles) {
      const generic = readFileSync(templatePath('generic', rel), 'utf-8');
      for (const profile of SUPPORTED_PROFILES) {
        expect(readFileSync(templatePath(profile, rel), 'utf-8')).toBe(generic);
      }
    }

    const preCommit = readFileSync(templatePath('generic', '.claude/hooks/pre-commit'), 'utf-8');
    expect(preCommit).toContain('[ ! -f go.mod ]');
    expect(preCommit).toContain('run_check "Go build" "go build ./..."');
    expect(preCommit).toContain('run_check "Go vet" "go vet ./..."');
    expect(preCommit).toContain('run_check "Go tests" "go test ./..."');

    const preReview = readFileSync(templatePath('generic', '.claude/hooks/pre-review.sh'), 'utf-8');
    expect(preReview).toContain('if [ -f go.mod ]; then');
    expect(preReview).toContain('run_check "Go build" "go build ./..."');
    expect(preReview).toContain('run_check "Go vet" "go vet ./..."');
    expect(preReview).toContain('run_check "Go tests" "go test ./..."');

    const settings = JSON.parse(readFileSync(templatePath('generic', '.claude/settings.json'), 'utf-8'));
    expect(settings.permissions.allow).toContain('Bash(npm run lint*)');
    expect(settings.permissions.allow).toContain('Bash(go test*)');
    expect(settings.permissions.allow).toContain('Bash(go vet*)');
    expect(settings.permissions.allow).toContain('Bash(go build*)');
    expect(settings.permissions.allow).toContain('Bash(ruff*)');
    expect(settings.permissions.allow).toContain('Bash(pytest*)');
    expect(settings.permissions.allow).toContain('Bash(composer*)');

    const localSettings = JSON.parse(readFileSync(templatePath('generic', '.claude/settings.local.example.json'), 'utf-8'));
    expect(localSettings.permissions.allow).toContain('Bash(go test*)');
    expect(localSettings.permissions.allow).toContain('Bash(go vet*)');
    expect(localSettings.permissions.allow).toContain('Bash(go build*)');

    const startTask = readFileSync(templatePath('generic', '.claude/commands/start-task.md'), 'utf-8');
    expect(startTask).toContain('Project lint command from `CLAUDE.md`');
    expect(startTask).toContain('`package.json`, `composer.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, etc.');
    expect(startTask).not.toContain('npm run test:e2e');

    const review = readFileSync(templatePath('generic', '.claude/commands/review.md'), 'utf-8');
    expect(review).toContain('Semgrep, gosec');
    expect(review).toContain('For Go changes touching `cmd/`, `internal/`, `pkg/`, `go.mod`, or Go config');
    expect(review).not.toContain('`npm run test:e2e`');

    const ci = readFileSync(templatePath('generic', '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('has-go');
    expect(ci).toContain('actions/setup-go@v5');
    expect(ci).toContain('go vet ./...');
    expect(ci).toContain('go test ./...');
    expect(ci).toContain('go build ./...');
  });

  it('uses the gitleaks command supported by current gitleaks (git --staged), not the removed detect --staged', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const hooks = ['.claude/hooks/pre-commit', '.claude/hooks/pre-commit-secrets'];
    for (const rel of hooks) {
      const repoHook = readFileSync(path.resolve(repoRoot, rel), 'utf-8');
      // The `git` subcommand is the pre-commit scan form since gitleaks v8.19;
      // `gitleaks detect --staged` errors ("unknown flag") on current versions.
      expect(repoHook).toContain('gitleaks git --staged');
      expect(repoHook).not.toContain('gitleaks detect --staged');

      // Every shipped copy must carry the same gitleaks invocation — that is
      // what this test exists to protect.
      const shipped = SUPPORTED_PROFILES.map((profile) =>
        readFileSync(templatePath(profile, rel), 'utf-8'),
      );
      for (const copy of shipped) {
        expect(copy).toContain('gitleaks git --staged');
        expect(copy).not.toContain('gitleaks detect --staged');
      }

      // The five shipped copies must be identical to each other.
      for (const copy of shipped) {
        expect(copy).toBe(shipped[0]);
      }

      // `pre-commit` is deliberately allowed to differ from the repo copy:
      // the shipped hook enforces the linear feature -> dev -> main flow for
      // generated projects (no commits on dev/main, no release/* branches),
      // while ai-scaffold itself still runs a fast-forward release that keeps
      // release/* as a documented emergency path. Every other hook must match
      // the repo copy exactly.
      if (rel !== '.claude/hooks/pre-commit') {
        for (const copy of shipped) {
          expect(copy).toBe(repoHook);
        }
      }
    }
  });
});

describe('generated package.json scripts', () => {
  // The Node block used to run `npm run lint` / `typecheck` / `test`
  // unconditionally whenever a package.json existed, so a profile missing any
  // script failed a team member's first commit (fixed for laravel in v0.11.0).
  // The hook now skips a script the project does not define, so the assertion
  // is no longer "every script exists" but "the test script is safe to run in
  // a fresh scaffold". Verified end-to-end: a generated node project commits
  // cleanly with only a `test` script present.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const profilesWithPackageJson = ['node', 'laravel'];
  for (const profile of profilesWithPackageJson) {
    it(`${profile} package.json ships a fresh-scaffold-safe test script and no stubs`, () => {
      const pkg = JSON.parse(readFileSync(path.resolve(here, '../../templates', profile, 'package.json'), 'utf-8'));
      // Only node uses npm as its test runner. laravel's package.json is the
      // frontend manifest; its real test command is `composer test`, so
      // requiring an npm `test` script there would force a stub back in.
      if (profile === 'node') {
        expect(pkg.scripts).toHaveProperty('test');
      }
      // No script may be a placeholder: an `echo`/`true`/no-op that exits 0
      // reports success without doing the work (FR-02).
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        expect(cmd, `${profile} script "${name}" is a placeholder`).not.toMatch(/^\s*(echo|printf|true|:)\b/);
      }
      // The Node block runs `npm test`; a fresh scaffold has no vendor/artisan,
      // so the test script must not require a full backend install to pass.
      if (pkg.scripts.test) {
        expect(pkg.scripts.test).not.toMatch(/artisan|phpunit|pytest|go test/i);
      }
    });
  }
});

describe('token-budget-guard.sh (item 64)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '../..');

  it('is byte-identical across the repo copy and all five profiles', () => {
    const repoHook = readFileSync(path.resolve(repoRoot, '.claude/hooks/token-budget-guard.sh'), 'utf-8');
    expect(repoHook).toContain('WARN_TOKENS="${ECC_TOKEN_BUDGET_WARN_TOKENS:-300000}"');
    expect(repoHook).toContain('BLOCK_TOKENS="${ECC_TOKEN_BUDGET_BLOCK_TOKENS:-500000}"');
    for (const profile of SUPPORTED_PROFILES) {
      const templateHook = readFileSync(
        path.resolve(repoRoot, 'templates', profile, '.claude/hooks/token-budget-guard.sh'),
        'utf-8',
      );
      expect(templateHook).toBe(repoHook);
    }
  });

  it('is wired into the PreToolUse matcher in every settings.json', () => {
    const settingsFiles = [
      '.claude/settings.json',
      ...SUPPORTED_PROFILES.map((p) => `templates/${p}/.claude/settings.json`),
    ];
    for (const rel of settingsFiles) {
      const settings = JSON.parse(readFileSync(path.resolve(repoRoot, rel), 'utf-8'));
      const block = settings.hooks.PreToolUse.find(
        (b) => b.matcher === 'Read|Grep|Glob|Edit|Write|MultiEdit',
      );
      expect(block).toBeDefined();
      expect(block.hooks.some((h) => h.command.includes('token-budget-guard.sh'))).toBe(true);
    }
  });

  it('warns under the block threshold and blocks over it, verified by actually running the hook', () => {
    const hookPath = path.resolve(repoRoot, '.claude/hooks/token-budget-guard.sh');
    const tmpTranscript = path.join(os.tmpdir(), `token-budget-test-${Date.now()}.jsonl`);

    try {
      // ~350K est-tokens (chars/4) — warn zone, must not block.
      writeFileSync(tmpTranscript, 'x'.repeat(1_400_000));
      const warnResult = spawnSync('bash', [hookPath], {
        input: JSON.stringify({ tool_name: 'Read', transcript_path: tmpTranscript }),
        encoding: 'utf-8',
      });
      expect(warnResult.status).toBe(0);
      expect(warnResult.stderr).toMatch(/WARN/);

      // ~550K est-tokens — block zone.
      writeFileSync(tmpTranscript, 'x'.repeat(2_200_000));
      const blockResult = spawnSync('bash', [hookPath], {
        input: JSON.stringify({ tool_name: 'Read', transcript_path: tmpTranscript }),
        encoding: 'utf-8',
      });
      expect(blockResult.status).toBe(2);
      expect(blockResult.stderr).toMatch(/BLOCK/);

      // Same block-zone transcript, but WARN_ONLY set — must not block.
      const overrideResult = spawnSync('bash', [hookPath], {
        input: JSON.stringify({ tool_name: 'Read', transcript_path: tmpTranscript }),
        encoding: 'utf-8',
        env: { ...process.env, ECC_TOKEN_BUDGET_WARN_ONLY: '1' },
      });
      expect(overrideResult.status).toBe(0);
    } finally {
      rmSync(tmpTranscript, { force: true });
    }
  });

  it('fails open on a missing transcript', () => {
    const hookPath = path.resolve(repoRoot, '.claude/hooks/token-budget-guard.sh');
    const result = spawnSync('bash', [hookPath], {
      input: JSON.stringify({ tool_name: 'Read', transcript_path: '/tmp/does-not-exist-token-budget-test.jsonl' }),
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
  });
});

describe('buildConstitution', () => {
  it('renders a one-page tie-breaker with resolving rule links', () => {
    const md = buildConstitution({ displayName: 'Billing API', multiTenant: false });
    expect(md).toContain('# Constitution — Billing API');
    // Stays a one-pager — the smoke gate enforces the same 120-line ceiling.
    expect(md.split('\n').length).toBeLessThanOrEqual(120);
    // Owns precedence/order; links out to the detailed rule files.
    expect(md).toContain('owns **precedence and order**');
    expect(md).toContain('.claude/rules/security-rules.md');
    // No unresolved placeholders leak into the generated file.
    expect(md).not.toMatch(/\{\{.*?\}\}/);
  });

  it('makes tenant isolation conditional for single-tenant projects', () => {
    const md = buildConstitution({ displayName: 'Billing API', multiTenant: false });
    expect(md).toContain('applies only if this project is multi-tenant');
    expect(md).not.toContain('Every query that touches tenant data');
  });

  it('asserts tenant isolation for multi-tenant projects', () => {
    const md = buildConstitution({ displayName: 'Billing API', multiTenant: true });
    expect(md).toContain('Every query that touches tenant data');
    expect(md).toContain('tenant_id');
  });
});

describe('buildTokenReport', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const report = buildTokenReport(repoRoot);

  it('measures every corpus category with a positive total', () => {
    const keys = report.categories.map((c) => c.key);
    expect(keys).toEqual(['always', 'rules', 'commands', 'agents', 'skills']);
    expect(report.total.tokens).toBeGreaterThan(0);
    const sum = report.categories.reduce((n, c) => n + c.tokens, 0);
    expect(report.total.tokens).toBe(sum);
  });

  it('splits always-loaded (CLAUDE.md) from on-demand', () => {
    expect(report.alwaysLoadedTokens).toBeGreaterThan(0);
    expect(report.onDemandTokens).toBe(report.total.tokens - report.alwaysLoadedTokens);
    // The upfront/always-loaded slice is small vs on-demand — the premise of the workstream.
    expect(report.alwaysLoadedTokens).toBeLessThan(report.onDemandTokens);
  });

  it('ranks the largest files descending and caps the list', () => {
    expect(report.topFiles.length).toBeGreaterThan(0);
    expect(report.topFiles.length).toBeLessThanOrEqual(10);
    const tokens = report.topFiles.map((f) => f.tokens);
    expect([...tokens].sort((a, b) => b - a)).toEqual(tokens);
  });

  it('measures the /review fan-out from the five reviewers in review.md', () => {
    // Must match the five reviewers /review actually fans out to — NOT critic.
    expect(report.reviewFanout.agents).toEqual([
      'backend-reviewer',
      'frontend-reviewer',
      'security-reviewer',
      'qa-reviewer',
      'architect',
    ]);
    expect(report.reviewFanout.tokens).toBeGreaterThan(0);
  });
});

describe('scaffold self-marker', () => {
  // The scaffold dogfoods itself; its own .ai-scaffold.json version drifted to
  // 0.6.2 while the package was 0.8.x. Keep them in lockstep — a release bump
  // must touch both.
  it('.ai-scaffold.json version matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
    const marker = JSON.parse(readFileSync(new URL('../../.ai-scaffold.json', import.meta.url), 'utf-8'));
    expect(marker.version).toBe(pkg.version);
  });
});

// ------------------------------------------------- item 26 distribution gap
//
// A feature is not shipped until adopters can find it. `docs/cli-reference.md`
// lives in this repository and is NOT copied into generated projects, so the
// doctor flags, the third state and the troubleshooting table reach adopters
// only through this generated file. The smoke suite gates it end to end; these
// are the fast guards.

describe('generated CLI reference', () => {
  const reference = buildCliReference();

  it('documents both flags, the third state and how to act on it', () => {
    for (const needle of [
      '--require-remote',
      '--repo owner/name',
      '[UNAVAILABLE]',
      'gh auth login',
      'rate limit',
      'no merged pull request',
    ]) {
      expect(reference).toContain(needle);
    }
  });

  it('does not describe unavailable as a skip or a pass', () => {
    expect(reference).toContain('not a skip and never a pass');
    expect(reference).not.toMatch(/\[SKIP\]/);
  });

  it('is planned on create AND on init', async () => {
    // On init the `.ai-scaffold/README.md` path is taken by the namespaced
    // project README template, which is why this is its own file. Existing
    // repositories are exactly the population with branch protection to check,
    // so losing it on the init path would miss the audience that needs it.
    for (const existingTarget of [false, true]) {
      const plan = await buildFilePlan(templatePath('generic'), '/tmp/out', { existingTarget });
      expect(plan.generate.map((f) => f.rel)).toContain('.ai-scaffold/cli-reference.md');
    }
  });
});
