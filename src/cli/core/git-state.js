/**
 * Git safety for `ais update --apply` (item 25, BRD FR-32, FR-33, FR-47).
 * Runs `git rev-parse`, `git config` (read only) and `git status` only, with
 * optional locks off so the index is not refreshed, and with `core.fsmonitor`
 * and every filter driver off and submodules skipped, so no command
 * configured in the project's own repository runs.
 */

import { spawnSync } from 'child_process';
import { resolveOnPath } from './exec-path.js';
import { UpdateError } from './update-policy.js';
import { identityKey } from './write-ops.js';

export const GIT_TIMEOUT_MS = 30_000;
// The project may arrive with a hostile .git/config (#159 review).
export const SAFE_GIT_OPTIONS = ['-c', 'core.fsmonitor=false', '--no-optional-locks'];

function runGit(git, root, args, env) {
  // Resolved from PATH, never from the project directory (item 94); array
  // form, no shell, fixed arguments.
  return spawnSync(git, [...SAFE_GIT_OPTIONS, '-C', root, ...args], { env, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS, windowsHide: true });
}

// A driver name that would change the meaning of `-c name=value`.
const UNSAFE_DRIVER_NAME = /[=\0\r\n]/;

/**
 * Filter drivers configured for the project (its own config, a file it
 * includes, or the adopter's) run on stat-dirty files during `git status`,
 * and a copied repository makes every tracked file stat-dirty. Reading config
 * runs nothing, so each driver found is neutralised for the status call
 * (#159 security review).
 * @returns {{ args: string[] } | { error: string }}
 */
function filterOverrides(git, root, env) {
  const listed = runGit(git, root, ['config', '-z', '--includes', '--name-only', '--get-regexp', '^filter\\.'], env);
  if (listed.status === 1) return { args: [] };
  if (listed.status !== 0) return { error: (listed.stderr || 'git config failed').trim() };
  const names = new Set(listed.stdout.split('\0').filter(Boolean)
    .map((key) => key.slice('filter.'.length, key.lastIndexOf('.'))));
  const args = [];
  for (const name of names) {
    if (UNSAFE_DRIVER_NAME.test(name)) return { error: 'a git filter driver name cannot be neutralised' };
    args.push('-c', `filter.${name}.clean=`, '-c', `filter.${name}.process=`, '-c', `filter.${name}.required=false`);
  }
  return { args };
}

/** Split `git status --porcelain=v1 -z` output into { code, path } records. */
export function parsePorcelain(output) {
  const fields = output.split('\0');
  const records = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.length < 4) continue;
    const code = field.slice(0, 2);
    records.push({ code, path: field.slice(3) });
    // A rename or copy is followed by its source path in the next field.
    if (code[0] === 'R' || code[0] === 'C') records.push({ code, path: fields[++i] ?? '' });
  }
  return records;
}

/**
 * @returns {{ state: 'repository', dirty: Array<{ rel: string, untracked: boolean }> }
 *   | { state: 'unavailable', reason: string }}
 *   Paths are relative to the project, even when it is a subdirectory of the
 *   repository.
 */
export function readGitState(root, { env = process.env, platform = process.platform } = {}) {
  const git = resolveOnPath('git', { env, platform });
  if (!git) return { state: 'unavailable', reason: 'git was not found on PATH' };
  const inside = runGit(git, root, ['rev-parse', '--is-inside-work-tree', '--show-prefix'], env);
  if (inside.status !== 0 || !inside.stdout.startsWith('true')) {
    const detail = (inside.stderr || '').trim().split('\n')[0];
    return { state: 'unavailable', reason: detail || 'not inside a git work tree' };
  }
  const prefix = inside.stdout.split('\n')[1]?.trim() ?? '';
  const filters = filterOverrides(git, root, env);
  if (filters.error) return { state: 'unavailable', reason: filters.error };
  // Submodules are skipped: their own config could define drivers too.
  const status = runGit(git, root,
    [...filters.args, 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all', '--', '.'], env);
  if (status.status !== 0) return { state: 'unavailable', reason: (status.stderr || 'git status failed').trim() };
  const dirty = parsePorcelain(status.stdout)
    .filter((record) => record.path.startsWith(prefix))
    .map((record) => ({ rel: record.path.slice(prefix.length), untracked: record.code === '??' }));
  return { state: 'repository', dirty };
}

// Planned paths are always normalisable, so a dirty path that is not (a
// reserved or aliasing name, `..`) can never match one: it is skipped, not
// allowed to abort the apply.
function dirtyKey(rel) {
  try {
    return identityKey(rel);
  } catch {
    return null;
  }
}

/**
 * FR-32 and FR-47. `writePaths` are every path the apply writes or deletes,
 * sidecars included. Untracked `.ais-new` files from earlier runs are exempt.
 * @returns {'clean'|'dirty-allowed'|'acknowledged-no-repository'}
 */
export function checkGitSafety({ root, writePaths, allowDirty = false, allowNoGit = false, state }) {
  const git = state ?? readGitState(root);
  if (git.state === 'unavailable') {
    if (allowNoGit) return 'acknowledged-no-repository';
    throw new UpdateError('GIT_UNAVAILABLE',
      `Git safety cannot be checked (${git.reason}). Commit or back up the project, then re-run with --allow-no-git.`);
  }
  const planned = new Set(writePaths.map(identityKey));
  const conflicts = git.dirty
    .filter((d) => !(d.untracked && d.rel.endsWith('.ais-new')))
    .filter((d) => planned.has(dirtyKey(d.rel)))
    .map((d) => d.rel)
    .sort();
  if (conflicts.length === 0) return 'clean';
  if (allowDirty) return 'dirty-allowed';
  throw new UpdateError('UNCOMMITTED_CHANGES',
    `Uncommitted changes in files the update would change: ${conflicts.join(', ')}. Commit or stash them, or re-run with --allow-dirty.`);
}
