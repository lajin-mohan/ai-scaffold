/**
 * Path containment for reads inside an installed project (item 25, BRD FR-43).
 *
 * A path is safe to read only if it is lexically relative and inside the
 * project, uses no Windows alias syntax, no existing segment is a symbolic
 * link or junction, and the real path of the deepest existing segment stays
 * inside the project's real path. Content is read only from regular files
 * under a size cap, through a handle whose identity matches the checked path.
 * Hard links pass these checks; git cannot create them, and update only
 * hashes what it reads (documented in HLD §10a).
 */

import fs from 'fs';
import path from 'path';

const defaultFs = {
  lstat: (file, options) => fs.promises.lstat(file, options),
  realpath: (file) => fs.promises.realpath(file),
  open: (file, flags) => fs.promises.open(file, flags),
};

// NTFS stream syntax, trailing dot or space (Windows strips them), 8.3 short
// names and reserved device names all let a path alias another one.
const UNSAFE_SEGMENT = [
  /:/,
  /[. ]$/,
  /~\d/,
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i,
];

/**
 * Lexical check: POSIX-normalise and reject absolute, drive-letter,
 * project-escaping and Windows-alias paths.
 * @returns {string} the normalised relative path
 */
export function normaliseRel(rel) {
  const posix = path.posix.normalize(String(rel).replace(/\\/g, '/'));
  const escapes = posix === '..' || posix.startsWith('../');
  if (posix === '.' || path.posix.isAbsolute(posix) || /^[A-Za-z]:/.test(posix) || escapes) {
    throw new TypeError(`path must be relative and inside the project: ${rel}`);
  }
  if (posix.split('/').some((segment) => UNSAFE_SEGMENT.some((pattern) => pattern.test(segment)))) {
    throw new TypeError(`path uses a reserved or aliasing name: ${rel}`);
  }
  return posix;
}

/** @returns {Promise<string>} the real path of the project directory */
export async function resolveProjectRoot(target, fsApi = defaultFs) {
  return fsApi.realpath(path.resolve(target));
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
}

async function lstatOrNull(file, fsApi) {
  try {
    return await fsApi.lstat(file);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

/**
 * @param {string} root  real path from resolveProjectRoot
 * @param {string} rel   project-relative path
 * @returns {Promise<{ ok: true, rel: string, abs: string, exists: boolean, stat: object|null }
 *   | { ok: false, rel: string, reason: 'outside'|'symlink' }>}
 */
export async function checkContained(root, rel, fsApi = defaultFs) {
  let normalised;
  try {
    normalised = normaliseRel(rel);
  } catch {
    return { ok: false, rel: String(rel), reason: 'outside' };
  }
  let current = root;
  let deepest = root;
  let stat = null;
  for (const segment of normalised.split('/')) {
    current = path.join(current, segment);
    stat = await lstatOrNull(current, fsApi);
    if (!stat) break;
    if (stat.isSymbolicLink()) return { ok: false, rel: normalised, reason: 'symlink' };
    deepest = current;
  }
  if (!isInside(root, await fsApi.realpath(deepest))) {
    return { ok: false, rel: normalised, reason: 'outside' };
  }
  return { ok: true, rel: normalised, abs: path.join(root, normalised), exists: stat !== null, stat };
}

/**
 * Contained read of a regular file, at most `maxBytes`, through a handle
 * whose device and inode match the checked path (narrows check-to-read races).
 * @returns {Promise<{ ok: true, rel: string, exists: false }
 *   | { ok: true, rel: string, exists: true, data: Buffer }
 *   | { ok: false, rel: string, reason: string }>}
 */
export async function readContained(root, rel, { maxBytes, fsApi = defaultFs }) {
  const checked = await checkContained(root, rel, fsApi);
  if (!checked.ok || !checked.exists) return checked;
  if (!checked.stat.isFile()) return { ok: false, rel: checked.rel, reason: 'not-a-file' };
  if (checked.stat.size > maxBytes) return { ok: false, rel: checked.rel, reason: 'too-large' };
  const handle = await fsApi.open(checked.abs, 'r');
  try {
    const [opened, named] = await Promise.all([handle.stat({ bigint: true }), fsApi.lstat(checked.abs, { bigint: true })]);
    if (opened.dev !== named.dev || opened.ino !== named.ino || !opened.isFile()) {
      return { ok: false, rel: checked.rel, reason: 'changed' };
    }
    const data = await handle.readFile();
    if (data.length > maxBytes) return { ok: false, rel: checked.rel, reason: 'too-large' };
    return { ok: true, rel: checked.rel, exists: true, data };
  } finally {
    await handle.close();
  }
}

/** Contained check that an existing path is a directory before listing it. */
export async function checkDirectory(root, rel, fsApi = defaultFs) {
  const checked = await checkContained(root, rel, fsApi);
  if (checked.ok && checked.exists && !checked.stat.isDirectory()) {
    return { ok: false, rel: checked.rel, reason: 'not-a-directory' };
  }
  return checked;
}
