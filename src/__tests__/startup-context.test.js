import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  measureStartupContext, frontmatter, importTargets, duplicatedLines, CODEX_DEFAULT_MAX_BYTES,
} from '../cli/core/startup-context.js';

let root;

function write(rel, text) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

const surface = (key) => measureStartupContext(root).surfaces.find((s) => s.key === key);
const paths = (key) => surface(key).files.map((f) => f.path);

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-context-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('frontmatter and imports', () => {
  it('reads flat front-matter keys and strips quotes', () => {
    expect(frontmatter('---\nname: x\ndescription: "Does y"\n---\nbody')).toEqual({ name: 'x', description: 'Does y' });
  });

  it('returns no fields when the file has no front matter', () => {
    expect(frontmatter('# Title\nname: x')).toEqual({});
  });

  it('ignores @imports inside code spans and fenced blocks', () => {
    const text = 'See @docs/a.md\nUse `@docs/b.md` here\n```\n@docs/c.md\n```\nemail me@example.com';
    expect(importTargets(text)).toEqual(['docs/a.md']);
  });
});

describe('Claude Code surface', () => {
  it('counts CLAUDE.md, its imports and unscoped rules but not paths-scoped rules', () => {
    write('CLAUDE.md', '# Core\n@docs/extra.md\n');
    write('docs/extra.md', 'extra');
    write('.claude/rules/always.md', '# Always');
    write('.claude/rules/stacks/nested.md', '# Nested, still unscoped');
    write('.claude/rules/scoped.md', '---\npaths:\n  - "src/**"\n---\n# Scoped');
    expect(paths('claude-code')).toEqual(
      ['CLAUDE.md', 'docs/extra.md', '.claude/rules/always.md', '.claude/rules/stacks/nested.md'],
    );
  });

  it('counts only descriptions for skills and omits model-invocation-disabled skills', () => {
    write('.claude/skills/a/SKILL.md', '---\nname: a\ndescription: abcd\n---\n' + 'x'.repeat(4000));
    write('.claude/skills/b/SKILL.md', '---\nname: b\ndescription: hidden\ndisable-model-invocation: true\n---\nbody');
    const skills = surface('claude-code').files.filter((f) => f.kind === 'skill-description');
    expect(skills.map((f) => f.path)).toEqual(['.claude/skills/a/SKILL.md']);
    expect(skills[0].bytes).toBe(Buffer.byteLength('a abcd'));
  });

  it('survives an import cycle and ignores imports outside the project', () => {
    write('CLAUDE.md', '@a.md\n@../outside.md');
    write('a.md', '@CLAUDE.md');
    expect(paths('claude-code')).toEqual(['CLAUDE.md', 'a.md']);
  });
});

describe('Codex, Cursor and Copilot surfaces', () => {
  it('prefers AGENTS.override.md over AGENTS.md and reports the byte limit', () => {
    write('AGENTS.md', 'base');
    write('AGENTS.override.md', 'override');
    expect(paths('codex')).toEqual(['AGENTS.override.md']);
    expect(surface('codex').byteLimit).toBe(CODEX_DEFAULT_MAX_BYTES);
  });

  it('counts alwaysApply .mdc rules for Cursor and ignores scoped and plain .md rules', () => {
    write('.cursor/rules/core.mdc', '---\nalwaysApply: true\n---\ncore');
    write('.cursor/rules/api.mdc', '---\nglobs: "src/api/**"\nalwaysApply: false\n---\napi');
    write('.cursor/rules/ignored.md', 'plain markdown is ignored by Cursor');
    expect(paths('cursor')).toEqual(['.cursor/rules/core.mdc']);
  });

  it('loads AGENTS.md, CLAUDE.md and copilot-instructions for Copilot CLI', () => {
    write('AGENTS.md', 'a');
    write('CLAUDE.md', 'c');
    write('.github/copilot-instructions.md', 'g');
    expect(paths('copilot-cli')).toEqual(['.github/copilot-instructions.md', 'AGENTS.md', 'CLAUDE.md']);
  });
});

describe('budget, duplication and errors', () => {
  it('flags a surface over the 5K est-token budget', () => {
    write('AGENTS.md', 'x'.repeat(20004));
    expect(surface('codex').overBudget).toBe(true);
    write('AGENTS.md', 'x'.repeat(100));
    expect(surface('codex').overBudget).toBe(false);
  });

  it('counts non-trivial lines repeated across loaded files', () => {
    write('AGENTS.md', 'Run npm test before every commit please\nshort\n');
    write('CLAUDE.md', 'Run npm test before every commit please\nshort\n');
    expect(duplicatedLines([{ file: path.join(root, 'AGENTS.md') }, { file: path.join(root, 'CLAUDE.md') }]).lines).toBe(1);
    expect(surface('cursor').duplicated.lines).toBe(1);
  });

  it('reports an empty project as zero rather than failing', () => {
    expect(measureStartupContext(root).surfaces.every((s) => s.tokens === 0)).toBe(true);
  });

  it('throws a clear error for a missing directory', () => {
    expect(() => measureStartupContext(path.join(root, 'nope'))).toThrow(/Project directory not found/);
  });

  it('labels every figure as a static estimate with observed and billed unavailable', () => {
    for (const s of measureStartupContext(root).surfaces) {
      expect(s.measure).toBe('static-estimate');
      expect(s.observed).toMatch(/^unavailable/);
      expect(s.billed).toMatch(/^unavailable/);
    }
  });
});

describe('token-report script (M-08 regression)', () => {
  it('measures a generated project, not the maintainer CLAUDE.md at the repository root', async () => {
    const { spawnSync } = await import('child_process');
    const repoRoot = path.resolve(import.meta.dirname, '../..');
    const run = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/token-report.js'), '--profile', 'generic', '--json'],
      { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    const [result] = JSON.parse(run.stdout);
    const claudeMd = result.surfaces[0].files.find((f) => f.path === 'CLAUDE.md');
    expect(result.profile).toBe('generic');
    expect(claudeMd.bytes).toBeGreaterThan(0);
    expect(claudeMd.bytes).not.toBe(fs.statSync(path.join(repoRoot, 'CLAUDE.md')).size);
  }, 60000);
});
