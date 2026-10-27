/**
 * Markdown report for the item 25 slice 5 compatibility matrix: one row per
 * case, every failed check with its detail, and every managed file that
 * differs from a fresh install.
 */

const ACTIONS = ['replace', 'add', 'remove', 'conflict', 'merge', 'unchanged'];

function countsCell(counts) {
  if (!counts) return 'none';
  return ACTIONS.filter((a) => counts[a]).map((a) => `${a} ${counts[a]}`).join(', ');
}

export function renderReport(results, meta) {
  const lines = [
    '# Item 25 slice 5: `ais update` against real installs',
    '',
    `- Candidate: packed tarball \`${meta.tarball}\` from commit \`${meta.commit}\`, installed with version \`${meta.candidate}\``,
    `- Platform: ${meta.platform}, Node ${meta.node}`,
    '- Clock pinned to 2026-10-15T12:00:00Z for every install and update; every project is named `compat-app`',
    '',
    '| Case | Criterion | Checks | Apply actions |',
    '|---|---|---|---|',
  ];
  for (const r of results) {
    if (r.notApplicable) {
      lines.push(`| ${r.id} | ${r.kind} | not applicable | ${r.notApplicable} |`);
      continue;
    }
    const failed = r.checks.filter((c) => !c.ok).length;
    const verdict = failed === 0 ? `pass ${r.checks.length}/${r.checks.length}` : `**FAIL ${failed}**/${r.checks.length}`;
    lines.push(`| ${r.id} | ${r.kind} | ${verdict} | ${countsCell(r.counts)} |`);
  }
  const failures = results.flatMap((r) => r.checks.filter((c) => !c.ok).map((c) => `- **${r.id}**: ${c.name}: ${c.detail}`));
  lines.push('', '## Failed checks', '', ...(failures.length > 0 ? failures : ['None.']));
  const differing = results.filter((r) => r.differing.length > 0).map((r) => `- **${r.id}**: ${r.differing.join(', ')}`);
  lines.push('', '## Unexplained differences from a fresh install', '', ...(differing.length > 0 ? differing : ['None.']));
  const answers = results.filter((r) => r.answers).map((r) => `- **${r.id}**: ${r.answers}`);
  lines.push('', '## Answers given to each fresh reference (the old project\'s recorded values)', '', ...answers);
  const explained = results.flatMap((r) => (r.explained ?? []).map((e) => `- **${r.id}**: \`${e.rel}\`: ${e.reason}`));
  lines.push('', '## Explained differences', '', ...(explained.length > 0 ? explained : ['None.']), '');
  return lines.join('\n');
}
