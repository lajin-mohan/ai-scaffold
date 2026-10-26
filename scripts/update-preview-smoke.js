#!/usr/bin/env node
/**
 * `ais update` preview against the PACKED tarball (item 25 slice 3, NFR-08).
 *
 * pre-publish-smoke.sh runs the working-tree CLI, so it cannot prove what
 * adopters receive. This script packs the CLI, installs the tarball in a
 * scratch directory and exercises the preview's CLI contract: one JSON
 * document on stdout, exit codes, removed flags, exception flags at the
 * installed version, invalid manifests, locks and malformed journals, one
 * `--apply` outside git (FR-46 retired in slice 4), and the packed CLI
 * killed with SIGKILL mid-apply and before its marker (NFR-09, AC-16,
 * AC-17). CI runs it on Ubuntu and Windows.
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-update-smoke-'));
let failures = 0;

function sh(command, cwd) {
  // npm is a .cmd shim on Windows, which needs a shell to run.
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf-8', timeout: 300_000 });
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

function check(name, condition, detail = '') {
  console.log(`${condition ? '  ✓' : '  ✗'} ${name}${condition ? '' : `  ${detail}`}`);
  if (!condition) failures++;
}

console.log('==> npm pack and install');
sh(`npm pack --pack-destination "${scratch}"`, root);
const tarball = fs.readdirSync(scratch).find((file) => file.endsWith('.tgz'));
const cliDir = path.join(scratch, 'cli');
fs.mkdirSync(cliDir);
sh('npm init -y', cliDir);
sh(`npm install "${path.join(scratch, tarball)}" --no-save --silent --no-audit --no-fund`, cliDir);
const bin = path.join(cliDir, 'node_modules', '@lajin.m', 'ai-scaffold', 'bin', 'ai-scaffold.js');
const cliVersion = JSON.parse(fs.readFileSync(path.join(cliDir, 'node_modules', '@lajin.m', 'ai-scaffold', 'package.json'), 'utf-8')).version;

function ais(...args) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: scratch, encoding: 'utf-8', timeout: 120_000 });
}

// The crash hook is test-only and not in the tarball: it SIGKILLs the packed
// CLI at the stage its own apply publishes on the diagnostics channel.
const crashHook = path.join(scratch, 'crash-hook.mjs');
fs.writeFileSync(crashHook, [
  "import diagnosticsChannel from 'node:diagnostics_channel';",
  "import process from 'node:process';",
  "diagnosticsChannel.subscribe('ais:update:apply', (event) => {",
  '  if (event.stage !== process.env.AIS_TEST_CRASH_STAGE) return;',
  "  if (process.env.AIS_TEST_CRASH_INDEX && String(event.index) !== process.env.AIS_TEST_CRASH_INDEX) return;",
  "  process.kill(process.pid, 'SIGKILL');",
  '});',
  '',
].join('\n'));

function aisKilled(stage, index, ...args) {
  const env = { ...process.env, AIS_TEST_CRASH_STAGE: stage, AIS_TEST_CRASH_INDEX: index };
  return spawnSync(process.execPath, ['--import', pathToFileURL(crashHook).href, bin, ...args],
    { cwd: scratch, env, encoding: 'utf-8', timeout: 120_000 });
}

/** Hash of every file under dir except .git, keyed by relative path. */
function snapshot(dir) {
  const out = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = path.join(rel, entry.name);
      if (entry.name === '.git') continue;
      if (entry.isDirectory()) walk(child);
      else out[child] = fs.readFileSync(path.join(dir, child)).toString('base64');
    }
  };
  walk('');
  return JSON.stringify(out);
}

/** Run with --json; the whole of stdout must parse as one document. */
function aisJson(...args) {
  const result = ais(...args, '--json');
  let doc = null;
  try {
    doc = JSON.parse(result.stdout);
  } catch {
    // doc stays null; the check below reports it.
  }
  return { status: result.status, doc, stdout: result.stdout };
}

function project(name) {
  const dir = path.join(scratch, name);
  const result = ais('create', dir, '--profile', 'node', '--yes', '--no-git', '--purpose', 'Update smoke', '--owner-email', 's@example.com');
  if (result.status !== 0) throw new Error(`create failed:\n${result.stderr || result.stdout}`);
  return dir;
}

