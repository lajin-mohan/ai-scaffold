# Effort Estimate — Scaffold Effectiveness Baseline (backlog item 74)

**Date:** 2026-08-27
**Estimated By:** Claude (Cowork session), following `.claude/agents/estimator.md`
**Reviewed By:** Lajin M J (Technical Lead) — signed off 2026-08-27
**Confidence:** MEDIUM
**Status:** Reviewed — Technical Lead signed off 2026-08-27
**Source spec:** `docs/brd/74-scaffold-effectiveness-baseline-brd.md` (Approved v2.0, 2026-08-27)

> **Template adaptation, recorded.** `.claude/templates/estimation-template.md` assumes a web
> feature (migrations, repository layer, route handlers, page components, staging/production
> deploys). This deliverable is a maintainer-side documentation and script package with no runtime,
> no UI and no deployment. Those rows are replaced with the actual work items rather than filled
> with zeros, and the Deployment section is replaced by release inclusion. Section order and the
> three-point method are unchanged.

---

## Scope Summary

**What's included:** the metric definitions document, a re-runnable report that computes the
repo-side metrics, a dated baseline snapshot with a JSON emit, a pilot self-report template, unit
tests for the extraction logic, and the backlog link that closes AC-06.

**What's excluded:**
- Any Wave 1 fix (items 26, 65 follow-up, 66) — OS-01
- Telemetry of any kind — OS-02, decided in Q-02
- Field data from the general npm install base — OS-03
- Item 51's Graphify measurement — OS-04
- Interpretation of the numbers. This estimate covers producing the baseline, not drawing
  conclusions from it

---

## Correction to an earlier statement

When recommending Q-05 (hard gate vs parallel track) I said the retro capture was "roughly a day of
work, so gating costs almost nothing." **That was optimistic by roughly 3×.** Broken down properly,
the retro-computable capture is **~3.7 realistic days**, and the full productized item is ~13. The
Q-05 recommendation still holds — 3.7 days is an acceptable gate — but it holds on a weaker margin
than I implied, and the phasing below exists because of it.

---

## Assumptions

1. The BRD is Approved and will not change scope during delivery. If it does, this estimate is void
   (>20% deviation rule, `docs/estimates/README.md`).
2. Q-04's proposed false-done definition stands. If the maintainer rewrites it, M-07's extractor
   changes and adds ~0.5 day.
3. `tasks/lessons.md` entries are parseable by their existing `## YYYY-MM-DD - title` convention.
   All 20 current entries follow it; no reformatting is budgeted.
4. `scripts/token-report.js` and `src/cli/core/token-report.js` are the structural precedent, so the
   harness copies an existing tested pattern rather than inventing one.
5. Effort is a single maintainer working alone. No parallelism is available, so business days and
   calendar days differ only by the capacity factor.
6. No new runtime dependency is added (NFR-04), so no packaging or audit work is budgeted beyond the
   existing smoke gates.
7. M-01 and M-02 are null records, not measurements. Budgeting them as work items would be budgeting
   for a measurement that BR-04 forbids.

---

## Task Breakdown

Estimates in **business days** (1 day = 7.5 productive hours).

### Phase A — Retro-computable snapshot (this is what gates Wave 1)

| Task | Optimistic | Realistic | Pessimistic | Risk Notes |
|---|---|---|---|---|
| **Analysis** | | | | |
| Confirm Q-04 definition with maintainer | 0.25 | 0.25 | 0.5 | BRD approved; only Q-04 is open |
| **Definitions** | | | | |
| `docs/process/effectiveness-metrics.md` — M-01…M-08, sources, methods, denominators, limitations (FR-01–FR-05, FR-26) | 0.5 | 1.0 | 1.5 | FR-26's "not measured by construction" list needs care — it is the part a reader will misread |
| **Manual extraction** | | | | |
| M-03 maintenance effort, M-06 escaped defects, M-07 false-done, M-08 surface usage — computed by hand from git, CHANGELOG, `tasks/lessons.md`, existing token-report | 0.5 | 1.0 | 2.0 | M-03's cross-profile duplicate-edit count is the fiddly one |
| M-01, M-02 null records with start conditions | 0.1 | 0.25 | 0.25 | Writing, not measuring |
| **Output** | | | | |
| Snapshot document + backlog Wave 0 link (AC-06) | 0.25 | 0.5 | 0.75 | |
| **Review** | | | | |
| AI review + fixes | 0.25 | 0.5 | 1.0 | |
| **Subtotal** | **1.85** | **3.5** | **6.0** | |
| **Buffer (15%)** | 0.28 | 0.53 | 0.9 | |
| **PHASE A TOTAL** | **2.1** | **4.0** | **6.9** | |

### Phase B — Productized report harness (runs in parallel with Wave 1)

