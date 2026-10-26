/**
 * Contained, size-capped reads of `.ai-scaffold.json` and
 * `.claude/settings.json` for the update preview, and validation of the
 * manifest's shape before anything trusts it (item 25, BRD FR-43, FR-44).
 */

import { hashRaw, isPristine } from './hashing.js';
import { INSTALL_MODES, pathKey } from './ownership.js';
import { UpdateError } from './update-policy.js';

export const MANIFEST = '.ai-scaffold.json';
export const SETTINGS = '.claude/settings.json';
export const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;
export const MAX_SETTINGS_BYTES = 5 * 1024 * 1024;
export const MAX_RECORDS = 10_000;

function invalid(detail) {
  return new UpdateError('MANIFEST_INVALID', `${MANIFEST} is not valid: ${detail}`);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Shape checks for every field the preview reads (FR-44 step 1). */
export function validateManifest(manifest) {
  if (!isObject(manifest)) throw invalid('not a JSON object');
  if (typeof manifest.version !== 'string') throw invalid('version must be a string');
  if (typeof manifest.profile !== 'string') throw invalid('profile must be a string');
  if (manifest.install !== undefined) {
    if (!isObject(manifest.install)) throw invalid('install must be an object');
    const mode = manifest.install.mode;
    if (mode !== undefined && !INSTALL_MODES.includes(mode)) throw invalid('install.mode is not a known mode');
  }
  for (const section of ['project', 'stack', 'risk', 'requirements', 'commands', 'settingsBase', 'settingsExceptions']) {
    if (manifest[section] !== undefined && !isObject(manifest[section])) throw invalid(`${section} must be an object`);
  }
  if (manifest.managedFiles === undefined) return manifest;
  if (!Array.isArray(manifest.managedFiles)) throw invalid('managedFiles must be an array');
  if (manifest.managedFiles.length > MAX_RECORDS) throw invalid(`managedFiles has more than ${MAX_RECORDS} records`);
  for (const record of manifest.managedFiles) {
    if (!isObject(record) || typeof record.path !== 'string' || typeof record.hash !== 'string') {
      throw invalid('every managedFiles record needs a string path and hash');
    }
  }
  return manifest;
}

function safeKey(rel) {
  try {
    return pathKey(rel);
  } catch {
    return null;
  }
}

/** FR-44 step 1: containment first, then a capped read, then shape checks. */
export async function readManifest(root, io) {
  return (await readManifestObserved(root, io)).manifest;
}

/** @returns {Promise<{ manifest: object, observed: string }>} with the hash of the bytes read */
export async function readManifestObserved(root, io) {
  const read = await io.readContained(root, MANIFEST, MAX_MANIFEST_BYTES);
  if (!read.ok) throw new UpdateError('MANIFEST_UNSAFE', `Refusing to read ${MANIFEST}: ${read.reason}`);
  if (!read.exists) throw new UpdateError('MANIFEST_MISSING', 'No scaffold installation found. Run `ais init` first.');
  let manifest;
  try {
    manifest = JSON.parse(read.data.toString('utf-8'));
  } catch {
    throw invalid('not valid JSON');
  }
  return { manifest: validateManifest(manifest), observed: hashRaw(read.data) };
}

/**
 * @returns {Promise<{ local: object|null, valid: boolean, pristine: boolean|null, rejected?: string }>}
 *   `rejected` carries the reason; the preview reports it and merges nothing.
 */
export async function readSettings(root, manifest, io) {
  const read = await io.readContained(root, SETTINGS, MAX_SETTINGS_BYTES);
  if (!read.ok) return { local: null, valid: false, pristine: null, rejected: read.reason };
  if (!read.exists) return { local: {}, valid: true, pristine: null, observed: null };
  const observed = hashRaw(read.data);
  const record = (manifest.managedFiles ?? []).find((r) => safeKey(r.path) === pathKey(SETTINGS));
  const pristine = record ? isPristine(read.data, record) : null;
  try {
    const local = JSON.parse(read.data.toString('utf-8'));
    return isObject(local) ? { local, valid: true, pristine, observed } : { local: null, valid: false, pristine, observed };
  } catch {
    return { local: null, valid: false, pristine, observed };
  }
}
