/**
 * Item 25 slice 2: context-aware ownership (BRD §3, FR-42).
 */
import { describe, expect, it } from 'vitest';
import { classifyPath, INSTALL_MODES } from '../cli/core/ownership.js';
import { PROTECTED_PATHS } from '../cli/core/file-plan.js';

const created = { installMode: 'create', recorded: true };

describe('classifyPath: the OC table', () => {
  it.each([
    ['.ai-scaffold.json', 'excluded'],
    ['.ai-scaffold/backups/2026-10-15T00-00-00Z/CLAUDE.md', 'excluded'],
    ['.ai-scaffold/update.lock', 'excluded'],
    ['.claude/memory/project-context.md', 'user-data'],
    ['.claude/MEMORY.md', 'user-data'],
    ['.claude/settings-overrides.json', 'user-data'],
    ['.claude/settings.local.json', 'user-data'],
    ['.ai-scaffold/context.md', 'user-data'],
    ['tasks/lessons.md', 'user-data'],
    ['CHANGELOG.md', 'seeded'],
    ['tasks/todo/.gitkeep', 'seeded'],
    ['tasks/done/.gitkeep', 'seeded'],
    ['.claude/settings.json', 'merged'],
    ['CLAUDE.md', 'managed'],
    ['AGENTS.md', 'managed'],
    ['constitution.md', 'managed'],
    ['.ai-scaffold/README.md', 'managed'],
    ['.claude/rules/security-rules.md', 'managed'],
    ['.claude/hooks/pre-commit', 'managed'],
  ])('%s is %s', (rel, expected) => {
    expect(classifyPath(rel, created)).toBe(expected);
  });

  it.each([
    'README.md', '.gitignore', '.gitattributes', 'package.json', 'composer.json',
    'routes/web.php', 'database/migrations/0001_create_users.php', 'public/index.php',
    'src/index.js', '.github/workflows/ci.yml', 'docs/brd/x.md',
  ])('application file %s is unowned even when recorded by create', (rel) => {
    expect(classifyPath(rel, created)).toBe('unowned');
  });

  it('normalises backslashes, a leading ./, doubled slashes and inner ..', () => {
    expect(classifyPath('.claude\\rules\\x.md', created)).toBe('managed');
    expect(classifyPath('./CLAUDE.md', created)).toBe('managed');
    expect(classifyPath('.claude//memory/x.md', created)).toBe('user-data');
    expect(classifyPath('.claude/rules/../memory/x.md', created)).toBe('user-data');
  });

  it.each(['/etc/passwd', 'C:/Windows/x', 'C:\\Windows\\x', '../outside.md', 'a/../../outside.md', '..'])(
    'throws for a path outside the project: %s',
    (rel) => {
      expect(() => classifyPath(rel, created)).toThrow(TypeError);
    },
  );
});

describe('classifyPath: install-mode context (FR-42)', () => {
  const protectedManaged = ['CLAUDE.md', 'AGENTS.md', 'constitution.md'];

  it.each(protectedManaged)('unrecorded %s in init is the adopter file: unowned', (rel) => {
    expect(classifyPath(rel, { installMode: 'init', recorded: false })).toBe('unowned');
  });

  it.each(protectedManaged)('unrecorded %s in unknown mode is unowned', (rel) => {
    expect(classifyPath(rel, { installMode: 'unknown', recorded: false })).toBe('unowned');
  });

  it.each(protectedManaged)('recorded %s in init (init wrote it) is managed', (rel) => {
    expect(classifyPath(rel, { installMode: 'init', recorded: true })).toBe('managed');
  });

  it.each(protectedManaged)('unrecorded %s in create stays managed (a later conflict, FR-08)', (rel) => {
    expect(classifyPath(rel, { installMode: 'create', recorded: false })).toBe('managed');
  });

  it('unprotected managed paths are managed in init with or without a record', () => {
    for (const recorded of [true, false]) {
      expect(classifyPath('.claude/rules/x.md', { installMode: 'init', recorded })).toBe('managed');
      expect(classifyPath('.ai-scaffold/README.md', { installMode: 'init', recorded })).toBe('managed');
    }
  });

  it('protected paths of other classes keep their class in init', () => {
    const ctx = { installMode: 'init', recorded: false };
    expect(classifyPath('CHANGELOG.md', ctx)).toBe('seeded');
    expect(classifyPath('tasks/lessons.md', ctx)).toBe('user-data');
    expect(classifyPath('.ai-scaffold.json', ctx)).toBe('excluded');
    expect(classifyPath('README.md', ctx)).toBe('unowned');
  });

  it('the protected-managed set is exactly what PROTECTED_PATHS yields today', () => {
    const literal = PROTECTED_PATHS.filter((p) => !p.includes('*'));
    const unownedInInit = literal.filter((rel) =>
      classifyPath(rel, created) === 'managed'
      && classifyPath(rel, { installMode: 'init', recorded: false }) === 'unowned');
    expect(unownedInInit.sort()).toEqual([...protectedManaged].sort());
  });
});

describe('classifyPath: invalid context', () => {
  it.each([undefined, 'Create', 'update', ''])('throws for installMode %s', (installMode) => {
    expect(() => classifyPath('CLAUDE.md', { installMode, recorded: true })).toThrow(TypeError);
  });

  it('throws with no context at all', () => {
    expect(() => classifyPath('CLAUDE.md')).toThrow(TypeError);
  });

  it('exports the three install modes', () => {
    expect(INSTALL_MODES).toEqual(['create', 'init', 'unknown']);
  });
});
