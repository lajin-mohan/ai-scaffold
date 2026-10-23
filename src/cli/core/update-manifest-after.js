/**
 * The manifest an apply writes last (item 25, FR-30, FR-34, FR-39; criterion
 * 5.2). Pure: computed before the first write so the journal can record its
 * hash.
 */

import { isoDate } from './content-templates.js';
import { recordFor } from './hashing.js';
import { pathKey } from './ownership.js';
import { scaffoldSubset } from './settings-merge.js';

const SETTINGS = '.claude/settings.json';

function safeKey(rel) {
  try {
    return pathKey(rel);
  } catch {
    return `\u0000${rel}`;
  }
}

function compareCodeUnits(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function recordAfter(entry, previous, { renders, mergedSettings }) {
  if (entry.recordAfter === 'drop') return null;
  if (entry.recordAfter === 'carry') return previous ?? null;
  if (entry.recordAfter === 'merged') return mergedSettings ? { path: entry.path, ...recordFor(mergedSettings) } : previous ?? null;
  // B3: the hash of the new render, also for conflicts, so an edit stays a
  // conflict until the adopter takes the new content.
  return { path: entry.path, ...recordFor(renders.get(entry.path)) };
}

/**
 * @param {{ migrated: object, entries: object[], renders: Map<string, Buffer>,
 *   mergedSettings: Buffer|null, scaffoldSettings: object, exceptions: Set<string>,
 *   to: string, now: Date }} input
 *   `entries` are planner entries (with `recordAfter`); `migrated` is the
 *   manifest after migrations.
 * @returns {object} the manifest to write
 */
export function buildManifestAfter({ migrated, entries, renders, mergedSettings, scaffoldSettings, exceptions, to, now }) {
  // Records are matched by identity, as the planner matches them, so a record
  // spelled `./README.md` is carried for the `README.md` entry.
  const previous = new Map((migrated.managedFiles ?? []).map((r) => [safeKey(r.path), r]));
  const records = new Map();
  for (const entry of entries) {
    const before = previous.get(safeKey(entry.path));
    if (entry.action === 'rejected') {
      if (before) records.set(entry.path, before);
      continue;
    }
    const record = recordAfter(entry, before, { renders, mergedSettings });
    // The record takes the entry's canonical spelling.
    if (record) records.set(entry.path, { ...record, path: entry.path, class: entry.class ?? record.class });
  }
  const shippedRules = new Set(['deny', 'ask'].flatMap((type) => scaffoldSettings?.permissions?.[type] ?? []));
  const kept = [...exceptions].filter((rule) => shippedRules.has(rule));
  const byType = (type) => kept.filter((rule) => (scaffoldSettings.permissions[type] ?? []).includes(rule)).sort();
  return {
    ...migrated,
    version: to,
    updatedAt: isoDate(now),
    manifestSchema: 2,
    managedFiles: [...records.values()].sort((a, b) => compareCodeUnits(a.path, b.path)),
    settingsBase: scaffoldSubset(scaffoldSettings),
    settingsExceptions: { deny: byType('deny'), ask: byType('ask') },
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export { SETTINGS };
