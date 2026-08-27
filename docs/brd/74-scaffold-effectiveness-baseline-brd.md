# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Scaffold Effectiveness Baseline (backlog item 74 — Wave 0)
**Version:** 1.0
**Date:** 2026-08-27
**Status:** Draft — approval blocked on Q-01, Q-02, Q-03
**Author:** Claude (Cowork session), executing `/create-brd` and `.claude/agents/solution-analyst.md` manually — the Claude Code CLI commands are not available in this runtime
**Approved By:** TBD

> **Deviation recorded.** `.claude/agents/solution-analyst.md` says *"Never proceed past this
> analysis if there are unresolved BLOCKER ambiguities."* Q-01, Q-02 and Q-03 are unresolved
> blockers, so this draft was written ahead of that rule, on explicit maintainer instruction. It
> must not be marked Approved and Stage 2 must not begin until they are resolved.
>
> Companion solution analysis: `docs/brd/74-scaffold-effectiveness-baseline-analysis.md`.
> Backlog definition: `docs/process/pre-npm-publish-todo.md` → "New work definitions" → item 74.

---

## 1. Executive Summary

The scaffold's v1.0 bar ("every category ≥ 8.5") rests on self-assessed ratings with no measurement
behind them. This feature records a dated, reproducible baseline of how the scaffold actually
performs — maintenance cost, gate bypasses, rework, escaped defects, false completion claims and
surface usage — captured before Wave 1 changes anything. Two families (golden-path success and
upgrade conflicts) have no honest source yet and are recorded as null with a start condition rather
than as a number. It buys the ability to detect
regression and show trend; it does not, and must not claim to, prove causation.

---

## 2. Objectives

| ID | Objective | Success Metric |
|---|---|---|
| OBJ-01 | Publish metric definitions before any measurement is interpreted | `docs/process/effectiveness-metrics.md` exists and is committed **before** the first baseline figure is cited in the backlog |
| OBJ-02 | Capture a dated baseline snapshot for every defined metric | Every metric M-01–M-08 (§3a) has either a recorded value or a recorded null with a stated start condition |
| OBJ-03 | Make the repo-side portion reproducible, not prose | `npm run effectiveness-report` re-runs and produces identical output for the same commit |
| OBJ-04 | Unblock Wave 1 with a dated cut-off rather than an open-ended wait | Baseline snapshot commit exists and is referenced from the backlog's Wave 0 entry |
| OBJ-05 | State the measurement's limits in the artifact itself | Metric definitions document names the no-control-group limitation and the N=2 sample size |

---

## 3. Scope

### In Scope
| ID | Item |
|---|---|
| S-01 | Metric definitions document covering M-01–M-08 (§3a): item 74's seven families plus surface usage |
| S-02 | Repo-side baseline for M-03, M-04, M-05, M-06, M-07 and M-08 — computed from durable artifacts (git history, CI run records, npm registry, `tasks/lessons.md`) |
| S-03 | A re-runnable script under `scripts/`, following the `scripts/token-report.js` precedent (T0) |
| S-04 | A dated baseline snapshot committed under `docs/process/` |
| S-05 | Explicit reuse of the existing 2026-07-13 token-report baseline (~138K est-tokens) rather than re-derivation |
| S-06 | Null-with-start-condition records for any metric not measurable at baseline — M-01 and M-02 wholly, and the unmeasurable portion of M-04, M-05 and M-07 (see BR-04, FR-11) |

### Out of Scope
| ID | Item | Reason |
|---|---|---|
| OS-01 | Any Wave 1 fix (items 26, 65 follow-up, 66) | Baseline must precede the changes it measures |
| OS-02 | Opt-in or automatic telemetry from installed projects | Pending Q-02; a privacy/security posture decision must not be made implicitly inside a metrics ticket |
| OS-03 | Field data from the general npm install base | No audit trail exists (item 15, Phase 1); not retroactively recoverable |
| OS-04 | Item 51's Graphify pilot measurement | Separate metric set and separate adoption threshold |
| OS-05 | Time-tracking-based maintenance effort | No agreed timesheet discipline; A-06 uses git-derived effort instead |
| OS-06 | Category re-rating (the 1–10 table) | Ratings are judgement; this item measures inputs to judgement, not the judgement |

> **Wave split, recorded.** The backlog places baseline *capture* in Wave 0 and item 74's
> *reporting* in Wave 4. This BRD covers both halves in one requirement set because the reporting
> mechanism (FR-20–FR-23) is what makes the Wave 0 capture reproducible. If the maintainer wants the
> halves delivered separately, §5.3 splits cleanly into its own ticket.

---

## 3a. Metric Families (ID class `M-xx`)

The seven families named in item 74. Every requirement, rule and criterion below that refers to
"a metric" refers to one of these.

