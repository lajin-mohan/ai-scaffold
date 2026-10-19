/**
 * First migration (item 25, BRD FR-26, FR-35, W3): brings a pre-ownership
 * manifest to schema 2. Its trigger is the manifest's shape
 * (`manifestSchema` below 2), not a version crossing, because every
 * existing install needs it whatever version it came from.
 */

import picomatch from 'picomatch';
import { CREATE_ROOT_FILES_BY_PROFILE } from '../file-plan.js';
import { classifyPath } from '../ownership.js';
import { CREATE_DEFAULTS } from '../prompts.js';

export const SCHEMA_2_ID = 'schema-2';

// Manifest location of each create default that renders into a file.
const DEFAULT_FIELDS = [
  ['project', 'kind', 'projectType'],
  ['project', 'lifecycleStage', 'lifecycleStage'],
  ['stack', 'frontend', 'frontendStack'],
  ['stack', 'database', 'database'],
  ['risk', 'multiTenant', 'multiTenant'],
  ['risk', 'dataSensitivity', 'dataSensitivity'],
  ['risk', 'complianceScope', 'complianceScope'],
  ['requirements', 'source', 'requirementsSource'],
  ['commands', 'install', 'installCommand'],
  ['commands', 'dev', 'devCommand'],
  ['commands', 'migration', 'migrationCommand'],
  ['commands', 'test', 'testCommand'],
  ['commands', 'lint', 'lintCommand'],
  ['commands', 'typecheck', 'typecheckCommand'],
  ['commands', 'build', 'buildCommand'],
];

function inferInstallMode(manifest) {
  if (!Array.isArray(manifest.managedFiles)) return 'unknown';
  const rootFiles = ['.gitattributes', ...(CREATE_ROOT_FILES_BY_PROFILE[manifest.profile] ?? [])];
  const isRootFile = picomatch(rootFiles, { dot: true });
  return manifest.managedFiles.some((record) => isRootFile(record.path)) ? 'create' : 'init';
}

// FR-05: every value the migration supplies is recorded in defaultedValues,
// appended once in field order, like create records its own defaults.
function recordDefault(manifest, valueKey) {
  const list = Array.isArray(manifest.defaultedValues) ? manifest.defaultedValues : [];
  if (!list.includes(valueKey)) list.push(valueKey);
  manifest.defaultedValues = list;
}

function fillDefaults(manifest, intents) {
  for (const [section, key, defaultKey] of DEFAULT_FIELDS) {
    manifest[section] ??= {};
    if (manifest[section][key] === undefined) {
      const value = CREATE_DEFAULTS[defaultKey];
      manifest[section][key] = Array.isArray(value) ? [...value] : value;
      recordDefault(manifest, defaultKey);
      intents.push(`defaulted ${section}.${key}`);
    }
  }
  manifest.requirements ??= {};
  if (manifest.requirements.paths === undefined) {
    manifest.requirements.paths = [];
    recordDefault(manifest, 'requirementsPath');
    intents.push('defaulted requirements.paths');
  }
}

/**
 * @param {object} manifest  a clone the migration may modify
 * @param {{ settingsPristine: boolean|null }} context
 *   whether `.claude/settings.json` matches its record (null: no record)
 * @returns {{ intents: string[], settingsBase: 'recorded'|'derived'|'unknown' }}
 */
export function migrateToSchema2(manifest, { settingsPristine }) {
  const intents = [];
  manifest.install ??= {};
  if (!manifest.install.mode) {
    manifest.install.mode = inferInstallMode(manifest);
    intents.push(`inferred install.mode: ${manifest.install.mode}`);
  }
  const installMode = manifest.install.mode;
  let classified = 0;
  for (const record of manifest.managedFiles ?? []) {
    if (record.class) continue;
    try {
      record.class = classifyPath(record.path, { installMode, recorded: true });
      classified++;
    } catch {
      // An unsafe path stays unclassified; the planner rejects it.
    }
  }
  if (classified > 0) intents.push(`classified ${classified} recorded files`);
  fillDefaults(manifest, intents);
  manifest.manifestSchema = 2;
  manifest.appliedMigrations = [...(manifest.appliedMigrations ?? []), SCHEMA_2_ID];
  intents.push('manifestSchema: 2');
  return { intents, settingsBase: settingsBaseState(manifest, settingsPristine) };
}

/** FR-35: recorded, derived (settings.json unedited) or unknown; never empty. */
export function settingsBaseState(manifest, settingsPristine) {
  if (manifest.settingsBase && typeof manifest.settingsBase === 'object') return 'recorded';
  return settingsPristine === true ? 'derived' : 'unknown';
}
