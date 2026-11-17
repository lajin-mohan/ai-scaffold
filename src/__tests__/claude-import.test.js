import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  applyClaudeImport,
  chooseAgentsCore,
  decideClaudeImport,
  hasCoreImport,
  NAMESPACED_CORE,
  pointImportAt,
  ROOT_CORE,
  withCoreImport,
} from '../cli/core/claude-import.js';

describe('hasCoreImport', () => {
  it('finds either core location, with or without ./', () => {
    expect(hasCoreImport('# x\n@AGENTS.md\n')).toBe(true);
    expect(hasCoreImport('@./AGENTS.md')).toBe(true);
    expect(hasCoreImport('a\r\n@.ai-scaffold/AGENTS.md\r\n')).toBe(true);
  });

  it('ignores mentions that are not an import line', () => {
    expect(hasCoreImport('See @AGENTS.md for rules')).toBe(false);
    expect(hasCoreImport('`@AGENTS.md`')).toBe(false);
    expect(hasCoreImport('')).toBe(false);
    expect(hasCoreImport(null)).toBe(false);
  });
});

describe('chooseAgentsCore', () => {
  it('keeps the recorded choice on a repeat init', () => {
    const manifest = { install: { mode: 'init', agentsCore: NAMESPACED_CORE } };
    expect(chooseAgentsCore({ manifest, agentsExists: true })).toBe(NAMESPACED_CORE);
    expect(chooseAgentsCore({ manifest: { install: { mode: 'init' } }, agentsExists: true })).toBe(ROOT_CORE);
  });

  it('namespaces the core when the adopter already has AGENTS.md', () => {
    expect(chooseAgentsCore({ manifest: null, agentsExists: true })).toBe(NAMESPACED_CORE);
    expect(chooseAgentsCore({ manifest: null, agentsExists: false })).toBe(ROOT_CORE);
  });

  it('uses the root core with --force', () => {
    expect(chooseAgentsCore({ manifest: null, agentsExists: true, force: true })).toBe(ROOT_CORE);
  });
});

describe('pointImportAt', () => {
  const text = '# CLAUDE\n\n@AGENTS.md\n\nmore\n';

  it('rewrites the import line only when the core is namespaced', () => {
    expect(pointImportAt(text, ROOT_CORE)).toBe(text);
    expect(pointImportAt(text, undefined)).toBe(text);
    expect(pointImportAt(text, NAMESPACED_CORE)).toBe('# CLAUDE\n\n@.ai-scaffold/AGENTS.md\n\nmore\n');
  });
});

describe('withCoreImport', () => {
  it('appends one section after a blank line, keeping LF', () => {
    const out = withCoreImport('# Mine\n', NAMESPACED_CORE);
    expect(out).toBe('# Mine\n\n## AI Scaffold\n\nShared rules for AI assistants, added by `ais init`:\n\n@.ai-scaffold/AGENTS.md\n');
  });

  it('keeps CRLF and handles a file with no final newline', () => {
    const out = withCoreImport('# Mine\r\nbody', ROOT_CORE);
    expect(out.startsWith('# Mine\r\nbody\r\n\r\n## AI Scaffold\r\n')).toBe(true);
    expect(out.endsWith('@AGENTS.md\r\n')).toBe(true);
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('does not add extra blank lines to an empty file or one ending in a blank line', () => {
    expect(withCoreImport('', ROOT_CORE).startsWith('## AI Scaffold')).toBe(true);
    expect(withCoreImport('a\n\n', ROOT_CORE).startsWith('a\n\n## AI Scaffold')).toBe(true);
  });
});

describe('decideClaudeImport / applyClaudeImport', () => {
  let dir;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-claude-import-')); });
  afterEach(async () => { await fs.remove(dir); });

  it('lets the scaffold write CLAUDE.md when there is none, or with --force', async () => {
    expect(await decideClaudeImport(dir, ROOT_CORE)).toEqual({ action: 'scaffold-writes', core: ROOT_CORE });
    await fs.writeFile(path.join(dir, 'CLAUDE.md'), '# Mine\n');
    expect((await decideClaudeImport(dir, ROOT_CORE, { force: true })).action).toBe('scaffold-writes');
  });

  it('adds the import once and is idempotent', async () => {
    const file = path.join(dir, 'CLAUDE.md');
    await fs.writeFile(file, '# Mine\n');
    const decision = await decideClaudeImport(dir, NAMESPACED_CORE);
    expect(decision.action).toBe('add');
    expect(await applyClaudeImport(dir, decision)).toBe(true);
    const once = await fs.readFile(file, 'utf-8');
    expect(once.startsWith('# Mine\n')).toBe(true);
    expect(hasCoreImport(once)).toBe(true);

    expect((await decideClaudeImport(dir, NAMESPACED_CORE)).action).toBe('present');
    expect(await applyClaudeImport(dir, decision)).toBe(false);
    expect(await fs.readFile(file, 'utf-8')).toBe(once);
  });

  it('respects a hand-written import', async () => {
    await fs.writeFile(path.join(dir, 'CLAUDE.md'), '# Mine\n@AGENTS.md\n');
    expect((await decideClaudeImport(dir, NAMESPACED_CORE)).action).toBe('present');
  });

  it('reports a symlinked CLAUDE.md and leaves it alone', async (ctx) => {
    await fs.writeFile(path.join(dir, 'AGENTS.md'), '# Agents\n');
    try {
      await fs.symlink('AGENTS.md', path.join(dir, 'CLAUDE.md'));
    } catch {
      ctx.skip(); // Windows without symlink privilege
    }
    const decision = await decideClaudeImport(dir, NAMESPACED_CORE);
    expect(decision.action).toBe('symlink');
    expect(await applyClaudeImport(dir, decision)).toBe(false);
    expect(await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf-8')).toBe('# Agents\n');
  });
});
