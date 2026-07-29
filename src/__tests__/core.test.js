import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokenReport } from '../cli/core/token-report.js';
import { applyInteractiveDefaults, resolveWithDefaults, validateBootstrapValues } from '../cli/core/prompts.js';
import { buildFilePlan } from '../cli/core/file-plan.js';
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
    expect(resolved.lintCommand).toBe('npm run lint');
    expect(resolved.typecheckCommand).toBe('npm run typecheck');
    expect(resolved.buildCommand).toBe('npm run build');
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
    expect(resolved.lintCommand).toBe('npm run lint');
    expect(resolved.typecheckCommand).toBe('npm run typecheck');
    expect(resolved.buildCommand).toBe('npm run build');
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
    expect(py.resolved.testCommand).toBe('pytest');

    const go = resolveWithDefaults({ profile: 'go' });
    expect(go.resolved.profile).toBe('golang');
    expect(go.resolved.testCommand).toBe('go test ./...');
  });

  it('sets install/dev/migration command defaults per profile', () => {
    const py = resolveWithDefaults({ profile: 'python' }).resolved;
    expect(py.installCommand).toBe('pip install -e ".[dev]"');
    expect(py.devCommand).toBe('none');
    expect(py.migrationCommand).toBe('none');

    const go = resolveWithDefaults({ profile: 'golang' }).resolved;
    expect(go.installCommand).toBe('go mod download');

    const laravel = resolveWithDefaults({ profile: 'laravel' }).resolved;
    expect(laravel.installCommand).toBe('composer install');
    expect(laravel.devCommand).toBe('php artisan serve');
    expect(laravel.migrationCommand).toBe('php artisan migrate');

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
      // Shipped copies must match the repo copy exactly.
      for (const profile of SUPPORTED_PROFILES) {
        expect(readFileSync(templatePath(profile, rel), 'utf-8')).toBe(repoHook);
      }
    }
  });
});

describe('generated package.json scripts', () => {
  // The pre-commit hook's Node block runs `npm run lint`, `npm run typecheck`,
  // and `npm test` whenever a package.json is present. A profile that ships a
  // package.json missing any of those — or with a `test` that can't run in a
  // fresh scaffold (e.g. `php artisan test`) — fails a team member's first
  // commit. This locks in that every package.json-bearing profile passes.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const profilesWithPackageJson = ['node', 'laravel'];
  for (const profile of profilesWithPackageJson) {
    it(`${profile} package.json defines lint, typecheck, and a fresh-scaffold-safe test`, () => {
      const pkg = JSON.parse(readFileSync(path.resolve(here, '../../templates', profile, 'package.json'), 'utf-8'));
      expect(pkg.scripts).toHaveProperty('lint');
      expect(pkg.scripts).toHaveProperty('typecheck');
      expect(pkg.scripts).toHaveProperty('test');
      // The Node block runs `npm test`; a fresh scaffold has no vendor/artisan,
      // so the test script must not require a full backend install to pass.
      expect(pkg.scripts.test).not.toMatch(/artisan|phpunit|pytest|go test/i);
    });
  }
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
