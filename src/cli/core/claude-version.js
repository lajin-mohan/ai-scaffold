/**
 * Item 97 D5: the installed Claude Code version against the minimum the
 * shipped settings need. 2.1.295 is the first version that honours a hook's
 * `onFailure: "block"`; older versions let a guard that times out or crashes
 * allow the tool call. A version that cannot be read is `unavailable`, never
 * a pass.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { findFileOnPath, resolveOnPath } from './exec-path.js';
import { LOCAL_REASONS } from './governance-checks.js';

export const MIN_CLAUDE_CODE = '2.1.295';
export const CLAUDE_VERSION_CHECK = 'Claude Code version (hooks block on failure)';
const VERSION_TIMEOUT_MS = 5_000;

/** `claude --version` prints e.g. "2.1.319 (Claude Code)". */
export function parseClaudeVersion(output) {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(String(output ?? ''));
  return match ? match.slice(1, 4).map(Number) : null;
}

export function isAtLeast(version, minimum) {
  for (let i = 0; i < 3; i += 1) {
    if (version[i] !== minimum[i]) return version[i] > minimum[i];
  }
  return true;
}

// An npm install on Windows puts only claude.cmd on PATH, which cannot be run
// without a shell. The shim runs this exe, so doctor runs it directly.
const NPM_SHIM_TARGET = ['node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'];

function findClaude() {
  const direct = resolveOnPath('claude');
  if (direct || process.platform !== 'win32') return direct;
  const shim = findFileOnPath('claude.cmd');
  if (!shim) return null;
  const target = path.join(path.dirname(shim), ...NPM_SHIM_TARGET);
  return fs.existsSync(target) ? target : null;
}

/**
 * Runs `claude --version` found through PATH only.
 * @returns {{ found: boolean, output: string|null }}
 */
export function readClaudeVersionOutput() {
  const claude = findClaude();
  if (!claude) return { found: false, output: null };
  const result = spawnSync(claude, ['--version'], { encoding: 'utf-8', timeout: VERSION_TIMEOUT_MS });
  return { found: true, output: result.status === 0 ? result.stdout : null };
}

/**
 * The scaffold works with any agent, so a project without Claude Code gets no
 * line at all (null). Claude Code that is found but reports no version is
 * `unavailable`, never a pass.
 * @param {{ read?: () => { found: boolean, output: string|null } }} [options]  injectable for tests
 * @returns {object|null}
 */
export function checkClaudeCodeVersion({ read = readClaudeVersionOutput } = {}) {
  const { found, output } = read();
  if (!found) return null;
  // 'filesystem' is doctor's word for "local, no network" (AC-13); only 'api'
  // checks can be made to fail by --require-remote.
  const base = { name: CLAUDE_VERSION_CHECK, severity: 'medium', verifiedBy: 'filesystem' };
  const version = parseClaudeVersion(output);
  if (!version) {
    return {
      ...base,
      passed: false,
      state: 'unavailable',
      reason: LOCAL_REASONS.CLAUDE_UNAVAILABLE,
      remedy: `claude was found but did not report a version; check that \`claude --version\` works, and that it is ${MIN_CLAUDE_CODE} or later.`,
    };
  }
  const shown = version.join('.');
  if (isAtLeast(version, parseClaudeVersion(MIN_CLAUDE_CODE))) {
    return { ...base, passed: true, state: 'pass', note: `Claude Code ${shown}` };
  }
  return {
    ...base,
    passed: false,
    state: 'fail',
    message: `Claude Code ${shown} is older than ${MIN_CLAUDE_CODE}: a security hook that times out or crashes will not block the tool call. Update Claude Code.`,
  };
}
