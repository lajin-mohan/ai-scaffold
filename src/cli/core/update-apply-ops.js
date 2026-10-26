/**
 * Turn the shared plan into the fixed operation list an apply executes
 * (item 25, FR-16 to FR-19, FR-49, FR-50; HLD §10b steps 4 and 5). Reads
 * only. Every check here runs before the first write.
 */

import fs from 'fs';
import path from 'path';
import { checkContained } from './containment.js';
import { hashRaw } from './hashing.js';
import { applySettingsChanges, serializeSettings } from './settings-apply.js';
import { currentHash } from './update-apply.js';
import { buildManifestAfter, serializeManifest } from './update-manifest-after.js';
import { MANIFEST, SETTINGS } from './update-manifest.js';
import { UpdateError } from './update-policy.js';
import { identityKey, missingDirectories, nativeFs } from './write-ops.js';

export const SIDECAR_SUFFIX = '.ais-new';

function collision(message) {
  return new UpdateError('PLAN_COLLISION', message);
}

async function sidecarOp(root, entry, data, fsApi) {
  const rel = `${entry.path}${SIDECAR_SUFFIX}`;
  const checked = await checkContained(root, rel, fsApi);
  if (!checked.ok) throw collision(`Sidecar path is unsafe: ${rel} (${checked.reason})`);
  if (checked.exists && !checked.stat.isFile()) throw collision(`Sidecar path is not a regular file: ${rel}`);
  const final = hashRaw(data);
  const existing = await currentHash(root, rel, fsApi);
  if (existing === final) return null;
  if (existing !== null) {
    throw new UpdateError('SIDECAR_EXISTS',
      `${rel} already exists and differs from the new version. Finish merging it into ${entry.path} and delete it, then run again.`);
  }
  return { rel, action: 'write', data, pre: null, final, sidecar: true };
}

function mergedSettings(computed) {
  const { settingsFile, decided } = computed;
  if (!settingsFile.valid || !decided) return { op: null, bytes: null };
  const merged = Buffer.from(serializeSettings(applySettingsChanges(settingsFile.local, decided.changes)));
  // The merge was computed from the bytes read at planning: write only over those.
  const pre = settingsFile.observed;
  if (pre === hashRaw(merged)) return { op: null, bytes: merged };
  return { op: { rel: SETTINGS, action: 'write', data: merged, pre, final: hashRaw(merged) }, bytes: merged };
}

function observedPre(entry) {
  if (entry.observed === undefined) throw new UpdateError('INTERNAL', `No planned state recorded for ${entry.path}`);
  return entry.observed;
}

async function entryOp(root, entry, computed, fsApi) {
  const render = computed.renders.get(entry.path);
  // `pre` is the state the plan decided on, never a fresh read: the
  // transaction then refuses any file that changed since (FR-41).
  if (entry.action === 'replace' || entry.action === 'add') {
    return { rel: entry.path, action: 'write', data: render, pre: observedPre(entry), final: hashRaw(render) };
  }
  if (entry.action === 'remove') {
    return { rel: entry.path, action: 'remove', pre: observedPre(entry), final: null };
  }
  if (entry.action === 'conflict' && render) return sidecarOp(root, entry, render, fsApi);
  return null;
}

/** FR-50: refuse any two operations that could touch the same file. */
async function checkCollisions(root, ops, renders, fsApi) {
  for (const rel of renders.keys()) {
    if (rel.endsWith(SIDECAR_SUFFIX) || rel.includes('.ais-tmp')) throw collision(`A scaffold path uses a reserved name: ${rel}`);
  }
  const keys = new Set();
  const inodes = new Set();
  for (const op of ops) {
    const key = identityKey(op.rel);
    if (keys.has(key)) throw collision(`Two planned operations touch the same file: ${op.rel}`);
    keys.add(key);
    const checked = await checkContained(root, op.rel, fsApi);
    if (!checked.ok) throw collision(`Unsafe path: ${op.rel} (${checked.reason})`);
    if (!checked.exists) continue;
    const stat = await fsApi.lstat(checked.abs, { bigint: true });
    const inode = `${stat.dev}:${stat.ino}`;
    if (inodes.has(inode)) throw collision(`Two planned paths are the same file: ${op.rel}`);
    inodes.add(inode);
  }
}

async function nearestExisting(root, rel, fsApi) {
  let current = rel;
  for (;;) {
    const checked = await checkContained(root, current, fsApi);
    if (checked.ok && checked.exists) return checked.abs;
    if (!current.includes('/')) return root;
    current = current.slice(0, current.lastIndexOf('/'));
  }
}

/** HLD §10b step 5: every target, or its nearest existing parent, writable. */
async function checkWritable(root, ops, fsApi) {
  for (const op of ops) {
    const abs = await nearestExisting(root, op.rel, fsApi);
    try {
      await fs.promises.access(abs, fs.constants.W_OK);
    } catch {
      throw new UpdateError('NOT_WRITABLE', `Cannot write ${op.rel}: ${path.relative(root, abs) || '.'} is not writable.`);
    }
  }
}

/**
 * @returns {Promise<{ ops: object[], dirs: string[], sidecars: string[] }>}
 *   `ops` in apply order with the manifest last.
 */
export async function buildApplyOps({ root, computed, versions, now, manifestObserved, fsApi = nativeFs }) {
  const ops = [];
  for (const entry of computed.entries) {
    const op = await entryOp(root, entry, computed, fsApi);
    if (op) ops.push(op);
  }
  const settings = mergedSettings(computed);
  if (settings.op) ops.push(settings.op);
  const manifest = buildManifestAfter({
    migrated: computed.migrated.manifest, entries: computed.entries, renders: computed.renders,
    mergedSettings: settings.bytes, scaffoldSettings: computed.scaffold, exceptions: computed.exceptions,
    to: versions.to, now,
  });
  const manifestBytes = Buffer.from(serializeManifest(manifest));
  ops.push({ rel: MANIFEST, action: 'write', data: manifestBytes, pre: manifestObserved, final: hashRaw(manifestBytes) });
  await checkCollisions(root, ops, computed.renders, fsApi);
  await checkWritable(root, ops, fsApi);
  const dirs = await missingDirectories(root, ops.map((op) => op.rel), fsApi);
  return { ops, dirs, sidecars: ops.filter((op) => op.sidecar).map((op) => op.rel) };
}
