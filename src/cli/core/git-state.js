/**
 * Git safety for `ais update --apply` (item 25, BRD FR-32, FR-33, FR-47).
 * Read-only: runs `git rev-parse` and `git status` only, never a command that
 * changes the repository.
 */

import { spawnSync } from 'child_process';
import { resolveOnPath } from './exec-path.js';
import { UpdateError } from './update-policy.js';
import { identityKey } from './write-ops.js';

const GIT_TIMEOUT_MS = 30_000;

function runGit(git, root, args, env) {
  // Resolved from PATH, never from the project directory (item 94); array
  // form, no shell, fixed arguments.
  return spawnSync(git, ['-C', root, ...args], { env, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS, windowsHide: true });
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
  const status = runGit(git, root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.'], env);
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
