# Effort Estimate — Golden-path execution (backlog item 65 follow-up)

**Date:** 2026-09-01
**Estimated By:** Claude (Cowork session), following `.claude/agents/estimator.md`
**Reviewed By:** _pending — Tech Lead sign-off required before execution_
**Confidence:** **MEDIUM** — the spike has not been run. The dependency cost that looked like the
main risk has been measured and is not one; the unmeasured item is the minimal Laravel file set.
**Status:** **Draft for approval** at 5.6 / **12.0** / 21.2 days.
**Source spec:** `docs/brd/65-golden-path-execution-brd.md` (Draft v1.0, Q-01…Q-04 decided 2026-09-01)

> **Template adaptation.** `.claude/templates/estimation-template.md` assumes a web feature with
> migrations, a repository layer and deploys. This is CI/test infrastructure plus one profile's
> application skeleton. Those rows are replaced with the real work items; Deployment becomes
> release inclusion. Three-point method and section order unchanged. Totals are computed, not
> hand-summed — item 26's estimate needed an arithmetic correction at review.

---

## Scope Summary

**Included:** the command contract (real command or `none`, no-op is a failure), the Laravel
skeleton required to make its documented path runnable, the execution harness that runs every
profile's documented commands against a project generated **from the packed tarball**, both CI
call sites, retention of the existing static gates, and the tests proving the harness fails
correctly.

**Excluded:**
- Any profile beyond the five that exist today
- A rename of `laravel` to `php` — FR-14 makes that a separately approved decision, not this item
- Design-system or component validation — unrelated backlog item
- Metric reporting built on the new signal — item 74 consumes it, this item only produces it

---

## Assumptions

1. **The Laravel skeleton is additive to the existing profile.** `composer.json`, `phpunit.xml`
   and `tests/` stay; `artisan`, bootstrap, config and a migration are added. A wholesale
   replacement with `laravel/laravel` would change the estimate materially.
2. **Dependency cost is not a risk — measured, not assumed.** `composer install` on the generated
   laravel profile completes in **14s**, producing **84 MB** across **38 packages**. The Stage 1
   concern about ~100 MB in CI does not survive measurement. No budget is carried for trimming
   `laravel/framework`.
3. **`node --test` stays** as node's real test command. Only `dev`, `build`, `lint` and
   `typecheck` are in question.
4. **Readiness is undefined and must be settled in the architecture pass, not here.** FR-22 and
   AC-02 require a bounded start/health check but neither states what "ready" means — an HTTP
   status, an open port, or a log line. This is the largest flakiness risk in the item and is
   priced as a range, not resolved.
5. Single maintainer, working serially.
6. **The harness is test infrastructure and is itself tested.** A gate that cannot be shown to
   fail is indistinguishable from one that checks nothing — the defect class this whole item
   exists to remove.

---

## Task Breakdown

Business days, 1 day = 7.5 productive hours.

