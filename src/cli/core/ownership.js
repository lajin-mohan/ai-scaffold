/**
 * Ownership classes for `ais update` (item 25, BRD §3 and FR-42).
 *
 * Ownership comes from the path, the install mode and whether the manifest
 * records the path. It never depends on what is on disk.
 */

import path from 'path';
import picomatch from 'picomatch';
import { PROTECTED_PATHS } from './file-plan.js';

export const INSTALL_MODES = ['create', 'init', 'unknown'];

// Evaluated in order; the first matching class wins.
const CLASS_RULES = [
  ['excluded', ['.ai-scaffold.json', '.ai-scaffold/backups/**', '.ai-scaffold/update.lock']],
  ['user-data', [
    '.claude/memory/**',
    '.claude/MEMORY.md',
    '.claude/settings-overrides.json',
    '.claude/settings.local.json',
    '.ai-scaffold/context.md',
    'tasks/lessons.md',
  ]],
  ['seeded', ['CHANGELOG.md', 'tasks/todo/.gitkeep', 'tasks/done/.gitkeep']],
  ['merged', ['.claude/settings.json']],
  ['managed', ['CLAUDE.md', 'AGENTS.md', 'constitution.md', '.ai-scaffold/**', '.claude/**']],
].map(([cls, patterns]) => [cls, picomatch(patterns, { dot: true })]);

const isProtected = picomatch(PROTECTED_PATHS, { dot: true });

// Paths come from the manifest or a file plan, which use canonical case, so
// matching is case-sensitive. Anything that could escape the project throws.
function normaliseRel(rel) {
  const posix = path.posix.normalize(String(rel).replace(/\\/g, '/'));
  if (path.posix.isAbsolute(posix) || /^[A-Za-z]:/.test(posix) || posix === '..' || posix.startsWith('../')) {
    throw new TypeError(`classifyPath: path must be relative and inside the project: ${rel}`);
  }
  return posix;
}

function tableClass(rel) {
  const match = CLASS_RULES.find(([, matches]) => matches(rel));
  return match ? match[0] : 'unowned';
}

/**
 * @param {string} rel  project-relative path
 * @param {{ installMode: 'create'|'init'|'unknown', recorded: boolean }} context
 * @returns {'excluded'|'user-data'|'seeded'|'merged'|'managed'|'unowned'}
 */
export function classifyPath(rel, { installMode, recorded } = {}) {
  if (!INSTALL_MODES.includes(installMode)) {
    throw new TypeError(`classifyPath: installMode must be one of ${INSTALL_MODES.join(', ')}`);
  }
  const normalised = normaliseRel(rel);
  const cls = tableClass(normalised);
  // An unrecorded protected file in an init-style install is the adopter's
  // own file, which init skipped (FR-42).
  if (cls === 'managed' && installMode !== 'create' && !recorded && isProtected(normalised)) {
    return 'unowned';
  }
  return cls;
}
