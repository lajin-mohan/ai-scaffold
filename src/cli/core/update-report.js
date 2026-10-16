/**
 * Human-readable `ais update` preview report (item 25, HLD §8, FR-13).
 * Conflicts first, one count per group, and a next-step line that never
 * suggests applying while applying is unavailable (FR-46).
 */

const ACTION_ORDER = [
  'rejected', 'conflict', 'replace', 'add', 'remove', 'user-deleted', 'orphan-kept', 'drop-record',
  'merge', 'unchanged', 'skip-seeded', 'skip-user-data', 'skip-unowned',
];
const SETTINGS_GROUPS = ['added', 'replaced', 'restored', 'missingNoBase', 'exceptions', 'removed', 'reported', 'ambiguous', 'suggestions'];
const LISTED = new Set(['rejected', 'conflict', 'replace', 'add', 'remove', 'orphan-kept']);

function header(doc) {
  return [
    'AI Scaffold update preview',
    `  Installed: ${doc.from ?? 'unknown'}  →  this CLI: ${doc.to ?? 'unknown'}`,
    `  Profile: ${doc.profile ?? 'unknown'}  Install mode: ${doc.installMode ?? 'unknown'}`,
  ];
}

function entryLines(doc) {
  const lines = [];
  for (const action of ACTION_ORDER) {
    const group = doc.entries.filter((entry) => entry.action === action);
    if (group.length === 0) continue;
    lines.push(`  ${action}: ${group.length}`);
    if (!LISTED.has(action)) continue;
    for (const entry of group) lines.push(`    ${entry.path}${entry.reason ? ` (${entry.reason})` : ''}`);
  }
  return lines;
}

function settingsLines(settings) {
  if (!settings) return [];
  const lines = [`  .claude/settings.json (base: ${settings.base})`];
  for (const group of SETTINGS_GROUPS) {
    for (const item of settings[group]) lines.push(`    ${group}: ${item}`);
  }
  return lines;
}

function nextStep(doc) {
  if (doc.status === 'error') return `✗ ${doc.error.message}`;
  if (doc.status === 'locked') return '✗ Another update is in progress. Run the preview again when it has finished.';
  if (doc.status === 'interrupted') return '✗ A previous apply did not finish. Restore from the backup listed above, or move the backup aside, before previewing again.';
  if (doc.status === 'current') return `✓ Already at ${doc.to}. No files would change.`;
  if (doc.exitCode === 1) return '✗ Some paths are unsafe to read (links or outside the project). Fix them and preview again.';
  const conflicts = doc.counts.conflict ?? 0;
  const tail = 'This is a preview: applying is not available in this version.';
  return conflicts > 0
    ? `! ${conflicts} file(s) differ from what the scaffold installed and would be kept as they are. ${tail}`
    : `✓ No planning conflicts. ${tail}`;
}

// Paths, rule strings, profiles and backup names come from the project, so a
// hostile one could carry terminal escape sequences. Show them escaped.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g; // eslint-disable-line no-control-regex

function escapeControls(line) {
  return line.replace(CONTROL_CHARS, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`);
}

/** @returns {string} the report text */
export function formatReport(doc) {
  return buildLines(doc).map(escapeControls).join('\n');
}

function buildLines(doc) {
  const lines = [...header(doc), ''];
  if (doc.status === 'planned') {
    lines.push('Files:', ...entryLines(doc), ...settingsLines(doc.settings), '');
  }
  for (const notice of doc.notices ?? []) lines.push(`Note: ${notice}`);
  if (doc.status === 'planned') lines.push('Note: git safety was not assessed (uncommitted changes are not checked yet).');
  lines.push('', nextStep(doc));
  return lines;
}
