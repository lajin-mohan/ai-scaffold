/**
 * The per-project update lock (item 25, BRD FR-40, FR-52). Created
 * exclusively; removed only by the run whose token it holds; never broken
 * automatically.
 */

import crypto from 'crypto';
import os from 'os';
import { checkContained, readContained } from './containment.js';
import { createDirectory, createExclusive, nativeFs, removeFile, WriteError } from './write-ops.js';

export const LOCK_REL = '.ai-scaffold/update.lock';
const MAX_LOCK_BYTES = 64 * 1024;

const MISSING = 'No scaffold installation found. Run `ais init` first.';

/**
 * The lock comes before the manifest read (FR-40), so a directory that is not
 * a scaffold installation is refused here rather than given a lock. 0.7.x
 * installs keep their manifest at the root with no `.ai-scaffold/` folder, so
 * the folder is created only when a real `.ai-scaffold.json` is present.
 */
async function ensureLockHome(root, fsApi) {
  const home = await checkContained(root, '.ai-scaffold', fsApi);
  if (home.ok && home.exists && home.stat.isDirectory()) return;
  if (!home.ok || home.exists) throw new WriteError('MANIFEST_MISSING', MISSING, '.ai-scaffold');
  const manifest = await checkContained(root, '.ai-scaffold.json', fsApi);
  if (!manifest.ok || !manifest.exists || !manifest.stat.isFile()) {
    throw new WriteError('MANIFEST_MISSING', MISSING, '.ai-scaffold.json');
  }
  await createDirectory(root, '.ai-scaffold', fsApi);
}

/** @returns {Promise<{ token: string }>} */
export async function acquireLock(root, { fsApi = nativeFs, now = new Date() } = {}) {
  await ensureLockHome(root, fsApi);
  const token = crypto.randomBytes(16).toString('hex');
  const body = { pid: process.pid, host: os.hostname(), startedAt: now.toISOString(), token };
  try {
    await createExclusive(root, LOCK_REL, `${JSON.stringify(body)}\n`, fsApi);
  } catch (error) {
    if (error.code === 'EEXIST' || error.code === 'PLAN_COLLISION') {
      throw new WriteError('LOCKED', `Another update holds ${LOCK_REL}.`, LOCK_REL);
    }
    throw error;
  }
  return { token };
}

async function readLockBody(root, fsApi) {
  const read = await readContained(root, LOCK_REL, { maxBytes: MAX_LOCK_BYTES, fsApi });
  if (!read.ok) return { state: 'unsafe', reason: read.reason };
  if (!read.exists) return { state: 'absent' };
  try {
    const body = JSON.parse(read.data.toString('utf-8'));
    const valid = body && Number.isInteger(body.pid) && typeof body.host === 'string'
      && typeof body.startedAt === 'string' && typeof body.token === 'string';
    return valid ? { state: 'held', body } : { state: 'malformed' };
  } catch {
    return { state: 'malformed' };
  }
}

/** Remove the lock only if it still carries this run's token (FR-40). */
export async function releaseLock(root, token, { fsApi = nativeFs } = {}) {
  const lock = await readLockBody(root, fsApi);
  if (lock.state !== 'held' || lock.body.token !== token) return false;
  return removeFile(root, LOCK_REL, { fsApi });
}

function liveness(body, probe) {
  if (body.host !== os.hostname()) return 'unknown';
  try {
    probe(body.pid, 0);
    return 'running';
  } catch (error) {
    if (error.code === 'ESRCH') return 'not-running';
    return error.code === 'EPERM' ? 'running' : 'unknown';
  }
}

/**
 * FR-52 report: who holds the lock, since when, and whether that process
 * appears to be running. `running` is advisory: process ids are reused.
 */
export async function describeLock(root, { fsApi = nativeFs, now = new Date(), probe = process.kill } = {}) {
  const lock = await readLockBody(root, fsApi);
  if (lock.state === 'absent') return null;
  if (lock.state !== 'held') return { pid: null, host: null, startedAt: null, ageSeconds: null, liveness: 'unknown' };
  const { pid, host, startedAt } = lock.body;
  const started = Date.parse(startedAt);
  const ageSeconds = Number.isNaN(started) ? null : Math.max(0, Math.round((now.getTime() - started) / 1000));
  return { pid, host, startedAt, ageSeconds, liveness: liveness(lock.body, probe) };
}
