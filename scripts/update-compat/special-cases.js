/**
 * Compatibility cases outside the 5A grid (item 25 slice 5): the synthetic
 * hashless manifest (AC-07), autocrlf=true clones (AC-10, criterion 5B) and
 * the 0.7.0 ownership re-baseline (ADR-002). `env` supplies the matrix's
 * shared state and helpers.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  byAction, check, conflictKept, idempotent, list, outcomes, unchanged, writeScope,
} from './checks.js';
import { commitAll, exists, git, readFile, readJson, snapshot } from './lib.js';

const BACKSLASH = String.fromCharCode(92);

/**
 * AC-07, SYNTHETIC: no inspected release writes a manifest without
 * managedFiles, so one is made by removing them from a real 0.8.5 install.
 */
export function runHashless(env) {
  const parent = path.join(env.ctx.root, 'cases', 'hashless-0.8.5');
  const project = env.install(env.ctx.olds['0.8.5'], parent, { mode: 'create', profile: 'node' });
  const manifestFile = path.join(project, '.ai-scaffold.json');
  const { managedFiles: _dropped, ...manifest } = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  commitAll(project, 'synthetic hashless manifest');
  const before = snapshot(project);
  const preview = env.update(parent);
  const applied = env.update(parent, '--apply');
  const after = snapshot(project);
  const touchedExisting = [...before.keys()].filter((rel) => after.get(rel) !== before.get(rel))
    .filter((rel) => !['.ai-scaffold.json', '.claude/settings.json'].includes(rel));
  const checks = [
    check('preview plans no replace and no remove (FR-03)', byAction(preview.doc, 'replace').length + byAction(preview.doc, 'remove').length === 0,
      `replace ${list(byAction(preview.doc, 'replace'))}; remove ${list(byAction(preview.doc, 'remove'))}`),
    check('the report says no hashes are recorded', (preview.doc?.notices ?? []).some((n) => n.includes('No file hashes')), 'notice missing'),
    check('apply: applied', applied.doc?.status === 'applied', `status ${applied.doc?.status}, error ${applied.doc?.error?.code}`),
    check('no existing file replaced or removed, apart from the manifest and the settings merge', touchedExisting.length === 0,
      `changed: ${list(touchedExisting)}`),
  ];
  return {
    id: 'SYNTHETIC: 0.8.5 create node with managedFiles removed (not a published release)',
    kind: 'AC-07', counts: applied.doc?.counts ?? null, checks, differing: [],
  };
}

/** AC-10: a clone with core.autocrlf=true classifies untouched files as pristine. */
export function runCrlf(env, mode) {
  const parent = path.join(env.ctx.root, 'cases', `crlf-${mode}`);
  const source = env.install(env.ctx.olds['0.16.1'], path.join(parent, 'source'), { mode, profile: 'node' });
  commitAll(source, 'installed');
  git(parent, '-c', 'core.autocrlf=true', 'clone', '-q', source, env.NAME);
  const project = path.join(parent, env.NAME);
  git(project, 'config', 'core.autocrlf', 'true');
  // A clone holds only committed files; the project's .gitignore keeps some
  // recorded files (local memory, for example) out of it.
  const records = readJson(project, '.ai-scaffold.json').managedFiles.filter((r) => exists(project, r.path));
  const crlf = records.filter((r) => readFile(project, r.path).includes('\r\n')).length;
  const preview = env.update(parent);
  const applied = env.update(parent, '--apply');
  const conflicts = byAction(preview.doc, 'conflict');
  const checks = [
    mode === 'init'
      ? check('the clone really has CRLF managed files (not vacuous)', crlf > 0, 'no CRLF file: the test would prove nothing')
      : check('.gitattributes keeps create projects LF (eol=lf)', crlf === 0, `${crlf} CRLF files`),
    check('no untouched file is a conflict (AC-10)', conflicts.length === 0, `conflicts: ${list(conflicts)}`),
    check('apply: applied, exit 0', applied.doc?.status === 'applied' && applied.status === 0,
      `exit ${applied.status}, status ${applied.doc?.status}, error ${applied.doc?.error?.code}`),
  ];
  return { id: `0.16.1 ${mode} node, autocrlf=true clone (${crlf} CRLF files)`, kind: '5B', counts: applied.doc?.counts ?? null, checks, differing: [] };
}