| ID | Family | Baseline measurable today? |
|---|---|---|
| M-01 | Install and golden-path success | **No** — `pre-publish-smoke.sh` greps the generated README for the documented commands, it does not run them. Item 65's Wave 1 follow-up exists to change that. Null with start condition per BR-04 |
| M-02 | Upgrade conflicts | **No** — no upgrade path exists until item 25 ships. Null with start condition |
| M-03 | Maintenance effort | Yes — git-derived (files touched per change, cross-profile duplicate edits) |
| M-04 | Bypass frequency | Partly — depends on Q-03 and on GitHub API retrievability (unverified) |
| M-05 | Rework | Partly — artifact-derived for this repo; self-reported for pilots |
| M-06 | Escaped defects | Yes — git/CHANGELOG-derived for this repo |
| M-07 | False completion claims | Partly — `tasks/lessons.md` gives caught instances only; definition pending Q-04 |
| M-08 | Surface usage (item 69 / T5) | Yes — command/agent surface is already measured (35 commands, 17 agents, 2026-08-13) |

> M-08 is not one of item 74's seven families; it is added because Wave 0's own scope line names
> "surface usage". Wave 0 also names "duplication", which has no separate ID here — it is covered
> only as a component of M-03. If duplication needs to trend independently it wants its own metric.

---

## 4. User Roles & Permissions

| Role | Description | Permissions in this Feature |
|---|---|---|
| Maintainer | Sole owner of the scaffold repo | Defines metrics, runs the report, commits the snapshot, approves this BRD |
| Pilot team member | Adopting team (item 55, 2 projects) | Supplies self-reported bypass/rework/false-done counts via a fixed template |
| Reviewer agent | `/review` fan-out | Reads metric definitions; does not write metric values |

> **Conflict of interest, recorded:** the maintainer is also the sole reporter and sole approver.
> This is why FR-03 prefers artifact-derived metrics over self-report (R-03).

---

## 5. Functional Requirements

### 5.1 Metric definitions

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system SHALL publish a metric definitions document at `docs/process/effectiveness-metrics.md` covering every metric in §3a — item 74's seven families (M-01–M-07) plus surface usage (M-08), which Wave 0's scope line requires | Must Have |
| FR-02 | Each metric definition SHALL state: its ID, what is counted, the data source, the extraction method, the denominator, and whether it is artifact-derived or self-reported | Must Have |
| FR-03 | Where a metric can be derived from a durable artifact (git history, CI run records, npm registry, `tasks/lessons.md`), the definition SHALL use that source in preference to self-report | Must Have |
| FR-05 | A metric definition SHALL NOT cite a gate as its source unless that gate measures the thing named. Specifically, M-01 SHALL NOT use `pre-publish-smoke.sh` pass counts as golden-path success, because that gate asserts command presence in a README, not command execution | Must Have |
| FR-04 | The definitions document SHALL state the measurement's limits: no control group, N=2 pilot projects, and that the metrics support regression detection and trend, not proof of causation | Must Have |

> Requirement language: **SHALL** = mandatory · **SHOULD** = recommended · **MAY** = optional

### 5.2 Baseline capture

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | The system SHALL produce a dated baseline snapshot recording a value for every defined metric | Must Have |
| FR-11 | For any metric not measurable at baseline time, the snapshot SHALL record an explicit null plus the condition that starts measurement — never a zero | Must Have |
| FR-12 | The snapshot SHALL cite the commit SHA and the published package version it was taken against | Must Have |
| FR-13 | The snapshot SHALL reference the existing token-report baseline by date and value rather than re-deriving it | Must Have |
| FR-14 | Raw counts SHALL be recorded with their denominators; derived percentages and ratings SHALL NOT be recorded where the denominator is under 10 | Must Have |

### 5.3 Reproducibility

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | The repo-side metrics SHALL be produced by a script invoked through an npm script, following the `token-report` precedent | Must Have |
| FR-21 | Repeated runs of the report against the same commit SHALL produce identical output | Must Have |
| FR-22 | The report SHOULD emit machine-readable output (JSON) alongside the human-readable form, so later runs can be diffed | Should Have |
| FR-23 | The report MAY degrade honestly when no authenticated GitHub remote is available, reporting the affected metrics as unavailable rather than zero | Nice to Have |

### 5.4 Pilot-reported metrics

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | The system SHALL provide a fixed self-report template for pilot teams covering bypasses, rework, and false-done claims | Should Have |
| FR-31 | Pilot-reported values SHALL be recorded separately from artifact-derived values and labeled as self-reported | Must Have |

