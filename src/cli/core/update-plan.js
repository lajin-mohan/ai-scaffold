/**
 * The per-file update plan (item 25, HLD §4). Read-only: the class is decided
 * before any read, unowned and user-data files are never read, and managed
 * files are read only after the containment check (FR-43).
 */

import fs from 'fs';
import { checkContained } from './containment.js';
import { hashRaw, isPristine } from './hashing.js';
import { classifyPath } from './ownership.js';

const defaultReader = {
  checkContained,
  readFile: (abs) => fs.promises.readFile(abs),
};

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

async function planPath(rel, ctx) {
  const record = ctx.recorded.get(rel);
  const cls = record?.class ?? classifyPath(rel, { installMode: ctx.installMode, recorded: Boolean(record) });
  if (cls === 'excluded') return null;
  if (cls === 'unowned') return entry(rel, cls, 'skip-unowned', 'carry');
  if (cls === 'user-data') return entry(rel, cls, 'skip-user-data', 'carry');
  const contained = await ctx.reader.checkContained(ctx.root, rel);
  if (!contained.ok) return entry(rel, cls, 'rejected', 'carry', contained.reason);
  const render = ctx.renders.get(rel);
  if (cls === 'seeded') {
    if (contained.exists || !render) return entry(rel, cls, 'skip-seeded', 'carry');
    return entry(rel, cls, 'add', hashRaw(render));
  }
  if (cls === 'merged') return entry(rel, cls, 'merge', 'merged');
  const current = contained.exists ? await ctx.reader.readFile(contained.abs) : null;
  const decision = managedAction({ current, record, render });
  return entry(rel, cls, decision.action, decision.recordAfter, decision.reason ?? null);
}

function noticesFor({ installMode, hashed, recorded }) {
  const notices = [];
  if (!hashed) {
    notices.push('No file hashes were recorded at install (before 0.8.6): nothing will be replaced or removed.');
  }
  if (installMode === 'unknown') {
    const never = PROTECTED_MANAGED.filter((rel) => !recorded.has(rel));
    if (never.length > 0) notices.push(`Install mode unknown: ${never.join(', ')} will never be updated.`);
  }
  return notices;
}

/**
 * @param {{ root: string, manifest: object, renders: Map<string, Buffer>,
 *   reader?: { checkContained: Function, readFile: Function } }} input
 * @returns {Promise<{ entries: object[], counts: object, hashed: boolean,
 *   installMode: string, notices: string[] }>}
 */
export async function buildUpdatePlan({ root, manifest, renders, reader = defaultReader }) {
  const installMode = manifest.install?.mode;
  const hashed = Array.isArray(manifest.managedFiles);
  const recorded = new Map((manifest.managedFiles ?? []).map((record) => [record.path, record]));
  const paths = [...new Set([...renders.keys(), ...recorded.keys()])].sort(compareCodeUnits);
  const ctx = { root, installMode, recorded, renders, reader };
  const entries = [];
  for (const rel of paths) {
    const planned = await planPath(rel, ctx);
    if (planned) entries.push(planned);
  }
  const counts = {};
  for (const { action } of entries) counts[action] = (counts[action] ?? 0) + 1;
  return { entries, counts, hashed, installMode, notices: noticesFor({ installMode, hashed, recorded }) };
}
