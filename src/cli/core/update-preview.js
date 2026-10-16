/**
 * `ais update` preview (item 25 slice 3): runs the FR-44 check order and
 * returns the FR-45 document. Read-only; writes nothing in any outcome.
 */

import fs from 'fs';
import { isSupportedProfile } from './paths.js';
import { isPristine } from './hashing.js';
import { resolveProjectRoot } from './containment.js';
import { runMigrations } from './migrations/index.js';
import { renderManagedSet } from './update-render.js';
import { buildUpdatePlan } from './update-plan.js';
import { effectiveExceptions, previewSettingsMerge } from './settings-merge.js';
import { checkExceptionsAtCurrent, checkFlags, checkVersions, UpdateError } from './update-policy.js';
import { defaultIo, findInterrupted, isLocked } from './update-state.js';

export const PREVIEW_SCHEMA = 'ais-update-preview/1';
const MANIFEST = '.ai-scaffold.json';
const SETTINGS = '.claude/settings.json';
const KNOWN_OPTIONS = new Set(['--', 'targetVersion', 'dryRun', 'json', 'keepRemoved', 'restoreRemoved', 'force', 'apply']);

const realFs = {
  lstat: (p) => fs.promises.lstat(p),
  realpath: (p) => fs.promises.realpath(p),
  readFile: (p, encoding) => fs.promises.readFile(p, encoding),
  readdir: (p, options) => fs.promises.readdir(p, options),
};

/** Every documented field, null until known (FR-45). */
export function emptyDocument() {
  return {
    schema: PREVIEW_SCHEMA, status: 'error', exitCode: 1, error: null,
    from: null, to: null, profile: null, installMode: null, hashed: null,
    gitSafety: 'not-assessed', applyAvailable: false,
    entries: null, counts: null, settings: null, migrations: null, notices: null,
  };
}

function checkOptionNames(options) {
  const unknown = Object.keys(options).filter((key) => !KNOWN_OPTIONS.has(key));
  if (unknown.length > 0) throw new UpdateError('UNKNOWN_OPTION', `Unknown option: ${unknown.join(', ')}`);
}

async function readManifest(root, io) {
  const found = await io.checkContained(root, MANIFEST);
  if (!found.ok) throw new UpdateError('MANIFEST_UNSAFE', `Refusing to read ${MANIFEST}: ${found.reason}`);
  if (!found.exists) throw new UpdateError('MANIFEST_MISSING', 'No scaffold installation found. Run `ais init` first.');
  try {
    const manifest = JSON.parse(await io.readFile(found.abs, 'utf-8'));
    if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) return manifest;
  } catch {
    // Reported below as invalid.
  }
  throw new UpdateError('MANIFEST_INVALID', `${MANIFEST} is not a valid JSON object.`);
}

async function readSettings(root, manifest, io) {
  const found = await io.checkContained(root, SETTINGS);
  // A rejected path is reported by the planner; nothing is read or merged.
  if (!found.ok) return { local: null, valid: false, pristine: null, rejected: true };
  if (!found.exists) return { local: {}, valid: true, pristine: null };
  const raw = await io.readFile(found.abs);
  const record = (manifest.managedFiles ?? []).find((r) => r.path === SETTINGS);
  const pristine = record ? isPristine(raw, record) : null;
  try {
    return { local: JSON.parse(raw.toString('utf-8')), valid: true, pristine };
  } catch {
    return { local: null, valid: false, pristine };
  }
}

