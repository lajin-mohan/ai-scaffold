/**
 * Item 25 slice 4: contained write primitives (FR-49 to FR-51).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fse from 'fs-extra';
import { resolveProjectRoot } from '../cli/core/containment.js';
import {
  createDirectory, createExclusive, identityKey, missingDirectories, nativeFs, removeEmptyDirectory,
  removeFile, withRetry, WriteError, writeFileAtomic,
} from '../cli/core/write-ops.js';

let tmpDir;
let root;
let outside;

function linkDir(target, link) {
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-writeops-'));
  outside = path.join(tmpDir, 'outside');
  fse.outputFileSync(path.join(outside, 'victim.md'), 'outside\n');
  const project = path.join(tmpDir, 'project');
  fse.outputFileSync(path.join(project, 'a', 'file.md'), 'old\n');
  fse.ensureDirSync(path.join(project, 'dir-at-file'));
  linkDir(outside, path.join(project, 'linked'));
  root = await resolveProjectRoot(project);
});

afterAll(async () => {
  await fse.remove(tmpDir);
});

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf-8');

describe('identityKey (FR-50)', () => {
  it('folds case and Unicode composition on every platform', () => {
    expect(identityKey('CLAUDE.md')).toBe(identityKey('claude.md'));
    expect(identityKey('café.md')).toBe(identityKey('café.md'));
    expect(identityKey('./a//b.md')).toBe('a/b.md');
  });
});

describe('writeFileAtomic', () => {
  it('replaces a regular file through an exclusive, flushed temporary file', async () => {
    await writeFileAtomic(root, 'a/file.md', Buffer.from('new\n'), { tmpRel: 'a/file.md.ais-tmp-r1-w' });
    expect(read('a/file.md')).toBe('new\n');
    expect(fs.existsSync(path.join(root, 'a', 'file.md.ais-tmp-r1-w'))).toBe(false);
  });

  it('refuses when the temporary path already exists, without touching it', async () => {
    fse.outputFileSync(path.join(root, 'a', 'taken.ais-tmp'), 'adopter\n');
    await expect(writeFileAtomic(root, 'a/file.md', Buffer.from('x'), { tmpRel: 'a/taken.ais-tmp' }))
      .rejects.toMatchObject({ code: 'PLAN_COLLISION' });
    expect(read('a/taken.ais-tmp')).toBe('adopter\n');
    expect(read('a/file.md')).toBe('new\n');
  });

  it('refuses to write through a link or onto a directory', async () => {
    await expect(writeFileAtomic(root, 'linked/victim.md', Buffer.from('x'), { tmpRel: 'linked/v.tmp' }))
      .rejects.toMatchObject({ code: 'PATH_UNSAFE' });
    await expect(writeFileAtomic(root, 'dir-at-file', Buffer.from('x'), { tmpRel: 'dir-at-file.tmp' }))
      .rejects.toMatchObject({ code: 'PATH_UNSAFE' });
    expect(fs.readFileSync(path.join(outside, 'victim.md'), 'utf-8')).toBe('outside\n');
  });

  it('refuses a temporary path in another directory', async () => {
    await expect(writeFileAtomic(root, 'a/file.md', Buffer.from('x'), { tmpRel: 'elsewhere.tmp' }))
      .rejects.toMatchObject({ code: 'PLAN_COLLISION' });
  });

  it('removes its temporary file when the rename fails', async () => {
    const failing = { ...nativeFs, rename: async () => { throw Object.assign(new Error('nope'), { code: 'EXDEV' }); } };
    await expect(writeFileAtomic(root, 'a/file.md', Buffer.from('x'), { tmpRel: 'a/f.tmp', fsApi: failing }))
      .rejects.toThrow('nope');
    expect(fs.existsSync(path.join(root, 'a', 'f.tmp'))).toBe(false);
  });
});

describe('directories', () => {
  it('lists missing directories parent first, once per identity', async () => {
    expect(await missingDirectories(root, ['n1/n2/x.md', 'N1/n2/y.md', 'a/z.md'])).toEqual(['n1', 'n1/n2']);
  });

  it('refuses a missing-directory walk through a link or a file', async () => {
    await expect(missingDirectories(root, ['linked/new/x.md'])).rejects.toBeInstanceOf(WriteError);
    await expect(missingDirectories(root, ['a/file.md/x.md'])).rejects.toBeInstanceOf(WriteError);
  });

  it('creates one segment at a time and removes only empty directories', async () => {
    expect(await createDirectory(root, 'n1')).toBe(true);
    expect(await createDirectory(root, 'n1/n2')).toBe(true);
    expect(await createDirectory(root, 'n1')).toBe(false);
    fse.outputFileSync(path.join(root, 'n1', 'n2', 'keep.md'), 'k');
    expect(await removeEmptyDirectory(root, 'n1/n2')).toBe(false);
    fs.rmSync(path.join(root, 'n1', 'n2', 'keep.md'));
    expect(await removeEmptyDirectory(root, 'n1/n2')).toBe(true);
    expect(await removeEmptyDirectory(root, 'n1')).toBe(true);
  });
});

describe('removeFile and createExclusive', () => {
  it('removes only regular files and treats absent as done', async () => {
    fse.outputFileSync(path.join(root, 'gone.md'), 'x');
    expect(await removeFile(root, 'gone.md')).toBe(true);
    expect(await removeFile(root, 'gone.md')).toBe(false);
    await expect(removeFile(root, 'dir-at-file')).rejects.toMatchObject({ code: 'PATH_UNSAFE' });
  });

  it('never truncates an existing file', async () => {
    await createExclusive(root, 'marker', 'one');
    await expect(createExclusive(root, 'marker', 'two')).rejects.toMatchObject({ code: 'PLAN_COLLISION' });
    expect(read('marker')).toBe('one');
  });
});

describe('withRetry (FR-51)', () => {
  const busy = () => Object.assign(new Error('busy'), { code: 'EBUSY' });

  it('retries transient errors on Windows within the budget, then fails', async () => {
    let calls = 0;
    let waited = 0;
    const op = async () => { calls++; throw busy(); };
    await expect(withRetry(op, { platform: 'win32', budgetMs: 1000, wait: async (ms) => { waited += ms; } })).rejects.toThrow('busy');
    expect(calls).toBeGreaterThan(2);
    expect(waited).toBeLessThanOrEqual(1000);
  });

  it('succeeds after transient failures', async () => {
    let calls = 0;
    const op = async () => { if (++calls < 3) throw busy(); return 'ok'; };
    expect(await withRetry(op, { platform: 'win32', wait: async () => {} })).toBe('ok');
  });

  it.each(['linux', 'darwin'])('does not retry on %s', async (platform) => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw busy(); }, { platform, wait: async () => {} })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('does not retry other errors on Windows', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw Object.assign(new Error('x'), { code: 'ENOENT' }); },
      { platform: 'win32', wait: async () => {} })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('graceful-fs loaded through fs-extra leaves native fs.promises.rename untouched', async () => {
    const promises = await import('node:fs/promises');
    expect(fs.promises.rename).toBe(promises.rename);
    expect(fse.rename).not.toBe(fs.promises.rename);
  });
});
