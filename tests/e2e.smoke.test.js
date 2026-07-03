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
    expect(await fs.pathExists(path.join(targetDir, 'README.md'))).toBe(true);

    const readme = await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('Bare create smoke');
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
  });
});
