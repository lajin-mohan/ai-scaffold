# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Drift-aware `doctor` — enforcement verification slice (backlog item 26)
**Version:** 1.0
**Date:** 2026-08-27
**Status:** Draft — approval blocked on Q-01, Q-02, Q-03
**Size:** escalated **S → M**. The backlog sizes item 26 `S` ("small enforcement slice"); the estimate is 12.25 realistic days. `task-size-policy.md` permits escalation ("Escalation is not failure"). **The backlog rank table has not been updated — flagged to the Tech Lead**
**Author:** Claude (Cowork session), executing `/create-brd` and `solution-analyst` manually
**Approved By:** TBD

> Companion analysis: `docs/brd/26-drift-aware-doctor-analysis.md`.
> Backlog: `docs/process/pre-npm-publish-todo.md` → Phase 1 → item 26. Wave 1, rank 3, P0.
> **Scope is the P0 enforcement slice only.** Managed-file drift and the `update` boundary are the
> medium lifecycle slice, paired with item 25 in Wave 2.

---

## 1. Executive Summary

`ais doctor` reports installation health from local files and cannot tell you whether a single
governance gate is actually enforced — its own hook check passes on a settings file while the real
`.git/hooks/pre-commit` may be absent. This feature adds checks that query effective enforcement:
branch and ruleset coverage, required checks that actually report, administrator bypass, and real
hook installation. Configured intent stops counting as a pass.

---

## 2. Objectives

| ID | Objective | Success Metric |
|---|---|---|
| OBJ-01 | Detect configured-but-inert governance | Each of C-01…C-04 reports a verified state, never a state inferred from a config file |
| OBJ-02 | Degrade honestly rather than silently | With no `gh`, no auth or no remote, every affected check reports `unavailable` with the reason; none renders as a pass |
| OBJ-03 | Close `doctor`'s own configured-intent gap | `checkHooksWired` no longer passes when `.git/hooks/pre-commit` is missing or non-executable |
| OBJ-04 | Supply item 74's M-04 extraction contract | The documented query list is reused by M-04 rather than reimplemented (`FR-27` of the item 74 BRD) |
| OBJ-05 | Change nothing about how `doctor` is consumed | Existing `--json` consumers and the smoke gates that assert CRIT/HIGH-clean keep working unchanged |

---

## 3. Checks (ID class `C-xx`)

| ID | Check | Verifies | Source |
|---|---|---|---|
| C-01 | Branch / ruleset coverage | `main` and `dev` are actually protected, by legacy branch protection **or** a ruleset, or both | GitHub API — both surfaces, merged |
| C-02 | Required checks | Required checks are configured **and** have reported on recent PRs. A required check that never runs blocks every PR; a configured-but-absent one blocks nothing | GitHub API |
| C-03 | Administrator bypass | Whether administrators can override protection (`enforce_admins` and ruleset bypass actors) | GitHub API |
| C-04 | Repository hook installation | `.git/hooks/pre-commit` exists and is executable — the real state, not `.claude/settings.json` | Local filesystem |

---

## 4. User Roles & Permissions

| Role | Description | Permissions in this Feature |
|---|---|---|
| Developer | Runs `ais doctor` in a generated project | Read-only diagnosis. No setting is changed by this command |
| Maintainer | Runs it on the scaffold repo and in CI | Same; consumes `--json` for gates |
| CI | Runs `doctor` as a gate | Consumes exit code and `--json` |

> `doctor` is **read-only by contract** (`BR-02`). Writing repository settings stays in
> `scripts/setup-branch-protection.sh`.

---

## 5. Functional Requirements

> Requirement language: **SHALL** = mandatory · **SHOULD** = recommended · **MAY** = optional

### 5.1 Enforcement checks

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | C-01 SHALL query **both** legacy branch protection and repository rulesets and report the merged effective state. Querying only one surface is prohibited | Must Have |
| FR-02 | C-02 SHALL report a required check as satisfied only when it is both configured and observed reporting on recent pull requests | Must Have |
| FR-03 | C-03 SHALL report administrator bypass from `enforce_admins` **and** ruleset bypass actors | Must Have |
| FR-04 | C-04 SHALL verify `.git/hooks/pre-commit` exists and is executable, and SHALL NOT infer hook state from `.claude/settings.json` alone | Must Have |
| FR-05 | The existing `checkHooksWired` check SHALL be retained as a separate signal — settings-wired and hook-installed are two different facts and are reported separately | Must Have |

