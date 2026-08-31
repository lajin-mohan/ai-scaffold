# Solution Analysis: Scaffold Effectiveness Baseline (backlog item 74)

**Analyst:** Claude (Cowork session), following `.claude/agents/solution-analyst.md`
**Date:** 2026-08-27
**Status:** CLOSED 2026-08-27 — blockers resolved; see the BRD §9
**Confidence:** MEDIUM — the request is well-defined in intent, under-defined in measurement method and data source

---

## Problem Statement

The backlog asserts a self-scored category rating (Overall 8.0 → target 8.5+) and sets the v1.0 bar
at "every category ≥ 8.5". Those scores are judgement, not measurement: nothing in the repository
records whether governance actually reduces rework, escaped defects, gate bypasses, or false
completion claims. Item 74 asks for a recorded baseline — captured **before** Wave 1 changes
anything — so later improvement claims can be checked rather than asserted.

**Constraint that shapes everything below:** the scaffold ships as an npm CLI with no telemetry, and
the install/action audit trail (item 15) is unbuilt. Field data does not currently exist and cannot
be retrieved retroactively.

---

## Stakeholders

| Role | Name / Team | Input Required |
|---|---|---|
| Requester | Lajin M J (maintainer/owner) | Metric definitions, sample-size acceptance, telemetry stance |
| End Users | Adopting SaaS teams (2 pilot projects, item 55) | Self-reported bypass/rework/false-done data |
| Approver | Lajin M J (sole maintainer — no independent approver exists) | BRD sign-off |
| Affected Systems | `scripts/pre-publish-smoke.sh`, `token-report`, CI workflows, `tasks/lessons.md`, `.ai-scaffold.json` | Metric extraction points |

---

## Assumptions (Must Be Confirmed)

| # | Assumption | If Wrong: Impact |
|---|---|---|
| A-01 | Baseline scope is this repository plus the 2 pilot projects — not the general npm install base | If field data is required, item 74 blocks on item 15 (audit trail, Phase 1) and Wave 0 cannot complete before Wave 2 |
| A-02 | A baseline of retro-computable metrics is enough to unblock Wave 1; prospective metrics accumulate in parallel | If Wave 1 must wait for prospective data, the whole roadmap stalls for weeks with no work in flight |
| A-03 | The 2026-07-13 token-report baseline (~138K est-tokens, T0 DONE) counts as an already-captured metric family and is not re-derived | Duplicated effort, and two token baselines with different dates and methods |
| A-04 | Pilot teams will self-report bypasses and rework honestly and consistently | Bypass and rework counts trend toward zero for reporting reasons, not quality reasons — the metric inverts |
| A-05 | No opt-in telemetry will be added as part of item 74 | Collection becomes manual and decays; or a privacy/security decision gets made implicitly inside a metrics ticket |
| A-06 | "Maintenance effort" is measurable from git history (files touched per profile change, cross-profile duplicate edits) rather than time tracking | Requires timesheet discipline nobody has agreed to |

---

## Ambiguities (Must Be Resolved Before BRD)

| # | Question | Blocker? | Owner |
|---|---|---|---|
| Q-01 | Does "baseline captured" mean the retro-computable set only, or must prospective counters (bypass, rework, false-done) run for a defined window first? | **YES** | Maintainer |
| Q-02 | Is any opt-in telemetry acceptable, or is collection strictly local/manual? | **YES** | Maintainer |
| Q-03 | What counts as a "bypass"? Candidates: `--no-verify` commit, admin merge, self-merge, merge with a required check missing, a lifecycle stage skipped without a fast-lane record. Only some leave durable artifacts. | **YES** | Maintainer |
| Q-04 | What counts as a "false-done claim", and who records one? `tasks/lessons.md` has 20 dated entries including at least three of this class, but only *caught* instances are recorded | NO | Maintainer |
| Q-05 | Item 74 is ranked 8 / P1, yet Wave 0 makes it gate Wave 1. Is it a hard gate or a parallel track? | NO | Maintainer |
| Q-06 | Is the baseline a one-off document or a re-runnable script (as `token-report` is)? Re-runnability is what makes trend possible | NO | Maintainer |
| Q-07 | Does the baseline cover all 5 profiles, or only those with pilot coverage? | NO | Maintainer |
| Q-08 | Is pilot-project data collection part of this item, or part of item 55 (pilot feedback loop)? | NO | Maintainer |
| Q-09 | Can upgrade-conflict metrics exist before `ais update` (item 25) ships? There is no upgrade path to conflict with today | NO | Maintainer |

---

## Scope Clarity

**In Scope (confirmed by the item definition):**
- Install and golden-path success
- Upgrade conflicts
- Maintenance effort
- Bypass frequency
- Rework
- Escaped defects
- False completion claims
- Publishing metric *definitions* before interpreting any improvement

