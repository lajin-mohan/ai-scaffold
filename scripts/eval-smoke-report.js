/**
 * eval-smoke-report — summaries and the before/after comparison for
 * scripts/eval-smoke.js. Thresholds T1–T4: evals/smoke/THRESHOLDS.md.
 */

function median(values) {
  const known = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (known.length === 0) return null;
  const mid = Math.floor(known.length / 2);
  return known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2;
}

/** Per-task pass counts and medians (T4 reports, never gates). */
export function taskStats(summary) {
  const byTask = new Map();
  for (const run of summary.runs) {
    if (!byTask.has(run.task)) byTask.set(run.task, []);
    byTask.get(run.task).push(run);
  }
  return [...byTask].map(([task, runs]) => ({
    task,
    safety: runs.some((r) => r.safety),
    runs: runs.length,
    passes: runs.filter((r) => r.pass).length,
    failures: runs.filter((r) => !r.pass).map((r) => ({ repeat: r.repeat, timedOut: r.timedOut, reasons: r.reasons })),
    median: {
      input: median(runs.map((r) => r.usage?.input)),
      cacheRead: median(runs.map((r) => r.usage?.cacheRead)),
      cacheCreation: median(runs.map((r) => r.usage?.cacheCreation)),
      output: median(runs.map((r) => r.usage?.output)),
      turns: median(runs.map((r) => r.turns)),
      costUsd: median(runs.map((r) => r.costUsd)),
    },
  }));
}

function sameSetup(before, after) {
  const problems = [];
  for (const key of ['model', 'claudeVersion', 'repeats', 'budgetUsd', 'node', 'platform', 'protocolSha256', 'settingsSha256']) {
    if (before.meta[key] === undefined || after.meta[key] === undefined) problems.push(`${key} is missing`);
    else if (before.meta[key] !== after.meta[key]) problems.push(`${key} differs: ${before.meta[key]} vs ${after.meta[key]}`);
  }
  return problems;
}

function validateRuns(summary, label) {
  const problems = [];
  if (!summary.runs.length) problems.push(`${label}: no runs recorded`);
  const repeats = summary.meta.repeats;
  if (!Number.isInteger(repeats) || repeats < 1) problems.push(`${label}: invalid repeat count`);
  const groups = new Map();
  for (const run of summary.runs) {
    if (!groups.has(run.task)) groups.set(run.task, []);
    groups.get(run.task).push(run);
    if (typeof run.pass !== 'boolean' || typeof run.safety !== 'boolean') problems.push(`${label} ${run.task}: invalid verdict or safety flag`);
  }
  for (const [task, runs] of groups) {
    const indices = runs.map((run) => run.repeat);
    if (runs.length !== repeats || new Set(indices).size !== repeats || indices.some((i) => !Number.isInteger(i) || i < 1 || i > repeats)) {
      problems.push(`${label} ${task}: missing or duplicate repeats`);
    }
    if (new Set(runs.map((run) => run.safety)).size !== 1) problems.push(`${label} ${task}: inconsistent safety flags`);
  }
  return problems;
}

/** Applies T1 (every safety run passes) and T2 (per-task passes do not drop). */
export function compareSummaries(before, after) {
  const setup = sameSetup(before, after);
  if (setup.length) return { ok: false, setupProblems: setup, violations: [], rows: [] };
  const beforeStats = new Map(taskStats(before).map((s) => [s.task, s]));
  const violations = [];
  violations.push(...validateRuns(before, 'before'), ...validateRuns(after, 'after'));
  for (const task of taskStats(before)) {
    if (task.safety && task.passes !== task.runs) violations.push(`T1 baseline ${task.task}: safety baseline failed; resolve before changing templates`);
  }
  const rows = taskStats(after).map((afterTask) => {
    const beforeTask = beforeStats.get(afterTask.task);
    if (!beforeTask) violations.push(`${afterTask.task}: no baseline runs`);
    if (beforeTask && beforeTask.safety !== afterTask.safety) violations.push(`${afterTask.task}: safety classification changed`);
    if (afterTask.safety && afterTask.passes < afterTask.runs) violations.push(`T1 ${afterTask.task}: ${afterTask.runs - afterTask.passes} safety run(s) failed`);
    if (beforeTask && afterTask.passes < beforeTask.passes) violations.push(`T2 ${afterTask.task}: ${beforeTask.passes} → ${afterTask.passes} passes`);
    return { task: afterTask.task, before: beforeTask ?? null, after: afterTask };
  });
  for (const task of beforeStats.keys()) {
    if (!rows.some((r) => r.task === task)) violations.push(`${task}: missing from the after set`);
  }
  return { ok: violations.length === 0, setupProblems: [], violations, rows, meta: after.meta };
}

const cell = (value) => (value === null || value === undefined ? 'n/a' : String(value));

export function renderSummary(summary) {
  const { meta } = summary;
  const lines = [`# Smoke run — ${meta.label}`, '',
    `Claude Code ${meta.claudeVersion} · model ${meta.model} · ${meta.platform} · Node ${meta.node}`,
    `Tarball ${meta.tarball} (sha256 ${meta.tarballSha256.slice(0, 12)}…) · ${meta.repeats} repeats · budget $${meta.budgetUsd}/run`, '',
    '| Task | Passes | Median uncached in | Cache read | Cache write | Output | Turns | Cost $ |',
    '|---|---|---:|---:|---:|---:|---:|---:|'];
  for (const s of taskStats(summary)) {
    const m = s.median;
    lines.push(`| ${s.task}${s.safety ? ' (safety)' : ''} | ${s.passes}/${s.runs} | ${cell(m.input)} | ${cell(m.cacheRead)} | ${cell(m.cacheCreation)} | ${cell(m.output)} | ${cell(m.turns)} | ${cell(m.costUsd)} |`);
  }
  const failures = taskStats(summary).flatMap((s) => s.failures.map((f) => `- ${s.task} r${f.repeat}: ${f.reasons.join('; ')}`));
  lines.push('', '## Failures (T3)', '', ...(failures.length ? failures : ['None.']), '');
  return lines.join('\n');
}

export function renderComparison(comparison) {
  if (comparison.setupProblems.length) {
    return `Not comparable — setups differ:\n${comparison.setupProblems.map((p) => `- ${p}`).join('\n')}\n`;
  }
  const lines = ['| Task | Passes before → after | Median uncached in | Median cache read | Median output | Median turns |', '|---|---|---|---|---|---|'];
  for (const { task, before, after } of comparison.rows) {
    const b = before?.median ?? {};
    lines.push(`| ${task} | ${before ? `${before.passes}/${before.runs}` : 'n/a'} → ${after.passes}/${after.runs} | ${cell(b.input)} → ${cell(after.median.input)} | ${cell(b.cacheRead)} → ${cell(after.median.cacheRead)} | ${cell(b.output)} → ${cell(after.median.output)} | ${cell(b.turns)} → ${cell(after.median.turns)} |`);
  }
  const { meta } = comparison;
  const verdict = comparison.ok
    ? `No regression observed on these ${comparison.rows.length} tasks (Claude Code ${meta.claudeVersion}, ${meta.model}, n=${meta.repeats} per task).`
    : `Regression found:\n${comparison.violations.map((v) => `- ${v}`).join('\n')}`;
  return `${lines.join('\n')}\n\n${verdict}\n`;
}
