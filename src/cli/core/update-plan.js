/**
 * The per-file update plan (item 25, HLD §4). Read-only: the class is decided
 * before any read, unowned and user-data files are never read, and managed
 * files are read only after the containment check (FR-43).
 */

import { checkContained, readContained } from './containment.js';
import { hashRaw, isPristine } from './hashing.js';
import { classifyPath, pathKey } from './ownership.js';
import { MAX_SETTINGS_BYTES } from './update-manifest.js';
import { normaliseRel } from './containment.js';

export const MAX_MANAGED_BYTES = 10 * 1024 * 1024;

const defaultReader = {
  checkContained: (root, rel) => checkContained(root, rel),
  readContained: (root, rel, maxBytes) => readContained(root, rel, { maxBytes }),
};

// Lower ranks are never read. A class stored in the manifest may only make a
// path more restrictive than the table says, never unlock a read (FR-43).
const RANK = { excluded: 0, unowned: 1, 'user-data': 1, seeded: 2, merged: 3, managed: 3 };

const PROTECTED_MANAGED = ['AGENTS.md', 'CLAUDE.md', 'constitution.md'];

function compareCodeUnits(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function entry(path, cls, action, recordAfter, reason = null) {
  return { path, class: cls, action, recordAfter, reason };
}

/** HLD §4 rows 1–9 for a managed file. C: current bytes or null. */
export function managedAction({ current, record, render }) {
  const N = render ?? null;
  if (current && N && current.equals(N)) return { action: 'unchanged', recordAfter: hashRaw(N) };
  if (N) {
    if (!current) return { action: record ? 'user-deleted' : 'add', recordAfter: hashRaw(N) };
    if (!record) return { action: 'conflict', recordAfter: hashRaw(N), reason: 'unrecorded' };
    if (isPristine(current, record)) return { action: 'replace', recordAfter: hashRaw(N) };
    return { action: 'conflict', recordAfter: hashRaw(N), reason: conflictReason(current, record, N) };
  }
  if (!current) return { action: 'drop-record', recordAfter: 'drop' };
  return { action: isPristine(current, record) ? 'remove' : 'orphan-kept', recordAfter: 'drop' };
}

// A record without hashLf cannot prove the CRLF-to-LF direction; when the
// template renders CRLF and the checkout has none, say so (HLD §3).
function conflictReason(current, record, render) {
  const legacyCrlf = record.hashLf === undefined && render.includes('\r\n') && !current.includes('\r');
  return legacyCrlf ? 'legacy-crlf-unprovable' : 'edited';
}

function resolveClass(rel, record, installMode) {
  const derived = classifyPath(rel, { installMode, recorded: Boolean(record) });
  const stored = record?.class;
  return stored in RANK && RANK[stored] < RANK[derived] ? stored : derived;
}

async function planPath({ rel, record, render, duplicate }, ctx) {
  let cls;
  try {
    cls = resolveClass(rel, record, ctx.installMode);
  } catch {
    return entry(rel, null, 'rejected', 'carry', 'outside');
  }
  if (cls === 'excluded') return null;
  if (duplicate) return entry(rel, cls, 'rejected', 'carry', 'duplicate-record');
  if (cls === 'unowned') return entry(rel, cls, 'skip-unowned', 'carry');
  if (cls === 'user-data') return entry(rel, cls, 'skip-user-data', 'carry');
  const contained = await ctx.reader.checkContained(ctx.root, rel);
  if (!contained.ok) return entry(rel, cls, 'rejected', 'carry', contained.reason);
  if (cls === 'seeded') {
    if (contained.exists || !render) return entry(rel, cls, 'skip-seeded', 'carry');
    return { ...entry(rel, cls, 'add', hashRaw(render)), observed: null };
  }
  if (cls === 'merged') {
    if (!contained.exists) return entry(rel, cls, 'merge', 'merged');
    const read = await ctx.reader.readContained(ctx.root, rel, MAX_SETTINGS_BYTES);
    return read.ok ? entry(rel, cls, 'merge', 'merged') : entry(rel, cls, 'rejected', 'carry', read.reason);
  }
  let current = null;
  if (contained.exists) {
    const read = await ctx.reader.readContained(ctx.root, rel, MAX_MANAGED_BYTES);
    if (!read.ok) return entry(rel, cls, 'rejected', 'carry', read.reason);
    current = read.data ?? null;
  }
  const decision = managedAction({ current, record, render });
  // `observed` is what this decision was made on; apply writes only while
  // the file still matches it (FR-41).
  const observed = current ? hashRaw(current) : null;
  return { ...entry(rel, cls, decision.action, decision.recordAfter, decision.reason ?? null), observed };
}

function noticesFor({ installMode, hashed, keys }) {
  const notices = [];
  if (!hashed) {
    notices.push('No file hashes were recorded at install (before 0.8.6): nothing will be replaced or removed.');
  }
  if (installMode === 'unknown') {
    const never = PROTECTED_MANAGED.filter((rel) => !keys.has(pathKey(rel)));
    if (never.length > 0) notices.push(`Install mode unknown: ${never.join(', ')} will never be updated.`);
  }
  return notices;
}

/**
 * One item per file identity (FR-43): records and renders are matched by
 * pathKey, so `./CLAUDE.md` and `CLAUDE.md` are one file. Two records for one
 * file are a duplicate, rejected rather than resolved by choosing one; a
 * record whose path cannot be normalised keeps its raw spelling and is
 * rejected by planPath.
 */
function identify(records, renders) {
  const byKey = new Map();
  const item = (key, rel) => {
    if (!byKey.has(key)) byKey.set(key, { rel, record: undefined, render: undefined, duplicate: false });
    return byKey.get(key);
  };
  const recordKeys = new Set();
  for (const record of records) {
    let key;
    let rel = record.path;
    try {
      rel = normaliseRel(record.path);
      key = pathKey(rel);
    } catch {
      key = `\u0000${record.path}`;
    }
    const slot = item(key, rel);
    if (slot.record) slot.duplicate = true;
    else slot.record = record;
    recordKeys.add(key);
  }
  for (const [rel, bytes] of renders) {
    const slot = item(pathKey(rel), rel);
    slot.rel = rel;
    slot.render = bytes;
  }
  const items = [...byKey.values()].sort((a, b) => compareCodeUnits(a.rel, b.rel));
  return { items, recordKeys };
}

/**
 * @param {{ root: string, manifest: object, renders: Map<string, Buffer>,
 *   reader?: { checkContained: Function, readContained: Function } }} input
 * @returns {Promise<{ entries: object[], counts: object, hashed: boolean,
 *   installMode: string, notices: string[] }>}
 */
export async function buildUpdatePlan({ root, manifest, renders, reader = defaultReader }) {
  const installMode = manifest.install?.mode;
  const hashed = Array.isArray(manifest.managedFiles);
  const { items, recordKeys } = identify(manifest.managedFiles ?? [], renders);
  const ctx = { root, installMode, reader };
  const entries = [];
  for (const item of items) {
    const planned = await planPath(item, ctx);
    if (planned) entries.push(planned);
  }
  const counts = {};
  for (const { action } of entries) counts[action] = (counts[action] ?? 0) + 1;
  return { entries, counts, hashed, installMode, notices: noticesFor({ installMode, hashed, keys: recordKeys }) };
}