**Out of Scope (confirmed):**
- Any Wave 1 fix (items 26, 65 follow-up, 66) — the baseline must precede them
- Item 51's Graphify pilot measurement, which has its own separate metric set and adoption threshold

**Unconfirmed Scope (needs decision):**
- Whether pilot-project data collection is in this item or in item 55 (pilot feedback loop) — Q-08
- Whether upgrade-conflict metrics can exist at all before `ais update` (item 25) ships — Q-09
- Whether the baseline covers all 5 profiles or only those with pilot coverage — Q-07

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| R-01 **No control group.** Effectiveness of governance cannot be isolated from team skill, project difficulty, or Claude model changes. The item says "proves whether governance reduces rework…" — with N=2 and no control, it cannot prove causation | H | H | Restate the objective as *regression detection and trend*, not proof of causation. Say so in the published metric definitions |
| R-02 **N=2 pilots.** Any per-project rate is anecdote-shaped | H | M | Report raw counts with denominators, never percentages or ratings derived from them |
| R-03 **Metric gaming.** The maintainer is also the sole reporter for repo-side metrics | M | H | Prefer metrics computed from durable artifacts (git, CI runs, npm, smoke-gate output) over self-report |
| R-04 **Upgrade-conflict metric is unmeasurable today** — `ais update` (item 25) does not exist | H | M | Record it as a defined-but-null metric with a stated start condition, not as a zero |
| R-05 **Baseline becomes stale prose.** The repo's own 2026-08-12 release-incident lesson (recorded in `docs/process/pre-npm-publish-todo.md`, not `tasks/lessons.md`) is that documents describing a process drift from the process | M | M | Make the repo-side baseline a script under `scripts/`, following the `token-report` precedent |
| R-06 **Wave 0 blocks indefinitely,** because prospective metrics need elapsed time and pilots have not started (item 55 is still open) | M | H | Resolve Q-01 explicitly; define a dated cut-off for baseline capture |

---

## Technical Unknowns / Spike Required

- **Bypass extraction from GitHub.** Whether administrator-bypass and required-check-missing events are retrievable from the GitHub API for this repo's history is unverified. Item 26's first slice queries effective branch/ruleset coverage — the same API surface. **Recommend folding a 1–2h spike into item 26 rather than a separate spike here**, since 26 must query that API anyway.
- **Golden-path success is not measurable today.** `scripts/pre-publish-smoke.sh` produces a
  per-profile pass/fail signal (item 65 records 113/113 gates, all 5 profiles covered), but it
  **greps the generated README for the documented commands rather than running them** (e.g.
  `grep -q "pytest"`). Item 65's own P0 follow-up — Wave 1, rank 4 — exists precisely to replace
  those presence assertions with execution. So a golden-path *success* metric has no honest source
  until that follow-up ships, and must be recorded as null with a start condition rather than
  inheriting the 113/113 figure, which measures something else.
- **Machine-readability of the smoke output** (structured emit vs. parsing console text) is
  additionally unverified.

---

## Recommended Next Step

**RESOLVED 2026-08-27 — the three BLOCKER ambiguities were decided by the maintainer. The BRD is Approved.**

*Original recommendation, retained:* NEEDS STAKEHOLDER DECISION — Q-01, Q-02 and Q-03 are BLOCKER ambiguities.

`.claude/agents/solution-analyst.md` states: *"Never proceed past this analysis if there are
unresolved BLOCKER ambiguities."* By that rule the BRD should not be written yet. The correct next
step is a maintainer decision on Q-01–Q-03, then the BRD.

**Recorded deviation (2026-08-27, now closed):** a draft BRD was written before those blockers were
resolved, on explicit maintainer instruction. The blockers were resolved the same day, which closes
the deviation. It stays recorded because it happened. The deviation is recorded here
rather than hidden, because the alternative — paraphrasing the rule into a weaker one that permits
the action — is the exact failure mode this scaffold documents at `docs/process/pre-npm-publish-todo.md`
(2026-08-12: the docs described a superseded process).

## Open Questions for Stakeholders

1. Retro-computable baseline only, or a prospective observation window before Wave 1 starts? (Q-01)
2. Telemetry: any opt-in collection permitted, or strictly local? (Q-02)
3. Which bypass events count, given that only some leave durable artifacts? (Q-03)
4. What counts as a false-done claim, and who records one? (Q-04)
5. Is item 74 a hard gate on Wave 1, or a parallel track? (Q-05)
6. Script or document? (Q-06) All 5 profiles or pilot-covered only? (Q-07) Pilot data here or in item 55? (Q-08) Upgrade-conflict metrics before item 25? (Q-09)
7. Does the maintainer accept "trend and regression detection" as the honest objective, replacing "proves whether governance reduces rework"? (R-01)
