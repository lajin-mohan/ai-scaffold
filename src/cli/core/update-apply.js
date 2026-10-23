/**
 * The apply transaction (item 25, BRD FR-16 to FR-19, FR-38, FR-41, FR-48,
 * FR-49; HLD §10b). The caller holds the lock and passes a fixed list of
 * operations; this module journals them, backs up what they change, applies
 * them in order and rolls back on failure.
 */

import crypto from 'crypto';
import diagnosticsChannel from 'diagnostics_channel';
import { checkContained, readContained } from './containment.js';
import { hashRaw } from './hashing.js';
import {
  createDirectory, createExclusive, nativeFs, permissionBits, removeEmptyDirectory, removeFile,
  ROLLBACK_RETRY_BUDGET_MS, WriteError, writeFileAtomic,
} from './write-ops.js';

export const BACKUPS_REL = '.ai-scaffold/backups';
export const JOURNAL_SCHEMA = 'ais-update-journal/1';
export const MAX_APPLY_BYTES = 20 * 1024 * 1024;
const channel = diagnosticsChannel.channel('ais:update:apply');

/** Stage events for crash testing (NFR-09); free when nobody subscribes. */
function emit(stage, detail = {}) {
  if (channel.hasSubscribers) channel.publish({ stage, ...detail });
}

function backupRel(backupDir, rel) {
  return `${backupDir}/files/${rel}`;
}

/** Pre-run permission bits of each existing target (read-only). */
async function preModes(root, ops, fsApi) {
  const modes = [];
  for (const op of ops) {
    const checked = op.pre === null ? null : await checkContained(root, op.rel, fsApi);
    modes.push(checked?.ok && checked.exists ? permissionBits(checked.stat) : null);
  }
  return modes;
}

function journalFor({ runId, backupDir, ops, dirs, meta, modes }) {
  return {
    schema: JOURNAL_SCHEMA,
    runId,
    backupDir,
    meta: meta ?? null,
    dirs,
    entries: ops.map(({ rel, action, pre, final, mode }, index) => ({
      rel, action, pre, final,
      preMode: modes[index],
      mode: mode ?? modes[index],
      tmp: `${rel}.ais-tmp-${runId}-${index}`,
      rollbackTmp: `${rel}.ais-tmp-${runId}-${index}r`,
    })),
  };
}

/** Current state of a path as a hash, or null when absent. */
export async function currentHash(root, rel, fsApi) {
  const read = await readContained(root, rel, { maxBytes: MAX_APPLY_BYTES, fsApi });
  if (!read.ok) throw new WriteError('PATH_UNSAFE', `Refusing to read ${rel}: ${read.reason}`, rel);
  return read.exists ? hashRaw(read.data) : null;
}

async function ensureDirectoryChain(root, rel, fsApi) {
  const segments = rel.split('/');
  for (let i = 1; i <= segments.length; i++) await createDirectory(root, segments.slice(0, i).join('/'), fsApi);
}

async function createBackupDirectory(root, runId, now, fsApi) {
  await ensureDirectoryChain(root, BACKUPS_REL, fsApi);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = `${BACKUPS_REL}/${stamp}-${runId}`;
  if (!(await createDirectory(root, backupDir, fsApi))) {
    throw new WriteError('PLAN_COLLISION', `Backup directory already exists: ${backupDir}`, backupDir);
  }
  return backupDir;
}

async function copyToBackup(root, backupDir, entry, fsApi) {
  const read = await readContained(root, entry.rel, { maxBytes: MAX_APPLY_BYTES, fsApi });
  if (!read.ok || !read.exists || hashRaw(read.data) !== entry.pre) {
    throw new WriteError('BACKUP_MISMATCH', `${entry.rel} changed after planning`, entry.rel);
  }
  const target = backupRel(backupDir, entry.rel);
  await ensureDirectoryChain(root, target.split('/').slice(0, -1).join('/'), fsApi);
  await writeFileAtomic(root, target, read.data, { tmpRel: `${target}.tmp`, fsApi });
}

async function applyEntry(root, entry, data, fsApi) {
  const now = await currentHash(root, entry.rel, fsApi);
  if (now !== entry.pre) {
    throw new WriteError('CONCURRENT_EDIT', `${entry.rel} changed after planning; nothing more was written`, entry.rel);
  }
  if (entry.action === 'remove') await removeFile(root, entry.rel, { fsApi });
  else await writeFileAtomic(root, entry.rel, data, { tmpRel: entry.tmp, fsApi, mode: entry.mode ?? undefined });
}

async function rollbackEntry(root, backupDir, entry, fsApi) {
  const now = await currentHash(root, entry.rel, fsApi);
  if (now === entry.pre) return 'untouched';
  if (now !== entry.final) return 'conflict';
  if (entry.pre === null) {
    await removeFile(root, entry.rel, { fsApi, budgetMs: ROLLBACK_RETRY_BUDGET_MS });
    return 'restored';
  }
  const saved = await readContained(root, backupRel(backupDir, entry.rel), { maxBytes: MAX_APPLY_BYTES, fsApi });
  if (!saved.ok || !saved.exists || hashRaw(saved.data) !== entry.pre) return 'backup-missing';
  await writeFileAtomic(root, entry.rel, saved.data, {
    tmpRel: entry.rollbackTmp, fsApi, budgetMs: ROLLBACK_RETRY_BUDGET_MS, mode: entry.preMode ?? undefined,
  });
  return 'restored';
}

