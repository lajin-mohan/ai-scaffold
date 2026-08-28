# Scaffold Effectiveness Metrics — Definitions

**Version:** 1.1
**Date:** 2026-08-27 (v1.1 same day — M-04 population corrected to adopting projects)
**Owner:** Lajin M J
**Spec:** `docs/brd/74-scaffold-effectiveness-baseline-brd.md` (Approved v2.0), FR-01 – FR-05, FR-26

> **`BR-01`: a number without a prior published definition is not evidence.** This document is
> committed before any figure derived from it is cited. If you are reading a baseline value, its
> definition is here.

---

## What these metrics can and cannot show

**They can:** detect regression, and show trend across dated snapshots.

**They cannot:** prove that governance reduces rework, defects, bypasses or false-done claims.

Three limits make causation unrecoverable, and they are structural, not temporary:

1. **No control group.** There are no comparable projects running without the scaffold. Any change
   in these numbers is confounded with team skill, project difficulty, and Claude model changes.
2. **N = 2 pilot projects.** Per-project rates are anecdote-shaped. Raw counts are reported with
   their denominators; percentages are not derived where the denominator is under 10 (`FR-14`).
3. **Single reporter.** The maintainer is also the sole implementer, reviewer and approver.
   Artifact-derived metrics are preferred over self-report for exactly this reason (`FR-03`, `R-03`).

Item 74's own definition says these metrics prove whether governance reduces rework. **It cannot,
and this document does not claim it.** The objective is regression detection and trend (`BR-08`).

---

## Reading a metric definition

| Field | Meaning |
|---|---|
| **Counts** | What one unit of this metric is |
| **Source** | The durable artifact the value comes from |
| **Method** | How the value is extracted |
| **Denominator** | What the count is reported against |
| **Kind** | `artifact` (computed from a durable record) or `self-reported` (supplied by a person) |
| **Status** | `measured`, or `null` with a start condition |

`BR-03`: artifact-derived and self-reported values are never summed or averaged together.
`BR-04`: a metric that cannot be measured yet is recorded as null with a start condition. **Never zero** —
a zero asserts an observation that was never made.

---

## M-01 — Install and golden-path success

- **Counts:** a profile whose documented day-one commands actually run to success on a freshly
  generated project.
- **Source:** CI execution of each profile's documented first commands.
- **Method:** none yet — see status.
- **Denominator:** 5 profiles (generic, golang, laravel, node, python).
- **Kind:** artifact.
- **Status:** **null.** Starts when item 65's Wave 1 follow-up ships.

> **Why this is not 113/113.** `scripts/pre-publish-smoke.sh` asserts that the documented commands
> are *present* in the generated README — `grep -q "pytest"`, `grep -q "composer test"`. It does not
> run them. Its pass count measures documentation completeness, not golden-path success. Recording
> 113/113 here would label command presence as success and every later improvement claim would
> inherit the error. Item 65's follow-up (Wave 1, rank 4) exists precisely to replace those
> presence assertions with execution.

## M-02 — Upgrade conflicts

- **Counts:** a file whose update could not be applied cleanly during `ais update`.
- **Source:** `ais update` conflict report.
- **Method:** none yet.
- **Denominator:** managed files per upgraded project.
- **Kind:** artifact.
- **Status:** **null.** Starts on the first released `ais update` (item 25). There is no upgrade path
  to conflict with today.

## M-03 — Maintenance effort

- **Counts:** (a) commits touching `templates/`, and (b) how many of the 5 profile copies each such
  commit edits.
- **Source:** git history.
- **Method:** for each commit touching `templates/`, count distinct profile directories in its
  changed paths. Report the distribution, not a mean.
- **Denominator:** **non-merge commits only.** Git history simplification means a merge commit effectively cannot enter the numerator, so including merges in the denominator understates the ratio. Both the numerator and denominator exclude merges.
- **Kind:** artifact.
- **Status:** measured.

> **Heuristic published before use (`BR-01`):** "cross-profile duplicate edit" means one commit
> changing the same logical file in 2 or more of the 5 profile directories. It is a proxy for the
> duplication tax item 34 exists to remove. It over-counts a commit that legitimately touches
> several profiles for different reasons; no attempt is made to separate those.

## M-04 — Bypass frequency

- **Counts:** a governance gate that applied to a change but was not enforced.
- **Source:** GitHub API — PR, merge and branch-protection records.
- **Method:** count these events only (`FR-25`):
  - merge with a required check missing or failing
  - admin or force merge overriding branch protection
  - self-merge (author approved their own PR)
  - direct push to `dev`/`main`, skipping the PR
  - force-push to a protected branch
