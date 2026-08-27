# Scaffold Effectiveness Baseline — Snapshot 2026-08-27

**Snapshot:** #1 (Wave 0 baseline)
**Date:** 2026-08-27
**Commit:** `a4a2eb2`
**Package version:** `0.14.0`
**Definitions:** `docs/process/effectiveness-metrics.md` v1.0 — committed before this file
**Window:** 2026-05-01 → 2026-08-27 unless a metric states otherwise
**Captured by:** manual extraction (Phase A). The scripted harness is Phase B.

> **This snapshot exists so later improvement claims can be checked rather than asserted.** It shows
> trend and detects regression. It does not prove that governance reduces rework — no control group
> exists and N = 2 pilots. See the definitions document's limits section.

---

## Wave 1 cut-off

**Wave 1 may begin on this commit** (`FR-16`, Q-01). Prospective counters — M-05, and M-04 once
item 26 ships — accumulate in parallel and are labeled trend-only. Waiting for them would make
Wave 0 depend on Wave 1's output, since the pilots that supply them are gated on Wave 1.

---

## Results

| ID | Metric | Value | Kind | Status |
|---|---|---|---|---|
| M-01 | Install / golden-path success | **null** | artifact | Starts when item 65's execution follow-up ships |
| M-02 | Upgrade conflicts | **null** | artifact | Starts on the first released `ais update` (item 25) |
| M-03 | Maintenance effort | see below | artifact | measured |
| M-04 | Bypass frequency | **null** | artifact | Starts when item 26 ships its GitHub query surface |
| M-05 | Rework | **trend only** | mixed | instrumented from 2026-08-27 |
| M-06 | Escaped defects | 44 | artifact | measured (upper bound) |
| M-07 | False completion claims | 4 | artifact | measured (caught instances only) |
| M-08 | Surface usage | 140,531 est-tokens / 94 files | artifact | measured |

Four of eight are null or trend-only. That is the honest state of measurability today, not a gap in
the capture. Per `BR-04` none of them is recorded as zero.

---

## M-03 — Maintenance effort

Window 2026-05-01 → 2026-08-27.

| Figure | Value |
|---|---|
| Commits in window | 228 |
| Commits touching `templates/` | 31 (13.6% of 228) |
| Mean files changed per `templates/` commit | 63.8 |

**Profile copies edited per `templates/` commit:**

| Profiles touched | Commits | Share |
|---|---:|---:|
| 5 (all) | 16 | 51.6% |
| 4 | 1 | 3.2% |
| 3 | 10 | 32.3% |
| 2 | 1 | 3.2% |
| 1 | 3 | 9.7% |

**Reading:** **90.3% of profile-touching commits edited 2 or more copies, and over half edited all
five.** A change to shared scaffold content costs roughly 5× its logical size. This is the
duplication tax item 34 (shared base + overlays, rank 5, P0) exists to remove, and it is the number
that should move when item 34 ships.

The 63.8-files-per-commit mean is inflated by a handful of sweeping commits and is reported for
completeness, not as a typical value.

---

## M-06 — Escaped defects (upper bound)

| Figure | Value |
|---|---|
| `### Fixed` bullets across all releases | 44 |
| Published releases in `CHANGELOG.md` | 19 |
| Releases containing at least one fix | 17 / 19 (89.5%) |

**Per release:** 0.7.1 → 9 · 0.8.0 → 2 · 0.8.1 → 3 · 0.8.2 → 0 · 0.8.3 → 2 · 0.8.5 → 2 · 0.8.6 → 2 ·
0.8.7 → 1 · 0.8.8 → 0 · 0.9.0 → 3 · 0.9.1 → 2 · 0.10.0 → 3 · 0.10.1 → 2 · 0.10.2 → 2 · 0.11.0 → 1 ·
0.11.1 → 1 · 0.12.0 → 2 · 0.13.0 → 5 · 0.14.0 → 2

**Reading:** 89.5% of releases carried at least one fix. Upper bound — some bullets fix problems
found before release. The trend in the bound carries the information, not the absolute number.

---

## M-07 — False completion claims (caught instances only)

**4 of 20** dated `tasks/lessons.md` entries classify as reported-state-differed-from-real-state:

| Date | Entry |
|---|---|
| 2026-07-10 | "Released" means verified on npm, not merged to main — tag never pushed, npm stayed at the old version |
| 2026-07-10 | npm silently strips `.gitignore` from tarballs — every gate passed against the working tree; the shipped artifact was broken |
| 2026-07-10 | A squashed main→dev sync does not restore ancestry — the sync was reported done but did not achieve its purpose |
| 2026-06-24 | Hooks with unverified assumptions look correct but are no-ops |

**Incident count is higher than the entry count.** The 2026-07-10 release entry itself records
*"this session alone had three (tag unpushed, sync squashed, branch out-of-date) where reported
state differed from real state."* So **≥ 6 incidents across 4 entries**, and the entry count is the
conservative figure.

**Bias, restated:** only caught instances are recorded. Improvement in this number is ambiguous
between fewer incidents and less noticing. Definition is Proposed (Q-04).

---

## M-08 — Surface usage

`npm run token-report`, run at this commit.

| Category | Files | Est tokens | Share | Loaded |
|---|---:|---:|---:|---|
| Always-loaded (`CLAUDE.md`) | 1 | 7,116 | 5% | every session |
| Rules | 24 | 40,432 | 29% | on reference |
| Commands | 35 | 47,509 | 34% | on invoke |
| Agents | 17 | 18,880 | 13% | on invoke (own context) |
| Skills | 17 | 26,594 | 19% | on invoke |
| **Total** | **94** | **140,531** | | |

`/review` fan-out floor: 4,608 est-tokens — 5 reviewer definitions re-loaded per full review.

**Trend vs the 2026-07-13 T0 baseline (~138,000):** **+2,531 est-tokens (+1.8%) in 45 days**, while
T1 (lite review) and T3 (scoped stack overlays) shipped. Surface grew despite active
token-efficiency work. Item 69 / T5 (prune, rank 6) targets this.

Largest files: `ai-coding-rules.md` 6,301 · `design-system/SKILL.md` 5,826 ·
`what-next.md` 4,458 · `bootstrap.md` 3,358 · `ponytail-debt.md` 3,164.

---

## What this snapshot says

Three things are measurable, and each already points at a queued item:

1. **Profile duplication is real and large** — 90.3% of profile-touching commits edit 2+ copies.
   Item 34.
2. **Governance surface is still growing** — +1.8% in 45 days despite two shipped token-efficiency
   items. Item 69 / T5.
3. **Verification-gap failures dominate the recorded lessons** — all 4 false-done entries are
   "a gate passed but the artifact was wrong". The 2026-07-10 rule (*verify the packed artifact, not
   the working tree*) came from this class, and M-01's null status is the same class again.

**No conclusion is drawn about whether governance is working.** That question is not answerable from
this data, by design.

---

## Next snapshot

**Snapshot #2** should be taken after Wave 1 completes, and should add M-04 once item 26 ships its
GitHub query surface. Per `BR-06` it is a new dated file, not an edit of this one. Per `BR-07` any
improvement claim names the metric ID and both snapshot dates.