function setManifest(dir, change) {
  const file = path.join(dir, '.ai-scaffold.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf-8'));
  fs.writeFileSync(file, JSON.stringify(change(manifest), null, 2));
}

function expectJson(name, args, { status, docStatus, code, schema = 'ais-update-preview/1' }) {
  const { status: actual, doc, stdout } = aisJson(...args);
  const ok = doc !== null && actual === status && doc.status === docStatus
    && doc.schema === schema && (code === undefined || doc.error?.code === code);
  check(name, ok, `exit ${actual}, stdout: ${stdout.slice(0, 200)}`);
  return doc;
}

console.log(`==> preview cases (packed CLI ${cliVersion})`);
const current = project('current');
expectJson('already current: one document, exit 0', ['update', current], { status: 0, docStatus: 'current' });
expectJson('exception flags at the installed version fail', ['update', current, '--keep-removed', 'Read(.env)'],
  { status: 1, docStatus: 'error', code: 'EXCEPTIONS_AT_CURRENT' });

// A fresh install is schema 2 already; model a pre-schema-2 (0.16.1) manifest.
function toLegacy({ manifestSchema: _schema, settingsBase: _base, ...rest }) {
  return { ...rest, version: '0.1.0', managedFiles: rest.managedFiles.map(({ class: _class, ...record }) => record) };
}

const older = project('older');
setManifest(older, toLegacy);
const manifestBytes = fs.readFileSync(path.join(older, '.ai-scaffold.json'));
const planned = expectJson('older install: planned, no conflicts, exit 0', ['update', older], { status: 0, docStatus: 'planned' });
check('planned document has sorted entries and the schema-2 migration',
  planned?.entries?.length > 0 && planned.migrations?.includes('schema-2'));
fs.appendFileSync(path.join(older, 'CLAUDE.md'), '\nlocal edit\n');
expectJson('an edited managed file: exit 2', ['update', older], { status: 2, docStatus: 'planned' });
const human = ais('update', older);
check('human report points to --apply and the .ais-new sidecar',
  human.status === 2 && human.stdout.includes('ais update --apply') && human.stdout.includes('.ais-new'));

expectJson('--force is removed', ['update', older, '--force'], { status: 1, docStatus: 'error', code: 'FLAG_REMOVED' });
expectJson('an unknown option still yields JSON', ['update', older, '--bogus'], { status: 1, docStatus: 'error', code: 'UNKNOWN_OPTION' });
expectJson('a missing option value still yields JSON', ['update', older, '--target-version'],
  { status: 1, docStatus: 'error', code: 'INVALID_OPTION' });
expectJson('another --target-version fails', ['update', older, '--target-version', '9.9.9'],
  { status: 1, docStatus: 'error', code: 'TARGET_VERSION_MISMATCH' });

fs.mkdirSync(path.join(older, '.ai-scaffold', 'backups', 'b1'), { recursive: true });
fs.writeFileSync(path.join(older, '.ai-scaffold', 'backups', 'b1', 'journal.json'), '{ broken');
const interrupted = expectJson('a malformed journal is an interrupted apply', ['update', older], { status: 1, docStatus: 'interrupted' });
check('the notice names the malformed journal', interrupted?.notices?.[0]?.includes('(malformed)'));
fs.writeFileSync(path.join(older, '.ai-scaffold', 'update.lock'), '1');
expectJson('a lock wins over the journal', ['update', older], { status: 1, docStatus: 'locked' });
check('preview left .ai-scaffold.json byte-identical', fs.readFileSync(path.join(older, '.ai-scaffold.json')).equals(manifestBytes));

const applied = project('applied');
setManifest(applied, (m) => ({ ...m, version: '0.1.0' }));
fs.appendFileSync(path.join(applied, 'AGENTS.md'), '\nlocal edit\n');
expectJson('--apply outside git needs --allow-no-git', ['update', applied, '--apply'],
  { status: 1, docStatus: 'error', code: 'GIT_UNAVAILABLE', schema: 'ais-update-apply/1' });
const done = expectJson('--apply --allow-no-git applies, exit 2 for the sidecar', ['update', applied, '--apply', '--allow-no-git'],
  { status: 2, docStatus: 'applied', schema: 'ais-update-apply/1' });
