/**
 * Resolve an external tool to an absolute path through PATH only.
 *
 * On Windows, spawning a bare program name such as gh makes Node search the
 * working directory before PATH (verified 2026-10-12, item 94), so a `gh.exe`
 * or `git.exe` planted in a cloned project would run instead of the real tool.
 * Spawning the absolute path this returns never consults the working directory.
 */

import fs from 'fs';
import path from 'path';

// .cmd/.bat are deliberately absent: they need a shell, which no spawn in this
// CLI uses (and current Node refuses them without one — CVE-2024-27980).
const WINDOWS_EXTENSIONS = ['.com', '.exe'];

/**
 * @param {string} name   bare program name, e.g. 'gh' or 'git'
 * @param {{ env?: object, platform?: string }} [options]
 * @returns {string|null} absolute path, or null when not found on PATH
 */
export function resolveOnPath(name, { env = process.env, platform = process.platform } = {}) {
  if (!name || /[\\/]/.test(name)) return null;

  const isWindows = platform === 'win32';
  const pathApi = isWindows ? path.win32 : path.posix;
  const candidates = isWindows ? WINDOWS_EXTENSIONS.map((ext) => name + ext) : [name];

  for (const dir of pathEntries(env, isWindows)) {
    if (!pathApi.isAbsolute(dir)) continue;
    for (const candidate of candidates) {
      const full = pathApi.join(dir, candidate);
      if (isRunnableFile(full, isWindows)) return full;
    }
  }
  return null;
}

// Windows env objects may spell the key `Path`; a spread of process.env is a
// plain object, so the lookup is made case-insensitive there.
function pathEntries(env, isWindows) {
  const key = isWindows
    ? Object.keys(env).find((k) => k.toUpperCase() === 'PATH')
    : 'PATH';
  const raw = (key && env[key]) || '';
  const delimiter = isWindows ? ';' : ':';
  return raw
    .split(delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, '$1'))
    .filter((entry) => entry !== '' && entry !== '.');
}

function isRunnableFile(full, isWindows) {
  try {
    if (!fs.statSync(full).isFile()) return false;
    if (!isWindows) fs.accessSync(full, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
