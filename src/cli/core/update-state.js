/**
 * Read-only detection of an update lock and of interrupted applies (item 25,
 * BRD FR-38, FR-40, FR-44). The lock is checked first; while it exists no
 * backup or journal is read, because another updater may be writing them.
 */

import { checkContained, checkDirectory, readContained } from './containment.js';
import { UpdateError } from './update-policy.js';

export const LOCK_PATH = '.ai-scaffold/update.lock';
export const BACKUPS_DIR = '.ai-scaffold/backups';
export const MAX_JOURNAL_BYTES = 5 * 1024 * 1024;

function unsafe(result) {
  return new UpdateError('PATH_UNSAFE', `Refusing to read ${result.rel}: ${result.reason}`);
}

async function exists(root, rel, io) {
  const result = await io.checkContained(root, rel);
  if (!result.ok) throw unsafe(result);
  return result.exists;
}

/** @returns {Promise<boolean>} */
export async function isLocked(root, io) {
  return exists(root, LOCK_PATH, io);
}

async function journalState(root, dir, io) {
  const journal = await io.readContained(root, `${BACKUPS_DIR}/${dir}/journal.json`, MAX_JOURNAL_BYTES);
  if (!journal.ok) return 'malformed';
  if (!journal.exists) return 'missing';
  try {
    const parsed = JSON.parse(journal.data.toString('utf-8'));
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
  const backups = await io.checkDirectory(root, BACKUPS_DIR);
  if (!backups.ok) throw unsafe(backups);
  if (!backups.exists) return [];
  const names = (await io.readdir(backups.abs, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const interrupted = [];
  for (const name of names) {
    if (await exists(root, `${BACKUPS_DIR}/${name}/complete`, io)) continue;
    interrupted.push({ backup: `${BACKUPS_DIR}/${name}`, journal: await journalState(root, name, io) });
  }
  return interrupted;
}

export function defaultIo(fsApi) {
  return {
    checkContained: (root, rel) => checkContained(root, rel, fsApi),
    checkDirectory: (root, rel) => checkDirectory(root, rel, fsApi),
    readContained: (root, rel, maxBytes) => readContained(root, rel, { maxBytes, fsApi }),
    readdir: (abs, options) => fsApi.readdir(abs, options),
  };
}