async function removeTemporaries(root, journal, fsApi, states) {
  for (const entry of journal.entries) {
    for (const tmp of [entry.tmp, entry.rollbackTmp]) {
      try {
        if (await removeFile(root, tmp, { fsApi, budgetMs: ROLLBACK_RETRY_BUDGET_MS })) states.push({ rel: tmp, state: 'removed' });
      } catch (error) {
        states.push({ rel: tmp, state: 'failed', reason: error.code ?? 'ERROR' });
      }
    }
  }
}

async function removeDirectories(root, dirs, fsApi, states) {
  for (const dir of [...dirs].reverse()) {
    try {
      const outcome = await removeEmptyDirectory(root, dir, fsApi);
      if (outcome === 'not-empty') states.push({ rel: dir, state: 'not-removed' });
    } catch (error) {
      states.push({ rel: dir, state: 'failed', reason: error.code ?? 'ERROR' });
    }
  }
}

const SETTLED = new Set(['restored', 'untouched', 'removed']);

/**
 * FR-48: reverse order, only paths still holding this run's bytes, then the
 * journal-named temporary files, then the directories this run created
 * (`createdDirs`; recovery passes the journal's list). Complete only when
 * every path settled and no temporary file or created directory remains.
 */
export async function rollback(root, journal, fsApi = nativeFs, createdDirs = journal.dirs) {
  const states = [];
  for (const [index, entry] of [...journal.entries.entries()].reverse()) {
    emit('rollback-step', { index });
    try {
      states.push({ rel: entry.rel, state: await rollbackEntry(root, journal.backupDir, entry, fsApi) });
    } catch (error) {
      states.push({ rel: entry.rel, state: 'failed', reason: error.code ?? 'ERROR' });
    }
  }
  await removeTemporaries(root, journal, fsApi, states);
  await removeDirectories(root, createdDirs, fsApi, states);
  const complete = states.every((s) => SETTLED.has(s.state));
  const marker = complete ? 'rolled-back' : 'rollback.json';
  await createExclusive(root, `${journal.backupDir}/${marker}`, complete ? '' : `${JSON.stringify(states, null, 2)}\n`, fsApi);
  return { complete, states: states.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0)) };
}

/**
 * @param {{ root: string, ops: Array<{ rel: string, action: 'write'|'remove',
 *   data?: Buffer, pre: string|null, final: string|null }>, dirs: string[],
 *   meta?: object, fsApi?: object, now?: Date }} input
 *   `ops` in apply order (the manifest last); `dirs` parent first.
 * @returns {Promise<{ status: 'applied'|'rolled-back'|'rollback-incomplete',
 *   backupDir: string, error?: { code: string, message: string }, rollback?: object[] }>}
 */
export async function applyTransaction({ root, ops, dirs = [], meta, fsApi = nativeFs, now = new Date() }) {
  const runId = crypto.randomBytes(6).toString('hex');
  const modes = await preModes(root, ops, fsApi);
  const backupDir = await createBackupDirectory(root, runId, now, fsApi);
  emit('backup-dir-created');
  const journal = journalFor({ runId, backupDir, ops, dirs, meta, modes });
  const journalBytes = `${JSON.stringify(journal, null, 2)}\n`;
  await writeFileAtomic(root, `${backupDir}/journal.json`, journalBytes, { tmpRel: `${backupDir}/journal.json.tmp`, fsApi });
  emit('journal-written');
  try {
    for (const [index, entry] of journal.entries.entries()) {
      if (entry.pre === null) continue;
      await copyToBackup(root, backupDir, entry, fsApi);
      emit('backup-copied', { index });
    }
  } catch (error) {
    await createExclusive(root, `${backupDir}/abandoned`, '', fsApi);
    throw error;
  }
  const createdDirs = [];
  try {
    for (const dir of dirs) {
      if (await createDirectory(root, dir, fsApi)) createdDirs.push(dir);
      emit('dir-created', { dir });
    }
    for (const [index, entry] of journal.entries.entries()) {
      await applyEntry(root, entry, ops[index].data, fsApi);
      emit('write-done', { index, last: index === journal.entries.length - 1 });
    }
  } catch (error) {
    const result = await rollback(root, journal, fsApi, createdDirs);
    const status = result.complete ? 'rolled-back' : 'rollback-incomplete';
    const code = result.complete ? (error.code ?? 'ERROR') : 'ROLLBACK_INCOMPLETE';
    return { status, backupDir, error: { code, message: error.message }, rollback: result.states };
  }
  emit('before-marker');
  await createExclusive(root, `${backupDir}/complete`, '', fsApi);
  emit('complete');
  return { status: 'applied', backupDir };
}