---

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Metric definitions are published before any figure derived from them is cited as evidence. A number without a prior published definition is not evidence |
| BR-02 | The baseline is captured before the first Wave 1 change is merged. A baseline taken after a fix cannot measure that fix |
| BR-03 | Artifact-derived and self-reported values are never summed or averaged together |
| BR-04 | A metric that cannot be measured yet is recorded as null with a start condition. Recording it as zero is prohibited — a zero asserts an observation that was never made |
| BR-05 | No metric introduces data collection from installed projects without an explicit, separately approved telemetry decision |
| BR-06 | The baseline document is superseded by re-runs, never edited in place; each run is a new dated snapshot |
| BR-07 | Improvement claims against the baseline name the metric ID and the two snapshot dates being compared |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Determinism | The report produces byte-identical output across runs on the same commit with the same inputs |
| NFR-02 | Runtime | The report completes in under 60s on a developer machine without network access to non-essential services |
| NFR-03 | Privacy | The report collects no data from outside this repository and the explicitly supplied pilot reports; it transmits nothing |
| NFR-04 | Dependencies | No new runtime dependency is added to the published package; the report is a maintainer tool (same posture as `token-report`) |
| NFR-05 | Portability | The report runs on the platforms CI covers; where GitHub API access is unavailable it degrades to a documented reduced metric set |
| NFR-06 | Maintainability | Metric extraction logic is unit-tested, matching the `src/cli/core/token-report.js` pattern |

> Feature-flag-driven sections (GDPR, ISO 27001, accessibility, audit log, async jobs) are **off — not
> configured**: `.claude/settings-overrides.json` does not exist in this repository. Per
> `.claude/commands/create-brd.md` these sections are omitted rather than hidden. Project identity
> declares Compliance Scope `N/A` and no personal data processing, which is consistent with NFR-03.

---

## 8. Acceptance Criteria

| ID | Criterion | Test Scenario |
|---|---|---|
| AC-01 | Given the repo at the baseline commit, when `npm run effectiveness-report` is run twice, then both runs produce identical output | Run twice, diff — empty |
| AC-02 | Given the metric definitions document, when it is parsed, then each of M-01–M-08 appears exactly once with a non-empty source, method and denominator field | Automatable: parse the definitions table, assert 8 rows, assert no empty cell |
| AC-03 | Given the baseline snapshot, when it is parsed, then every metric row has a `value` that is either a number with a non-empty `observed_on` field, or the literal `null` with a non-empty `starts_when` field. No row has value `0` and an empty `observed_on` | Automatable over the JSON emit (FR-22): assert the invariant per row |
| AC-04 | Given the snapshot, when its provenance is checked, then it names a commit SHA and a published package version | Both fields present and resolvable |
| AC-05 | Given the definitions document, when the limitations section is read, then it names the absence of a control group and the N=2 sample size | Text present |
| AC-06 | Given the backlog's Wave 0 entry, when it is read after this work merges, then it links to the committed snapshot | Link present and resolves |
| AC-07 | Given the snapshot, when it is parsed, then every metric row carries `source: artifact` or `source: self-reported`, and no aggregate row draws on rows of both kinds | Automatable: assert the field exists on every row; assert no aggregate spans both source values |
| AC-08 | Given the packed tarball for the next release, when it is inspected, then `package.json` `dependencies` is unchanged from the previous release and the existing smoke gates still pass | `npm pack` + diff dependencies + run `scripts/pre-publish-smoke.sh`, per the 2026-07-10 lesson (verify the packed artifact, never the working tree) |
| AC-09 | Given the definitions document, when M-01 is read, then its source is not `pre-publish-smoke.sh` pass counts and its start condition names item 65's execution follow-up | Text assertion — closes FR-05 |
| AC-10 | Given the snapshot, when the token metric is read, then it cites the 2026-07-13 figure by date rather than a freshly derived number | Text assertion — closes FR-13 |
| AC-11 | Given two snapshots, when the JSON emits are diffed, then the diff is machine-readable and identifies changed metrics by ID | Closes FR-22 |
| AC-12 | Given the backlog, when the first figure from this baseline is cited in it, then `docs/process/effectiveness-metrics.md` has an earlier commit date than that citation | Closes BR-01 — checkable from git log |

---

## 9. Open Questions

**Q-01, Q-02 and Q-03 are blockers. This BRD cannot move to Approved, and Stage 2 estimation must not begin, until they are resolved.**

