/**
 * Path containment for reads inside an installed project (item 25, BRD FR-43).
 *
 * A path is safe to read only if it is lexically relative and inside the
 * project, no existing segment is a symbolic link or junction, and the real
 * path of the deepest existing segment stays inside the project's real path.
 */

import fs from 'fs';
import path from 'path';

const defaultFs = {
  lstat: (file) => fs.promises.lstat(file),
  realpath: (file) => fs.promises.realpath(file),
};

/**
 * Lexical check: POSIX-normalise and reject absolute, drive-letter and
 * project-escaping paths. Paths from manifests and plans use canonical case,
 * so no case folding is done.
 * @returns {string} the normalised relative path
 */
export function normaliseRel(rel) {
  const posix = path.posix.normalize(String(rel).replace(/\\/g, '/'));
  const escapes = posix === '..' || posix.startsWith('../');
  if (posix === '.' || path.posix.isAbsolute(posix) || /^[A-Za-z]:/.test(posix) || escapes) {
    throw new TypeError(`path must be relative and inside the project: ${rel}`);
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
 * @returns {Promise<{ ok: true, rel: string, abs: string, exists: boolean }
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
  let exists = true;
  for (const segment of normalised.split('/')) {
    current = path.join(current, segment);
    const stat = await lstatOrNull(current, fsApi);
    if (!stat) {
      exists = false;
      break;
    }
    if (stat.isSymbolicLink()) return { ok: false, rel: normalised, reason: 'symlink' };
    deepest = current;
  }
  if (!isInside(root, await fsApi.realpath(deepest))) {
    return { ok: false, rel: normalised, reason: 'outside' };
  }
  return { ok: true, rel: normalised, abs: path.join(root, normalised), exists };
}
