// Item 112: PROJECT.md loading, claudeMdExcludes and the security floor.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  buildStarterProject,
  checkProjectContent,
  excludes,
  hasProjectImport,
  PROJECT_IMPORT_LINE,
} from '../cli/core/project-content.js';
import { applySettingsChanges } from '../cli/core/settings-apply.js';
import { decideSettingsMerge } from '../cli/core/settings-merge.js';

let dir;
let home;

beforeEach(async () => {
  dir = fs.realpathSync.native(await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-')));
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-home-'));
  await fs.outputFile(path.join(dir, 'CLAUDE.md'), '# Claude\n\n@AGENTS.md\n@PROJECT.md\n');
  await fs.outputFile(path.join(dir, 'AGENTS.md'), '# Agents\n');
  await fs.outputFile(path.join(dir, 'PROJECT.md'), '# Project\n');
  for (const rule of ['security-rules.md', 'branching-rules.md', 'ux-rules.md']) {
    await fs.outputFile(path.join(dir, '.claude', 'rules', rule), `# ${rule}\n`);
  }
  await fs.outputFile(path.join(dir, '.claude', 'rules', 'project', 'ux.md'), '# Our UX\n');
});

afterEach(async () => {
  await fs.remove(dir);
  await fs.remove(home);
});

const run = () => checkProjectContent(dir, { homeDir: home });
const named = (checks, prefix) => checks.find((c) => c.name.startsWith(prefix));
const setExcludes = (file, patterns) => fs.outputJson(file, { claudeMdExcludes: patterns });

describe('hasProjectImport and the starter', () => {
  it('finds only a real import line', () => {
    expect(hasProjectImport('@PROJECT.md\n')).toBe(true);
    expect(hasProjectImport('x\r\n@./PROJECT.md\r\n')).toBe(true);
    expect(hasProjectImport('See @PROJECT.md for context')).toBe(false);
    expect(hasProjectImport(null)).toBe(false);
  });

  it('starter names the project and the safe places for its content', () => {
    const text = buildStarterProject({ displayName: 'Acme' });
    expect(text.startsWith('# Acme — project context\n')).toBe(true);
    expect(text).toContain('.claude/rules/project/');
    expect(text).not.toMatch(/\{\{/);
  });
});

describe('doctor: project context loaded', () => {
  it('passes with the import and the file present', async () => {
    expect(named(await run(), 'Project context').passed).toBe(true);
  });

  it('prints the exact line to add when CLAUDE.md lacks the import', async () => {
    await fs.writeFile(path.join(dir, 'CLAUDE.md'), '# Claude\n\n@AGENTS.md\n');
    const check = named(await run(), 'Project context');
    expect(check).toMatchObject({ passed: false, severity: 'medium' });
    expect(check.message).toContain(`Add this line to CLAUDE.md: ${PROJECT_IMPORT_LINE}`);
  });

  it('says how to restore a missing PROJECT.md', async () => {
    await fs.remove(path.join(dir, 'PROJECT.md'));
    expect(named(await run(), 'Project context').message).toContain('ais update --apply');
  });
});

describe('doctor: claudeMdExcludes', () => {
  it('passes with no excludes, and ignores the project\'s own rules', async () => {
    await setExcludes(path.join(dir, '.claude', 'settings.json'), ['**/.claude/rules/project/**']);
    const checks = await run();
    expect(named(checks, 'Security floor').passed).toBe(true);
    expect(named(checks, 'Scaffold rules replaced').passed).toBe(true);
  });

  it('fails high when a floor rule is excluded from any settings layer', async () => {
    for (const file of [
      path.join(dir, '.claude', 'settings.json'),
      path.join(dir, '.claude', 'settings.local.json'),
      path.join(home, '.claude', 'settings.json'),
    ]) {
      await setExcludes(file, ['**/security-rules.md']);
      const check = named(await run(), 'Security floor');
      expect(check, file).toMatchObject({ passed: false, severity: 'high' });
      expect(check.message).toContain('.claude/rules/security-rules.md');
      await fs.remove(file);
    }
  });

  it('fails when AGENTS.md itself is excluded', async () => {
    await setExcludes(path.join(dir, '.claude', 'settings.json'), [path.join(dir, 'AGENTS.md')]);
    expect(named(await run(), 'Security floor').message).toContain('AGENTS.md');
  });

  it('warns, without failing the floor, when an ordinary rule is replaced', async () => {
    await setExcludes(path.join(dir, '.claude', 'settings.json'), ['**/.claude/rules/ux-rules.md']);
    const checks = await run();
    expect(named(checks, 'Security floor').passed).toBe(true);
    expect(named(checks, 'Scaffold rules replaced')).toMatchObject({ passed: false, severity: 'medium' });
  });

  it('survives unreadable settings and non-string patterns', async () => {
    await fs.outputFile(path.join(dir, '.claude', 'settings.json'), '{ not json');
    await setExcludes(path.join(dir, '.claude', 'settings.local.json'), [42, null, '']);
    expect(named(await run(), 'Security floor').passed).toBe(true);
  });
});

describe('excludes: glob semantics', () => {
  const file = path.join(path.sep, 'repo', '.claude', 'rules', 'ux-rules.md');

  it('** spans directories; * and ? stay within one segment', () => {
    expect(excludes('**/ux-rules.md', file)).toBe(true);
    expect(excludes('/repo/.claude/rules/*.md', file.split(path.sep).join('/'))).toBe(true);
    expect(excludes('/repo/*/ux-rules.md', file.split(path.sep).join('/'))).toBe(false);
    expect(excludes('**/ux-rules.m?', file)).toBe(true);
  });

  it('treats regex characters literally', () => {
    expect(excludes('**/ux-rules.md', path.join(path.sep, 'repo', 'ux-rulesXmd'))).toBe(false);
    expect(excludes('**/(ux)-rules.md', file)).toBe(false);
  });
});

describe('settings merge keeps claudeMdExcludes', () => {
  it('a scaffold update leaves the adopter key untouched', () => {
    const local = {
      claudeMdExcludes: ['**/.claude/rules/ux-rules.md'],
      permissions: { deny: ['Read(.env)'] },
    };
    const scaffold = { permissions: { deny: ['Read(.env)', 'Read(.npmrc)'] } };
    const decision = decideSettingsMerge({ local, localValid: true, scaffold, baseState: 'derived', exceptions: new Set() });
    const merged = applySettingsChanges(local, decision.changes);
    expect(merged.claudeMdExcludes).toEqual(['**/.claude/rules/ux-rules.md']);
    expect(merged.permissions.deny).toContain('Read(.npmrc)');
  });
});
