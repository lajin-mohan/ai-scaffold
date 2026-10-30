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
import { GIT_TIMEOUT_MS, SAFE_GIT_OPTIONS } from './git-state.js';

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
  // Resolved from PATH, never from the project directory (item 94); with
  // core.fsmonitor off, since the project's own git config may name a command.
  const git = resolveOnPath('git');
  if (!git) return null;
  // No ceiling: a project in a subdirectory of its repository (a monorepo app)
  // must find that repository, as the update's git safety check does. The
  // caller's repository overrides are dropped so git acts on this project.
  const env = { ...process.env };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[name];
  return (args) => {
    const result = spawnSync(git, [...SAFE_GIT_OPTIONS, ...args], {
      cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], env, timeout: GIT_TIMEOUT_MS, windowsHide: true,
    });
    return result.status === 0 ? result.stdout.trim() : null;
  };
}

function samePath(a, b) {
  const norm = (p) => path.resolve(p).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

function isLink(file) {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
}

function realOrNull(file) {
  try {
    return fs.realpathSync.native(file);
  } catch {
    return null;
  }
}

// Hooks are written only into the repository's own hooks directory: the one
// under `git rev-parse --git-common-dir`, which is also where a linked
// worktree's hooks live. A link, or a junction on Windows, that leads anywhere
// else is refused, so activation never writes outside the repository.
function hooksDirProblem(root, git, hooksDir) {
  const common = git(['rev-parse', '--git-common-dir']);
  const commonReal = common === null ? null : realOrNull(path.resolve(root, common));
  if (!commonReal) return 'the repository directory could not be resolved';
  if (isLink(hooksDir)) return `${hooksDir} is a link`;
  const parentReal = realOrNull(path.dirname(hooksDir));
  const actual = realOrNull(hooksDir) ?? (parentReal && path.join(parentReal, path.basename(hooksDir)));
  return actual && samePath(actual, path.join(commonReal, 'hooks')) ? null : `${hooksDir} is not the repository's hooks directory`;
}

// Every shipped version of a hook opens with the same two lines (shebang and
// a one-line description). A copy older than the version just replaced, left
// behind by an upgrade done by hand, still carries them.
function headerOf(bytes) {
  return bytes.toString('utf-8').split('\n', 2).join('\n');
}

function isOlderScaffoldCopy(current, source) {
  return headerOf(current) === headerOf(source);
}

// One hook: install when missing, refresh a copy of an earlier scaffold
// version, leave anything else alone, since it is the project's own hook.
function syncHook(root, hooksDir, hook, previous) {
  const sourcePath = path.join(root, HOOK_DIR, hook);
  const dest = path.join(hooksDir, hook);
  if (isLink(sourcePath) || isLink(dest)) {
    return `Left the ${hook} git hook alone: ${isLink(dest) ? dest : sourcePath} is a link. Install it by hand if you want it.`;
  }
  const source = readOrNull(sourcePath);
  if (!source) return null;
  const current = readOrNull(dest);
  const previousCopy = Boolean(current && previous && current.equals(previous));
  const olderCopy = Boolean(current && !previousCopy && !current.equals(source) && isOlderScaffoldCopy(current, source));
  if (current && !current.equals(source) && !previousCopy && !olderCopy) {
    return `Left ${hook} in the git hooks directory unchanged: it differs from ${HOOK_DIR}/${hook}. Merge the two by hand if you want the scaffold version.`;
  }
  // .git/hooks is not versioned, so an older copy that may carry hand edits is
  // kept beside the new one rather than lost.
  const backup = `${dest}.ais-backup`;
  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    if (olderCopy) {
      if (isLink(backup)) throw Object.assign(new Error(`${backup} is a link`), { code: 'ELINK' });
      fs.writeFileSync(backup, current);
    }
    if (!current || !current.equals(source)) fs.writeFileSync(dest, source);
    fs.chmodSync(dest, 0o755);
  } catch (error) {
    return `Could not install the ${hook} git hook (${error.code ?? error.message}); copy ${HOOK_DIR}/${hook} into ${hooksDir} by hand.`;
  }
  if (!current) return `Installed the ${hook} git hook.`;
  if (olderCopy) return `Updated the ${hook} git hook from an older scaffold copy; the old one is saved as ${backup}.`;
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
  if (!git) return ['git was not found on PATH, so the git hooks were not activated; run `ais update --apply` again once git is installed.'];
  const resolved = git(['rev-parse', '--git-path', 'hooks']);
  if (resolved === null) return [];
  const hooksDir = path.resolve(root, resolved);
  const notices = indexModeNotices(git);
  if (samePath(hooksDir, path.join(root, HOOK_DIR))) return notices;
  if (git(['config', '--get', 'core.hooksPath'])) {
    return [`core.hooksPath is set to ${resolved}, so git ignores .git/hooks; copy ${GIT_HOOKS.map((h) => `${HOOK_DIR}/${h}`).join(' and ')} into that directory.`, ...notices];
  }
  const problem = hooksDirProblem(root, git, hooksDir);
  if (problem) {
    return [`Did not install git hooks: ${problem}. Copy ${GIT_HOOKS.map((h) => `${HOOK_DIR}/${h}`).join(' and ')} into the repository's hooks directory by hand.`, ...notices];
  }
  const synced = GIT_HOOKS.map((hook) => syncHook(root, hooksDir, hook, previous.get(hook)));
  return [...synced.filter(Boolean), ...notices];
}
