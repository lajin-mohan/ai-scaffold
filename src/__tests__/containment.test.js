/**
 * Item 25 slice 3: safe reads (BRD FR-43).
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkContained, normaliseRel, resolveProjectRoot } from '../cli/core/containment.js';

let tmpDir;
let root;
let outside;

// Junctions need no privilege on Windows; directory symlinks work on POSIX.
function linkDir(target, link) {
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-contain-'));
  outside = path.join(tmpDir, 'outside');
  await fs.outputFile(path.join(outside, 'secret.md'), 'outside\n');
  const project = path.join(tmpDir, 'project');
  await fs.outputFile(path.join(project, '.ai-scaffold.json'), '{}');
  await fs.outputFile(path.join(project, '.claude', 'rules', 'a.md'), 'a\n');
  linkDir(outside, path.join(project, '.claude', 'linked'));
  linkDir(outside, path.join(project, 'top-link'));
  root = await resolveProjectRoot(project);
});

afterAll(async () => {
  await fs.remove(tmpDir);
});

describe('normaliseRel', () => {
  it.each([
    ['./CLAUDE.md', 'CLAUDE.md'],
    ['.claude\\rules\\a.md', '.claude/rules/a.md'],
    ['.claude//rules/../rules/a.md', '.claude/rules/a.md'],
  ])('normalises %s', (rel, expected) => {
    expect(normaliseRel(rel)).toBe(expected);
  });

  it.each(['/etc/passwd', 'C:/x', 'c:\\x', '..', '../x', 'a/../../x', '.', ''])('rejects %s', (rel) => {
    expect(() => normaliseRel(rel)).toThrow(TypeError);
  });
});

describe('checkContained', () => {
  it('accepts an existing file inside the project', async () => {
    const result = await checkContained(root, '.claude/rules/a.md');
    expect(result).toMatchObject({ ok: true, rel: '.claude/rules/a.md', exists: true });
    expect(result.abs).toBe(path.join(root, '.claude', 'rules', 'a.md'));
  });

  it('accepts the manifest path itself', async () => {
    expect(await checkContained(root, '.ai-scaffold.json')).toMatchObject({ ok: true, exists: true });
  });

  it('accepts a missing path inside the project as absent', async () => {
    expect(await checkContained(root, '.claude/rules/missing.md')).toMatchObject({ ok: true, exists: false });
    expect(await checkContained(root, 'no/such/dir/file.md')).toMatchObject({ ok: true, exists: false });
  });

  it('rejects a path through a linked directory', async () => {
    expect(await checkContained(root, '.claude/linked/secret.md')).toMatchObject({ ok: false, reason: 'symlink' });
    expect(await checkContained(root, 'top-link/secret.md')).toMatchObject({ ok: false, reason: 'symlink' });
  });

  it('rejects the link itself', async () => {
    expect(await checkContained(root, 'top-link')).toMatchObject({ ok: false, reason: 'symlink' });
  });

  it.each(['../outside/secret.md', '/etc/passwd', 'C:/Windows'])('rejects lexical escape %s', async (rel) => {
    expect(await checkContained(root, rel)).toMatchObject({ ok: false, reason: 'outside' });
  });

  it('rejects a path whose real location is outside even without a link segment', async () => {
    const fakeFs = {
      lstat: async () => ({ isSymbolicLink: () => false }),
      realpath: async () => path.join(tmpDir, 'elsewhere'),
    };
    expect(await checkContained(root, 'CLAUDE.md', fakeFs)).toMatchObject({ ok: false, reason: 'outside' });
  });

  it('propagates unexpected filesystem errors', async () => {
    const fakeFs = {
      lstat: async () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); },
      realpath: async (p) => p,
    };
    await expect(checkContained(root, 'CLAUDE.md', fakeFs)).rejects.toThrow('denied');
  });

  it('resolveProjectRoot returns the real path', async () => {
    expect(await resolveProjectRoot(path.join(root, '.claude', '..'))).toBe(root);
  });
});
