/**
 * Read-only detection of an update lock and of interrupted applies (item 25,
 * BRD FR-38, FR-40, FR-44). The lock is checked first; while it exists no
 * backup or journal is read, because another updater may be writing them.
 */

import { checkContained } from './containment.js';
import { UpdateError } from './update-policy.js';

export const LOCK_PATH = '.ai-scaffold/update.lock';
export const BACKUPS_DIR = '.ai-scaffold/backups';

async function contained(root, rel, io) {
  const result = await io.checkContained(root, rel);
  if (!result.ok) throw new UpdateError('PATH_UNSAFE', `Refusing to read ${rel}: ${result.reason}`);
  return result;
}

/** @returns {Promise<boolean>} */
export async function isLocked(root, io) {
  return (await contained(root, LOCK_PATH, io)).exists;
}

async function journalState(root, dir, io) {
  const journal = await contained(root, `${BACKUPS_DIR}/${dir}/journal.json`, io);
  if (!journal.exists) return 'missing';
  try {
    const parsed = JSON.parse(await io.readFile(journal.abs, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? 'readable' : 'malformed';
  } catch {
    return 'malformed';
  }
}

/**
 * Backups without a `complete` marker, oldest first.
 * @returns {Promise<Array<{ backup: string, journal: 'readable'|'malformed'|'missing' }>>}
 */
export async function findInterrupted(root, io) {
  const backups = await contained(root, BACKUPS_DIR, io);
  if (!backups.exists) return [];
  const names = (await io.readdir(backups.abs, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const interrupted = [];
  for (const name of names) {
    const marker = await contained(root, `${BACKUPS_DIR}/${name}/complete`, io);
    if (marker.exists) continue;
    interrupted.push({ backup: `${BACKUPS_DIR}/${name}`, journal: await journalState(root, name, io) });
  }
  return interrupted;
}

export function defaultIo(fsApi) {
  return {
    checkContained: (root, rel) => checkContained(root, rel, fsApi),
    readFile: (abs, encoding) => fsApi.readFile(abs, encoding),
    readdir: (abs, options) => fsApi.readdir(abs, options),
  };
}
