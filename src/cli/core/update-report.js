/**
 * Human-readable `ais update` report for preview and `--apply` (item 25,
 * HLD §8, FR-13). Conflicts first, one count per group, a next-step line,
 * and never any file contents.
 */

const ACTION_ORDER = [
  'rejected', 'conflict', 'replace', 'add', 'remove', 'user-deleted', 'orphan-kept', 'drop-record',
  'merge', 'unchanged', 'skip-seeded', 'skip-user-data', 'skip-unowned',
];
const SETTINGS_GROUPS = ['added', 'replaced', 'restored', 'missingNoBase', 'exceptions', 'removed', 'reported', 'ambiguous', 'suggestions'];
const LISTED = new Set(['rejected', 'conflict', 'replace', 'add', 'remove', 'orphan-kept']);
const PLANNED = new Set(['planned', 'applied', 'rolled-back', 'rollback-incomplete']);
const GIT_SAFETY = {
  'not-assessed': 'git safety is checked when you apply',
  'no-repository': 'no git repository: applying will need --allow-no-git',
  clean: 'no uncommitted changes in the files the update changed',
  'dirty-allowed': 'applied over uncommitted changes (--allow-dirty)',
  'acknowledged-no-repository': 'applied without a git repository (--allow-no-git)',
};

function header(doc) {
  const applying = doc.schema?.startsWith('ais-update-apply');
  return [
    applying ? 'AI Scaffold update' : 'AI Scaffold update preview',
    `  Installed: ${doc.from ?? 'unknown'}  →  this CLI: ${doc.to ?? 'unknown'}`,
    `  Profile: ${doc.profile ?? 'unknown'}  Install mode: ${doc.installMode ?? 'unknown'}`,
  ];
}

function entryLines(doc) {
  const lines = [];
  for (const action of ACTION_ORDER) {
    const group = (doc.entries ?? []).filter((entry) => entry.action === action);
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

function rollbackLines(doc) {
  if (!Array.isArray(doc.rollback)) return [];
  const unsettled = doc.rollback.filter((s) => !['restored', 'untouched', 'removed', 'not-written', 'not-attempted'].includes(s.state));
  return unsettled.map((s) => `  restore by hand: ${s.rel} (${s.state}${s.reason ? `, ${s.reason}` : ''})`);
}

function nextStep(doc) {
  if (doc.status === 'error') return `✗ ${doc.error.message}`;
  if (doc.status === 'locked') return '✗ Another update is in progress. Run again when it has finished.';
  if (doc.status === 'interrupted') {
    return doc.error ? `✗ ${doc.error.message}` : '✗ A previous apply did not finish. Run `ais update --apply` to complete or abandon it where that is safe.';
  }
  if (doc.status === 'current') return `✓ Already at ${doc.to}. No files changed.`;
  if (doc.status === 'rolled-back') return `✗ ${doc.error.message} Every change was rolled back; backup: ${doc.backup}.`;
  if (doc.status === 'rollback-incomplete') return `✗ ${doc.error.message} Restore the paths above from ${doc.backup}.`;
  if (doc.status === 'applied') {
    return doc.exitCode === 2
      ? `! Applied, with files that need your merge (.ais-new). Backup: ${doc.backup}.`
      : `✓ Applied. Backup: ${doc.backup}.`;
  }
  if (doc.exitCode === 1) return '✗ Some paths are unsafe to read (links or outside the project). Fix them and preview again.';
  const conflicts = doc.counts.conflict ?? 0;
  return conflicts > 0
    ? `! ${conflicts} file(s) differ from what the scaffold installed: applying keeps them and writes the new version beside them as .ais-new. Run \`ais update --apply\`.`
    : '✓ No planning conflicts. Run `ais update --apply` to apply.';
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
  if (PLANNED.has(doc.status) && doc.entries) {
    lines.push('Files:', ...entryLines(doc), ...settingsLines(doc.settings), ...rollbackLines(doc), '');
  }
  for (const notice of doc.notices ?? []) lines.push(`Note: ${notice}`);
  if (PLANNED.has(doc.status)) lines.push(`Note: ${GIT_SAFETY[doc.gitSafety] ?? doc.gitSafety}.`);
  lines.push('', nextStep(doc));
  return lines;
}
