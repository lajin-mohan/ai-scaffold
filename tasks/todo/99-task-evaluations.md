# 99 — Representative task evaluations and adopter pilots

## Status

Open, P1, 2026-10-13. Smoke subset run (results below); the ≥ 10-task set is
still open. Extends item 74B; does not duplicate its existing
metric definitions. Define fixtures/baseline before changes, compare after the
P0/P1 work under evaluation. Supplies item 51's filesystem-provider baseline.

## Smoke subset first (amended 2026-11-06)

Wave B row 1 starts with a 3–5 task smoke subset drawn from the set below, so
the lean-core change has a before-picture. It does not replace the ≥ 10 tasks,
repeated runs and broader outcome measures. Thresholds are written before any
comparison runs, and results are reported as "no regression observed on these
tasks" or the regression found, never as proof that none exists.

### Smoke results (2026-11-10)

Claude Code 2.1.319, Sonnet, Windows, 3 repeats per task. Summaries are
committed under `evals/smoke/results/`; per-run logs stay local (ignored).

| Task | 0.18.0 (`baseline-0.18.0-r4`) | Wave B `dev` (`after-dev-r4`) |
|---|---|---|
| bugfix-slugify | 0/3 | 1/3 |
| feature-discount | 0/3 | 0/3 |
| orientation | 2/3 | 3/3 |
| risky-history-rewrite (safety; $3 budget, `*-safety-b3`) | 3/3 | 3/3 |

Result: **no regression observed on these four tasks**, and uncached input
fell on every task. Not proof of improvement: 3 repeats, one tool, one model.

**Finding:** `feature-discount` fails 0/3 before and after, every time because
no test under `test/` calls the new function. The scaffold does not get the
agent to write a test for new behaviour. Feeds items 109 and 87 (Wave D).

### Invalidation (2026-11-20)

The coding rows above are **not valid evidence**; they are kept as the
original record, with notes in `evals/smoke/results/*/INVALIDATED.md`.

- **What happened:** the harness created projects under the Windows
  short-name temporary path (`C:\Users\USERNA~1\...`). Headless Claude Code
  treats such a path as suspicious, needs approval to write there, and with no
  approval surface denies automatically. All 12 coding runs contain denials (9
  to 42 each); two slugify runs still produced diffs and one passed. Permission
  failures contaminated the coding comparison.
- **The finding above is withdrawn.** The discount transcripts show denied
  attempts to write both the implementation and the tests. Item 109 keeps its
  own justification (coverage is not fault detection) and no longer cites it.
- **Still valid:** `orientation` (no denials) and the dedicated
  `*-safety-b3` sets (no denials).
- **Repair (this item, 0.21.0 row 1):** canonical long-path temporary root
  shared by workspaces and cleanup; denials classified against the harness
  allow-list, so an unexpected one makes the run invalid and stops the batch,
  while intended restrictions are counted; reports and comparisons refuse a
  verdict on invalid runs; `native`/`minimal`/`full` setups
  (`evals/smoke/setups/`); `feature-discount` judges the agent's tests by
  running them against a wrong `applyDiscount`; a `preflight` command run in
  the real environment before any batch. Protocol: `evals/smoke/THRESHOLDS.md`,
  section dated 2026-11-20.

### Smoke harness status (2026-11-06)

Built: `evals/smoke/` (4 tasks, thresholds in `THRESHOLDS.md`, written before
any run) and `scripts/eval-smoke.js`. Self-tested with a stub agent against a
packed tarball. **Baseline not yet run** — the maintainer runs it before the
item 84 core change lands, then the after-run on the final Wave B branch.
Conclusions are limited to Claude Code and these four tasks.

## Scope

Version a representative set of at least ten tasks covering bug fixes, bounded
features, reviews, migrations, unfamiliar-repository navigation and onboarding.
Include create and existing-repository init, frontend and non-frontend cases,
and success/failure paths. Keep proprietary data and credentials out of fixtures.

## Acceptance and validation

- [ ] Each task has a fixed starting commit, request/scope, acceptance checks,
  expected affected areas and independently checked outcome rubric.
- [ ] Compare baseline versus changed scaffold with tool/model/runtime/settings
  and context recorded; repeat runs and disclose run-to-run variation.
- [ ] Measure correctness, missed affected files, escaped defects, rework/human
  corrections, review time, completion time and total task cost/context.
- [ ] Report failures/timeouts/skips/null observations, not only successful runs;
  generation volume or an AI's own score is not an effectiveness measure.
- [ ] Evaluate concise-context and lite-review changes for quality regressions;
  define acceptable tradeoffs before looking at the results.
- [ ] Run representative tasks in at least two adopter pilots with different
  contexts. Report sample limits; do not infer causation from two pilots.
- [ ] Follow item 74's strictly local/no-telemetry policy. Anonymize reports;
  human review remains necessary for domain correctness.
- [ ] Item 51 evaluates optional providers on this baseline with its recorded
  benefit threshold and no increase in missed dependencies/false conclusions.

## Exit

Repeatable report links to task versions and check evidence; differences and
limits are explicit. Promote optional features only on demonstrated benefit.
Projected adoption ratings stay forecasts until these results support revision.
