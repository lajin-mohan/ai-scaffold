/**
 * Migration runner for `ais update` (item 25, BRD FR-25 to FR-27). Pure and
 * in memory: preview computes the migrated manifest; only apply saves it.
 */

import semver from 'semver';
import { migrateToSchema2, settingsBaseState } from './schema-2.js';

/**
 * Version-keyed migrations, ascending. Each runs once when an update crosses
 * its version: `{ version, run(manifest) → string[] intents }`. None yet.
 */
export const VERSION_MIGRATIONS = [];

/**
 * @param {object} manifest  parsed `.ai-scaffold.json` (never modified)
 * @param {{ from: string, to: string, settingsPristine: boolean|null,
 *   migrations?: Array<{ version: string, run: Function }> }} options
 * @returns {{ manifest: object, applied: string[], intents: string[],
 *   settingsBase: 'recorded'|'derived'|'unknown' }}
 */
export function runMigrations(manifest, { from, to, settingsPristine, migrations = VERSION_MIGRATIONS }) {
  // The manifest is parsed JSON, so a JSON round trip is a faithful deep copy.
  const next = JSON.parse(JSON.stringify(manifest));
  const applied = [];
  const intents = [];
  let settingsBase = settingsBaseState(next, settingsPristine);

  if ((next.manifestSchema ?? 1) < 2) {
    const result = migrateToSchema2(next, { settingsPristine });
    applied.push('schema-2');
    intents.push(...result.intents);
    settingsBase = result.settingsBase;
  }

  const done = new Set(next.appliedMigrations ?? []);
  const crossed = migrations
    .filter((m) => semver.gt(m.version, from) && semver.lte(m.version, to) && !done.has(m.version))
    .sort((a, b) => semver.compare(a.version, b.version));
  for (const migration of crossed) {
    intents.push(...migration.run(next));
    next.appliedMigrations = [...(next.appliedMigrations ?? []), migration.version];
    applied.push(migration.version);
  }
  return { manifest: next, applied, intents, settingsBase };
}
