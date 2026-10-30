/**
 * The planning pipeline shared by `ais update` preview and `--apply`
 * (item 25): migrations, renders, the per-file plan and the settings merge
 * decisions, computed once so both commands see the same plan.
 */

import { runMigrations } from './migrations/index.js';
import { renderManagedSet } from './update-render.js';
import { buildUpdatePlan } from './update-plan.js';
import { decideSettingsMerge, effectiveExceptions } from './settings-merge.js';
import { UpdateError } from './update-policy.js';
import { readSettings, SETTINGS } from './update-manifest.js';

const KNOWN_OPTIONS = new Set([
  '--', 'targetVersion', 'dryRun', 'json', 'keepRemoved', 'restoreRemoved', 'force', 'apply', 'allowDirty', 'allowNoGit',
]);

export function checkOptionNames(options) {
  const unknown = Object.keys(options).filter((key) => !KNOWN_OPTIONS.has(key));
  if (unknown.length > 0) throw new UpdateError('UNKNOWN_OPTION', `Unknown option: ${unknown.join(', ')}`);
}

// FR-52: who holds the lock and whether it looks stale; never removed for you.
export function lockNotice(lock) {
  if (!lock || lock.pid === null) {
    return 'Another update holds .ai-scaffold/update.lock (owner unknown). If no update is running, delete that file and run again.';
  }
  const age = lock.ageSeconds === null ? 'unknown age' : `${lock.ageSeconds}s old`;
  return `Another update holds .ai-scaffold/update.lock: pid ${lock.pid} on ${lock.host}, ${age}, process ${lock.liveness}. `
    + 'If no update is running, delete that file and run again.';
}

export function countActions(entries) {
  const counts = {};
  for (const { action } of entries) counts[action] = (counts[action] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Exit 1 for unsafe paths, 2 for conflicts, else 0 (FR-15). */
export function planExitCode(counts, settings) {
  if (counts.rejected) return 1;
  const conflicts = (counts.conflict ?? 0) + (settings?.ambiguous.length ?? 0);
  return conflicts > 0 ? 2 : 0;
}

function adjustSettingsEntry(entries, settingsFile) {
  const settingsEntry = entries.find((e) => e.path === SETTINGS);
  if (!settingsEntry) return;
  // The first read decides: a later read that succeeds must not turn a
  // rejected settings target back into a merge.
  if (settingsFile.rejected) Object.assign(settingsEntry, { action: 'rejected', reason: settingsFile.rejected, recordAfter: 'carry' });
  else if (!settingsFile.valid) Object.assign(settingsEntry, { action: 'conflict', reason: settingsFile.invalidReason ?? 'invalid-json' });
}

/**
 * @returns {Promise<object>} migrated manifest, renders, planner entries
 *   (with recordAfter), settings decisions, exceptions and notices.
 */
export async function computePlan({ root, manifest, versions, flags, io, today, migrations }) {
  const settingsFile = await readSettings(root, manifest, io);
  const migrated = runMigrations(manifest, {
    from: versions.from, to: versions.to, settingsPristine: settingsFile.pristine,
    ...(migrations ? { migrations } : {}),
  });
  const { renders } = await renderManagedSet(migrated.manifest, root, { today });
  const planned = await buildUpdatePlan({ root, manifest: migrated.manifest, renders, reader: io });
  const scaffold = JSON.parse(renders.get(SETTINGS)?.toString('utf-8') ?? '{}');
  const { exceptions, dropped } = effectiveExceptions({ recorded: migrated.manifest.settingsExceptions, ...flags, scaffold });
  const entries = planned.entries.map((entry) => ({ ...entry }));
  adjustSettingsEntry(entries, settingsFile);
  // Only a settings entry the planner chose to merge is merged: a stored
  // `unowned` or `user-data` class, a rejection or invalid JSON leaves the
  // adopter's file untouched (FR-42).
  const merging = entries.find((e) => e.path === SETTINGS)?.action === 'merge';
  const decided = !merging ? null : decideSettingsMerge({
    local: settingsFile.local, localValid: settingsFile.valid, scaffold, exceptions,
    baseState: migrated.settingsBase, recordedBase: migrated.manifest.settingsBase,
    // Retired settings entries (RETIRED_SETTINGS, plus any a crossed migration
    // names) fill the `removed` group (HLD §10).
    retired: migrated.retired,
  });
  const notices = [...planned.notices];
  if (decided?.groups.base === 'unknown') notices.push('settings.json has no recorded base: deliberate removals cannot be determined.');
  if (dropped.length > 0) notices.push(`Exceptions for rules no longer shipped are dropped: ${dropped.join(', ')}`);
  return {
    migrated, renders, entries, settingsFile, scaffold, decided, exceptions, notices,
    installMode: planned.installMode, hashed: planned.hashed,
  };
}

/** The document's view of the planner entries: path, class, action, reason. */
export function publicEntries(entries) {
  return entries.map(({ path, class: cls, action, reason }) => ({ path, class: cls, action, reason: reason ?? null }));
}