### 5.2 Honest degradation

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | When `gh` is absent, unauthenticated, the remote is not GitHub, or there is no remote, every affected check SHALL report state `unavailable` with the specific reason | Must Have |
| FR-11 | `unavailable` SHALL NOT render as a pass in any output mode, and SHALL be visually distinct from both pass and fail | Must Have |
| FR-12 | The command SHALL remain fully functional offline for all local checks | Must Have |
| FR-13 | When a remote check is `unavailable`, the output SHALL name the one action that would make it available (install `gh`, authenticate, add a remote) | Should Have |

### 5.3 Output and integration

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | The existing `--json` shape SHALL be extended additively. No existing field is renamed, removed or repurposed | Must Have |
| FR-21 | Each check's JSON entry SHALL carry `state` (`pass`/`fail`/`unavailable`), `verifiedBy` (`api`/`filesystem`), and on `unavailable` a `reason` | Must Have |
| FR-22 | The severity model (`critical`/`high`/`medium`/`low`) and the exit-code rule SHALL be extended, not replaced | Must Have |
| FR-23 | The query list SHALL be documented as a stable contract so item 74's M-04 consumes it rather than reimplementing it | Must Have |

### 5.4 Transport

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | Remote queries SHALL use the `gh` CLI, invoked via `spawnSync` in array form, following `scripts/setup-branch-protection.sh` | Must Have |
| FR-31 | The CLI SHALL NOT accept, store, read from disk, or log a GitHub token. Authentication is `gh`'s responsibility | Must Have |
| FR-32 | No new runtime dependency SHALL be added | Must Have |
| FR-33 | The security-posture bullet in `docs/process/pre-npm-publish-todo.md` stating the only shell-out is `spawnSync('git', …)` SHALL be updated **in the same change** as the code that falsifies it. `SECURITY.md` contains no such claim and is **not** in scope for this edit | Must Have |

---

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Configured intent is not a pass. A check reports what it verified, never what a config file declares |
| BR-02 | `doctor` is read-only. It never mutates repository or local settings |
| BR-03 | `unavailable` is a distinct third state. It is never collapsed into pass or fail |
| BR-04 | A false "unprotected" is worse than no check. Where the API can be read two ways, both are queried before a negative is reported |
| BR-05 | A documented security claim and the code it describes change in the same commit. Before relying on this rule, locate where the claim actually lives — for this item it is the backlog, not `SECURITY.md` |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Runtime | Remote checks complete within 10s on a typical repo, or report `unavailable` with a timeout reason |
| NFR-02 | Security | No token is handled by this CLI (FR-31). Shell-out is array-form only — no shell interpolation |
| NFR-03 | Offline | All local checks run with no network. No check hangs waiting on one |
| NFR-04 | Compatibility | Existing `--json` consumers and the pre-publish smoke gates keep working unchanged |
| NFR-05 | Maintainability | Query logic lives in `src/cli/core/`, unit-tested, matching the existing core-module pattern |
| NFR-06 | Portability | Behaves identically where `gh` is present on the platforms CI covers; absence is a reported state, not an error |

> Feature-flag sections (GDPR, ISO 27001, accessibility, audit log, async jobs) are **off — not
> configured**: `.claude/settings-overrides.json` does not exist in this repository.

---

## 8. Acceptance Criteria

| ID | Criterion | Test Scenario |
|---|---|---|
| AC-01 | Given a repo protected by a ruleset only, when C-01 runs, then it reports protected | Fixture/mocked API response; asserts FR-01 |
| AC-02 | Given a repo with a required check that has never reported, when C-02 runs, then it does not report satisfied | Mocked API; asserts FR-02 |
| AC-03 | Given `enforce_admins` false, when C-03 runs, then administrator bypass is reported | Mocked API |
| AC-04 | Given `.git/hooks/pre-commit` deleted, when C-04 runs, then it fails, while `checkHooksWired` still passes | Both signals present and independent — asserts FR-04 and FR-05 |
| AC-05 | Given `gh` is not on `PATH`, when `doctor` runs, then all remote checks report `unavailable` with a reason, exit code is unchanged from the local-only result, and no check renders as a pass | Asserts FR-10, FR-11, BR-03 |
| AC-06 | Given no network, when `doctor` runs, then it completes and no check hangs | Asserts FR-12, NFR-03 |
| AC-07 | Given the previous release's `--json` output, when compared to this release's, then every pre-existing field is present with the same name and meaning | Schema diff — asserts FR-20, NFR-04 |
| AC-08 | Given the packed tarball, when the smoke suite runs, then all existing gates still pass and no dependency was added | `npm pack` + dependency diff + smoke — asserts FR-32, per the 2026-07-10 lesson |
| AC-09 | Given the commit that adds the `gh` shell-out, when its diff is inspected, then it also edits the security-posture bullet in `docs/process/pre-npm-publish-todo.md`, and no stale `spawnSync('git', …)`-only claim remains anywhere in the repo | `grep` the repo for the claim after the change — asserts FR-33, BR-05 |

