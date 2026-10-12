// Real-git behaviour of the shipped commit-msg hook (backlog item 66): every
// case commits in a throwaway repository, so git's own message handling
// (scissors, comment stripping, CRLF, merge and amend) is what is exercised.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['generic', 'golang', 'laravel', 'node', 'python'];
const hookOf = (profile) => path.join(REPO_ROOT, 'templates', profile, '.claude', 'hooks', 'commit-msg');
const TRAILER = 'Co-Authored-By: Bot <bot@example.invalid>';

let repo;
let counter = 0;

const git = (args, env = {}) => spawnSync('git', args, {
  cwd: repo,
  encoding: 'utf-8',
  env: { ...process.env, ...env },
});

// Stages a fresh change, then attempts the commit; a rejected commit is unstaged.
const commit = (args, env) => {
  fs.appendFileSync(path.join(repo, 'f'), `${(counter += 1)}\n`);
  git(['add', 'f']);
  const result = git(['commit', '-q', ...args], env);
  if (result.status !== 0) git(['reset', '-q']);
  return result;
};

const writeMessage = (name, content) => {
  const file = path.join(repo, name);
  fs.writeFileSync(file, content);
  return file;
};

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-msg-'));
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', 'Test']);
  git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'core.autocrlf', 'false']);
  fs.copySync(hookOf('node'), path.join(repo, '.git', 'hooks', 'commit-msg'));
  fs.chmodSync(path.join(repo, '.git', 'hooks', 'commit-msg'), 0o755);
  fs.writeFileSync(path.join(repo, 'f'), 'base\n');
  git(['add', 'f']);
  git(['commit', '-q', '-m', 'base']);
});

afterAll(() => fs.removeSync(repo));

describe('commit-msg hook: shipping', () => {
  it('is byte-identical across all five profiles', () => {
    const node = fs.readFileSync(hookOf('node'));
    for (const profile of PROFILES) {
      expect(fs.readFileSync(hookOf(profile)).equals(node), profile).toBe(true);
    }
  });
});

describe('commit-msg hook: rejects attribution trailers', () => {
  it.each([
    ['-m', ['-m', 'feat: x', '-m', TRAILER]],
    ['lowercase', ['-m', 'feat: x', '-m', TRAILER.toLowerCase()]],
    ['indented', ['-m', 'feat: x', '-m', `   ${TRAILER}`]],
    ['space before the colon', ['-m', 'feat: x', '-m', 'Co-Authored-By : Bot']],
    ['second of two trailers', ['-m', 'feat: x', '-m', `Signed-off-by: A <a@example.invalid>\n${TRAILER}`]],
  ])('via %s', (_label, args) => {
    const result = commit(args);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('BLOCK');
  });

  it('via -F', () => {
    expect(commit(['-F', writeMessage('m1', `feat: file\n\n${TRAILER}\n`)]).status).not.toBe(0);
  });

  it('in a CRLF message', () => {
    expect(commit(['-F', writeMessage('m2', `feat: crlf\r\n\r\n${TRAILER}\r\n`)]).status).not.toBe(0);
  });

  it('on --amend', () => {
    expect(git(['commit', '-q', '--amend', '-m', 'feat: amended', '-m', TRAILER]).status).not.toBe(0);
  });

  it('on a merge commit', () => {
    git(['checkout', '-q', '-b', 'side']);
    fs.writeFileSync(path.join(repo, 's'), 's\n');
    git(['add', 's']);
    git(['commit', '-q', '-m', 'side']);
    git(['checkout', '-q', 'main']);
    const rejected = git(['merge', '-q', '--no-ff', 'side', '-m', 'merge', '-m', TRAILER]);
    expect(rejected.status).not.toBe(0);
    git(['merge', '--abort']);
    expect(git(['merge', '-q', '--no-ff', 'side', '-m', 'merge side']).status).toBe(0);
  });
});

describe('commit-msg hook: does not reject legitimate messages', () => {
  it('accepts a plain message', () => {
    expect(commit(['-m', 'feat: add thing']).status).toBe(0);
  });

  it('accepts prose that wraps onto "co-authored by" without a colon', () => {
    expect(commit(['-m', 'feat: x', '-m', 'This was co-authored by the whole team']).status).toBe(0);
  });

  it('accepts a trailer that appears only in a comment line', () => {
    const file = writeMessage('m3', `feat: comment\n\n# ${TRAILER}\n`);
    expect(commit(['-F', file, '--cleanup=strip']).status).toBe(0);
  });

  it('ignores the commit -v diff below the scissors line', () => {
    fs.writeFileSync(path.join(repo, 'doc.md'), `${TRAILER}\nmore\n`);
    git(['add', 'doc.md']);
    // git runs GIT_EDITOR through sh: quote both paths (Windows has spaces).
    const script = writeMessage('editor.cjs',
      "const fs = require('fs'); const f = process.argv[2];\n"
      + "fs.writeFileSync(f, 'docs: edit with -v\\n' + fs.readFileSync(f, 'utf8'));\n");
    const posix = (p) => p.replace(/\\/g, '/');
    const editor = `"${posix(process.execPath)}" "${posix(script)}"`;
    expect(git(['commit', '-q', '-v'], { GIT_EDITOR: editor }).status).toBe(0);
  });
});