async function plan(doc, { root, manifest, versions, flags, io, today }) {
  const settingsFile = await readSettings(root, manifest, io);
  const migrated = runMigrations(manifest, { from: versions.from, to: versions.to, settingsPristine: settingsFile.pristine });
  const { renders } = await renderManagedSet(migrated.manifest, root, { today });
  const planned = await buildUpdatePlan({ root, manifest: migrated.manifest, renders, reader: io });
  const scaffold = JSON.parse(renders.get(SETTINGS)?.toString('utf-8') ?? '{}');
  const { exceptions, dropped } = effectiveExceptions({
    recorded: migrated.manifest.settingsExceptions, ...flags, scaffold,
  });
  doc.settings = settingsFile.rejected ? null : previewSettingsMerge({
    local: settingsFile.local, localValid: settingsFile.valid, scaffold, exceptions,
    baseState: migrated.settingsBase, recordedBase: migrated.manifest.settingsBase,
  });
  const entries = planned.entries.map(({ path, class: cls, action, reason }) => ({ path, class: cls, action, reason }));
  if (!settingsFile.valid && !settingsFile.rejected) {
    const settingsEntry = entries.find((e) => e.path === SETTINGS);
    if (settingsEntry) Object.assign(settingsEntry, { action: 'conflict', reason: 'invalid-json' });
  }
  const notices = [...planned.notices];
  if (doc.settings?.base === 'unknown') notices.push('settings.json has no recorded base: deliberate removals cannot be determined.');
  if (dropped.length > 0) notices.push(`Exceptions for rules no longer shipped are dropped: ${dropped.join(', ')}`);
  Object.assign(doc, {
    installMode: planned.installMode, hashed: planned.hashed, entries,
    counts: countActions(entries), migrations: migrated.applied, notices,
  });
  return statusFor(doc);
}

function countActions(entries) {
  const counts = {};
  for (const { action } of entries) counts[action] = (counts[action] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function statusFor(doc) {
  if (doc.counts.rejected) return { status: 'planned', exitCode: 1 };
  const conflicts = (doc.counts.conflict ?? 0) + (doc.settings?.ambiguous.length ?? 0);
  return { status: 'planned', exitCode: conflicts > 0 ? 2 : 0 };
}

async function runChecks(doc, { target, options, cliVersion, io, fsApi, today }) {
  const root = await resolveProjectRoot(target, fsApi).catch(() => {
    throw new UpdateError('TARGET_NOT_FOUND', `Project directory not found: ${target}`);
  });
  const manifest = await readManifest(root, io);
  doc.profile = typeof manifest.profile === 'string' ? manifest.profile : null;
  doc.installMode = manifest.install?.mode ?? null;
  checkOptionNames(options);
  const flags = checkFlags(options);
  const versions = checkVersions({ installed: manifest.version, cli: cliVersion, targetVersion: options.targetVersion });
  Object.assign(doc, { from: versions.from, to: versions.to });
  if (!isSupportedProfile(manifest.profile)) {
    throw new UpdateError('MANIFEST_INVALID', `Unsupported profile in ${MANIFEST}: ${manifest.profile}`);
  }
  if (await isLocked(root, io)) {
    return { status: 'locked', exitCode: 1, notices: ['Another update holds .ai-scaffold/update.lock; no plan was computed.'] };
  }
  const interrupted = await findInterrupted(root, io);
  if (interrupted.length > 0) {
    const notices = interrupted.map((i) => `Interrupted apply: ${i.backup} (journal ${i.journal}).`);
    return { status: 'interrupted', exitCode: 1, notices };
  }
  if (versions.current) {
    checkExceptionsAtCurrent(flags);
    return { status: 'current', exitCode: 0, notices: [`Already at ${versions.to}.`] };
  }
  return plan(doc, { root, manifest, versions, flags, io, today });
}

/**
 * @param {{ target: string, options?: object, cliVersion: string,
 *   fsApi?: object, today?: Date }} input
 * @returns {Promise<object>} the FR-45 document
 */
export async function runPreview({ target, options = {}, cliVersion, fsApi = realFs, today }) {
  const doc = emptyDocument();
  const io = defaultIo(fsApi);
  try {
    const result = await runChecks(doc, { target, options, cliVersion, io, fsApi, today });
    if (result.notices && !doc.notices) doc.notices = result.notices;
    Object.assign(doc, { status: result.status, exitCode: result.exitCode });
  } catch (error) {
    const code = error instanceof UpdateError ? error.code : 'INTERNAL';
    Object.assign(doc, { status: 'error', exitCode: 1, error: { code, message: error?.message ?? String(error) } });
  }
  return doc;
}
