/**
 * Resolving interrupted applies under `--apply` (item 25, BRD FR-38;
 * HLD §10b). Called with the lock held. Only journal-named temporary files
 * and empty journaled directories are ever removed.
 */

import { UpdateError } from './update-policy.js';
import { createExclusive, nativeFs, removeEmptyDirectory, removeFile } from './write-ops.js';

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
