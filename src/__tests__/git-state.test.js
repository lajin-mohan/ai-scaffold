/**
 * Item 25 slice 4, S4: git safety (FR-32, FR-47; criteria 4.1 to 4.3).
 * Uses real repositories in temporary directories.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkGitSafety, parsePorcelain, readGitState } from '../cli/core/git-state.js';
import { resolveOnPath } from '../cli/core/exec-path.js';

const GIT = resolveOnPath('git');
let tmpDir;
let counter = 0;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function repo({ subdir = '' } = {}) {
  const top = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, `r${counter++}-`)));
  git(top, 'init', '-q');
  git(top, 'config', 'user.email', 't@example.com');
  git(top, 'config', 'user.name', 'Test');
  git(top, 'config', 'core.autocrlf', 'false');
  const root = subdir ? path.join(top, subdir) : top;
  fse.outputFileSync(path.join(root, 'CLAUDE.md'), 'v1\n');
  fse.outputFileSync(path.join(root, '.claude', 'rules', 'a.md'), 'a\n');
  fse.outputFileSync(path.join(root, 'README.md'), 'readme\n');
  git(top, 'add', '-A');
  git(top, 'commit', '-q', '-m', 'init');
  return { top, root };
}

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-git-'));
});

afterAll(async () => {
  await fse.remove(tmpDir);
});

describe('parsePorcelain', () => {
  it('reads modified, untracked and renamed entries', () => {
    const out = ' M CLAUDE.md\0?? new.md\0R  to.md\0from.md\0';
    expect(parsePorcelain(out)).toEqual([
      { code: ' M', path: 'CLAUDE.md' },
      { code: '??', path: 'new.md' },
      { code: 'R ', path: 'to.md' },
      { code: 'R ', path: 'from.md' },
    ]);
  });
});

describe.runIf(GIT)('checkGitSafety (FR-32, FR-47)', { timeout: 60_000 }, () => {
  it('a clean repository is clean', () => {
    const { root } = repo();
    expect(checkGitSafety({ root, writePaths: ['CLAUDE.md', '.claude/rules/a.md'] })).toBe('clean');
  });

  it('an uncommitted change in a planned path is refused and named; --allow-dirty proceeds', () => {
    const { root } = repo();
    fs.appendFileSync(path.join(root, 'CLAUDE.md'), 'edit\n');
    expect(() => checkGitSafety({ root, writePaths: ['CLAUDE.md'] })).toThrow(/UNCOMMITTED|CLAUDE\.md/);
    try {
      checkGitSafety({ root, writePaths: ['CLAUDE.md'] });
    } catch (error) {
      expect(error.code).toBe('UNCOMMITTED_CHANGES');
      expect(error.message).toContain('CLAUDE.md');
    }
    expect(checkGitSafety({ root, writePaths: ['CLAUDE.md'], allowDirty: true })).toBe('dirty-allowed');
  });

  it('a dirty path that is unsafe to write never matches a planned path and never aborts (#159 review)', () => {
    const { root } = repo();
    const state = {
      state: 'repository',
      dirty: ['Report~1.docx', 'aux.c', 'logs/2024-01-01T10:00.log', 'trailing. ', '../outside'].map((rel) => ({ rel, untracked: true })),
    };
    expect(checkGitSafety({ root, writePaths: ['CLAUDE.md'], state })).toBe('clean');
    state.dirty.push({ rel: 'CLAUDE.md', untracked: false });
    expect(() => checkGitSafety({ root, writePaths: ['CLAUDE.md'], state })).toThrow(/CLAUDE\.md/);
  });

  it('a core.fsmonitor command in the project repository never runs (#159 review)', () => {
    const { root } = repo();
    const marker = path.join(root, 'fsmonitor-ran');
    const hook = path.join(root, 'fsmonitor.sh');
    fs.writeFileSync(hook, `#!/bin/sh\ntouch "${marker.split(path.sep).join('/')}"\n`, { mode: 0o755 });
    git(root, 'config', 'core.fsmonitor', hook.split(path.sep).join('/'));
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'hook');
    // Plain git in the setup above runs the hook (the positive control).
    expect(fs.existsSync(marker)).toBe(true);
    fs.rmSync(marker);
    expect(readGitState(root).state).toBe('repository');
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('changes outside the planned paths do not block', () => {
    const { root } = repo();
    fs.appendFileSync(path.join(root, 'README.md'), 'adopter edit\n');
    expect(checkGitSafety({ root, writePaths: ['CLAUDE.md'] })).toBe('clean');
  });

  it('an untracked file at a planned path blocks, but an untracked .ais-new is exempt', () => {
    const { root } = repo();
    fse.outputFileSync(path.join(root, '.claude', 'rules', 'b.md'), 'mine\n');
    fse.outputFileSync(path.join(root, 'CLAUDE.md.ais-new'), 'old sidecar\n');
    expect(() => checkGitSafety({ root, writePaths: ['.claude/rules/b.md'] })).toThrow(/b\.md/);
    expect(checkGitSafety({ root, writePaths: ['CLAUDE.md.ais-new'] })).toBe('clean');
  });

  it('a staged rename marks both its paths as uncommitted', () => {
    const { top, root } = repo();
    git(top, 'mv', '.claude/rules/a.md', '.claude/rules/renamed.md');
    expect(() => checkGitSafety({ root, writePaths: ['.claude/rules/a.md'] })).toThrow(/a\.md/);
    expect(() => checkGitSafety({ root, writePaths: ['.claude/rules/renamed.md'] })).toThrow(/renamed\.md/);
  });

  it('a project in a subdirectory of the repository uses project-relative paths', () => {
    const { root } = repo({ subdir: 'packages/app' });
    fs.appendFileSync(path.join(root, 'CLAUDE.md'), 'edit\n');
    const state = readGitState(root);
    expect(state.dirty.map((d) => d.rel)).toEqual(['CLAUDE.md']);
    expect(() => checkGitSafety({ root, writePaths: ['CLAUDE.md'] })).toThrow(/CLAUDE\.md/);
  });

  it('a directory outside any repository needs --allow-no-git', () => {
    const plain = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, 'plain-')));
    const env = { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(plain) };
    const state = readGitState(plain, { env });
    expect(state.state).toBe('unavailable');
    try {
      checkGitSafety({ root: plain, writePaths: ['CLAUDE.md'], state });
      throw new Error('expected GIT_UNAVAILABLE');
    } catch (error) {
      expect(error.code).toBe('GIT_UNAVAILABLE');
      expect(error.message).toContain('--allow-no-git');
    }
    expect(checkGitSafety({ root: plain, writePaths: ['CLAUDE.md'], state, allowNoGit: true })).toBe('acknowledged-no-repository');
  });
});

describe('git not on PATH (FR-47, 4.3)', () => {
  it('is unavailable without looking in the project directory', () => {
    const state = readGitState(tmpDir, { env: { PATH: '' } });
    expect(state).toEqual({ state: 'unavailable', reason: 'git was not found on PATH' });
  });
});
