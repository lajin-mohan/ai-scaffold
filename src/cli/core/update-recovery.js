/**
 * Resolving interrupted applies under `--apply` (item 25, BRD FR-38;
 * HLD §10b). Called with the lock held. Only journal-named temporary files
 * and empty journaled directories are ever removed.
 */

import fs from 'fs';
import { checkContained, checkDirectory } from './containment.js';
import { UpdateError } from './update-policy.js';
import { BACKUPS_DIR, TERMINAL_MARKERS } from './update-state.js';
import { createExclusive, nativeFs, removeEmptyDirectory, removeFile } from './write-ops.js';

export const KEEP_BACKUPS = 5;

async function isTerminalBackup(root, backup, fsApi) {
  for (const marker of TERMINAL_MARKERS) {
    const checked = await checkContained(root, `${backup}/${marker}`, fsApi);
    if (checked.ok && checked.exists) return true;
  }
  return false;
}

/**
 * Keep the last KEEP_BACKUPS terminal backups (HLD §10b). Only contained,
 * marked backup directories are removed; an unmarked one is never pruned.
 * Failures are returned, not thrown: pruning never undoes an apply.
 * @returns {Promise<{ removed: string[], failed: string[] }>}
 */
export async function pruneBackups(root, { fsApi = nativeFs, keep = KEEP_BACKUPS } = {}) {
  const outcome = { removed: [], failed: [] };
  const backups = await checkDirectory(root, BACKUPS_DIR, fsApi);
  if (!backups.ok || !backups.exists) return outcome;
  const names = (await fs.promises.readdir(backups.abs, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();
  const terminal = [];
  for (const name of names) {
    if (await isTerminalBackup(root, `${BACKUPS_DIR}/${name}`, fsApi)) terminal.push(`${BACKUPS_DIR}/${name}`);
  }
  for (const backup of terminal.slice(0, Math.max(0, terminal.length - keep))) {
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
  for (const entry of journal.entries) {
    for (const tmp of [entry.tmp, entry.rollbackTmp]) await removeFile(root, tmp, { fsApi });
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
  throw new UpdateError('INTERRUPTED_APPLY',
    `A previous apply did not finish (${backup}, ${state}). Restore the listed paths from that backup, then move it aside.`);
}
