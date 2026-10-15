# 99 — Representative task evaluations and adopter pilots

## Status

Proposed, P1, 2026-10-13. Extends item 74B; does not duplicate its existing
metric definitions. Define fixtures/baseline before changes, compare after the
P0/P1 work under evaluation. Supplies item 51's filesystem-provider baseline.

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
