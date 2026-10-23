/**
 * Read-only detection of an update lock and of interrupted applies (item 25,
 * BRD FR-38, FR-40, FR-44). The lock is checked first; while it exists no
 * backup or journal is read, because another updater may be writing them.
 */

import { checkContained, checkDirectory, readContained } from './containment.js';
import { hashRaw } from './hashing.js';
import { UpdateError } from './update-policy.js';

export const LOCK_PATH = '.ai-scaffold/update.lock';
export const BACKUPS_DIR = '.ai-scaffold/backups';
export const MAX_JOURNAL_BYTES = 5 * 1024 * 1024;
export const MAX_RECOVERY_BYTES = 20 * 1024 * 1024;
export const TERMINAL_MARKERS = ['complete', 'rolled-back', 'abandoned'];

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

const isHash = (value) => value === null || typeof value === 'string';

function validJournal(journal) {
  if (!journal || typeof journal !== 'object' || !Array.isArray(journal.entries) || !Array.isArray(journal.dirs)) return false;
  return journal.entries.every((e) => e && typeof e.rel === 'string' && isHash(e.pre) && isHash(e.final)
    && typeof e.tmp === 'string' && typeof e.rollbackTmp === 'string');
}

async function readJournal(root, backup, io) {
  const read = await io.readContained(root, `${backup}/journal.json`, MAX_JOURNAL_BYTES);
  if (!read.ok) return { state: 'malformed' };
  if (!read.exists) return { state: 'no-journal' };
  try {
    const journal = JSON.parse(read.data.toString('utf-8'));
    return validJournal(journal) ? { journal } : { state: 'malformed' };
  } catch {
    return { state: 'malformed' };
  }
}

async function pathState(root, entry, io) {
  const read = await io.readContained(root, entry.rel, MAX_RECOVERY_BYTES);
  if (!read.ok) return 'other';
  const hash = read.exists ? hashRaw(read.data) : null;
  if (hash === entry.pre) return 'pre-run';
  return hash === entry.final ? 'final' : 'other';
}

/**
 * FR-38 classification of one unmarked backup (read-only):
 * `no-journal` (nothing changed), `malformed`, `rollback-incomplete`,
 * `all-pre-run`, `all-final`, or `mixed` with each path's state.
 */
export async function classifyBackup(root, backup, io) {
  if (await exists(root, `${backup}/rollback.json`, io)) return { backup, state: 'rollback-incomplete', journal: null, paths: [] };
  const { journal, state } = await readJournal(root, backup, io);
  if (!journal) return { backup, state, journal: null, paths: [] };
  const paths = [];
  for (const entry of journal.entries) paths.push({ rel: entry.rel, state: await pathState(root, entry, io) });
  const states = new Set(paths.map((p) => p.state));
  let overall = 'mixed';
  if (states.size === 0 || (states.size === 1 && states.has('pre-run'))) overall = 'all-pre-run';
  else if (states.size === 1 && states.has('final')) overall = 'all-final';
  return { backup, state: overall, journal, paths };
}

async function isTerminal(root, backup, io) {
  for (const marker of TERMINAL_MARKERS) {
    if (await exists(root, `${backup}/${marker}`, io)) return true;
  }
  return false;
}

/**
 * Backups without a terminal marker, oldest first, each classified.
 * @returns {Promise<Array<{ backup: string, state: string, journal: object|null, paths: object[] }>>}
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
    const backup = `${BACKUPS_DIR}/${name}`;
    if (await isTerminal(root, backup, io)) continue;
    interrupted.push(await classifyBackup(root, backup, io));
  }
  return interrupted;
}

/** One human-readable line per interrupted backup, naming mixed paths. */
export function interruptedNotice({ backup, state, paths }) {
  const others = paths.filter((p) => p.state !== 'final').map((p) => `${p.rel} (${p.state})`);
  const detail = state === 'mixed' ? `: ${others.join(', ')}` : '';
  return `Interrupted apply: ${backup} (${state})${detail}.`;
}

export function defaultIo(fsApi) {
  return {
    checkContained: (root, rel) => checkContained(root, rel, fsApi),
    checkDirectory: (root, rel) => checkDirectory(root, rel, fsApi),
    readContained: (root, rel, maxBytes) => readContained(root, rel, { maxBytes, fsApi }),
    readdir: (abs, options) => fsApi.readdir(abs, options),
  };
}
