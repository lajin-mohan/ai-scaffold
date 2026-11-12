/**
 * Item 84, Wave C PR C2: Claude Code loads the scaffold's shared rules
 * (AGENTS.md) only through an `@` import in CLAUDE.md. `ais init` keeps an
 * adopter's own CLAUDE.md and AGENTS.md, so it connects them instead:
 *
 * - an existing AGENTS.md stays the adopter's; the shared rules are installed
 *   as `.ai-scaffold/AGENTS.md` (the "core"), recorded in the manifest;
 * - an existing CLAUDE.md gets one short appended section that imports the
 *   core, once. Nothing else in it changes.
 */

import fs from 'fs-extra';
import path from 'path';

export const ROOT_CORE = 'AGENTS.md';
export const NAMESPACED_CORE = '.ai-scaffold/AGENTS.md';
const CLAUDE = 'CLAUDE.md';

// Any line that imports either core location counts, so a hand-written
// import is respected and a second init adds nothing.
const CORE_IMPORT = /^@(\.\/)?(AGENTS\.md|\.ai-scaffold\/AGENTS\.md)[ \t]*$/m;

export function hasCoreImport(text) {
  return CORE_IMPORT.test(String(text ?? ''));
}

/**
 * Where init installs the core. A repeat init keeps the recorded choice; a
 * first init namespaces it when the adopter already has an AGENTS.md.
 * @param {{ manifest?: object|null, agentsExists: boolean, force?: boolean }} input
 */
export function chooseAgentsCore({ manifest, agentsExists, force = false }) {
  if (manifest) return manifest.install?.agentsCore ?? ROOT_CORE;
  return agentsExists && !force ? NAMESPACED_CORE : ROOT_CORE;
}

/** The scaffold's own CLAUDE.md imports the root core; point it at the real one. */
export function pointImportAt(text, agentsCore) {
  if (!agentsCore || agentsCore === ROOT_CORE) return text;
  return text.replace(/^@AGENTS\.md[ \t]*$/m, `@${agentsCore}`);
}

/** The adopter's text with the import section appended, in its own line endings. */
export function withCoreImport(text, agentsCore) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = [
    '## AI Scaffold',
    '',
    'Shared rules for AI assistants, added by `ais init`:',
    '',
    `@${agentsCore}`,
  ];
  return text + blankLineBefore(text, eol) + lines.join(eol) + eol;
}

// One blank line between the adopter's text and the new section.
function blankLineBefore(text, eol) {
  if (text === '' || text.endsWith(eol + eol)) return '';
  return text.endsWith(eol) ? eol : eol + eol;
}

/**
 * Decide, before anything is written, what init will do to CLAUDE.md.
 * @returns {Promise<{ action: 'add'|'present'|'symlink'|'scaffold-writes', core: string }>}
 */
export async function decideClaudeImport(targetDir, agentsCore, { force = false } = {}) {
  const file = path.join(targetDir, CLAUDE);
  let stat;
  try {
    stat = await fs.lstat(file);
  } catch {
    return { action: 'scaffold-writes', core: agentsCore };
  }
  if (force) return { action: 'scaffold-writes', core: agentsCore };
  // A CLAUDE.md that links to AGENTS.md is a common setup; appending would
  // make it import itself, so a link is reported and left alone.
  if (stat.isSymbolicLink() || !stat.isFile()) return { action: 'symlink', core: agentsCore };
  const text = await fs.readFile(file, 'utf-8');
  return { action: hasCoreImport(text) ? 'present' : 'add', core: agentsCore };
}

/** Apply an 'add' decision. Any other decision writes nothing. */
export async function applyClaudeImport(targetDir, decision) {
  if (decision.action !== 'add') return false;
  const file = path.join(targetDir, CLAUDE);
  const text = await fs.readFile(file, 'utf-8');
  if (hasCoreImport(text)) return false;
  await fs.writeFile(file, withCoreImport(text, decision.core));
  return true;
}
