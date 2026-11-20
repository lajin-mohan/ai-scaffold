/**
 * eval-smoke-report — summaries and the before/after comparison for
 * scripts/eval-smoke.js. Thresholds: evals/smoke/THRESHOLDS.md.
 */

function median(values) {
  const known = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (known.length === 0) return null;
  const mid = Math.floor(known.length / 2);
  return known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2;
}

/** One group per task and setup; summaries from before setups existed group by task. */
export function groupKey(run) {
  return run.setup ? `${run.task} [${run.setup}]` : run.task;
}

/** Per-group pass counts and medians (T4 reports, never gates). Invalid runs are never passes or fails. */
export function taskStats(summary) {
  const byGroup = new Map();
  for (const run of summary.runs) {
    const key = groupKey(run);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(run);
  }
  return [...byGroup].map(([task, runs]) => {
    const valid = runs.filter((r) => !r.invalid);
    return {
      task,
      safety: runs.some((r) => r.safety),
      runs: runs.length,
      valid: valid.length,
      passes: valid.filter((r) => r.pass).length,
      invalid: runs.filter((r) => r.invalid).map((r) => ({ repeat: r.repeat, reasons: r.reasons })),
      failures: valid.filter((r) => !r.pass).map((r) => ({ repeat: r.repeat, timedOut: r.timedOut, reasons: r.reasons })),
      restrictedDenials: runs.reduce((sum, r) => sum + (r.denials?.restricted ?? 0), 0),
      median: {
        input: median(valid.map((r) => r.usage?.input)),
        cacheRead: median(valid.map((r) => r.usage?.cacheRead)),
        cacheCreation: median(valid.map((r) => r.usage?.cacheCreation)),
        output: median(valid.map((r) => r.usage?.output)),
        turns: median(valid.map((r) => r.turns)),
        costUsd: median(valid.map((r) => r.costUsd)),
        durationSec: median(valid.map((r) => (Number.isFinite(r.durationMs) ? Math.round(r.durationMs / 1000) : null))),
      },
    };
  });
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
  if (summary.meta.stoppedEarly) problems.push(`${label}: batch stopped early (${summary.meta.stoppedEarly})`);
  const repeats = summary.meta.repeats;
  if (!Number.isInteger(repeats) || repeats < 1) problems.push(`${label}: invalid repeat count`);
  const groups = new Map();
  for (const run of summary.runs) {
    const key = groupKey(run);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
    if (typeof run.pass !== 'boolean' || typeof run.safety !== 'boolean') problems.push(`${label} ${key}: invalid verdict or safety flag`);
  }
  for (const [key, runs] of groups) {
    const indices = runs.map((run) => run.repeat);
    if (runs.length !== repeats || new Set(indices).size !== repeats || indices.some((i) => !Number.isInteger(i) || i < 1 || i > repeats)) {
      problems.push(`${label} ${key}: missing or duplicate repeats`);
    }
    if (new Set(runs.map((run) => run.safety)).size !== 1) problems.push(`${label} ${key}: inconsistent safety flags`);
  }
  return problems;
}

function invalidRuns(summary, label) {
  return summary.runs.filter((r) => r.invalid).map((r) => `${label} ${groupKey(r)} r${r.repeat}: ${r.reasons.join('; ')}`);
}

/** Applies T1 (every safety run passes) and T2 (per-group passes do not drop); refuses a verdict on invalid runs. */
export function compareSummaries(before, after) {
  const setup = sameSetup(before, after);
  if (setup.length) return { ok: false, setupProblems: setup, invalid: [], violations: [], rows: [] };
  const invalid = [...invalidRuns(before, 'before'), ...invalidRuns(after, 'after')];
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
  return { ok: violations.length === 0 && invalid.length === 0, setupProblems: [], invalid, violations, rows, meta: after.meta };
}

const cell = (value) => (value === null || value === undefined ? 'n/a' : String(value));

export function renderSummary(summary) {
  const { meta } = summary;
  const stats = taskStats(summary);
  const lines = [`# Smoke run — ${meta.label}`, '',
    `Claude Code ${meta.claudeVersion} · model ${meta.model} · ${meta.platform} · Node ${meta.node}`,
    `Tarball ${meta.tarball} (sha256 ${meta.tarballSha256.slice(0, 12)}…) · ${meta.repeats} repeats · budget $${meta.budgetUsd}/run`];
  if (meta.setups) lines.push(`Setups ${meta.setups.join(', ')} · ${Object.entries(meta.setupSha256 ?? {}).map(([s, h]) => `${s} ${String(h).slice(0, 12)}`).join(' · ')}`);
  if (meta.stoppedEarly) lines.push('', `**Stopped early:** ${meta.stoppedEarly}. No effectiveness verdict can be drawn from this set.`);
  lines.push('', '| Task [setup] | Passes / valid | Invalid | Median uncached in | Cache read | Cache write | Output | Turns | Seconds | Cost $ | Restricted denials |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const s of stats) {
    const m = s.median;
    lines.push(`| ${s.task}${s.safety ? ' (safety)' : ''} | ${s.passes}/${s.valid} | ${s.invalid.length} | ${cell(m.input)} | ${cell(m.cacheRead)} | ${cell(m.cacheCreation)} | ${cell(m.output)} | ${cell(m.turns)} | ${cell(m.durationSec)} | ${cell(m.costUsd)} | ${s.restrictedDenials} |`);
  }
  const failures = stats.flatMap((s) => s.failures.map((f) => `- ${s.task} r${f.repeat}: ${f.reasons.join('; ')}`));
  const invalid = stats.flatMap((s) => s.invalid.map((f) => `- ${s.task} r${f.repeat}: ${f.reasons.join('; ')}`));
  lines.push('', '## Failures (T3)', '', ...(failures.length ? failures : ['None.']));
  lines.push('', '## Invalid runs (harness failures, not agent results)', '', ...(invalid.length ? invalid : ['None.']), '');
  return lines.join('\n');
}

export function renderComparison(comparison) {
  if (comparison.setupProblems.length) {
    return `Not comparable — setups differ:\n${comparison.setupProblems.map((p) => `- ${p}`).join('\n')}\n`;
  }
  const lines = ['| Task | Passes before → after | Median uncached in | Median cache read | Median output | Median turns |', '|---|---|---|---|---|---|'];
  for (const { task, before, after } of comparison.rows) {
    const b = before?.median ?? {};
    lines.push(`| ${task} | ${before ? `${before.passes}/${before.valid}` : 'n/a'} → ${after.passes}/${after.valid} | ${cell(b.input)} → ${cell(after.median.input)} | ${cell(b.cacheRead)} → ${cell(after.median.cacheRead)} | ${cell(b.output)} → ${cell(after.median.output)} | ${cell(b.turns)} → ${cell(after.median.turns)} |`);
  }
  const { meta } = comparison;
  let verdict;
  if (comparison.invalid.length) {
    verdict = `No verdict: ${comparison.invalid.length} invalid run(s). Fix the harness and rerun under a new label:\n${comparison.invalid.map((v) => `- ${v}`).join('\n')}`;
  } else if (comparison.ok) {
    verdict = `No regression observed on these ${comparison.rows.length} tasks (Claude Code ${meta.claudeVersion}, ${meta.model}, n=${meta.repeats} per task).`;
  } else {
    verdict = `Regression found:\n${comparison.violations.map((v) => `- ${v}`).join('\n')}`;
  }
  return `${lines.join('\n')}\n\n${verdict}\n`;
}
