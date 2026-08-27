# Scope Statement — ai-scaffold / Item 74, Wave 0 Effectiveness Baseline

**Version:** 1.0
**Date:** 2026-08-27
**Owner:** Lajin M J (maintainer — PM, Tech Lead and Product Owner are the same person on this project)

> Produced per `.claude/agents/pm.md` output format 1, to close the Stage 2 scope-statement gate.
> Source of truth for scope detail is `docs/brd/74-scaffold-effectiveness-baseline-brd.md` §3
> (Approved v2.0). Where this statement and the BRD differ, the BRD governs.

---

## In Scope

- **Metric definitions** — `docs/process/effectiveness-metrics.md` covering M-01 through M-08: what
  each counts, its data source, extraction method, denominator, and whether it is artifact-derived
  or self-reported. Published **before** any figure from it is cited.
- **Phase A — retro-computable baseline snapshot.** Values for M-03 (maintenance effort), M-06
  (escaped defects), M-07 (false completion claims) and M-08 (surface usage), computed by hand from
  git history, `CHANGELOG.md`, `tasks/lessons.md` and the existing token-report. Null records with
  start conditions for M-01 and M-02. Committed as a dated snapshot citing its commit SHA and
  published package version.
- **Phase B — report harness.** A re-runnable report under `scripts/`, invoked through an npm
  script, following the `token-report` precedent, with a JSON emit and unit-tested extraction logic.
- **Pilot self-report template** for bypasses, rework and false-done claims, kept separate from and
  never aggregated with artifact-derived values.
- **Backlog linkage** — the Wave 0 entry in `docs/process/pre-npm-publish-todo.md` points at the
  committed snapshot.
- **Stated limitations** published alongside the definitions: no control group, N=2 pilots,
  regression detection and trend only.

## Out of Scope

- Any Wave 1 fix — items 26, 65 follow-up, 66. The baseline must precede the changes it measures.
- **Telemetry of any kind**, opt-in or automatic. Decided 2026-08-27 (Q-02): collection stays
  strictly local. This fixes item 15 as a local append-only log with no client, server or privacy
  policy.
- Field data from the general npm install base. No audit trail exists and none is retroactively
  recoverable.
- Item 51's Graphify pilot measurement — separate metric set, separate adoption threshold.
- Time-tracking-based maintenance effort. Maintenance effort is git-derived.
- Re-rating the 1–10 category table. This item measures inputs to judgement, not the judgement.
- **Interpretation of the resulting numbers.** Producing the baseline is in scope; drawing
  conclusions from it is not.

## Deferred (Considered but Pushed)

| Item | Pushed to | Reason |
|---|---|---|
| **M-04 — bypass frequency** (+1.5 realistic days) | Snapshot #2, after item 26 ships | FR-27 requires reusing item 26's GitHub query surface, and item 26 is Wave 1. Building it now would make Wave 0 depend on Wave 1's output — the circularity Q-01 was decided to avoid |
| "Merged `feature/*` PR with no `docs/brd/` artifact" as a bypass signal | After item 73 | Needs task size to be machine-readable. FR-28 explicitly forbids adding it earlier |
| Prospective counters as a *baseline* | Never — they become a trend series | With no pre-Wave-1 history they are not a baseline. BR-08 forbids describing them as one |
| A separate GitHub-API spike | Item 26's first slice | Item 26 must query that surface regardless; a spike here duplicates it |

## Assumptions

1. The Approved BRD does not change scope during delivery. A >20% deviation voids the signed
   estimate and requires re-estimation.
2. Q-04's proposed false-done definition stands. Rewriting it adds ~0.5 day to M-07.
3. `tasks/lessons.md` entries remain parseable by their existing `## YYYY-MM-DD - title` convention.
4. `token-report` remains the structural precedent, so the harness copies a tested pattern.
5. A single maintainer works alone; no parallelism is available.
6. No new runtime dependency is introduced.

---

## Decisions Flagged to the Tech Lead

Per `.claude/agents/pm.md` — *"never make architecture or technical decisions; produce the
communication, flag the decision to the right person."*

| # | Decision needed | Why it is not decided here |
|---|---|---|
| 1 | **Architecture gate.** `task-size-policy.md` marks M as requiring HLD + ADR. This deliverable is one definitions document plus a script copying an existing structure. Either produce an ADR recording why architecture was skipped, or run the gate | Architectural call, not a PM call |
| 2 | **Q-04 false-done definition** — currently Proposed, not Resolved | The maintainer may override without reopening BRD approval |
| 3 | **Wave 1 start trigger** — Wave 1 begins on the Phase A snapshot commit, independent of Phase B progress. Confirm this is the intended trigger | Sequencing decision with roadmap consequences |

---

## Delivery Shape

| Phase | Realistic | Gates Wave 1? |
|---|---|---|
| Phase A — retro-computable snapshot | 4.0 d | **Yes** |
| Phase B — report harness | 9.0 d | No — runs alongside Wave 1 |
| M-04 (deferred) | 1.5 d | No — snapshot #2 |

**Wave 1 unblocks ~6 calendar days after Phase A starts.**

---

**Approved by:** Lajin M J (PM) | Lajin M J (Tech Lead) | N/A (no external client — internal tooling)
**Date:** 2026-08-27

> **No independent approval exists.** PM, Tech Lead and Product Owner are the same person. Recorded
> so a later reader does not mistake three signature lines for three reviews.
