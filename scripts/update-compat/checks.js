/**
 * Assertions for one compatibility case (item 25 slice 5, criteria 5A/5B).
 * Each returns `{ name, ok, detail }`; nothing here writes to the project.
 */

import { changedPaths, exists, hashOf, readFile, readJson } from './lib.js';

const WRITES = new Set(['replace', 'add', 'remove', 'merge']);
const BACKUPS = '.ai-scaffold/backups/';
export const SIDECAR = '.ais-new';

const check = (name, ok, detail = '') => ({ name, ok: Boolean(ok), detail: ok ? '' : detail });
const list = (items, max = 8) => (items.length > max ? `${items.slice(0, max).join(', ')}, … (${items.length})` : items.join(', '));
const byAction = (doc, action) => (doc?.entries ?? []).filter((e) => e.action === action).map((e) => e.path);

/** FR-49 at scale: every changed path was planned, is the manifest, a sidecar or a backup. */
export function writeScope({ before, after, applied }) {
  const planned = new Set((applied.entries ?? []).filter((e) => WRITES.has(e.action)).map((e) => e.path));
  for (const rel of byAction(applied, 'conflict')) planned.add(`${rel}${SIDECAR}`);
  planned.add('.ai-scaffold.json');
  const outside = changedPaths(before, after).filter((rel) => !planned.has(rel) && !rel.startsWith(BACKUPS));
  return check('writes stay inside the plan (FR-49)', outside.length === 0, `unplanned changes: ${list(outside)}`);
}

/** Every listed path is byte-identical before and after (absent stays absent). */
export function unchanged(name, paths, { before, after }) {
  const moved = paths.filter((rel) => before.get(rel) !== after.get(rel));
  return check(name, moved.length === 0, `changed: ${list(moved)}`);
}

/**
 * Untouched managed files equal a fresh install's (AC-01). A difference
 * passes only when `explain(rel)` names a verified reason; every explained
 * difference is returned for the report. Paths the plan leaves to the
 * adopter (skip-unowned, FR-42) are reported, not required.
 */
export function managedParity({ project, fresh, applied, freshManifest, explain }) {
  const conflicts = new Set(byAction(applied, 'conflict'));
  const unowned = new Set(byAction(applied, 'skip-unowned'));
  const freshManaged = freshManifest.managedFiles.filter((r) => r.class === 'managed').map((r) => r.path);
  const differing = [];
  const missing = [];
  const explained = [];
  for (const rel of freshManaged) {
    if (conflicts.has(rel)) continue;
    if (unowned.has(rel)) {
      explained.push({ rel, reason: 'unowned in this install (FR-42): never added or changed by update' });
    } else if (!exists(project, rel)) {
      missing.push(rel);
    } else if (hashOf(readFile(project, rel)) !== hashOf(readFile(fresh, rel))) {
      const reason = explain(rel);
      if (reason) explained.push({ rel, reason });
      else differing.push(rel);
    }
  }
  const leftovers = (readJson(project, '.ai-scaffold.json').managedFiles ?? [])
    .filter((r) => r.class === 'managed' && !freshManaged.includes(r.path) && !conflicts.has(r.path))
    .map((r) => r.path);
  return {
    checks: [
      check('managed files equal a fresh install with the same answers (AC-01)', differing.length === 0, `differ: ${list(differing)}`),
      check('no fresh managed file is missing', missing.length === 0, `missing: ${list(missing)}`),
      check('no retired managed file is left recorded', leftovers.length === 0, `left: ${list(leftovers)}`),
    ],
    differing,
    explained,
  };
}

/** The adopter's edit is kept and the sidecar holds exactly the fresh render (AC-02). */
export function conflictKept({ project, fresh, before, after, rel }) {
  const sidecar = `${rel}${SIDECAR}`;
  const sidecarOk = exists(project, sidecar) && hashOf(readFile(project, sidecar)) === hashOf(readFile(fresh, rel));
  return [
    check(`${rel} keeps the adopter's edit`, before.get(rel) === after.get(rel), 'the edited file changed'),
    check(`${sidecar} equals the fresh render`, sidecarOk, 'sidecar missing or different'),
  ];
}

/** The manifest an apply writes (criterion 5.2). */
export function manifestAfter({ project, version }) {
  const manifest = readJson(project, '.ai-scaffold.json');
  const unclassed = (manifest.managedFiles ?? []).filter((r) => typeof r.class !== 'string').map((r) => r.path);
  return [
    check('manifest records the new version and schema 2', manifest.version === version && manifest.manifestSchema === 2,
      `version ${manifest.version}, schema ${manifest.manifestSchema}`),
    check('every record has an ownership class', unclassed.length === 0, `unclassed: ${list(unclassed)}`),
    check('settingsBase recorded', Boolean(manifest.settingsBase && Array.isArray(manifest.settingsBase.hooks)), 'missing'),
  ];
}

/** Preview and apply outcome codes. */
export function outcomes({ preview, applied, expectExit }) {
  return [
    check('preview: one ais-update-preview/1 document, planned',
      preview.doc?.schema === 'ais-update-preview/1' && preview.doc.status === 'planned' && preview.status === expectExit,
      `exit ${preview.status}, status ${preview.doc?.status}, error ${preview.doc?.error?.code}`),
    check('preview rejects no path', (preview.doc?.counts?.rejected ?? 0) === 0, `rejected: ${list(byAction(preview.doc, 'rejected'))}`),
    check('apply: applied with git safety clean',
      applied.doc?.status === 'applied' && applied.status === expectExit && applied.doc.gitSafety === 'clean',
      `exit ${applied.status}, status ${applied.doc?.status}, git ${applied.doc?.gitSafety}, error ${applied.doc?.error?.code}`),
  ];
}

/** A second apply and a preview report current and change nothing (AC-09). */
export function idempotent({ second, preview, before, after }) {
  const moved = changedPaths(before, after);
  return [
    check('second apply: already current, exit 0', second.doc?.status === 'current' && second.status === 0,
      `exit ${second.status}, status ${second.doc?.status}`),
    check('preview after apply: current', preview.doc?.status === 'current' && preview.status === 0, `status ${preview.doc?.status}`),
    check('second apply changes nothing', moved.length === 0, `changed: ${list(moved)}`),
  ];
}

export { byAction, check, list };
