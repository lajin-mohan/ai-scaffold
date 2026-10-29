/**
 * The git hooks the scaffold delivers (item 66 slice d). `create` copies them
 * into the hooks directory once; `ais update --apply` keeps them active, so
 * an upgraded project neither runs a stale pre-commit nor skips the new
 * commit-msg. Best effort: every outcome is a notice, never a failed apply.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { resolveOnPath } from './exec-path.js';

export const GIT_HOOKS = ['pre-commit', 'commit-msg'];
const HOOK_DIR = '.claude/hooks';

// Shell scripts and extensionless hooks run directly, so they need the
// executable bit; the .py helpers are invoked through an interpreter.
export function isExecutableHook(rel) {
  if (!rel.startsWith(`${HOOK_DIR}/`)) return false;
  const name = rel.slice(HOOK_DIR.length + 1);
  return !name.includes('/') && (!name.includes('.') || name.endsWith('.sh'));
}

function readOrNull(file) {
  try {
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

/** The delivered hook sources before the apply, to recognise stale copies. */
export function readHookSources(root) {
  return new Map(GIT_HOOKS.map((hook) => [hook, readOrNull(path.join(root, HOOK_DIR, hook))]));
}

function gitRunner(root) {
  // Resolved from PATH, never from the project directory (item 94).
  const git = resolveOnPath('git');
  if (!git) return null;
  const env = { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(path.resolve(root)) };
  return (args) => {
    const result = spawnSync(git, args, { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], env });
    return result.status === 0 ? result.stdout.trim() : null;
  };
}

function samePath(a, b) {
  const norm = (p) => path.resolve(p).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

// One hook: install when missing, refresh a copy of the previous scaffold
// version, leave anything else alone, since it is the project's own hook.
function syncHook(root, hooksDir, hook, previous) {
  const source = readOrNull(path.join(root, HOOK_DIR, hook));
  if (!source) return null;
  const dest = path.join(hooksDir, hook);
  const current = readOrNull(dest);
  if (current && !current.equals(source) && !(previous && current.equals(previous))) {
    return `Left ${hook} in the git hooks directory unchanged: it differs from ${HOOK_DIR}/${hook}. Merge the two by hand if you want the scaffold version.`;
  }
  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    if (!current || !current.equals(source)) fs.copyFileSync(path.join(root, HOOK_DIR, hook), dest);
    fs.chmodSync(dest, 0o755);
  } catch (error) {
    return `Could not install the ${hook} git hook (${error.code ?? error.message}); copy ${HOOK_DIR}/${hook} into ${hooksDir} by hand.`;
  }
  if (!current) return `Installed the ${hook} git hook.`;
  return current.equals(source) ? null : `Updated the ${hook} git hook to the new version.`;
}

const NON_EXECUTABLE = '100644';

/** True when .claude/hooks/<hook> is committed without the executable bit. */
export function committedNonExecutable(root, hook) {
  const git = gitRunner(root);
  return Boolean(git?.(['ls-files', '-s', '--', `${HOOK_DIR}/${hook}`])?.startsWith(NON_EXECUTABLE));
}

// Git keeps the executable bit in the index. A hook committed without it is
// skipped on Linux and macOS clones, and Windows (core.fileMode false) never
// records the bit for a new file on its own.
function indexModeNotices(git) {
  const fileMode = git(['config', '--get', 'core.fileMode']);
  const notices = [];
  for (const hook of GIT_HOOKS) {
    const rel = `${HOOK_DIR}/${hook}`;
    const staged = git(['ls-files', '-s', '--', rel]);
    if (staged?.startsWith(NON_EXECUTABLE)) {
      notices.push(`${rel} is committed without the executable bit, so Linux and macOS clones skip it. Run \`git update-index --chmod=+x ${rel}\` and commit.`);
    } else if (staged === '' && fileMode === 'false') {
      notices.push(`Commit ${rel} with \`git add --chmod=+x ${rel}\` so Linux and macOS clones can run it.`);
    }
  }
  return notices;
}

/**
 * @param {string} root project root
 * @param {Map<string, Buffer|null>} previous hook sources read before the apply
 * @returns {string[]} notices for the report
 */
export function activateGitHooks(root, previous) {
  const git = gitRunner(root);
  if (!git) return [];
  const resolved = git(['rev-parse', '--git-path', 'hooks']);
  if (resolved === null) return [];
  const hooksDir = path.resolve(root, resolved);
  const notices = indexModeNotices(git);
  if (samePath(hooksDir, path.join(root, HOOK_DIR))) return notices;
  if (git(['config', '--get', 'core.hooksPath'])) {
    return [`core.hooksPath is set to ${resolved}, so git ignores .git/hooks; copy ${GIT_HOOKS.map((h) => `${HOOK_DIR}/${h}`).join(' and ')} into that directory.`, ...notices];
  }
  const synced = GIT_HOOKS.map((hook) => syncHook(root, hooksDir, hook, previous.get(hook)));
  return [...synced.filter(Boolean), ...notices];
}