- **Population:** **adopting projects only** (pilot projects, item 55). The `ai-scaffold` repository
  is excluded — maintainer directive 2026-08-27: the scaffold repo is the tool, not a governed
  project, and is not subject to the gates it ships. Counting bypasses of gates that were never
  meant to apply here would measure nothing.
- **Denominator:** merged PRs in an adopting project, in the window.
- **Kind:** artifact.
- **Status:** **null**, with a **compound** start condition — both must be true: (a) item 26 has
  shipped its GitHub query surface (`FR-27` — reuse it, do not build a second one), and (b) at least
  one pilot project (item 55) is running and its `doctor` output is available.
- **Known weakness:** with two pilots at most, the denominator will be far below 10, so `FR-14`
  applies — raw counts only, no derived rate.

> **Scope note (2026-08-27).** This metric's population is adopting projects, not this repository.
> The scaffold repo's own merge and protection history is out of scope by directive, not by
> oversight.
>
> **Explicitly not measured, by construction (`FR-26`).** These are real bypasses that leave no
> durable artifact, and they are named here so their absence is not read as zero:
> - `git commit --no-verify` — produces a byte-identical commit; nothing records the skip.
> - A lifecycle stage skipped — visible only as an absent file, which is ambiguous between a fast
>   lane and a skip. Becomes countable after item 73 makes task size machine-readable (`FR-28`).
> - Prompt-level rules the model ignored — no trace at all. Item 66 is the standing record that
>   `CLAUDE.md` is not an enforcement layer.

## M-05 — Rework

- **Counts:** a change to code or docs caused by a defect or a missed requirement in previously
  merged work.
- **Source:** git history for this repo; pilot self-report for pilot projects.
- **Method:** commits whose message or linked ticket identifies prior merged work as the cause.
- **Denominator:** commits in the window.
- **Kind:** mixed — reported separately by kind, never combined (`BR-03`).
- **Status:** **trend only.** No pre-Wave-1 history exists; instrumented from the baseline date.
  Per `BR-08` this is a trend series with a start date, not a baseline.

## M-06 — Escaped defects

- **Counts:** a `### Fixed` bullet in `CHANGELOG.md`.
- **Source:** `CHANGELOG.md`.
- **Method:** count top-level bullets under each release's `### Fixed` heading.
- **Denominator:** published releases in the window.
- **Kind:** artifact.
- **Status:** measured — **as an upper bound.**

> **Known over-count.** Not every `Fixed` bullet is an *escaped* defect; some fix problems found
> before release. Separating them would require per-bullet judgement, which reintroduces the single
> reporter this metric is meant to avoid. The bullet count is therefore an upper bound, and it is
> the *trend* in that upper bound that carries information, not its absolute value.

## M-07 — False completion claims

- **Counts:** a completion claim that later verification contradicted.
- **Source:** `tasks/lessons.md`.
- **Method:** classify each dated entry; count those whose lesson is that reported state differed
  from real state.
- **Denominator:** dated entries in `tasks/lessons.md`.
- **Kind:** artifact, with a classification judgement.
- **Status:** measured — **caught instances only.**

> **Structural bias, stated.** Only false-done claims that were *caught* reach `tasks/lessons.md`.
> An uncaught one leaves no record anywhere. This metric therefore measures the intersection of
> "happened" and "was noticed", and improvement in it is ambiguous between fewer incidents and less
> noticing. **Definition is Proposed (Q-04), not Resolved** — the maintainer may override it without
> reopening BRD approval.

## M-08 — Surface usage

- **Counts:** governance surface — files and estimated tokens by category.
- **Source:** `npm run token-report` (`scripts/token-report.js`, item T0).
- **Method:** run the existing report; record its category table verbatim. **Trend is computed by
  re-running the report against the anchor commit, never by subtracting a rounded figure from prose.**
  The 2026-07-13 anchor is commit `6081ea0` (138,331 est-tokens), not the backlog's "~138K".
- **Denominator:** none — absolute counts, compared across snapshots.
- **Kind:** artifact.
- **Status:** measured.

> **This metric measures bytes, not count.** File, command and agent counts are recorded alongside
> the token total precisely so a byte increase is not misread as surface growth. Item 69 / T5's
> prune argument rests on *count*; do not cite this metric's token delta as evidence for it.
>
> Not one of item 74's seven families. Added because Wave 0's scope line names "surface usage".
> Wave 0 also names "duplication", which has no separate ID and is covered only as a component of
> M-03. If duplication needs to trend independently it wants its own metric.

---

## Snapshot rules

- `BR-06`: snapshots are never edited in place. Each run is a new dated file.
- `BR-07`: an improvement claim names the metric ID and the two snapshot dates being compared.
- `FR-12`: every snapshot cites its commit SHA and the published package version.
- `FR-15`: a metric with no pre-existing history is labeled `instrumented from <date> — trend only`
  and is never presented as a pre-Wave-1 baseline.
