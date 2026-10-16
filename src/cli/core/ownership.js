/**
 * Ownership classes for `ais update` (item 25, BRD §3 and FR-42).
 *
 * Ownership comes from the path, the install mode and whether the manifest
 * records the path. It never depends on what is on disk.
 */

import picomatch from 'picomatch';
import { normaliseRel } from './containment.js';
import { PROTECTED_PATHS } from './file-plan.js';

export const INSTALL_MODES = ['create', 'init', 'unknown'];

// Windows and macOS file systems are case-insensitive by default, so
// .claude/MEMORY/x and .claude/memory/x are the same file there (FR-43).
const MATCH = { dot: true, nocase: process.platform === 'win32' || process.platform === 'darwin' };

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
].map(([cls, patterns]) => [cls, picomatch(patterns, MATCH)]);

const isProtected = picomatch(PROTECTED_PATHS, MATCH);

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