| Task | Optimistic | Realistic | Pessimistic | Risk notes |
|---|---|---|---|---|
| **Spike (gates the laravel work)** | | | | |
| Determine the minimal file set for `artisan migrate` + a bounded serve to work — empirically, by deleting from a real skeleton until it breaks | 0.25 | 0.5 | 1.0 | The single largest unknown. `composer install` already measured at 14s / 84MB / 38 packages, so dependency cost is **not** the risk — the required file set is |
| **Implementation — profile content** | | | | |
| Laravel skeleton: `artisan`, bootstrap/config, PSR-4 roots that exist, SQLite migration path | 1.0 | 2.0 | 4.0 | Real application files. Risk is coupling to `laravel/framework ^12` internals that move between minors |
| One meaningful PHPUnit test (FR-12) — exercises the app, not `assertTrue(true)` | 0.25 | 0.5 | 1.0 | Needs the skeleton first |
| Node: replace 4 `echo` stubs — real command or `none` (FR-05) | 0.25 | 0.5 | 1.0 | Decision-led. `test` is already real (`node --test`); `dev`/`build`/`lint`/`typecheck` are stubs |
| **Implementation — contract and rendering** | | | | |
| `none` semantics + `commandOrNA` change so N/A renders as prose, never in a fenced block (FR-04) | 0.5 | 1.0 | 2.0 | `content-templates.js` plus README templates in all 5 profiles |
| Contract validator: `echo`/`true`/no-op is a failure, not a skip (FR-02) | 0.5 | 1.0 | 1.5 | Detecting 'no-op' is heuristic — needs a defined rule, not a vibe |
| **Implementation — harness** | | | | |
| Execution harness: install CLI from packed tarball, generate, run each documented command (FR-20/21) | 1.0 | 2.0 | 3.5 | Must report profile, capability, command, exit status and output tail (AC-08) |
| Bounded start → readiness → terminate for `dev`/`serve` (FR-22) | 0.5 | 1.0 | 2.0 | **Readiness is undefined in the BRD** — see Assumption 4. Flaky-test risk concentrates here |
| CI wiring: normal CI on profile/package changes + pre-publish packed gate (FR-30/31) | 0.25 | 0.5 | 1.0 | Two call sites; pre-publish is authoritative |
| Keep the static layer reporting separately (FR-40) | 0.1 | 0.25 | 0.5 | Mostly 'do not delete'; needs separate reporting so the layers are distinguishable |
| **Testing** | | | | |
| Unit tests for the contract validator and `none` rendering | 0.5 | 1.0 | 2.0 |  |
| Prove the harness fails correctly — deliberately break a profile command (AC-08) | 0.25 | 0.5 | 1.0 | Testing the tester. Skipping this is how a green gate that checks nothing ships |
| **Documentation** | | | | |
| README templates ×5, backlog 65a/65b disambiguation, CHANGELOG | 0.25 | 0.5 | 0.75 | Backlog currently shows item 65 as DONE, which hides that Wave 1 is blocked on its follow-up |
| **Total** | **5.60** | **11.25** | **21.25** | |

**Three-point (PERT), (O + 4R + P) / 6: 11.97 days.**

At 70% capacity (`definition-of-ready` sprint rule), 11.97 ÷ 0.7 ≈ **17.1 calendar days**.

---

## Confidence and what would raise it

**MEDIUM.** It is not HIGH because the spike has not been run: the minimal Laravel file set is
unmeasured, and it drives the single largest line (1.0 / 2.0 / 4.0). It is not LOW because the
BRD's decisions are settled, the failing commands are reproduced with evidence, and the
dependency cost — the risk Stage 1 flagged loudest — has been measured away.

Running the spike first would likely move this to HIGH and narrow the pessimistic case, since
most of the spread sits in that one row.

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Laravel skeleton couples to framework internals that shift between minor versions | Skeleton breaks on a dependency bump, in a gate meant to prove correctness | Pin `laravel/framework` in the template; treat a bump as its own change with the gate re-run |
| "Ready" stays undefined until implementation | Flaky CI, which erodes trust in the gate faster than having no gate | Settle it in the architecture pass (Assumption 4). Prefer an explicit HTTP check over a sleep |
| No-op detection is heuristic | Either false failures on legitimate one-line commands, or stubs slipping through | Define the rule in the architecture pass and test both directions |
| Gate adds meaningful CI time | Pressure to skip or weaken it later | 14s measured for the heaviest install; run on profile/package changes rather than every commit |
| The harness passes because it never really ran | The exact failure this item exists to fix, reproduced one level up | AC-08's deliberate-break test is not optional; it is the item's own acceptance evidence |

---

## Dependencies

| Dependency | Status |
|---|---|
| BRD v1.0 with Q-01…Q-04 decided | Complete, 2026-09-01 |
| Architecture pass — readiness definition, no-op rule, harness placement | **Not started; required before execution at size M** |
| Item 26 (`doctor` enforcement slice) | Complete on `dev`; no coupling |
| Item 74 (effectiveness metrics) | Consumes this item's signal; does not block it |

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-09-01 | Claude (Cowork) | Initial estimate. Totals computed programmatically. Dependency cost measured (14s / 84 MB / 38 packages) and removed as a risk; readiness definition surfaced as the largest remaining unknown |
