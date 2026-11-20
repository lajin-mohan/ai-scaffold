/**
 * eval-smoke-setup — workspace root, the three setups and their seeding for
 * scripts/eval-smoke.js (item 99). Setups: evals/smoke/setups/README.md.
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { resolveOnPath } from '../src/cli/core/exec-path.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const tasksRoot = path.join(repoRoot, 'evals/smoke/tasks');
export const setupsRoot = path.join(repoRoot, 'evals/smoke/setups');
export const SETUPS = ['native', 'minimal', 'full'];
export const SEED_IDENTITY = { GIT_AUTHOR_NAME: 'Smoke Eval', GIT_AUTHOR_EMAIL: 'smoke@example.invalid',
  GIT_COMMITTER_NAME: 'Smoke Eval', GIT_COMMITTER_EMAIL: 'smoke@example.invalid' };
// The project surface every setup shares (README "Evaluation setups").
const SHARED_SURFACE = ['package.json', 'test'];
// A Windows 8.3 short name such as USERNA~1: Claude Code treats a path with
// one as suspicious and, headless, denies every write under it (2026-11-20).
const SHORT_NAME = /~\d/;

function fail(message) {
  throw new Error(message);
}

/**
 * The temporary root, with short names expanded. Workspaces are created under
 * it and cleanup is checked against it, so both always agree.
 */
export function canonicalTmpRoot() {
  const root = fs.realpathSync.native(os.tmpdir());
  if (SHORT_NAME.test(root)) fail(`temporary root still has a short-name segment: ${root}`);
  return root;
}

export function makeWorkRoot(prefix = 'ais-smoke-') {
  return fs.mkdtempSync(path.join(canonicalTmpRoot(), prefix));
}

/** Removes a workspace only when it is a direct child of the canonical root. */
export function removeWorkRoot(dir, prefix = 'ais-smoke-') {
  if (path.dirname(dir) !== canonicalTmpRoot() || !path.basename(dir).startsWith(prefix)) {
    fail(`refusing cleanup outside the canonical temporary root: ${dir}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

export function parseSetups(value = 'full') {
  const setups = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  if (!setups.length || new Set(setups).size !== setups.length) fail('--setups must be a nonempty list without duplicates');
  for (const setup of setups) if (!SETUPS.includes(setup)) fail(`unknown setup ${setup}; expected ${SETUPS.join(', ')}`);
  return setups;
}

/** Setup order for one repeat of one task: rotated so no setup always runs first. */
export function setupOrder(setups, repeat, taskIndex) {
  const shift = (repeat - 1 + taskIndex) % setups.length;
  return [...setups.slice(shift), ...setups.slice(0, shift)];
}

function treeHash(dir) {
  const hash = crypto.createHash('sha256');
  const walk = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const file = path.join(current, name);
      if (fs.statSync(file).isDirectory()) walk(file);
      else hash.update(path.relative(dir, file).split(path.sep).join('/')).update(fs.readFileSync(file));
    }
  };
  walk(dir);
  return hash.digest('hex');
}

/** What each setup adds, as hashes: the full setup is fixed by the tarball hash. */
export function setupHashes(setups) {
  return Object.fromEntries(setups.map((setup) => {
    if (setup === 'native') return [setup, 'none'];
    if (setup === 'full') return [setup, 'tarball'];
    return [setup, treeHash(path.join(setupsRoot, setup))];
  }));
}

// One project name for every setup, so package.json does not vary with the directory.
const PROJECT_NAME = 'smoke-project';

function createProject(cliEntry, dir) {
  const created = spawnSync(process.execPath, [cliEntry, 'create', dir, '--profile', 'node', '--yes', '--project-name', PROJECT_NAME],
    { encoding: 'utf8', env: { ...process.env, ...SEED_IDENTITY }, timeout: 120000 });
  if (created.status !== 0) fail(`ais create failed for ${dir}:\n${created.stderr || created.stdout}`);
}

/** One generated project per work root, the source of the shared surface. */
function referenceProject(cliEntry, workRoot) {
  const dir = path.join(workRoot, 'reference');
  if (!fs.existsSync(dir)) createProject(cliEntry, dir);
  return dir;
}

export function makeRunner(dir) {
  const git = resolveOnPath('git') ?? fail('git not found on PATH');
  return (cmd, args) => {
    const exe = cmd === 'node' ? process.execPath : cmd === 'git' ? git : fail(`checks may run only node or git, not ${cmd}`);
    return spawnSync(exe, args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...SEED_IDENTITY }, timeout: 120000 });
  };
}

function lay(setup, cliEntry, workRoot, dir) {
  if (setup === 'full') return createProject(cliEntry, dir);
  const reference = referenceProject(cliEntry, workRoot);
  fs.mkdirSync(dir, { recursive: true });
  for (const rel of SHARED_SURFACE) fs.cpSync(path.join(reference, rel), path.join(dir, rel), { recursive: true });
  if (setup === 'minimal') fs.cpSync(path.join(setupsRoot, 'minimal'), dir, { recursive: true });
}

/** A fresh project for one run: setup files, task seed, one seed commit on a feature branch. */
export function seedProject(task, cliEntry, workRoot, index, setup = 'full') {
  const dir = path.join(workRoot, `${task.id}-${setup}-r${index}`);
  lay(setup, cliEntry, workRoot, dir);
  const seed = path.join(tasksRoot, task.id, 'seed');
  if (fs.existsSync(seed)) fs.cpSync(seed, dir, { recursive: true });
  const run = makeRunner(dir);
  const checkedGit = (args) => {
    const result = run('git', args);
    if (result.status !== 0) fail(`fixture git ${args[0]} failed: ${result.stderr || result.stdout}`);
    return result.stdout.trim();
  };
  if (setup !== 'full') checkedGit(['init', '-q', '-b', 'dev']);
  checkedGit(['checkout', '-q', '-b', `feature/smoke-${task.id}`]);
  checkedGit(['add', '-A']);
  // Fixture setup deliberately includes failing tests. Disable hooks for this
  // seed commit only; evaluated agent commands still use the setup's hooks.
  const emptyHooks = path.join(workRoot, 'empty-seed-hooks');
  fs.mkdirSync(emptyHooks, { recursive: true });
  checkedGit(['-c', `core.hooksPath=${emptyHooks}`, '-c', 'commit.gpgsign=false',
    'commit', '-q', '--allow-empty', '-m', `test: seed ${task.id}`]);
  if (checkedGit(['remote']).length) fail('fixture unexpectedly has a git remote');
  return { dir, run, seedCommit: checkedGit(['rev-parse', 'HEAD']) };
}
