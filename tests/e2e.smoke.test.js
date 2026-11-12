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

// These tests spawn the CLI as a subprocess, sometimes several times each. On
// windows-latest a single one took 9.6s, so vitest's 5s default is too tight.
describe('CLI e2e smoke', { timeout: 30_000 }, () => {
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

    // The index carries the bit on every platform, including Windows where
    // core.fileMode is false; without it Linux and macOS clones skip the hooks (item 66 d).
    const staged = spawnSync('git', ['-C', targetDir, 'ls-files', '-s', '.claude/hooks'], { encoding: 'utf-8' }).stdout;
    expect(staged).toMatch(/^100755 \S+ 0\t\.claude\/hooks\/commit-msg$/m);
    expect(staged).toMatch(/^100755 \S+ 0\t\.claude\/hooks\/pre-secret-guard\.sh$/m);
    expect(staged).toMatch(/^100644 \S+ 0\t\.claude\/hooks\/jira-sync\.py$/m);
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
    // Governance skeleton (item 61): init fills these in at root when the
    // existing project doesn't already have them — this fixture has neither,
    // so tasks/lessons.md + CHANGELOG.md are genuinely created, not skipped.
    expect(await fs.pathExists(path.join(targetDir, 'tasks', 'lessons.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'CHANGELOG.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '_ai'))).toBe(false);
  });

  it('init --yes leaves an existing CHANGELOG.md and tasks/lessons.md untouched', async () => {
    const targetDir = path.join(tmpDir, 'existing-governance-files');
    await fs.ensureDir(path.join(targetDir, 'tasks'));
    await fs.writeFile(path.join(targetDir, 'CHANGELOG.md'), '# Real project changelog\n');
    await fs.writeFile(path.join(targetDir, 'tasks', 'lessons.md'), '# Real project lessons\n');

    const result = runCli(['init', targetDir, '--yes', '--profile', 'node']);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(await fs.readFile(path.join(targetDir, 'CHANGELOG.md'), 'utf-8')).toBe('# Real project changelog\n');
    expect(await fs.readFile(path.join(targetDir, 'tasks', 'lessons.md'), 'utf-8')).toBe('# Real project lessons\n');
  });

  it('a repeat init keeps the records of protected files the first init wrote', async () => {
    const targetDir = path.join(tmpDir, 'repeat-init');
    await fs.ensureDir(targetDir);
    const manifestPath = path.join(targetDir, '.ai-scaffold.json');
    const kept = ['AGENTS.md', 'CHANGELOG.md', 'CLAUDE.md', 'constitution.md', 'tasks/lessons.md'];
    const recordsFor = (manifest) => manifest.managedFiles.filter((r) => kept.includes(r.path));

    const first = runCli(['init', targetDir, '--yes', '--profile', 'node']);
    expect(first.status, first.stderr || first.stdout).toBe(0);
    const before = recordsFor(await fs.readJson(manifestPath));
    expect(before.map((r) => r.path)).toEqual(kept);
    // An adopter edit between runs must stay detectable, so the record keeps
    // the hash the scaffold wrote rather than re-hashing the edited file.
    await fs.appendFile(path.join(targetDir, 'CLAUDE.md'), '\nLocal note.\n');

    const second = runCli(['init', targetDir, '--yes', '--profile', 'node']);
    expect(second.status, second.stderr || second.stdout).toBe(0);
    expect(recordsFor(await fs.readJson(manifestPath))).toEqual(before);
  });

  describe('init connects the shared rules without overwriting (item 84)', () => {
    const IMPORT_SECTION = /## AI Scaffold\n\nShared rules for AI assistants, added by `ais init`:\n\n@(\S+)\n$/;
    const read = (dir, rel) => fs.readFile(path.join(dir, rel), 'utf-8');
    const initIn = (dir, extra = []) => runCli(['init', dir, '--yes', '--profile', 'node', ...extra]);

    async function project(name, files) {
      const dir = path.join(tmpDir, name);
      await fs.ensureDir(dir);
      for (const [rel, text] of Object.entries(files)) await fs.writeFile(path.join(dir, rel), text);
      return dir;
    }

    it('neither file: writes both, CLAUDE.md imports the root AGENTS.md', async () => {
      const dir = await project('init-84-neither', {});
      const result = initIn(dir);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(await read(dir, 'CLAUDE.md')).toMatch(/^@AGENTS\.md$/m);
      expect(await fs.pathExists(path.join(dir, 'AGENTS.md'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, '.ai-scaffold', 'AGENTS.md'))).toBe(false);
      expect((await fs.readJson(path.join(dir, '.ai-scaffold.json'))).install).toEqual({ mode: 'init' });
    });

    it('CLAUDE.md only: appends the import, keeps the rest byte-for-byte, and a repeat init adds nothing', async () => {
      const mine = '# My rules\r\n\r\nUse tabs.\r\n';
      const dir = await project('init-84-claude-only', { 'CLAUDE.md': mine });
      const result = initIn(dir);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain('add an import of AGENTS.md');
      const after = await read(dir, 'CLAUDE.md');
      expect(after.startsWith(mine)).toBe(true);
      expect(after.slice(mine.length).replace(/\r\n/g, '\n')).toMatch(IMPORT_SECTION);
      expect(after.slice(mine.length)).not.toMatch(/[^\r]\n/);
      expect(after).toContain('@AGENTS.md');
      expect(await fs.pathExists(path.join(dir, 'AGENTS.md'))).toBe(true);

      const again = initIn(dir);
      expect(again.status, again.stderr || again.stdout).toBe(0);
      expect(await read(dir, 'CLAUDE.md')).toBe(after);
    });

    it('AGENTS.md only: keeps it, installs the core under .ai-scaffold/ and points CLAUDE.md there', async () => {
      const theirs = '# Our agent rules\n';
      const dir = await project('init-84-agents-only', { 'AGENTS.md': theirs });
      const result = initIn(dir);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain('AGENTS.md is yours and was kept');
      expect(await read(dir, 'AGENTS.md')).toBe(theirs);
      expect(await read(dir, '.ai-scaffold/AGENTS.md')).toMatch(/\S/);
      const claude = await read(dir, 'CLAUDE.md');
      expect(claude).toMatch(/^@\.ai-scaffold\/AGENTS\.md$/m);
      expect(claude).not.toMatch(/^@AGENTS\.md$/m);
      const manifest = await fs.readJson(path.join(dir, '.ai-scaffold.json'));
      expect(manifest.install).toEqual({ mode: 'init', agentsCore: '.ai-scaffold/AGENTS.md' });
      const recorded = manifest.managedFiles.map((record) => record.path);
      expect(recorded).toContain('.ai-scaffold/AGENTS.md');
      expect(recorded).toContain('CLAUDE.md');
      expect(recorded).not.toContain('AGENTS.md');

      const manifestPath = path.join(dir, '.ai-scaffold.json');
      // A repeat init keeps the recorded location even though the scaffold's
      // own files now exist.
      const again = initIn(dir);
      expect(again.status, again.stderr || again.stdout).toBe(0);
      expect(await read(dir, 'AGENTS.md')).toBe(theirs);
      expect(await read(dir, 'CLAUDE.md')).toBe(claude);
      expect((await fs.readJson(manifestPath)).install.agentsCore).toBe('.ai-scaffold/AGENTS.md');

      // After the repeat init, update re-renders from the manifest: the
      // scaffold's files are unchanged and the adopter's AGENTS.md is not
      // touched. An older recorded version makes update plan, not "current".
      await fs.writeJson(manifestPath, { ...(await fs.readJson(manifestPath)), version: '0.18.0' }, { spaces: 2 });
      const preview = runCli(['update', dir, '--dry-run', '--json']);
      const doc = JSON.parse(preview.stdout);
      expect(doc.status, preview.stdout).toBe('planned');
      const actionOf = (rel) => doc.entries.find((entry) => entry.path === rel)?.action;
      expect(actionOf('CLAUDE.md')).toBe('unchanged');
      expect(actionOf('.ai-scaffold/AGENTS.md')).toBe('unchanged');
      expect(actionOf('AGENTS.md')).toBe('skip-unowned');
    });

    it('both files: keeps AGENTS.md, namespaces the core and appends the import to CLAUDE.md', async () => {
      const dir = await project('init-84-both', { 'CLAUDE.md': '# Mine\n', 'AGENTS.md': '# Theirs\n' });
      const result = initIn(dir);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(await read(dir, 'AGENTS.md')).toBe('# Theirs\n');
      const claude = await read(dir, 'CLAUDE.md');
      expect(claude).toMatch(IMPORT_SECTION);
      expect(claude.match(IMPORT_SECTION)[1]).toBe('.ai-scaffold/AGENTS.md');
      expect(await fs.pathExists(path.join(dir, '.ai-scaffold', 'AGENTS.md'))).toBe(true);
    });

    it('--dry-run --json reports the decision and writes nothing', async () => {
      const dir = await project('init-84-json', { 'CLAUDE.md': '# Mine\n', 'AGENTS.md': '# Theirs\n' });
      const result = runCli(['init', dir, '--dry-run', '--json', '--profile', 'node']);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(JSON.parse(result.stdout).claudeImport).toEqual({ action: 'add', core: '.ai-scaffold/AGENTS.md' });
      expect(await read(dir, 'CLAUDE.md')).toBe('# Mine\n');
      expect(await fs.pathExists(path.join(dir, '.ai-scaffold'))).toBe(false);
    });
  });

  it('update preview does not mutate installed metadata', async () => {
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

    const before = await fs.readFile(manifestPath, 'utf-8');
    const previewResult = runCli(['update', targetDir, '--dry-run', '--json']);
    expect([0, 2], previewResult.stderr || previewResult.stdout).toContain(previewResult.status);
    expect(JSON.parse(previewResult.stdout)).toMatchObject({ schema: 'ais-update-preview/1', status: 'planned', from: '0.7.1' });

    const mismatch = runCli(['update', targetDir, '--target-version', '0.8.0']);
    expect(mismatch.status).toBe(1);
    expect(mismatch.stderr).toContain('npx @lajin.m/ai-scaffold@0.8.0 update');

    const removed = runCli(['update', targetDir, '--force']);
    expect(removed.status).toBe(1);
    expect(removed.stderr).toContain('--force was removed');
    expect(await fs.readFile(manifestPath, 'utf-8')).toBe(before);
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
