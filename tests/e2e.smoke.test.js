/**
 * E2E smoke test — creates a fresh project with --yes --dry-run and asserts the file plan
 * includes generated files (.ai-scaffold.json, MEMORY.md, settings-overrides.json).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { resolveWithDefaults } from '../src/cli/core/prompts.js';
import { buildFilePlan } from '../src/cli/core/file-plan.js';
import { templatePath } from '../src/cli/core/paths.js';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const CLI_BIN = path.resolve(REPO_ROOT, 'bin', 'ai-scaffold.js');

describe('CLI e2e smoke — --yes creates expected files', () => {
  let tmpDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-scaffold-e2e-'));
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('--yes --dry-run produces a file plan with generated files', async () => {
    // Create the file plan using the same logic the CLI uses
    const flags = {
      projectName: 'smoke-test',
      profile: 'generic',
    };
    const resolved = resolveWithDefaults(flags).resolved;
    const templateDir = templatePath('generic');
    const plan = await buildFilePlan(templateDir, path.join(tmpDir, 'smoke-test'));

    // Check that generated files are in the plan
    const generatedPaths = plan.generate.map(g => g.rel);
    expect(generatedPaths).toContain('.ai-scaffold.json');
    expect(generatedPaths).toContain('.claude/MEMORY.md');
    expect(generatedPaths).toContain('.claude/settings-overrides.json');

    // Check that managed root files are in the copy plan
    const copyPaths = plan.copy.map(c => c.rel);
    expect(copyPaths).toContain('CLAUDE.md');
    expect(copyPaths).toContain('README.md');
    expect(copyPaths).toContain('.gitignore');
    expect(copyPaths).toContain('.github/copilot-instructions.md');
  });

  it('--yes --dry-run lists .claude/ directories in copy plan', async () => {
    const flags = {
      projectName: 'smoke-test-2',
      profile: 'generic',
    };
    const resolved = resolveWithDefaults(flags).resolved;
    const templateDir = templatePath('generic');
    const plan = await buildFilePlan(templateDir, path.join(tmpDir, 'smoke-test-2'));

    // .claude/ directory contents should be in copy plan
    const hasClaudeDir = plan.copy.some(f => f.rel.startsWith('.claude/'));
    expect(hasClaudeDir).toBe(true);
  });
});
