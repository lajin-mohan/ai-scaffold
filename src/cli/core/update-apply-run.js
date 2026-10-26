/**
 * `ais update --apply` (item 25 slice 4, HLD §10b): lock first, then the
 * manifest, interrupted backups, the shared plan, the operation list, git
 * safety and the transaction. Returns the FR-45 `ais-update-apply/1`
 * document; the lock is released in `finally`, only with its own token.
 */

import fs from 'fs';
import { isSupportedProfile } from './paths.js';
import { resolveProjectRoot } from './containment.js';
import { checkGitSafety } from './git-state.js';
import { applyTransaction } from './update-apply.js';
import { buildApplyOps } from './update-apply-ops.js';
import { acquireLock, describeLock, releaseLock } from './update-lock.js';
import { MANIFEST, readManifestObserved } from './update-manifest.js';
import {
  checkOptionNames, computePlan, countActions, lockNotice, planExitCode, publicEntries,
} from './update-pipeline.js';
import { checkExceptionsAtCurrent, checkFlags, checkVersions, UpdateError } from './update-policy.js';
import { pruneBackups, resolveInterrupted } from './update-recovery.js';
import { defaultIo, findInterrupted, interruptedNotice } from './update-state.js';
import { nativeFs } from './write-ops.js';

export const APPLY_SCHEMA = 'ais-update-apply/1';
const applyFs = { ...nativeFs, readdir: (p, options) => fs.promises.readdir(p, options) };

export function emptyApplyDocument() {
  return {
    schema: APPLY_SCHEMA, status: 'error', exitCode: 1, error: null,
    from: null, to: null, profile: null, installMode: null, hashed: null,
    gitSafety: 'not-assessed', applyAvailable: true,
    entries: null, counts: null, settings: null, migrations: null, notices: [], lock: null,
    backup: null, rollback: null,
  };
}

async function readChecked(doc, { root, options, cliVersion, io }) {
  const { manifest, observed: manifestObserved } = await readManifestObserved(root, io);
  doc.profile = typeof manifest.profile === 'string' ? manifest.profile : null;
  doc.installMode = typeof manifest.install?.mode === 'string' ? manifest.install.mode : null;
  checkOptionNames(options);
  const flags = checkFlags(options);
  const versions = checkVersions({ installed: manifest.version, cli: cliVersion, targetVersion: options.targetVersion });
  Object.assign(doc, { from: versions.from, to: versions.to });
  if (!isSupportedProfile(manifest.profile)) {
    throw new UpdateError('MANIFEST_INVALID', `Unsupported profile in ${MANIFEST}: ${manifest.profile}`);
  }
  return { manifest, manifestObserved, flags, versions };
}

/** FR-38: resolve or refuse interrupted backups; true if one was completed. */
async function recover(doc, root, io, fsApi) {
  let completed = false;
  for (const classified of await findInterrupted(root, io)) {
    try {
      const outcome = await resolveInterrupted(root, classified, { fsApi });
      doc.notices.push(`Recovered ${classified.backup}: ${outcome} (${classified.state}).`);
      if (outcome === 'completed') completed = true;
    } catch (error) {
      doc.notices.push(interruptedNotice(classified));
      throw error;
    }
  }
  return completed;
}

function setPlanFields(doc, computed) {
  const entries = publicEntries(computed.entries);
  doc.settings = computed.decided?.groups ?? null;
  Object.assign(doc, {
    installMode: computed.installMode, hashed: computed.hashed, entries,
    counts: countActions(entries), migrations: computed.migrated.applied,
  });
  doc.notices.push(...computed.notices);
}

async function transact(doc, { root, options, versions, computed, manifestObserved, fsApi, now }) {
  if (doc.counts.rejected) {
    throw new UpdateError('PATH_UNSAFE', 'Some paths are unsafe to read or write; nothing was changed. See the rejected entries.');
  }
  const { ops, dirs, sidecars } = await buildApplyOps({ root, computed, versions, now, manifestObserved, fsApi });
  doc.gitSafety = checkGitSafety({
    root, writePaths: ops.map((op) => op.rel), allowDirty: options.allowDirty === true, allowNoGit: options.allowNoGit === true,
  });
  const result = await applyTransaction({ root, ops, dirs, meta: { from: versions.from, to: versions.to }, fsApi, now });
  doc.backup = result.backupDir;
  if (result.status !== 'applied') {
    Object.assign(doc, { status: result.status, exitCode: 1, error: result.error, rollback: result.rollback });
    return;
  }
  for (const sidecar of sidecars) doc.notices.push(`Wrote ${sidecar}: merge it into the original, then delete it.`);
  const pruned = await pruneBackups(root, { fsApi });
  if (pruned.failed.length > 0) doc.notices.push(`Old backups could not be removed: ${pruned.failed.join(', ')}.`);
  Object.assign(doc, { status: 'applied', exitCode: planExitCode(doc.counts, doc.settings) });
}

async function runLocked(doc, context) {
  const { root, io, fsApi } = context;
  let checked = await readChecked(doc, context);
  if (await recover(doc, root, io, fsApi)) checked = await readChecked(doc, context);
  if (checked.versions.current) {
    checkExceptionsAtCurrent(checked.flags);
    Object.assign(doc, { status: 'current', exitCode: 0 });
    doc.notices.push(`Already at ${checked.versions.to}. No files changed.`);
    return;
  }
  const computed = await computePlan({
    root, manifest: checked.manifest, versions: checked.versions, flags: checked.flags, io,
    today: context.today, migrations: context.migrations,
  });
  setPlanFields(doc, computed);
  await transact(doc, { ...context, ...checked, computed });
}

/**
 * @param {{ target: string, options?: object, cliVersion: string,
 *   fsApi?: object, today?: Date, now?: Date, migrations?: object[] }} input
 *   `migrations` replaces the built-in version migrations (tests only).
 * @returns {Promise<object>} the `ais-update-apply/1` document
 */
export async function runApply({ target, options = {}, cliVersion, fsApi = applyFs, today, now = new Date(), migrations }) {
  const doc = emptyApplyDocument();
  const io = defaultIo(fsApi);
  let root;
  let token = null;
  try {
    root = await resolveProjectRoot(target, fsApi).catch(() => {
      throw new UpdateError('TARGET_NOT_FOUND', `Project directory not found: ${target}`);
    });
    try {
      ({ token } = await acquireLock(root, { fsApi, now }));
    } catch (error) {
      if (error.code !== 'LOCKED') throw error;
      doc.lock = await describeLock(root, { fsApi, now });
      doc.notices.push(lockNotice(doc.lock));
      Object.assign(doc, { status: 'locked', exitCode: 1 });
      return doc;
    }
    await runLocked(doc, { root, options, cliVersion, io, fsApi, today, now, migrations });
  } catch (error) {
    const code = error?.code && typeof error.code === 'string' ? error.code : 'INTERNAL';
    const status = code === 'INTERRUPTED_APPLY' ? 'interrupted' : 'error';
    Object.assign(doc, { status, exitCode: 1, error: { code, message: error?.message ?? String(error) } });
  } finally {
    if (token) {
      try {
        await releaseLock(root, token, { fsApi });
      } catch (error) {
        doc.notices.push(`Could not remove .ai-scaffold/update.lock (${error.code ?? error.message}); delete it once no update is running.`);
      }
    }
  }
  return doc;
}
