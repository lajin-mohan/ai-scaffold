/**
 * Helpers for the item 25 slice 5 compatibility matrix
 * (`scripts/update-compat-matrix.js`): installing CLIs from npm and from the
 * packed tarball, a fixed clock, git, and byte-level tree snapshots.
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 300_000;
export const FIXED_CLOCK = Date.UTC(2026, 9, 15, 12, 0, 0);

/** Run a command through a shell (npm is a .cmd shim on Windows); throw on failure. */
export function sh(command, cwd) {
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf-8', timeout: TIMEOUT_MS });
  if (result.status !== 0) throw new Error(`${command} failed in ${cwd}:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

export function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8', timeout: TIMEOUT_MS });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in ${cwd}:\n${result.stderr}`);
  return result.stdout;
}

/** A repository at `dir` with everything committed, hooks bypassed, line endings untouched. */
export function commitAll(dir, message = 'state') {
  if (!fs.existsSync(path.join(dir, '.git'))) {
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 'compat@example.com');
    git(dir, 'config', 'user.name', 'Compat');
    git(dir, 'config', 'core.autocrlf', 'false');
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '--allow-empty', '-m', message);
}

/** A preload that pins `Date` to FIXED_CLOCK, so every CLI run stamps the same time. */
export function writeClock(dir) {
  const file = path.join(dir, 'fixed-clock.mjs');
  fs.writeFileSync(file, [
    `const FIXED = ${FIXED_CLOCK};`,
    'const RealDate = Date;',
    'class FixedDate extends RealDate {',
    '  constructor(...args) { if (args.length === 0) super(FIXED); else super(...args); }',
    '  static now() { return FIXED; }',
    '}',
    'globalThis.Date = FixedDate;',
    '',
  ].join('\n'));
  return pathToFileURL(file).href;
}

function binOf(installDir) {
  return path.join(installDir, 'node_modules', '@lajin.m', 'ai-scaffold', 'bin', 'ai-scaffold.js');
}

/** Install a published version from npm; returns its bin path. */
export function installPublished(root, version) {
  const dir = path.join(root, `cli-${version}`);
  fs.mkdirSync(dir, { recursive: true });
  sh('npm init -y', dir);
  sh(`npm install @lajin.m/ai-scaffold@${version} --no-save --silent --no-audit --no-fund`, dir);
  return binOf(dir);
}

/**
 * Pack the repository, install the tarball, and give the installed copy a
 * synthetic version newer than every published one. Only package.json's
 * version changes; every code byte is the packed artifact's.
 */
export function installCandidate(root, repo, version) {
  const dir = path.join(root, 'cli-candidate');
  fs.mkdirSync(dir, { recursive: true });
  const tarball = sh(`npm pack --pack-destination "${dir}" --silent`, repo).trim().split('\n').pop();
  sh('npm init -y', dir);
  sh(`npm install "${path.join(dir, tarball)}" --no-save --silent --no-audit --no-fund`, dir);
  const manifest = path.join(dir, 'node_modules', '@lajin.m', 'ai-scaffold', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(manifest, `${JSON.stringify(pkg, null, 2)}\n`);
  return { bin: binOf(dir), tarball };
}

/** Run a CLI under the fixed clock. */
export function runCli({ bin, clock, cwd, args }) {
  return spawnSync(process.execPath, ['--import', clock, bin, ...args], { cwd, encoding: 'utf-8', timeout: TIMEOUT_MS });
}

/** Run a CLI with --json and parse its one document; null when stdout is not one. */
export function runJson(options) {
  const result = runCli({ ...options, args: [...options.args, '--json'] });
  let doc = null;
  try {
    doc = JSON.parse(result.stdout);
  } catch {
    // doc stays null; callers report the raw output.
  }
  return { status: result.status, doc, stdout: result.stdout, stderr: result.stderr };
}

export const hashOf = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Map of every file under `dir` (posix paths) to its sha256, skipping .git. */
export function snapshot(dir) {
  const out = new Map();
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.git') continue;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) out.set(child, hashOf(fs.readFileSync(path.join(dir, child))));
    }
  };
  walk('');
  return out;
}

/** Paths whose content changed, appeared or disappeared between two snapshots. */
export function changedPaths(before, after) {
  const changed = new Set();
  for (const [rel, hash] of after) if (before.get(rel) !== hash) changed.add(rel);
  for (const rel of before.keys()) if (!after.has(rel)) changed.add(rel);
  return [...changed].sort();
}

export const readFile = (dir, rel) => fs.readFileSync(path.join(dir, ...rel.split('/')));
export const exists = (dir, rel) => fs.existsSync(path.join(dir, ...rel.split('/')));
export const readJson = (dir, rel) => JSON.parse(readFile(dir, rel).toString('utf-8'));
