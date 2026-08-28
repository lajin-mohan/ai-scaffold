# Scaffold Effectiveness Baseline — Snapshot 2026-08-27

**Snapshot:** #1 (Wave 0 baseline)
**Date:** 2026-08-27
**Commit:** `a4a2eb2`
**Package version:** `0.14.0`
**Definitions:** `docs/process/effectiveness-metrics.md` v1.0 — committed before this file
**Measurement commit:** `a4a2eb2` — every git-derived figure below is computed at that commit
**Window:** the repository's full history (first commit 2026-05-07). A `--since=2026-05-01` filter is
a no-op here; "window" and "all history" are the same thing today, and are stated as such rather
than implying a selected period
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
| M-08 | Surface usage | 140,531 est-tokens / 94 files (+1.59% tokens, file count unchanged) | artifact | measured |

Four of eight are null or trend-only. That is the honest state of measurability today, not a gap in
the capture. Per `BR-04` none of them is recorded as zero.

---

## M-03 — Maintenance effort

Window 2026-05-01 → 2026-08-27.

| Figure | Value |
|---|---|
| Commits at `a4a2eb2` | 229 (183 non-merge, 46 merges) |
| Non-merge commits touching `templates/` | 31 |
| Share of non-merge commits | 31 / 183 = **16.9%** |
| Mean files changed per `templates/` commit | 63.8 (median 19) |

> **Denominator rule, pinned (`BR-01`).** The denominator is **non-merge commits only**. Git history
> simplification means a merge commit effectively cannot enter the numerator, so including merges in
> the denominator understates the ratio — 31/229 = 13.5% vs the correct 31/183 = 16.9%. Snapshot #2
> must use the same rule or the metric moves for parsing reasons rather than real ones.

**Profile copies edited per `templates/` commit:**

| Profiles touched | Commits | Share |
|---|---:|---:|
| 5 (all) | 16 | 51.6% |
| 4 | 0 | 0% |
| 3 | 10 | 32.3% |
| 2 | 2 | 6.5% |
| 1 | 3 | 9.7% |

> **No commit in this repository's history touches exactly 4 profile directories.** The zero row is
> kept rather than dropped, so snapshot #2 can tell "still none" from "not measured".
>
> One commit needs a stated reading: `eb2868b` (2026-07-03) touches `templates/generic` and
> `templates/laravel` as **submodule gitlinks** — they were submodules until `37be55d`. Counted as
> 2 profiles, per the definitions doc's "distinct profile directories in its changed paths".

**Reading:** **90.3% (28/31) of profile-touching commits edited 2 or more copies, and 51.6% (16/31)
edited all five.** A change to shared scaffold content costs roughly 5× its logical size. This is the
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

**The 4 is a floor, not a considered count.** At least four further entries plausibly fit the same
definition — 2026-07-10 *release readiness requires mergeability checks* (this is the "branch
out-of-date" incident quoted just above), 2026-06-25 *basename substring matching is a bypass*,
2026-06-24 *audit-then-fix caught defects code review missed*, and 2026-07-16 *smoke gate
over-asserted*. They are excluded because Q-04's definition is not yet settled enough to include
them consistently. A stricter or looser Q-04 moves this number, which is why comparing snapshot #2
against it requires the definition to be frozen first.

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

**Trend vs the 2026-07-13 T0 baseline.** The backlog records "~138K". That rounded string is not a
measurement — the exact value was recomputed by running `token-report.js` against commit `6081ea0`,
the commit that introduced it:

| | 2026-07-13 (`6081ea0`) | 2026-08-27 (`a4a2eb2`) | Δ |
|---|---:|---:|---:|
| Est tokens | 138,331 | 140,531 | **+2,200 (+1.59%)** |
| Files | 94 | 94 | **0** |
| Commands | 35 | 35 | **0** |
| Agents | 17 | 17 | **0** |

**What this does and does not say.** Over 45 days, while T1 (lite review) and T3 (scoped stack
overlays) shipped, the corpus grew **1.59% in bytes with no change in file, command or agent count**.
All growth is inside existing files. Item 69 / T5's concern is command and agent *count*, which this
metric shows as flat — so this number is **not** evidence for the prune argument. It is evidence
that existing definitions accrete.

> **Method note.** Do not subtract a rounded figure and report the result to four significant
> digits. An earlier draft of this snapshot did exactly that — "~138K" minus nothing gave +2,531
> (+1.8%), overstating real growth by 15%. The anchor value is recoverable exactly from git and must
> be recomputed, not read off prose.

Largest files: `ai-coding-rules.md` 6,301 · `design-system/SKILL.md` 5,826 ·
`what-next.md` 4,458 · `bootstrap.md` 3,358 · `ponytail-debt.md` 3,164.

---

## What this snapshot says

Three things are measurable, and each already points at a queued item:

1. **Profile duplication is real and large** — 90.3% of profile-touching commits edit 2+ copies.
   Item 34.
2. **Governance surface accretes inside existing files** — +1.59% tokens in 45 days with file,
   command and agent counts all flat. This is an argument for editing what exists, not for item
   69 / T5's prune, which targets count.
3. **Recorded false-done claims are all "reported state differed from real state"** — but the
   mechanism varies, and lumping them misreads the data. Two are a gate passing on the wrong object
   (npm stripped `.gitignore` from the tarball while every gate checked the working tree; hooks that
   looked correct and were no-ops). One is a gate correctly failing and the failure being worked
   around (the squashed sync). One had **no gate at all** — a human "merged" was accepted as
   "released". Only the first pair is a verification-gap failure. M-01's null status belongs to that
   same first class.

**No conclusion is drawn about whether governance is working.** That question is not answerable from
this data, by design.

---

## Next snapshot

**Snapshot #2** should be taken after Wave 1 completes, and should add M-04 once item 26 ships its
GitHub query surface. Per `BR-06` it is a new dated file, not an edit of this one. Per `BR-07` any
improvement claim names the metric ID and both snapshot dates.

---

## Amendment — 2026-08-27 (same day, after capture)

**Recorded values above are unchanged.** `BR-06` forbids editing a snapshot in place; a scope
correction is not a re-run, so it is appended here rather than rewritten above.

**What changed:** the maintainer scoped the scaffold's governance to **generated projects**. The
`ai-scaffold` repository is the tool, not a governed project — it keeps its build, test and release
workflows and is not subject to the branch, commit or CI gates it ships.

**Effect on this snapshot: one metric.**

- **M-04 (bypass frequency)** — the start condition recorded above ("when item 26 ships its GitHub
  query surface") is **incomplete as written**. M-04's population is now adopting projects, not this
  repository, so the condition is compound: item 26 shipped **and** at least one pilot (item 55)
  running with `doctor` output available. Snapshot #2 must use the corrected condition. The recorded
  value — null — was and remains correct.
- **M-01, M-02, M-03, M-05, M-06, M-07, M-08 — unaffected.** They measure the product and how it is
  developed (profile golden paths, upgrade conflicts, maintenance cost, rework, escaped defects,
  recorded false-done claims, governance surface), none of which depends on the scaffold repo being
  a governed project.

**Not a defect in the capture.** The scope was clarified after the snapshot was taken. It is recorded
here because a start condition that is wrong by the time snapshot #2 runs would silently produce a
metric nobody can interpret.
