/**
 * Contained write primitives for `ais update --apply` (item 25, BRD FR-49 to
 * FR-51). Every operation re-checks containment immediately before it runs,
 * creates temporary files exclusively, flushes them before renaming, and
 * retries only transient Windows sharing errors, within a fixed budget.
 */

import fs from 'fs';
import path from 'path';
import { checkContained, normaliseRel } from './containment.js';

export const RETRY_BUDGET_MS = 4000;
export const ROLLBACK_RETRY_BUDGET_MS = 8000;
const RETRYABLE = new Set(['EBUSY', 'EPERM', 'EACCES']);
const FIRST_DELAY_MS = 50;

export const nativeFs = {
  lstat: (p, options) => fs.promises.lstat(p, options),
  realpath: (p) => fs.promises.realpath(p),
  open: (p, flags) => fs.promises.open(p, flags),
  rename: (from, to) => fs.promises.rename(from, to),
  unlink: (p) => fs.promises.unlink(p),
  mkdir: (p) => fs.promises.mkdir(p),
  rmdir: (p) => fs.promises.rmdir(p),
  readFile: (p) => fs.promises.readFile(p),
};

/** A write-side failure with a machine-readable code. */
export class WriteError extends Error {
  constructor(code, message, rel) {
    super(message);
    this.name = 'WriteError';
    this.code = code;
    this.rel = rel;
  }
}

/**
 * Strict identity for collision checks (FR-50): NFC and case folding on every
 * platform, so two names that any supported file system could merge collide.
 */
export function identityKey(rel) {
  return normaliseRel(rel).normalize('NFC').toLowerCase();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `operation`, retrying transient sharing errors on Windows only, with
 * jittered exponential backoff until `budgetMs` of waiting is spent (FR-51).
 */
export async function withRetry(operation, { budgetMs = RETRY_BUDGET_MS, platform = process.platform, wait = sleep } = {}) {
  let delay = FIRST_DELAY_MS;
  let waited = 0;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      const retryable = platform === 'win32' && RETRYABLE.has(error?.code);
      if (!retryable || waited >= budgetMs) throw error;
      const pause = Math.min(delay + Math.floor(Math.random() * delay), budgetMs - waited);
      await wait(pause);
      waited += pause;
      delay *= 2;
    }
  }
}

async function contained(root, rel, fsApi) {
  const result = await checkContained(root, rel, fsApi);
  if (!result.ok) throw new WriteError('PATH_UNSAFE', `Refusing to write ${rel}: ${result.reason}`, rel);
  return result;
}

/**
 * Directories that must be created for `rels`, parent first, deduplicated by
 * identity. Reads only; refuses a segment that exists but is not a directory.
 */
export async function missingDirectories(root, rels, fsApi = nativeFs) {
  const seen = new Set();
  const missing = [];
  for (const rel of rels) {
    const segments = normaliseRel(rel).split('/').slice(0, -1);
    for (let i = 1; i <= segments.length; i++) {
      const dir = segments.slice(0, i).join('/');
      const key = identityKey(dir);
      if (seen.has(key)) continue;
      seen.add(key);
      const checked = await contained(root, dir, fsApi);
      if (!checked.exists) missing.push(dir);
      else if (!checked.stat.isDirectory()) throw new WriteError('PATH_UNSAFE', `Not a directory: ${dir}`, dir);
    }
  }
  return missing;
}

/** Create one journaled directory; its parent must already exist (FR-49). */
export async function createDirectory(root, rel, fsApi = nativeFs) {
  const checked = await contained(root, rel, fsApi);
  if (checked.exists) {
    if (checked.stat.isDirectory()) return false;
    throw new WriteError('PATH_UNSAFE', `Not a directory: ${rel}`, rel);
  }
  await fsApi.mkdir(checked.abs);
  return true;
}

/**
 * Remove a directory this run created, only if it is empty.
 * @returns {Promise<'removed'|'absent'|'not-empty'>}
 */
export async function removeEmptyDirectory(root, rel, fsApi = nativeFs) {
  const checked = await contained(root, rel, fsApi);
  if (!checked.exists) return 'absent';
  if (!checked.stat.isDirectory()) return 'not-empty';
  try {
    await fsApi.rmdir(checked.abs);
    return 'removed';
  } catch (error) {
    if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') return 'not-empty';
    throw error;
  }
}

async function writeExclusive(abs, data, fsApi, mode) {
  const handle = await fsApi.open(abs, 'wx');
  try {
    await handle.writeFile(data);
    // Replacing a file must keep its permissions: Git skips hooks that lose
    // their executable bit (review of #159).
    if (mode !== undefined) await handle.chmod(mode);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** The permission bits of an existing file, for preserving them. */
export function permissionBits(stat) {
  return stat.mode & 0o7777;
}

/**
 * Write `data` to `rel` through `tmpRel`: both contained, the temporary file
 * created exclusively and flushed, then renamed over the target. The target
 * must be absent or a regular file. `mode` defaults to the existing target's
 * permission bits. A failed write removes its temporary file; if that cleanup
 * fails too, the error carries `cleanupFailed` with the temporary path.
 */
export async function writeFileAtomic(root, rel, data, { tmpRel, fsApi = nativeFs, budgetMs, mode } = {}) {
  const target = await contained(root, rel, fsApi);
  if (target.exists && !target.stat.isFile()) throw new WriteError('PATH_UNSAFE', `Not a regular file: ${rel}`, rel);
  const temp = await contained(root, tmpRel, fsApi);
  if (temp.exists) throw new WriteError('PLAN_COLLISION', `Temporary path already exists: ${tmpRel}`, tmpRel);
  if (path.dirname(temp.abs) !== path.dirname(target.abs)) {
    throw new WriteError('PLAN_COLLISION', `Temporary path is not beside its target: ${tmpRel}`, tmpRel);
  }
  const bits = mode ?? (target.exists ? permissionBits(target.stat) : undefined);
  try {
    await writeExclusive(temp.abs, data, fsApi, bits);
    await withRetry(() => fsApi.rename(temp.abs, target.abs), { budgetMs });
  } catch (error) {
    try {
      await fsApi.unlink(temp.abs);
    } catch (cleanup) {
      if (cleanup.code !== 'ENOENT') error.cleanupFailed = tmpRel;
    }
    throw error;
  }
}

/** Remove a regular file inside the project. Absent is not an error. */
export async function removeFile(root, rel, { fsApi = nativeFs, budgetMs } = {}) {
  const target = await contained(root, rel, fsApi);
  if (!target.exists) return false;
  if (!target.stat.isFile()) throw new WriteError('PATH_UNSAFE', `Not a regular file: ${rel}`, rel);
  await withRetry(() => fsApi.unlink(target.abs), { budgetMs });
  return true;
}

/** Create a file exclusively (lock, markers); fails if it exists. */
export async function createExclusive(root, rel, data, fsApi = nativeFs) {
  const target = await contained(root, rel, fsApi);
  if (target.exists) throw new WriteError('PLAN_COLLISION', `Already exists: ${rel}`, rel);
  await writeExclusive(target.abs, data, fsApi);
}