| Task | Optimistic | Realistic | Pessimistic | Risk Notes |
|---|---|---|---|---|
| **Implementation** | | | | |
| `src/cli/core/effectiveness-report.js` + `scripts/effectiveness-report.js` + npm script + JSON emit (FR-20–FR-23) | 0.5 | 1.0 | 1.5 | Copies the `token-report` pattern |
| M-03 extractor (git history, cross-profile duplicate edits) | 0.5 | 1.0 | 2.0 | Heuristic definition of "duplicate edit" is the unknown |
| M-06 extractor (CHANGELOG / git) | 0.25 | 0.5 | 1.0 | |
| M-07 extractor (`tasks/lessons.md` parse) | 0.25 | 0.5 | 1.0 | Depends on assumption 3 |
| M-08 extractor (surface counts; reuses token-report) | 0.25 | 0.5 | 0.75 | Lowest risk |
| M-05 rework extractor | 0.25 | 0.5 | 1.0 | Definition is looser than the others |
| Pilot self-report template (FR-30, FR-31) | 0.25 | 0.5 | 0.75 | |
| **Testing** | | | | |
| Unit tests for extraction logic (NFR-06) — 25% of implementation | 0.6 | 1.1 | 2.0 | |
| Determinism test (AC-01, NFR-01) | 0.25 | 0.5 | 1.0 | Byte-identical output needs sorted keys and no timestamps in the emit |
| **Review & QA** | | | | |
| AI review + fixes | 0.25 | 0.5 | 1.0 | |
| Human code review | 0.25 | 0.5 | 0.5 | See conflict-of-interest note below |
| QA sign-off | 0.25 | 0.5 | 1.0 | |
| **Release** | | | | |
| Release inclusion + packed-tarball check (AC-08) | 0.25 | 0.25 | 0.5 | Per the 2026-07-10 lesson: verify the tarball, not the working tree |
| **Subtotal** | **4.1** | **7.85** | **14.0** | |
| **Buffer (15%)** | 0.62 | 1.18 | 2.1 | |
| **PHASE B TOTAL** | **4.7** | **9.0** | **16.1** | |

### Deferred — M-04 bypass frequency

| Task | Optimistic | Realistic | Pessimistic | Risk Notes |
|---|---|---|---|---|
| M-04 extractor over the GitHub API (FR-25, FR-27) | 0.5 | 1.5 | 3.0 | **Deferred — see Recommended Approach.** Retrievability of admin-bypass and required-check history is unverified, and FR-27 requires reusing item 26's query surface, which does not exist yet |

---

## Risk Register

| Risk | Likelihood | Impact | Multiplier Applied | Mitigation |
|---|---|---|---|---|
| **M-04 depends on item 26, which is Wave 1 — Wave 0 would depend on Wave 1's output** | High | High | 1.3× (third-party API) on the deferred row only | Defer M-04 to snapshot #2, after item 26 ships. Removes the circularity rather than working around it |
| GitHub API does not expose admin-bypass or required-check history for this repo's past | Med | Med | included above | M-04 is recorded null with a start condition, exactly as M-01 and M-02 are. No fabricated history |
| "Duplicate edit" (M-03) has no crisp definition; the extractor encodes a judgement | Med | Med | — | Publish the heuristic in the definitions document before running it (BR-01) |
| Determinism (NFR-01) fails on map ordering or an embedded timestamp | Med | Low | — | Sorted keys, no wall-clock in the emit; AC-01 is the regression test |
| Sole maintainer is estimator, implementer, reviewer and approver | High | Med | — | Same conflict recorded in the BRD (R-03). Human-review row is retained but is self-review in practice; it is not independent assurance |
| Unclear requirements | Low | — | **not applied** | BRD is Approved with all blockers resolved. Applying the 1.5× multiplier would be padding |

---

## Phasing Recommendation

**Split, and start Wave 1 after Phase A.**

- **Phase A — 4.0 realistic days.** Everything that gates Wave 1. Manual extraction, no harness. The
  numbers land in a committed snapshot and Wave 1 begins.
- **Phase B — 9.0 realistic days.** The tested, re-runnable harness. Runs alongside Wave 1. Nothing
  in Wave 1 depends on it; it exists so snapshot #2 is a diff rather than a re-derivation.
- **M-04 — deferred to snapshot #2**, after item 26 ships its GitHub query surface.

The alternative — one 13-day block before Wave 1 — buys nothing. Phase B's value is repeatability on
the *second* run, and there is no second run until Wave 1 has changed something.

---

## Summary

| Scenario | Phase A | Phase B | Total (A+B) | Calendar days (÷0.7 capacity) |
|---|---|---|---|---|
| Optimistic | 2.1 | 4.7 | 6.8 | 9.7 |
| Realistic | 4.0 | 9.0 | 13.0 | 18.6 |
| Pessimistic | 6.9 | 16.1 | 23.0 | 32.9 |

**Recommended commitment:** Phase A at **4.0 days** now; Phase B at **9.0 days** scheduled alongside
Wave 1. M-04 (+1.5 realistic days) booked against snapshot #2, not this item.

**Wave 1 unblocks after Phase A — ~6 calendar days, not ~19.**

---

## Spike Required?

**No spike in this item.** The one genuine unknown — whether the GitHub API exposes the bypass
history M-04 needs — belongs to item 26, which must query that surface regardless. Running a
separate spike here would duplicate item 26's first slice. Budget the answer there.

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Technical Lead | Lajin M J | 2026-08-27 | **Signed off** |
| Product Owner | Lajin M J | | Pending |

**Signed-off scope:** Phase A committed at 4.0 realistic days. Phase B (9.0 d) scheduled alongside
Wave 1. M-04 deferred to snapshot #2. The deferral and the Phase A/B split are part of what was
signed off, not implementation latitude — changing either is a >20% deviation and requires
re-estimation per `docs/estimates/README.md`.

> Both roles are the same person. This estimate has had no independent review. That is a stated
> limitation of the current team size, not an oversight — recorded here so a later reader does not
> mistake the sign-off for assurance.
