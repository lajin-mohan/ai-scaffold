/**
 * Resolving interrupted applies under `--apply` (item 25, BRD FR-38;
 * HLD §10b). Called with the lock held. Only journal-named temporary files
 * and empty journaled directories are ever removed.
 */

import fs from 'fs';
import { checkContained, checkDirectory } from './containment.js';
import { UpdateError } from './update-policy.js';
import { BACKUPS_DIR, TERMINAL_MARKERS, temporaryName } from './update-state.js';
import { createExclusive, nativeFs, removeEmptyDirectory, removeFile } from './write-ops.js';

export const KEEP_BACKUPS = 5;

const MOVE_ASIDE = 'then move that backup directory out of .ai-scaffold/backups and run again.';
// What the adopter does for each state recovery refuses (FR-38).
const REMEDY = {
  mixed: `Restore the paths listed above from that backup, ${MOVE_ASIDE}`,
  'rollback-incomplete': `Its rollback.json lists every path and its state: restore those from the backup, ${MOVE_ASIDE}`,
  malformed: `Its journal cannot be read, so what it changed is unknown. Compare the scaffold files against that backup, ${MOVE_ASIDE}`,
};

async function isTerminalBackup(root, backup, fsApi) {
  for (const marker of TERMINAL_MARKERS) {
    const checked = await checkContained(root, `${backup}/${marker}`, fsApi);
    if (checked.ok && checked.exists) return true;
  }
  return false;
}

// The directory name an apply creates: its UTC start time, then its run id.
const BACKUP_NAME = /^(\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z)-[0-9a-f]{12}$/;

const stampOf = (date) => date.toISOString().replace(/[:.]/g, '-');

// Stamps share one fixed-width format, so string order is time order.
function isPrunable(name, latest) {
  const match = BACKUP_NAME.exec(name);
  return match !== null && match[1] <= latest;
}

/**
 * Keep the last KEEP_BACKUPS terminal backups (HLD §10b), the current run's
 * included. Only contained, marked directories named as an apply names them
 * and stamped no later than now are candidates, so planted directories
 * cannot push real backups out; the current run's backup is never removed.
 * Failures are returned, not thrown: pruning never undoes an apply.
 * @returns {Promise<{ removed: string[], failed: string[] }>}
 */
export async function pruneBackups(root, { fsApi = nativeFs, keep = KEEP_BACKUPS, current = null, now = new Date() } = {}) {
  const outcome = { removed: [], failed: [] };
  const backups = await checkDirectory(root, BACKUPS_DIR, fsApi);
  if (!backups.ok || !backups.exists) return outcome;
  const latest = stampOf(now);
  const names = (await fs.promises.readdir(backups.abs, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => isPrunable(name, latest) && `${BACKUPS_DIR}/${name}` !== current)
    .sort();
  const terminal = [];
  for (const name of names) {
    if (await isTerminalBackup(root, `${BACKUPS_DIR}/${name}`, fsApi)) terminal.push(`${BACKUPS_DIR}/${name}`);
  }
  const keepOthers = Math.max(0, keep - (current ? 1 : 0));
  for (const backup of terminal.slice(0, Math.max(0, terminal.length - keepOthers))) {
    const checked = await checkDirectory(root, backup, fsApi);
    try {
      if (!checked.ok) throw new Error(checked.reason);
      // fs.rm removes links found inside the backup without following them.
      await fs.promises.rm(checked.abs, { recursive: true });
      outcome.removed.push(backup);
    } catch {
      outcome.failed.push(backup);
    }
  }
  return outcome;
}

async function removeJournaledTemporaries(root, journal, fsApi) {
  // Names are derived, never read from the journal (classifyBackup also
  // rejects a journal whose names differ).
  for (const [index, entry] of journal.entries.entries()) {
    const tmp = temporaryName(entry.rel, journal.runId, index);
    for (const name of [tmp, `${tmp}r`]) await removeFile(root, name, { fsApi });
  }
}

async function removeJournaledDirectories(root, journal, fsApi) {
  for (const dir of [...journal.dirs].reverse()) await removeEmptyDirectory(root, dir, fsApi);
}

/**
 * Resolve one classified backup, or throw `INTERRUPTED_APPLY` when it needs
 * the adopter: `no-journal` and `all-pre-run` are abandoned (nothing in the
 * project changed), `all-final` is completed (the apply finished but its
 * marker was not written).
 * @returns {Promise<'abandoned'|'completed'>}
 */
export async function resolveInterrupted(root, classified, { fsApi = nativeFs } = {}) {
  const { backup, state, journal } = classified;
  if (state === 'no-journal') {
    await createExclusive(root, `${backup}/abandoned`, '', fsApi);
    return 'abandoned';
  }
  if (state === 'all-pre-run') {
    await removeJournaledTemporaries(root, journal, fsApi);
    await removeJournaledDirectories(root, journal, fsApi);
    await createExclusive(root, `${backup}/abandoned`, '', fsApi);
    return 'abandoned';
  }
  if (state === 'all-final') {
    await removeJournaledTemporaries(root, journal, fsApi);
    await createExclusive(root, `${backup}/complete`, '', fsApi);
    return 'completed';
  }
  throw new UpdateError('INTERRUPTED_APPLY', `A previous apply did not finish (${backup}, ${state}). ${REMEDY[state] ?? REMEDY.mixed}`);
}
