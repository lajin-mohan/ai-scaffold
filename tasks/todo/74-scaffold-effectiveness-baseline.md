# 74 — Scaffold effectiveness baseline and metrics (Wave 0)

## Status

**Stage 1 — Analysis complete. BRD APPROVED 2026-08-27.**
Ready for Stage 2 — estimation. No open blockers.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/74-scaffold-effectiveness-baseline-analysis.md` | Closed |
| 1 — Analysis | `docs/brd/74-scaffold-effectiveness-baseline-brd.md` | **Approved v2.0** |
| 2 — Plan | `docs/estimates/74-scaffold-effectiveness-baseline-estimate.md` | **Next** |

## Why this gates Wave 1

The 2026-08-21 priority reset sequences Wave 0 (baseline) before Wave 1 (items
26, 65 follow-up, 66). A baseline taken after a fix cannot measure that fix.

## Size

**M** per `docs/process/task-size-policy.md` — full workflow. BRD, estimation,
and architecture are required gates; no fast lane.

## Decisions (all closed 2026-08-27)

- **Q-01** Retro-computable baseline only, with a dated cut-off. Prospective
  counters run in parallel, labeled trend-only.
- **Q-02** Strictly local. No telemetry. Item 15 stays a local log.
- **Q-03** GitHub-observable bypasses only; unobservable ones named as not
  measured, by construction.
- **Q-05–Q-09** resolved as consequences. **Q-04** carries a proposed definition
  the maintainer may override without reopening approval. Full rationale in the
  BRD §9.

## Recorded deviation (closed)

`.claude/agents/solution-analyst.md`: *"Never proceed past this analysis if there
are unresolved BLOCKER ambiguities."* The BRD was drafted ahead of that rule on
explicit maintainer instruction; the blockers were resolved the same day, which
closes it. Recorded because it happened.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-27 | BRD drafted ahead of the solution-analyst BLOCKER rule | Maintainer instructed "go" on writing the BRD in the 2026-08-27 Cowork session while Q-01–Q-03 were open. Recorded as a deviation, not a rule change; the BRD stays Draft |
| 2026-08-27 | Q-01 — retro-computable baseline only, dated cut-off | Prospective data comes largely from the pilots (item 55), gated on handover, gated on Wave 1. Waiting would make Wave 0 depend on Wave 1's outputs |
| 2026-08-27 | Q-02 — strictly local, no telemetry | Emitting anything becomes a procurement/security-review item for a product sold as governance over client code, and contradicts the documented no-collection posture. N=2 pilots offered no meaningful field data anyway |
| 2026-08-27 | Q-03 — GitHub-observable bypasses only | A metric that cannot be computed from an artifact gets computed from memory, and the sole reporter is the sole maintainer. Reuses item 26's API surface |
| 2026-08-27 | Objective restated as regression detection and trend, not proof that governance reduces rework | No control group and N=2 pilots; causation is not recoverable from this design (analysis R-01) |
| 2026-08-27 | Field data from the general npm install base is out of scope | No telemetry and no audit trail (item 15, unbuilt); not retroactively recoverable |
| 2026-08-27 | Existing token-report baseline (2026-07-13, ~138K est-tokens) is reused, not re-derived | T0 is done; a second baseline with a different method and date would be worse than one |
| 2026-08-27 | GitHub-API bypass-extraction spike folded into item 26 | Item 26's first slice must query the same API surface; a separate spike duplicates it |
| 2026-08-27 | Unmeasurable metrics recorded as null with a start condition, never zero | A zero asserts an observation that was never made (BR-04) |
| 2026-08-27 | Golden-path success (M-01) is null at baseline, not 113/113 | `pre-publish-smoke.sh` greps the generated README for the documented commands rather than running them; item 65's Wave 1 follow-up exists to change that. Inheriting the 113/113 figure would measure command *presence* and label it *success* |
| 2026-08-27 | Metric ID class `M-01`–`M-08` introduced; M-08 (surface usage) added beyond item 74's seven families | Wave 0's scope line names "surface usage". Wave 0 also names "duplication", which is covered only inside M-03 — flagged, not given its own ID |