---

## 9. Open Questions

**Q-01, Q-02 and Q-03 are blockers. This BRD cannot move to Approved, and Stage 2 estimation must not be committed to, until they are resolved.**

| ID | Question | Owner | Due | Resolution |
|---|---|---|---|---|
| Q-01 | Offline / no-`gh` behaviour: `unavailable` without affecting exit code, or failure? | Maintainer | Before Stage 2 | |
| Q-02 | A detected gap (admin bypass on, required check missing): `critical`/`high` and exit 1, or `medium` and exit 0? Gate or dashboard? | Maintainer | Before Stage 2 | |
| Q-03 | Which repository is checked, and how is it resolved — the project's own remote, and what happens in a fork or monorepo? | Maintainer | Before Stage 2 | |
| Q-04 | Ships to generated projects, or maintainer-only? | Maintainer | Before FR-20 | |
| Q-05 | C-04: content hash, or presence plus executable bit? Content checking overlaps the Wave 2 drift slice | Maintainer | Before FR-04 | |
| Q-06 | Caching or rate-limit handling for repeated runs? | Maintainer | Before FR-30 | |

---

## 10. Dependencies

| Dependency | Type | Status | Notes |
|---|---|---|---|
| `gh` CLI on the user's machine | External | Not controllable | The precedent (`setup-branch-protection.sh`) already requires it and checks for it explicitly |
| GitHub API — branch protection + rulesets | External | Shape unverified | Spike, first task |
| `scripts/setup-branch-protection.sh` | Internal | Exists | Transport precedent and the write-side counterpart |
| `src/cli/commands/doctor.js` | Internal | Exists, 346 lines | Extended, not rewritten |
| Item 74 M-04 | Internal | Blocked on this | Consumes this item's query contract (`FR-23`). **Cross-branch:** the item 74 BRD is on `feature/74-…`, unmerged to `dev` |
| Item 25 (`ais update`) | Internal | Open, P0 | The Wave 2 drift slice pairs with it; explicitly out of scope here |

---

## 11. Risks

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-01 | Rulesets vs legacy branch protection are separate APIs; querying one reports a false "unprotected" | H | H | FR-01 + BR-04: query both, merge, never report a negative from one surface |
| R-02 | `gh` absent on most user machines, so the highest-value checks are usually `unavailable` | H | M | FR-10–FR-13 make `unavailable` first-class and actionable |
| R-03 | Adding a `gh` shell-out falsifies the documented security claim | M | M | FR-33 + BR-05: docs change in the same commit — the 2026-08-12 doc-drift class |
| R-04 | A passing `doctor` gets cited as proof governance is enforced | M | H | FR-11: `unavailable` never renders as a tick; each check states what it verified |
| R-05 | Read operations may require `admin:repo`, which users will not grant for a diagnostic | M | M | Spike question 1; if true, report it prominently rather than degrading quietly |
| R-06 | Item 74's M-04 slips with this item | M | L | Accepted; M-04 is already null with a start condition |

---

## 12. Glossary

| Term | Definition |
|---|---|
| Effective enforcement | What the platform will actually block, as opposed to what a settings file declares |
| Ruleset | GitHub's newer protection mechanism, queried separately from legacy branch protection |
| `unavailable` | A check that could not be performed. Distinct from pass and fail (`BR-03`) |
| Configured intent | A declaration in a config file, with no evidence it takes effect |

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-08-27 | Claude (Cowork) | Initial draft from backlog item 26 and the companion analysis |
