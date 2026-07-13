/**
 * E2E smoke tests that spawn the real CLI entrypoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI_BIN = path.join(REPO_ROOT, 'bin', 'ai-scaffold.js');

function runCli(args) {
  return spawnSync(process.execPath, [CLI_BIN, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
  });
}

describe('CLI e2e smoke', () => {
  let tmpDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-scaffold-e2e-'));
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('bare project command creates generated files and resolves README placeholders', async () => {
    const targetDir = path.join(tmpDir, 'bare-create');
    const result = runCli([
      targetDir,
      '--yes',
      '--purpose',
      'Bare create smoke',
      '--owner-email',
      'test@example.com',
      '--backend-stack',
      'Node.js',
      '--frontend-stack',
      'None',
      '--database',
      'N/A',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'MEMORY.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'settings-overrides.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'pre-secret-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'pre-dangerous-bash-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'governance-file-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'context.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'tasks'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', '_ai'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'HOW-TO-USE.md'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'CONTRIBUTING.md'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '_ai'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'apps'))).toBe(false);

    // Governance skeleton ships on create so the CLAUDE.md workflow refs resolve
    expect(await fs.pathExists(path.join(targetDir, 'tasks', 'lessons.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'tasks', 'todo', '.gitkeep'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'CHANGELOG.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.gitattributes'))).toBe(true);
    // .gitignore ships as template `gitignore` (npm strips dotfiles) and is
    // renamed to `.gitignore` on copy — the actual file must exist, not the stub.
    expect(await fs.pathExists(path.join(targetDir, '.gitignore'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'gitignore'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'packages'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'infra'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'scripts'))).toBe(false);

    const gitHead = spawnSync('git', ['-C', targetDir, 'rev-parse', '--verify', 'HEAD'], { encoding: 'utf-8' });
    expect(gitHead.status, gitHead.stderr || gitHead.stdout).toBe(0);

    const readme = await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('Bare create smoke');
    expect(readme).not.toMatch(/\{\{[^}]+\}\}/);

    const settings = await fs.readFile(path.join(targetDir, '.claude', 'settings.json'), 'utf-8');
    expect(settings).toContain('pre-secret-guard.sh');
    expect(settings).toContain('pre-dangerous-bash-guard.sh');
    expect(settings).toContain('governance-file-guard.sh');

    const memory = await fs.readFile(path.join(targetDir, '.claude', 'MEMORY.md'), 'utf-8');
    expect(memory).toContain('Project memory only');
    expect(memory).toContain('production data');
    expect(memory).toContain('client-confidential text');

    const manifest = await fs.readJson(path.join(targetDir, '.ai-scaffold.json'));
    expect(manifest.project.kind).toBe('saas');
    expect(manifest.project.lifecycleStage).toBe('active-development');
    expect(manifest.risk.complianceScope).toEqual([]);
  });

  it('create --no-git skips git initialization', async () => {
    const targetDir = path.join(tmpDir, 'no-git-create');
    const result = runCli([
      'create',
      targetDir,
      '--yes',
      '--no-git',
      '--purpose',
      'No git smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(await fs.pathExists(path.join(targetDir, '.git'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.gitattributes'))).toBe(true);
  });

  it('create wires .claude/hooks/pre-commit into .git/hooks so out-of-band commits are gated (item 54)', async () => {
    const targetDir = path.join(tmpDir, 'hook-wired-create');
    const result = runCli([
      'create',
      targetDir,
      '--profile',
      'node',
      '--yes',
      '--purpose',
      'Hook wiring smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);

    const source = path.join(targetDir, '.claude', 'hooks', 'pre-commit');
    const installed = path.join(targetDir, '.git', 'hooks', 'pre-commit');
    expect(await fs.pathExists(installed)).toBe(true);
    expect(await fs.readFile(installed, 'utf-8')).toBe(await fs.readFile(source, 'utf-8'));

    // Not Windows-portable (exec bits are POSIX-only) — skip the mode assertion there;
    // installPreCommitHook() is still exercised end-to-end by the assertions above.
    if (process.platform !== 'win32') {
      const mode = (await fs.stat(installed)).mode & 0o777;
      expect(mode & 0o100).toBe(0o100); // owner-executable
    }

    // The initial scaffold commit must still succeed — installPreCommitHook runs
    // AFTER the initial commit precisely so the newly-installed hook can never
    // block project creation itself (see create.js comment).
    const gitHead = spawnSync('git', ['-C', targetDir, 'rev-parse', '--verify', 'HEAD'], { encoding: 'utf-8' });
    expect(gitHead.status, gitHead.stderr || gitHead.stdout).toBe(0);
  });

  it('create --dry-run --json prints a plan and writes nothing', async () => {
    const targetDir = path.join(tmpDir, 'json-create');
    const result = runCli([
      'create',
      targetDir,
      '--yes',
      '--profile',
      'node',
      '--dry-run',
      '--json',
      '--purpose',
      'JSON create smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan).toMatchObject({
      command: 'create',
      dryRun: true,
      profile: 'node',
      existingTarget: false,
    });
    expect(plan.defaultedValues).toContain('projectType');
    expect(plan.files.generate.map((file) => file.path)).toContain('README.md');
    expect(plan.files.copy.some((file) => file.path === '.claude/settings.json')).toBe(true);
    expect(await fs.pathExists(targetDir)).toBe(false);
  });

  it('init --dry-run --json prints a plan and preserves the target', async () => {
    const targetDir = path.join(tmpDir, 'json-init');
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'README.md'), '# Existing project\n');

    const result = runCli([
      'init',
      targetDir,
      '--yes',
      '--profile',
      'python',
      '--dry-run',
      '--json',
      '--purpose',
      'JSON init smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan).toMatchObject({
      command: 'init',
      dryRun: true,
      profile: 'python',
      existingTarget: true,
    });
    expect(plan.files.generate.map((file) => file.path)).toContain('.ai-scaffold/README.md');
    expect(plan.files.copy.some((file) => file.path === '.claude/settings.json')).toBe(true);
    expect(await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8')).toBe('# Existing project\n');
    expect(await fs.pathExists(path.join(targetDir, '.claude'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold.json'))).toBe(false);
  });

  it('creates a Node.js project through the JavaScript profile alias', async () => {
    const targetDir = path.join(tmpDir, 'node-create');
    const result = runCli([
      'create',
      targetDir,
      '--yes',
      '--profile',
      'javascript',
      '--purpose',
      'Node profile smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);

    const manifest = await fs.readJson(path.join(targetDir, '.ai-scaffold.json'));
    expect(manifest.profile).toBe('node');
    expect(await fs.pathExists(path.join(targetDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'context.md'))).toBe(true);

    const readme = await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('Node profile smoke');
    expect(readme).toContain('npm install');
    expect(readme).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('init --yes preserves existing protected files without --force', async () => {
    const targetDir = path.join(tmpDir, 'existing-project');
    const workflowDir = path.join(targetDir, '.github', 'workflows');
    await fs.ensureDir(workflowDir);
    await fs.writeFile(path.join(targetDir, 'README.md'), '# Existing README\n');
    await fs.writeJson(path.join(targetDir, 'package.json'), {
      name: 'existing-app',
      scripts: { test: 'existing-test' },
    }, { spaces: 2 });
    await fs.writeJson(path.join(targetDir, '.ai-scaffold.json'), {
      version: 'existing',
      profile: 'custom',
    }, { spaces: 2 });
    await fs.writeFile(path.join(workflowDir, 'ci.yml'), 'name: existing-ci\n');

    const result = runCli([
      'init',
      targetDir,
      '--yes',
      '--profile',
      'generic',
      '--purpose',
      'Init smoke',
      '--owner-email',
      'test@example.com',
      '--backend-stack',
      'Node.js',
      '--frontend-stack',
      'React',
      '--database',
      'PostgreSQL',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8')).toBe('# Existing README\n');
    expect(await fs.readJson(path.join(targetDir, 'package.json'))).toMatchObject({
      name: 'existing-app',
      scripts: { test: 'existing-test' },
    });
    expect(await fs.readJson(path.join(targetDir, '.ai-scaffold.json'))).toMatchObject({
      version: 'existing',
      profile: 'custom',
    });
    expect(await fs.readFile(path.join(workflowDir, 'ci.yml'), 'utf-8')).toBe('name: existing-ci\n');
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'MEMORY.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'pre-secret-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'pre-dangerous-bash-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.claude', 'hooks', 'governance-file-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'context.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'tasks'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', '_ai'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'tasks'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '_ai'))).toBe(false);
  });

  it('update placeholder does not mutate installed metadata', async () => {
    const targetDir = path.join(tmpDir, 'update-placeholder');
    const createResult = runCli([
      'create',
      targetDir,
      '--yes',
      '--purpose',
      'Update placeholder smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(createResult.status, createResult.stderr || createResult.stdout).toBe(0);

    const manifestPath = path.join(targetDir, '.ai-scaffold.json');
    const manifest = await fs.readJson(manifestPath);
    manifest.version = '0.7.1';
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    const dryRunResult = runCli(['update', targetDir, '--dry-run']);
    expect(dryRunResult.status, dryRunResult.stderr || dryRunResult.stdout).toBe(0);
    expect(await fs.readJson(manifestPath)).toMatchObject({ version: '0.7.1' });

    const updateResult = runCli(['update', targetDir, '--target-version', '0.8.0']);
    expect(updateResult.status).toBe(1);
    expect(updateResult.stderr).toContain('not implemented yet');
    expect(await fs.readJson(manifestPath)).toMatchObject({ version: '0.7.1' });
  });

  it('doctor reports invalid stored context values', async () => {
    const targetDir = path.join(tmpDir, 'invalid-context-doctor');
    const createResult = runCli([
      'create',
      targetDir,
      '--yes',
      '--purpose',
      'Doctor invalid context smoke',
      '--owner-email',
      'test@example.com',
    ]);

    expect(createResult.status, createResult.stderr || createResult.stdout).toBe(0);

    const manifestPath = path.join(targetDir, '.ai-scaffold.json');
    const manifest = await fs.readJson(manifestPath);
    manifest.project.kind = 'platform';
    manifest.risk.complianceScope = ['GDPR', 'BOGUSSCOPE'];
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    const doctorResult = runCli(['doctor', targetDir, '--json']);
    expect(doctorResult.status, doctorResult.stderr || doctorResult.stdout).toBe(0);
    const diagnostics = JSON.parse(doctorResult.stdout);
    const contextCheck = diagnostics.checks.find((check) => check.name === 'Setup context values are meaningful');
    expect(contextCheck.passed).toBe(false);
    expect(contextCheck.message).toContain('project.kind');
    expect(contextCheck.message).toContain('BOGUSSCOPE');
  });

  it('export-context backs up memory/lessons/settings outside the project so they survive delete-and-reinstall (item 56)', async () => {
    const targetDir = path.join(tmpDir, 'export-context-project');
    const createResult = runCli([
      'create',
      targetDir,
      '--yes',
      '--purpose',
      'Export context smoke',
      '--owner-email',
      'test@example.com',
    ]);
    expect(createResult.status, createResult.stderr || createResult.stdout).toBe(0);

    const lessonsPath = path.join(targetDir, 'tasks', 'lessons.md');
    await fs.appendFile(lessonsPath, '\n- Accumulated pilot lesson, not re-derivable.\n');

    const backupDir = path.join(tmpDir, 'export-context-backup');
    const result = runCli(['export-context', targetDir, '--out', backupDir, '--json']);
    expect(result.status, result.stderr || result.stdout).toBe(0);

    const manifest = JSON.parse(result.stdout);
    expect(manifest.copied).toEqual(
      expect.arrayContaining(['tasks/lessons.md', '.claude/MEMORY.md', '.claude/rules', '.ai-scaffold/context.md']),
    );

    const backedUpLessons = await fs.readFile(path.join(backupDir, 'tasks', 'lessons.md'), 'utf-8');
    expect(backedUpLessons).toContain('Accumulated pilot lesson, not re-derivable.');

    // The whole point: the backup must survive the project it was copied from
    // being deleted (the delete-and-reinstall workaround this safeguards).
    await fs.remove(targetDir);
    expect(await fs.pathExists(targetDir)).toBe(false);
    expect(await fs.pathExists(backupDir)).toBe(true);
    expect(await fs.readFile(path.join(backupDir, 'tasks', 'lessons.md'), 'utf-8')).toContain(
      'Accumulated pilot lesson, not re-derivable.',
    );
  });

  it('export-context reports nothing to back up outside a scaffold-managed directory', async () => {
    const emptyDir = path.join(tmpDir, 'export-context-empty');
    await fs.ensureDir(emptyDir);
    const backupDir = path.join(tmpDir, 'export-context-empty-backup');

    const result = runCli(['export-context', emptyDir, '--out', backupDir, '--json']);
    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout);
    expect(manifest.copied).toEqual([]);
  });
});
