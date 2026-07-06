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
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'HOW-TO-USE.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs', 'architecture', 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'tasks', 'lessons.md'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'HOW-TO-USE.md'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'CONTRIBUTING.md'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'tasks'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '_ai'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'apps'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'packages'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'infra'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'scripts'))).toBe(false);

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
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs'))).toBe(true);

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
    expect(await fs.pathExists(path.join(targetDir, '.ai-scaffold', 'docs'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'docs'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, 'tasks'))).toBe(false);
    expect(await fs.pathExists(path.join(targetDir, '_ai'))).toBe(false);
  });
});
