/**
 * Read-only detection of an update lock and of interrupted applies (item 25,
 * BRD FR-38, FR-40, FR-44). The lock is checked first; while it exists no
 * backup or journal is read, because another updater may be writing them.
 */

import { checkContained, checkDirectory, normaliseRel, readContained } from './containment.js';
import { hashRaw } from './hashing.js';
import { classifyPath } from './ownership.js';
import { MANIFEST } from './update-manifest.js';
import { UpdateError } from './update-policy.js';

export const LOCK_PATH = '.ai-scaffold/update.lock';
export const BACKUPS_DIR = '.ai-scaffold/backups';
export const MAX_JOURNAL_BYTES = 5 * 1024 * 1024;
export const MAX_RECOVERY_BYTES = 20 * 1024 * 1024;
export const TERMINAL_MARKERS = ['complete', 'rolled-back', 'abandoned'];
export const JOURNAL_SCHEMA = 'ais-update-journal/1';
const RUN_ID = /^[0-9a-f]{12}$/;
// update-apply-ops.js (SIDECAR_SUFFIX) imports this module, so not from there.
const SIDECAR = '.ais-new';

/** The temporary file an apply writes for journal entry `index`. */
export function temporaryName(rel, runId, index) {
  return `${rel}.ais-tmp-${runId}-${index}`;
}

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

function isSafeRel(rel) {
  if (typeof rel !== 'string') return false;
  try {
    return normaliseRel(rel) === rel && rel !== BACKUPS_DIR && !rel.startsWith(`${BACKUPS_DIR}/`);
  } catch {
    return false;
  }
}

// Recovery deletes temporaries and empty directories a journal names, before
// git safety runs, so a journal is trusted only in the exact shape an apply
// writes: temporary names derived from path, run and index, and directories
// that are ancestors of journaled paths.
// An apply writes only scaffold-owned files, their sidecars and the
// manifest. The class match ignores case where the file system does, so it
// also refuses the backups directory spelled in another case.
const WRITABLE_CLASSES = new Set(['managed', 'seeded', 'merged']);

function isApplyTarget(rel) {
  if (rel === MANIFEST) return true;
  const owner = rel.endsWith(SIDECAR) ? rel.slice(0, -SIDECAR.length) : rel;
  try {
    return WRITABLE_CLASSES.has(classifyPath(owner, { installMode: 'create', recorded: true }));
  } catch {
    return false;
  }
}

function validEntry(entry, index, runId) {
  if (!entry || !isSafeRel(entry.rel) || !isApplyTarget(entry.rel) || !isHash(entry.pre) || !isHash(entry.final)) return false;
  const tmp = temporaryName(entry.rel, runId, index);
  return entry.tmp === tmp && entry.rollbackTmp === `${tmp}r`;
}

function validJournal(journal, backup) {
  if (!journal || typeof journal !== 'object' || journal.schema !== JOURNAL_SCHEMA) return false;
  if (typeof journal.runId !== 'string' || !RUN_ID.test(journal.runId)) return false;
  if (journal.backupDir !== backup || !backup.endsWith(`-${journal.runId}`)) return false;
  if (!Array.isArray(journal.entries) || !Array.isArray(journal.dirs)) return false;
  if (!journal.entries.every((entry, index) => validEntry(entry, index, journal.runId))) return false;
  return journal.dirs.every((dir) => isSafeRel(dir) && journal.entries.some((entry) => entry.rel.startsWith(`${dir}/`)));
}

async function readJournal(root, backup, io) {
  const read = await io.readContained(root, `${backup}/journal.json`, MAX_JOURNAL_BYTES);
  if (!read.ok) return { state: 'malformed' };
  if (!read.exists) return { state: 'no-journal' };
  try {
    const journal = JSON.parse(read.data.toString('utf-8'));
    return validJournal(journal, backup) ? { journal } : { state: 'malformed' };
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
