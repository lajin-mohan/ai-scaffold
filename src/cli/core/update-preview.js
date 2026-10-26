/**
 * `ais update` preview (item 25 slice 3): runs the FR-44 check order and
 * returns the FR-45 document. Read-only; writes nothing in any outcome.
 */

import fs from 'fs';
import { isSupportedProfile } from './paths.js';
import { resolveProjectRoot } from './containment.js';
import { checkExceptionsAtCurrent, checkFlags, checkVersions, UpdateError } from './update-policy.js';
import { defaultIo, findInterrupted, interruptedNotice, isLocked } from './update-state.js';
import { describeLock } from './update-lock.js';
import { MANIFEST, readManifest } from './update-manifest.js';
import { readGitState } from './git-state.js';
import {
  checkOptionNames, computePlan, countActions, lockNotice, planExitCode, publicEntries,
} from './update-pipeline.js';

export const PREVIEW_SCHEMA = 'ais-update-preview/1';

const realFs = {
  lstat: (p, options) => fs.promises.lstat(p, options),
  realpath: (p) => fs.promises.realpath(p),
  readFile: (p, encoding) => fs.promises.readFile(p, encoding),
  readdir: (p, options) => fs.promises.readdir(p, options),
  open: (p, flags) => fs.promises.open(p, flags),
};

/** Every documented field, null until known (FR-45). */
export function emptyDocument() {
  return {
    schema: PREVIEW_SCHEMA, status: 'error', exitCode: 1, error: null,
    from: null, to: null, profile: null, installMode: null, hashed: null,
    gitSafety: 'not-assessed', applyAvailable: true,
    entries: null, counts: null, settings: null, migrations: null, notices: null, lock: null,
  };
}

async function plan(doc, context) {
  const computed = await computePlan(context);
  const entries = publicEntries(computed.entries);
  doc.settings = computed.decided?.groups ?? null;
  Object.assign(doc, {
    installMode: computed.installMode, hashed: computed.hashed, entries,
    counts: countActions(entries), migrations: computed.migrated.applied, notices: computed.notices,
  });
  return { status: 'planned', exitCode: planExitCode(doc.counts, doc.settings) };
}

// Preview only reports whether git safety could be assessed; apply checks it.
function previewGitSafety(root) {
  return readGitState(root).state === 'unavailable' ? 'no-repository' : 'not-assessed';
}

async function runChecks(doc, { target, options, cliVersion, io, fsApi, today, migrations }) {
  const root = await resolveProjectRoot(target, fsApi).catch(() => {
    throw new UpdateError('TARGET_NOT_FOUND', `Project directory not found: ${target}`);
  });
  const manifest = await readManifest(root, io);
  doc.profile = typeof manifest.profile === 'string' ? manifest.profile : null;
  doc.installMode = typeof manifest.install?.mode === 'string' ? manifest.install.mode : null;
  checkOptionNames(options);
  const flags = checkFlags(options);
  const versions = checkVersions({ installed: manifest.version, cli: cliVersion, targetVersion: options.targetVersion });
  Object.assign(doc, { from: versions.from, to: versions.to });
  if (!isSupportedProfile(manifest.profile)) {
    throw new UpdateError('MANIFEST_INVALID', `Unsupported profile in ${MANIFEST}: ${manifest.profile}`);
  }
  if (await isLocked(root, io)) {
    doc.lock = await describeLock(root, { fsApi, now: today });
    return { status: 'locked', exitCode: 1, notices: [lockNotice(doc.lock)] };
  }
  const interrupted = await findInterrupted(root, io);
  if (interrupted.length > 0) return { status: 'interrupted', exitCode: 1, notices: interrupted.map(interruptedNotice) };
  if (versions.current) {
    checkExceptionsAtCurrent(flags);
    return { status: 'current', exitCode: 0, notices: [`Already at ${versions.to}.`] };
  }
  doc.gitSafety = previewGitSafety(root);
  return plan(doc, { root, manifest, versions, flags, io, today, migrations });
}

/**
 * @param {{ target: string, options?: object, cliVersion: string,
 *   fsApi?: object, today?: Date }} input
 * @returns {Promise<object>} the FR-45 document
 */
export async function runPreview({ target, options = {}, cliVersion, fsApi = realFs, today, migrations }) {
  const doc = emptyDocument();
  const io = defaultIo(fsApi);
  try {
    const result = await runChecks(doc, { target, options, cliVersion, io, fsApi, today, migrations });
    if (result.notices && !doc.notices) doc.notices = result.notices;
    Object.assign(doc, { status: result.status, exitCode: result.exitCode });
  } catch (error) {
    const code = error instanceof UpdateError ? error.code : 'INTERNAL';
    Object.assign(doc, { status: 'error', exitCode: 1, error: { code, message: error?.message ?? String(error) } });
  }
  return doc;
}