| ID | Question | Owner | Due Date | Resolution |
|---|---|---|---|---|
| Q-01 | Does "baseline captured" mean the retro-computable set only, or must prospective counters run for a defined observation window before Wave 1 starts? | Maintainer | Before Stage 2 | |
| Q-02 | Is any opt-in telemetry acceptable, or is collection strictly local and manual? | Maintainer | Before Stage 2 | |
| Q-03 | Which events count as a "bypass"? (`--no-verify` commit, admin merge, self-merge, merge with a required check missing, lifecycle stage skipped without a fast-lane record) | Maintainer | Before Stage 2 | |
| Q-04 | What counts as a "false-done claim" and who records one? `tasks/lessons.md` holds 20 dated entries, at least three of this class, but only caught instances are recorded | Maintainer | Before FR-01 | |
| Q-05 | Is item 74 a hard gate on Wave 1, or a parallel track? Ranked 8 / P1, yet Wave 0 sequences it first | Maintainer | Before Stage 2 | |
| Q-06 | One-off document or re-runnable script? FR-20 assumes script; confirm | Maintainer | Before Stage 2 | |
| Q-07 | Does the baseline cover all 5 profiles, or only those with pilot coverage? | Maintainer | Before FR-10 | |
| Q-08 | Is pilot-project data collection part of this item, or part of item 55? | Maintainer | Before FR-30 | |
| Q-09 | Can upgrade-conflict metrics (M-02) exist before `ais update` ships? | Maintainer | Before FR-10 | |

---

## 10. Dependencies

| Dependency | Type | Status | Notes |
|---|---|---|---|
| Item 55 — pilot feedback loop | Internal | Open | Supplies the only source for FR-30/FR-31 pilot-reported metrics; if pilots have not started, those metrics are null per BR-04 |
| Item 25 — `ais update` | Internal | Open (P0) | The upgrade-conflict family cannot be measured before an upgrade path exists |
| Item 15 — install/action audit trail | Internal | Open (Phase 1) | Would be the only route to field-install data; explicitly out of scope here (OS-03) |
| Item 26 — drift-aware `doctor` | Internal | Open (P0, Wave 1) | Queries the same GitHub API surface the bypass metric needs; the API spike belongs there, not here |
| `scripts/pre-publish-smoke.sh` | Internal | Exists | Smoke-gate pass/fail source — asserts command **presence** in the generated README, not execution (see M-01). Item 65 records 113/113 gates across all 5 profiles |
| `scripts/token-report.js` | Internal | Exists (T0 done) | Precedent for FR-20 and source of the reused token baseline (FR-13) |
| GitHub API access | External | Unverified | Bypass/required-check history retrievability is unconfirmed (see analysis, Technical Unknowns) |

---

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | No control group — governance effectiveness cannot be isolated from team skill, project difficulty, or model changes | High | High | FR-04: restate the objective as regression detection and trend; never claim proof of causation |
| R-02 | N=2 pilots make per-project rates anecdotal | High | Med | FR-14: raw counts with denominators; no percentages under n=10 |
| R-03 | Maintainer is sole reporter and sole approver | Med | High | FR-03: artifact-derived in preference to self-report; BR-03 keeps the two separate |
| R-04 | Upgrade-conflict metric unmeasurable until item 25 ships | High | Med | BR-04 null-with-start-condition |
| R-05 | Baseline decays into stale prose — cf. the 2026-08-12 release incident, recorded in `docs/process/pre-npm-publish-todo.md` | Med | Med | FR-20/FR-21: script, not document |
| R-06 | Wave 0 blocks indefinitely waiting for prospective data | Med | High | Q-01 resolution plus OBJ-04's dated cut-off |
| R-07 | Metric definitions grow into governance surface, worsening item 69's measured bloat (35 commands / 17 agents) | Low | Med | Delivery is one definitions doc, one script, one npm script, one snapshot and one self-report template — and **no new command, agent, skill or rule**. Surface growth is measured by M-08, so this item's own effect on it is visible |

---

## 12. Glossary

| Term | Definition |
|---|---|
| Wave 0 | The baseline stage of the 2026-08-21 priority reset; gates Wave 1 per the backlog's execution order |
| Golden path | A profile's documented day-one command sequence. **Not currently executed by any gate** — `scripts/pre-publish-smoke.sh` asserts the commands are *present* in the generated README (`grep -q "pytest"`), which is why M-01 is null at baseline |
| Bypass | A governance gate that was configured but not applied to a change — precise definition pending Q-03 |
| False-done claim | Work reported complete that verification showed incomplete (e.g. the 2026-07-10 unpushed-tag release) |
| Escaped defect | A defect found after the change that introduced it was merged |
| Artifact-derived | A metric computed from a durable record (git, CI, npm, script output), not from a person's recollection |
| Rework | Change to code or docs caused by a defect or a missed requirement in previously merged work |

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-08-27 | Claude (Cowork) | Initial draft from backlog item 74 and the companion solution analysis |
| 1.1 | 2026-08-27 | Claude (Cowork) | Verification pass (two rounds): added the `M-xx` metric ID class (§3a); corrected the golden-path source — `pre-publish-smoke.sh` greps READMEs, it does not execute the documented commands, so M-01 is null at baseline (new FR-05, AC-09); recorded the solution-analyst rule deviation; recorded the Wave 0 / Wave 4 split; made AC-02/03/07/08 mechanically checkable and added AC-09–AC-12 to cover FR-05, FR-13, FR-22 and BR-01 |