/** The manifest disowns every legacy path left alone, and records no backslash paths. */
function disownChecks(manifest, legacy) {
  const records = new Map((manifest.managedFiles ?? []).map((r) => [r.path, r]));
  const claimed = legacy.filter((rel) => records.has(rel) && records.get(rel).class !== 'unowned');
  const backslashed = (manifest.managedFiles ?? []).filter((r) => r.path.includes(BACKSLASH)).map((r) => r.path);
  return [
    check('the manifest stops claiming legacy files (every record unowned or gone)', claimed.length === 0, `still claimed: ${list(claimed)}`),
    check('no record keeps a 0.7.0 backslash path', backslashed.length === 0, `backslash: ${list(backslashed)}`),
  ];
}

/** Every path both manifests record has the class a fresh install gives it. */
function classChecks(manifest, freshManifest) {
  const fresh = new Map(freshManifest.managedFiles.map((r) => [r.path, r.class]));
  const wrong = (manifest.managedFiles ?? []).filter((r) => fresh.has(r.path) && fresh.get(r.path) !== r.class)
    .map((r) => `${r.path} (${r.class}, fresh ${fresh.get(r.path)})`);
  const unclassed = (manifest.managedFiles ?? []).filter((r) => typeof r.class !== 'string').map((r) => r.path);
  return [
    check('current scaffold files get the classes a fresh install gives them', wrong.length === 0, `wrong: ${list(wrong)}`),
    check('every record has a class', unclassed.length === 0, `unclassed: ${list(unclassed)}`),
  ];
}

/** doctor (packed candidate) no longer treats legacy files as scaffold-managed. */
function doctorChecks(env, parent) {
  const doctor = env.cli(parent, ['doctor', env.NAME]);
  const named = (name) => doctor.doc?.checks?.find((c) => c.name === name);
  // The edited scaffold file (the conflict) is rightly reported; nothing else may be.
  const reported = (named('Managed files unmodified')?.message ?? '').replace(/^Modified: /, '').split(', ').filter(Boolean);
  const outside = reported.filter((rel) => rel !== env.CONFLICT);
  return [
    check('doctor: only the edited scaffold file is reported modified, no legacy or user file', Boolean(doctor.doc) && outside.length === 0,
      doctor.doc ? `also reported: ${list(outside)}` : 'no doctor document'),
    check('doctor: managed files present', named('Managed files present')?.state === 'pass', named('Managed files present')?.message ?? ''),
  ];
}

/**
 * ADR-002 re-baseline: a real 0.7.0 install, whose manifest lists docs,
 * tasks and application files as managed, updated to the current contract.
 */
export function runLegacy070(env) {
  const parent = path.join(env.ctx.root, 'cases', 'legacy-0.7.0');
  const project = env.install(env.ctx.olds['0.7.0'], parent, { mode: 'create', profile: 'node', noGit: false });
  const touched = env.adopt(project);
  const legacyDoc = 'docs/api/README.md';
  fs.appendFileSync(path.join(project, ...legacyDoc.split('/')), '\nThe adopter documented their API here.\n');
  commitAll(project, 'adopter state');
  const run = env.updateTwice(parent, project);
  const legacy = byAction(run.preview.doc, 'skip-unowned');
  const manifest = readJson(project, '.ai-scaffold.json');
  const fresh = env.freshInstall('create', 'node', env.answerArgs(manifest));
  const checks = [
    ...outcomes({ preview: run.preview, applied: run.applied, expectExit: 2 }),
    check('the legacy doc the adopter edited is outside current ownership', legacy.includes(legacyDoc), `not skip-unowned: ${legacyDoc}`),
    writeScope({ before: run.before, after: run.after, applied: run.applied.doc ?? {} }),
    unchanged('legacy application, documentation and pack files untouched', legacy, run),
    unchanged('user data byte-identical', touched.userData, run),
    ...conflictKept({ project, fresh, before: run.before, after: run.after, rel: env.CONFLICT }),
    ...disownChecks(manifest, legacy),
    ...classChecks(manifest, readJson(fresh, '.ai-scaffold.json')),
    ...doctorChecks(env, parent),
    ...idempotent({ second: run.second, preview: run.previewAgain, before: run.settled, after: run.final }),
  ];
  return { id: `0.7.0 create node, ownership re-baseline (${legacy.length} legacy files left alone)`, kind: 'ADR-002', counts: run.applied.doc?.counts ?? null, checks, differing: [] };
}