check('apply kept the edit, wrote AGENTS.md.ais-new and a completed backup',
  fs.readFileSync(path.join(applied, 'AGENTS.md'), 'utf-8').includes('local edit')
  && fs.existsSync(path.join(applied, 'AGENTS.md.ais-new'))
  && done !== null && fs.existsSync(path.join(applied, ...done.backup.split('/'), 'complete')));
const manifestAfter = JSON.parse(fs.readFileSync(path.join(applied, '.ai-scaffold.json'), 'utf-8'));
check('the manifest records this CLI version and schema 2', manifestAfter.version === cliVersion && manifestAfter.manifestSchema === 2);
expectJson('a second --apply is current', ['update', applied, '--apply', '--allow-no-git'],
  { status: 0, docStatus: 'current', schema: 'ais-update-apply/1' });

console.log('==> SIGKILL cases (packed CLI)');
// Two writes (CLAUDE.md, then the manifest), so a kill after the first
// leaves a mixed state.
function killed(name, stage, index) {
  const dir = project(name);
  const older = 'older scaffold claude\n';
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), older);
  const hash = `sha256:${crypto.createHash('sha256').update(older).digest('hex')}`;
  setManifest(dir, (m) => ({
    ...m, version: '0.1.0',
    managedFiles: m.managedFiles.map((r) => (r.path === 'CLAUDE.md' ? { ...r, hash } : r)),
  }));
  const child = aisKilled(stage, index, 'update', dir, '--apply', '--allow-no-git', '--json');
  check(`${name}: killed at ${stage}, lock left in place`,
    child.status !== 0 && fs.existsSync(path.join(dir, '.ai-scaffold', 'update.lock')), `exit ${child.status} signal ${child.signal}`);
  return dir;
}

const midWrite = killed('killed-mid-write', 'write-done', '0');
const frozen = snapshot(midWrite);
expectJson('after a kill the stale lock is reported, not run over', ['update', midWrite, '--apply', '--allow-no-git'],
  { status: 1, docStatus: 'locked', schema: 'ais-update-apply/1' });
fs.rmSync(path.join(midWrite, '.ai-scaffold', 'update.lock'));
const unlocked = snapshot(midWrite);
const midPreview = expectJson('preview after the lock is cleared reports the interrupted apply', ['update', midWrite], { status: 1, docStatus: 'interrupted' });
check('the notice names the backup and the mixed state', /\.ai-scaffold\/backups\/\S+ \(mixed\)/.test(midPreview?.notices?.join(' ') ?? ''));
expectJson('--apply refuses a mixed interrupted apply', ['update', midWrite, '--apply', '--allow-no-git'],
  { status: 1, docStatus: 'interrupted', schema: 'ais-update-apply/1' });
check('no file in the project or the backup changed after the kill', snapshot(midWrite) === unlocked && unlocked !== frozen);

const beforeMarker = killed('killed-before-marker', 'before-marker', '');
fs.rmSync(path.join(beforeMarker, '.ai-scaffold', 'update.lock'));
const markerFrozen = snapshot(beforeMarker);
expectJson('preview after a kill before the marker reports and writes nothing', ['update', beforeMarker], { status: 1, docStatus: 'interrupted' });
check('preview changed nothing', snapshot(beforeMarker) === markerFrozen);
const completed = expectJson('--apply completes it and plans normally (already current)', ['update', beforeMarker, '--apply', '--allow-no-git'],
  { status: 0, docStatus: 'current', schema: 'ais-update-apply/1' });
check('the completion is reported', completed?.notices?.join(' ').includes('completed (all-final)'));

const broken = project('broken');
fs.writeFileSync(path.join(broken, '.ai-scaffold.json'), '{');
const invalid = expectJson('an invalid manifest fails with nulls', ['update', broken], { status: 1, docStatus: 'error', code: 'MANIFEST_INVALID' });
check('unknown fields are null, never omitted', invalid !== null && invalid.from === null && 'entries' in invalid);

fs.rmSync(scratch, { recursive: true, force: true });
console.log(failures === 0 ? '\nupdate preview smoke: all checks passed' : `\nupdate preview smoke: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
