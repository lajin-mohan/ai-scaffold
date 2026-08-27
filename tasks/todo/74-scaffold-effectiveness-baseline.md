# 74 — Scaffold effectiveness baseline and metrics (Wave 0)

## Status

**Stage 1 — Analysis complete. BRD drafted, NOT approved.**
Blocked on maintainer decisions Q-01, Q-02, Q-03. Stage 2 estimation must not
begin until those are resolved.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/74-scaffold-effectiveness-baseline-analysis.md` | Draft |
| 1 — Analysis | `docs/brd/74-scaffold-effectiveness-baseline-brd.md` | Draft — approval blocked |
| 2 — Plan | `docs/estimates/74-*-estimate.md` | Not started |

## Why this gates Wave 1

The 2026-08-21 priority reset sequences Wave 0 (baseline) before Wave 1 (items
26, 65 follow-up, 66). A baseline taken after a fix cannot measure that fix.

## Size

**M** per `docs/process/task-size-policy.md` — full workflow. BRD, estimation,
and architecture are required gates; no fast lane.

## Open decisions (blockers)

- **Q-01** Retro-computable baseline only, or a prospective observation window before Wave 1 starts?
- **Q-02** Any opt-in telemetry permitted, or strictly local/manual collection?
- **Q-03** Which events count as a "bypass"? Only some leave durable artifacts.

Non-blocking: Q-04 (false-done definition and recorder), Q-05 (hard gate vs
parallel track), Q-06 (script vs document), Q-07 (all 5 profiles or
pilot-covered only), Q-08 (pilot data here or in item 55), Q-09 (upgrade-conflict
metrics before item 25).

## Recorded deviation

`.claude/agents/solution-analyst.md`: *"Never proceed past this analysis if there
are unresolved BLOCKER ambiguities."* The BRD was drafted ahead of that rule on
explicit maintainer instruction. It is marked Draft and must not be approved
until Q-01–Q-03 are resolved.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-27 | BRD drafted ahead of the solution-analyst BLOCKER rule | Maintainer instructed "go" on writing the BRD in the 2026-08-27 Cowork session while Q-01–Q-03 were open. Recorded as a deviation, not a rule change; the BRD stays Draft |
| 2026-08-27 | Objective restated as regression detection and trend, not proof that governance reduces rework | No control group and N=2 pilots; causation is not recoverable from this design (analysis R-01) |
| 2026-08-27 | Field data from the general npm install base is out of scope | No telemetry and no audit trail (item 15, unbuilt); not retroactively recoverable |
| 2026-08-27 | Existing token-report baseline (2026-07-13, ~138K est-tokens) is reused, not re-derived | T0 is done; a second baseline with a different method and date would be worse than one |
| 2026-08-27 | GitHub-API bypass-extraction spike folded into item 26 | Item 26's first slice must query the same API surface; a separate spike duplicates it |
| 2026-08-27 | Unmeasurable metrics recorded as null with a start condition, never zero | A zero asserts an observation that was never made (BR-04) |
| 2026-08-27 | Golden-path success (M-01) is null at baseline, not 113/113 | `pre-publish-smoke.sh` greps the generated README for the documented commands rather than running them; item 65's Wave 1 follow-up exists to change that. Inheriting the 113/113 figure would measure command *presence* and label it *success* |
| 2026-08-27 | Metric ID class `M-01`–`M-08` introduced; M-08 (surface usage) added beyond item 74's seven families | Wave 0's scope line names "surface usage". Wave 0 also names "duplication", which is covered only inside M-03 — flagged, not given its own ID |
