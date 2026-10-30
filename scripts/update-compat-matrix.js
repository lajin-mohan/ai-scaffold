#!/usr/bin/env node
/**
 * Item 25 slice 5: `ais update` against real installs from npm (criteria
 * 5A, 5B). Installs published versions, generates projects with them under a
 * fixed clock and one project name, plays an adopter (user data, application
 * files, one edited managed file), then previews and applies with the PACKED
 * candidate CLI and checks the result against a fresh install of that same
 * candidate. Usage: node scripts/update-compat-matrix.js [--report <file>]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  check, conflictKept, idempotent, managedParity, manifestAfter, outcomes, unchanged, writeScope, byAction, list,
} from './update-compat/checks.js';
import {
  commitAll, git, installCandidate, installPublished, readJson, runCli, runJson, snapshot, writeClock,
} from './update-compat/lib.js';
import { renderReport } from './update-compat/report.js';
import { runCrlf, runHashless, runLegacy070 } from './update-compat/special-cases.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Newer than the latest published version (0.17.1), so it has an update to
// take, and equal to the next release so the 0.18.0 migration is crossed.
const CANDIDATE = '0.18.0';
const NAME = 'compat-app';
const CONFLICT = 'AGENTS.md';
// 0.8.1 and generic are what real adopters ran (engyne; a 0.14.0 generic
// workspace), not just representative picks (lessons 2026-10-28).
const MATRIX = [
  { version: '0.8.1', profiles: ['node', 'generic'], noGitFlag: false },
  { version: '0.8.5', profiles: ['node', 'laravel'] },
  { version: '0.14.0', profiles: ['node', 'laravel', 'python', 'generic'] },
  { version: '0.16.1', profiles: ['node', 'laravel', 'python'] },
  { version: '0.17.1', profiles: ['node', 'generic'] },
];
// Combinations the release could not produce, reported rather than skipped.
const NOT_APPLICABLE = [
  { id: '0.8.5 create python', kind: '5A', notApplicable: '0.8.5 ships only the generic, laravel and node profiles', checks: [], counts: null, differing: [] },
];
// ADR-002: the 0.7.x manifest generation, re-baselined to the current contract.
const LEGACY_VERSION = '0.7.0';
const INSTALL_ARGS = ['--yes', '--purpose', 'Compatibility matrix', '--owner-email', 'compat@example.com'];
const SCAFFOLD_ADD = /^(\.claude\/|\.ai-scaffold\/|tasks\/|CLAUDE\.md$|AGENTS\.md$|constitution\.md$|CHANGELOG\.md$)/;

const ctx = {};

// Recorded answers a fresh install can be given by flag. Update renders from
// the project's recorded answers, so the reference must use the same ones.
const ANSWER_FLAGS = [['test', '--test-command'], ['lint', '--lint-command'], ['typecheck', '--typecheck-command'], ['build', '--build-command']];
// Commands a fresh install cannot be given (no flag in any version).
const UNFLAGGED_COMMANDS = ['dev', 'install', 'migration'];

function answerArgs(manifest) {
  const args = manifest.risk?.multiTenant === true ? ['--multi-tenant'] : [];
  for (const [key, flag] of ANSWER_FLAGS) {
    if (typeof manifest.commands?.[key] === 'string') args.push(flag, manifest.commands[key]);
  }
  return args;
}

/** Generate `<parent>/compat-app` with a CLI; init gets an existing application first. */
function install(bin, parent, { mode, profile, extra = [], noGit = true, noGitFlag = true }) {
  const project = path.join(parent, NAME);
  fs.mkdirSync(parent, { recursive: true });
  if (mode === 'init') {
    fs.mkdirSync(path.join(project, 'src'), { recursive: true });
    fs.writeFileSync(path.join(project, 'README.md'), '# Compat App\n\nThe adopter\'s own README.\n');
    fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: NAME, private: true }, null, 2)}\n`);
    fs.writeFileSync(path.join(project, 'src', 'index.js'), 'export const app = true;\n');
  }
  const args = mode === 'create'
    ? ['create', NAME, '--profile', profile, ...(noGit && noGitFlag ? ['--no-git'] : []), ...INSTALL_ARGS, ...extra]
    : ['init', NAME, '--profile', profile, ...INSTALL_ARGS, ...extra];
  const result = runCli({ bin, clock: ctx.clock, cwd: parent, args });
  if (result.status !== 0) throw new Error(`${mode} ${profile} failed:\n${result.stderr || result.stdout}`);
  // A release without --no-git made its own repository; drop it so the case
  // commits with the same git settings as every other row.
  if (noGit && !noGitFlag) fs.rmSync(path.join(project, '.git'), { recursive: true, force: true });
  return project;
}

/** Play an adopter: fill user data, edit application files, edit one managed file. */
function adopt(project) {
  const write = (rel, text, append = true) => {
    const file = path.join(project, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (append) fs.appendFileSync(file, text);
    else fs.writeFileSync(file, text);
  };
  write('tasks/lessons.md', '\n## 2026-10-15 — A lesson this project learned\n');
  write('.claude/MEMORY.md', '\nProject memory written by the adopter.\n');
  write('.claude/memory/notes.md', 'Adopter notes.\n', false);
  write('.claude/settings.local.json', '{ "permissions": { "allow": ["Bash(make *)"] } }\n', false);
  write('README.md', '\nAdopter section.\n');
  write('src/app-code.js', 'export const feature = 1;\n', false);
  write(CONFLICT, '\nAdopter edit to a scaffold file.\n');
  return {
    userData: ['tasks/lessons.md', '.claude/MEMORY.md', '.claude/memory/notes.md', '.claude/settings.local.json'],
    app: ['README.md', 'src/app-code.js'],
  };
}

/** A fresh candidate install given the old project's recorded answers. */
function freshInstall(mode, profile, extra) {
  const key = `${mode}-${profile}-${Object.keys(ctx.fresh).length}`;
  const known = Object.entries(ctx.fresh).find(([, entry]) => entry.mode === mode && entry.profile === profile && entry.args === JSON.stringify(extra));
  if (known) return known[1].dir;
  const dir = install(ctx.candidate, path.join(ctx.root, 'fresh', key), { mode, profile, extra });
  ctx.fresh[key] = { mode, profile, args: JSON.stringify(extra), dir };
  return dir;
}

/**
 * The only differences from the reference that pass: `init` renders the
 * dev, install and migration commands into `.ai-scaffold/README.md`, and no
 * flag can give those to a fresh install.
 */
function explainer(mode, applied, freshManifest) {
  return (rel) => {
    if (mode !== 'init' || rel !== '.ai-scaffold/README.md') return null;
    const drift = UNFLAGGED_COMMANDS.filter((key) => applied.commands?.[key] !== freshManifest.commands?.[key]);
    if (drift.length === 0) return null;
    return `renders recorded commands with no install flag: ${drift.map((key) => `${key} "${applied.commands?.[key]}"`).join(', ')}`;
  };
}

const update = (parent, ...flags) => runJson({ bin: ctx.candidate, clock: ctx.clock, cwd: parent, args: ['update', NAME, ...flags] });

/** Preview, apply, then a second apply and a preview on the committed result. */
function updateTwice(parent, project) {
  const before = snapshot(project);
  const preview = update(parent);
  const applied = update(parent, '--apply');
  const after = snapshot(project);
  commitAll(project, 'after update');
  const settled = snapshot(project);
  const second = update(parent, '--apply');
  const previewAgain = update(parent);
  return { before, preview, applied, after, settled, second, previewAgain, final: snapshot(project) };
}

function extras({ mode, profile }, project, run) {
  const out = [];
  if (mode === 'init') {
    const adds = byAction(run.applied.doc, 'add').filter((rel) => !SCAFFOLD_ADD.test(rel));
    out.push(check('init adds nothing from the create skeleton (AC-14)', adds.length === 0, `added: ${list(adds)}`));
    const gone = ['CLAUDE.md', 'AGENTS.md', 'constitution.md'].filter((rel) => run.before.has(rel) && !run.after.has(rel));
    out.push(check('init removes none of CLAUDE.md, AGENTS.md, constitution.md (AC-14)', gone.length === 0, `removed: ${list(gone)}`));
  }
  if (profile === 'laravel' && mode === 'create') {
    const unowned = byAction(run.preview.doc, 'skip-unowned');
    const missing = ['README.md', 'routes/web.php'].filter((rel) => !unowned.includes(rel));
    out.push(check('laravel README.md and routes/web.php are skip-unowned (AC-11)', missing.length === 0, `not unowned: ${list(missing)}`));
  }
  return out;
}

function runCase(spec) {
  const id = `${spec.version} ${spec.mode} ${spec.profile}`;
  const parent = path.join(ctx.root, 'cases', id.replace(/ /g, '-'));
  const project = install(ctx.olds[spec.version], parent, spec);
  const touched = adopt(project);
  commitAll(project, 'adopter state');
  const run = updateTwice(parent, project);
  const appliedManifest = readJson(project, '.ai-scaffold.json');
  const fresh = freshInstall(spec.mode, spec.profile, answerArgs(appliedManifest));
  const freshManifest = readJson(fresh, '.ai-scaffold.json');
  const appPaths = [...new Set([...touched.app, ...byAction(run.preview.doc, 'skip-unowned')])];
  const userData = [...new Set([...touched.userData, ...(run.preview.doc?.entries ?? []).filter((e) => e.class === 'user-data').map((e) => e.path)])];
  const parity = managedParity({
    project, fresh, applied: run.applied.doc ?? {}, freshManifest, explain: explainer(spec.mode, appliedManifest, freshManifest),
  });
  const checks = [
    ...outcomes({ preview: run.preview, applied: run.applied, expectExit: 2 }),
    writeScope({ before: run.before, after: run.after, applied: run.applied.doc ?? {} }),
    unchanged('user data byte-identical', userData, run),
    unchanged('application files byte-identical', appPaths, run),
    ...conflictKept({ project, fresh, before: run.before, after: run.after, rel: CONFLICT }),
    ...parity.checks,
    ...manifestAfter({ project, version: CANDIDATE }),
    ...extras(spec, project, run),
    ...idempotent({ second: run.second, preview: run.previewAgain, before: run.settled, after: run.final }),
  ];
  return {
    id, kind: '5A', counts: run.applied.doc?.counts ?? null, checks,
    differing: parity.differing, explained: parity.explained, answers: answerArgs(appliedManifest).join(' ') || '(defaults)',
  };
}

// A case that throws is a failed case in the report, never a crashed run.
function guarded(id, run) {
  console.log(`==> ${id}`);
  try {
    return run();
  } catch (error) {
    return { id, kind: 'error', counts: null, differing: [], checks: [check('case ran to completion', false, error.message.split('\n')[0])] };
  }
}

function main() {
  const reportAt = process.argv.indexOf('--report');
  ctx.root = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-compat-'));
  let failed;
  try {
    const { results, meta } = runMatrix();
    const report = renderReport(results, meta);
    console.log(`\n${report}`);
    if (reportAt !== -1) fs.writeFileSync(process.argv[reportAt + 1], report);
    failed = results.flatMap((r) => r.checks.filter((c) => !c.ok)).length;
  } finally {
    fs.rmSync(ctx.root, { recursive: true, force: true });
  }
  process.exit(failed === 0 ? 0 : 1);
}

function runMatrix() {
  ctx.clock = writeClock(ctx.root);
  console.log(`==> packing the candidate CLI (${CANDIDATE}) and installing published versions`);
  const candidate = installCandidate(ctx.root, REPO, CANDIDATE);
  ctx.candidate = candidate.bin;
  const versions = [...MATRIX.map(({ version }) => version), LEGACY_VERSION];
  ctx.olds = Object.fromEntries(versions.map((version) => [version, installPublished(ctx.root, version)]));
  ctx.fresh = {};
  const specs = MATRIX.flatMap(({ version, profiles, noGitFlag }) => [
    ...profiles.map((profile) => ({ version, mode: 'create', profile, noGitFlag })),
    { version, mode: 'init', profile: 'node' },
  ]);
  const env = {
    ctx, NAME, CONFLICT, install, adopt, update, updateTwice, freshInstall, answerArgs,
    cli: (parent, args) => runJson({ bin: ctx.candidate, clock: ctx.clock, cwd: parent, args }),
  };
  const cases = [
    ...specs.map((spec) => [`${spec.version} ${spec.mode} ${spec.profile}`, () => runCase(spec)]),
    ['synthetic hashless manifest', () => runHashless(env)],
    ['autocrlf init clone', () => runCrlf(env, 'init')],
    ['autocrlf create clone', () => runCrlf(env, 'create')],
    ['0.7.0 ownership re-baseline', () => runLegacy070(env)],
  ];
  const results = [...cases.map(([id, run]) => guarded(id, run)), ...NOT_APPLICABLE];
  const meta = {
    candidate: CANDIDATE, tarball: candidate.tarball, commit: git(REPO, 'rev-parse', 'HEAD').trim(),
    platform: `${process.platform} ${os.release()}`, node: process.version,
  };
  return { results, meta };
}

main();
