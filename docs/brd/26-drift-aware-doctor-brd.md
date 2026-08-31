# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Drift-aware `doctor` — enforcement verification slice (backlog item 26)
**Version:** 2.2
**Date:** 2026-08-27
**Status:** **Approved** — 2026-08-27. Q-01 = D, Q-02 = B, Q-03 = C; see §9
**Size:** escalated **S → M**. The backlog rank table and item definition now say `M`; the estimate is 14.0 realistic days. `task-size-policy.md` permits escalation ("Escalation is not failure").
**Author:** Claude (Cowork session), executing `/create-brd` and `solution-analyst` manually
**Approved By:** Lajin M J (maintainer/owner), 2026-08-27

> **Scope note — where these rules apply (maintainer directive, 2026-08-27).** The governance this
> item builds applies to **generated projects**, not to the `ai-scaffold` repository. The scaffold
> repo is the tool; it keeps its build, test and release workflows, and it is not itself subject to
> the gates it ships. Nothing in this BRD asserts a requirement against the scaffold repo's own
> branch protection, commit rules or CI gates.
>
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
| Maintainer | Runs it on the scaffold repo ad hoc | Same; consumes `--json` for inspection. The scaffold's CI gates are its existing smoke gates, not these checks |
| CI | Runs `doctor` as a gate | Consumes exit code and `--json` |

> `doctor` is **read-only by contract** (`BR-02`). Writing repository settings stays in
> `scripts/setup-branch-protection.sh`.

---

## 5. Functional Requirements

> Requirement language: **SHALL** = mandatory · **SHOULD** = recommended · **MAY** = optional

### 5.1 Enforcement checks

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | C-01 SHALL query **both protection surfaces** — the branch `protected` state (`GET /branches/{b}`) and the effective ruleset rules (`GET /rules/branches/{b}`), both coarse-tier — and report the merged result. The legacy *detail* endpoint belongs to C-03, not C-01. Querying only one surface is prohibited. Query list: `docs/architecture/spike-26-github-api-shape.md` | Must Have |
| FR-02 | C-02 SHALL report a required check as satisfied only when it is both configured and observed reporting on recent pull requests | Must Have |
| FR-03 | C-03 SHALL report administrator bypass from `enforce_admins` **and** ruleset bypass actors | Must Have |
| FR-04 | C-04 SHALL verify `.git/hooks/pre-commit` exists and is executable, and SHALL NOT infer hook state from `.claude/settings.json` alone | Must Have |
| FR-05 | The existing `checkHooksWired` check SHALL be retained as a separate signal — settings-wired and hook-installed are two different facts and are reported separately | Must Have |
| FR-06 | A ruleset SHALL contribute to "protected" only when its `enforcement` is `active`. `evaluate` and `disabled` rulesets are non-protecting and SHALL be reported as such rather than silently ignored — an evaluate-mode ruleset appears in `/rules/branches/{b}` and blocks nothing, which is precisely `BR-01`'s "configured intent is not a pass" | Must Have |

### 5.2 Honest degradation

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | When `gh` is absent, unauthenticated, the remote is not GitHub, or there is no remote, every affected check SHALL report state `unavailable` with the specific reason | Must Have |
| FR-11 | `unavailable` SHALL NOT render as a pass in any output mode, and SHALL be visually distinct from both pass and fail. In human output it SHALL use neither the `✗` glyph nor a `[CRIT]`/`[HIGH]` label — `scripts/pre-publish-smoke.sh:442,463` greps `✗ [CRIT|HIGH]` and requires zero, and generated projects have no remote, so every remote check is `unavailable` there | Must Have |
| FR-12 | The command SHALL remain fully functional offline for all local checks | Must Have |
| FR-13 | When a remote check is `unavailable`, the output SHALL name the one action that would make it available (install `gh`, authenticate, add a remote) | Should Have |
| FR-14 | `unavailable` SHALL NOT affect the exit code by default (Q-01 = D) | Must Have |
| FR-15 | A `--require-remote` flag SHALL make any `unavailable` remote check fail the exit code, for use in environments where `gh` is guaranteed | Must Have |
| FR-16 | Generated projects SHOULD be documented as able to run `doctor --require-remote` in their own CI. **The scaffold repository itself is out of scope** — it is the tool, not a governed project, and does not run its own governance gates | Should Have |

### 5.3 Output and integration

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | The `--json` shape SHALL be extended additively **except** for one documented narrowing: `criticalFailed`, `highFailed`, `mediumFailed`, `lowFailed` and `allPassed` are redefined to count `state === 'fail'` only, so `unavailable` checks do not inflate them. No field is renamed or removed. A deliberate contract change, recorded rather than asserted away | Must Have |
| FR-17 | The invariant `passed === (state === 'pass')` SHALL hold for every check. `unavailable` checks are excluded from the severity aggregates and the exit-code rule by default, and included only under `--require-remote`. A sibling `unavailableCount` SHALL be emitted | Must Have |
| FR-21 | Each check's JSON entry SHALL carry `state` (`pass`/`fail`/`unavailable`), `verifiedBy` (`api`/`filesystem`), and on `unavailable` a `reason` | Must Have |
| FR-22 | The severity model (`critical`/`high`/`medium`/`low`) and the exit-code rule SHALL be extended, not replaced | Must Have |
| FR-24 | A **detected** enforcement gap SHALL be severity `high`, which fails the exit code under `doctor`'s existing rule (Q-02 = B). `critical` is reserved for a broken installation and SHALL NOT be used for a governance gap | Must Have |
| FR-23 | The query list SHALL be documented as a stable contract so item 74's M-04 consumes it rather than reimplementing it | Must Have |

### 5.4 Transport

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | Remote queries SHALL use the `gh` CLI, invoked via `spawnSync` in array form, following `scripts/setup-branch-protection.sh` | Must Have |
| FR-34 | The target repository SHALL be resolved with `gh repo view --json nameWithOwner`, with a `--repo owner/name` override (Q-03 = C). **Resolution and every `gh` call SHALL run with `cwd` set to the resolved `[target-dir]`**, never the process cwd — `doctor` takes a target directory, and resolving from cwd would report the ambient repository's protection for a different project. Precedent: `create.js:266-272` threads cwd explicitly | Must Have |
| FR-35 | The output SHALL name the repository it checked, so a fork is never mistaken for upstream | Must Have |
| FR-31 | The CLI SHALL NOT accept, store, read from disk, or log a GitHub token. Authentication is `gh`'s responsibility | Must Have |
| FR-32 | No new runtime dependency SHALL be added | Must Have |
| FR-33 | Documentation falsified by this change SHALL be updated **in the same commit** as the code: the security-posture bullet in `docs/process/pre-npm-publish-todo.md`, and `docs/cli-reference.md`'s doctor options and exit-code sections, which this change extends with `--require-remote` / `--repo` and narrows via FR-20. `SECURITY.md` carries no shell-out claim and is **not** in scope | Must Have |
| FR-36 | Where the target has no GitHub remote, remote checks SHALL report `unavailable`. They SHALL NOT fall through to an ambient repository | Must Have |

---

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Configured intent is not a pass. A check reports what it verified, never what a config file declares |
| BR-02 | `doctor` is read-only. It never mutates repository or local settings |
| BR-03 | `unavailable` is a distinct third state. It is never collapsed into pass or fail |
| BR-04 | A false "unprotected" is worse than no check. Where the API can be read two ways, both are queried before a negative is reported |
| BR-06 | Inability to check and a detected gap are different failures and never share an exit code. Not being able to verify is an environment problem the user may not control; finding a gap is a problem they can fix |
| BR-07 | The read side and the write side resolve the target repository by the same mechanism. `doctor` and `setup-branch-protection.sh` disagreeing on "which repo" is a defect, not a configuration option |
| BR-05 | A documented security claim and the code it describes change in the same commit. Before relying on this rule, locate where the claim actually lives — for this item it is the backlog, not `SECURITY.md` |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Runtime | Remote checks complete within a **single 10s wall-clock deadline for the whole run**, with the remaining budget passed down — not 10s per call. The query list is ~7 serial `spawnSync` calls across two branches; a per-call timeout would total ~70s. On expiry, report `unavailable` with a timeout reason |
| NFR-02 | Security | No token is handled by this CLI (FR-31). Shell-out is array-form only — **and** `owner/repo` and branch values are validated (`^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`; branch non-empty, no whitespace) and rejected on `..` before interpolation into any API path. Array form prevents shell injection; it does not sanitise the request path |
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
| AC-03 | Given `enforce_admins` false **and** a ruleset carrying `bypass_actors`, when C-03 runs, then both bypass sources are reported | Fixtures for both surfaces — asserts FR-03 |
| AC-04 | Given `.git/hooks/pre-commit` deleted, when C-04 runs, then it fails, while `checkHooksWired` still passes | Both signals present and independent — asserts FR-04 and FR-05 |
| AC-05 | Given `gh` is not on `PATH`, when `doctor` runs, then all remote checks report `unavailable` with a reason, exit code is unchanged from the local-only result, and no check renders as a pass | Asserts FR-10, FR-11, BR-03 |
| AC-06 | Given the network disabled, when `doctor` runs, then it completes within the 10s wall-clock deadline and no check hangs | Asserts FR-12, NFR-01, NFR-03 |
| AC-07 | Given an identical fixture project, when the previous release's `--json` is compared to this release's, then every pre-existing field is present with the same name, type and value, except the five aggregates FR-20 narrows | Schema + value diff — asserts FR-20, NFR-04 |
| AC-08 | Given the packed tarball, when the smoke suite runs, then all existing gates still pass and no dependency was added | `npm pack` + dependency diff + smoke — asserts FR-32, per the 2026-07-10 lesson |
| AC-10 | Given `gh` absent and `--require-remote` passed, when `doctor` runs, then the exit code is non-zero and the reason names the missing prerequisite | Asserts FR-15 |
| AC-11 | Given a repo with `enforce_admins` disabled, when `doctor` runs without `--require-remote`, then C-03 fails at `high` and the exit code is 1 | Asserts FR-24, Q-02 = B |
| AC-12 | Given a fork, when `doctor` runs, then the output names the fork as the repository checked | Asserts FR-35 |
| AC-09 | **Review gate, not a test.** The commit adding the `gh` shell-out also edits `docs/process/pre-npm-publish-todo.md` and `docs/cli-reference.md`, and `grep -rn "only shell-out is" docs/` returns no stale claim | Manual gate — asserts FR-33, BR-05 |
| AC-13 | Given any check's `--json` entry, when parsed, then `state` ∈ {pass, fail, unavailable}, `verifiedBy` ∈ {api, filesystem}, `reason` is non-empty whenever `state` is `unavailable`, and `passed === (state === 'pass')` | Automatable — asserts FR-17, FR-21 |
| AC-14 | Given the query-contract document, when item 74's M-04 extraction is written, then it cites that document and adds no second implementation of the same calls | Review gate — asserts FR-23, OBJ-04 |
| AC-15 | Given `GH_TOKEN` and `GITHUB_TOKEN` set to sentinel values, when `doctor --json` and stderr are captured, then neither sentinel appears in any output and no token file is read | Automatable — asserts FR-31 |
| AC-16 | Given `ais doctor ./other-project` run from a different repository's working directory, when remote checks execute, then they report `./other-project`'s remote, not the ambient one | Asserts FR-34, FR-36 |
| AC-17 | Given a ruleset with `enforcement: "evaluate"`, when C-01 runs, then the branch is **not** reported protected on that ruleset's account, and the evaluate-mode ruleset is named | Asserts FR-06 |
| AC-18 | Given a generated project with no remote, when the profile smoke gates run `doctor`, then `grep -cE "✗ \[(CRIT|HIGH)\]"` returns 0 and `"highFailed": 0` holds | Protects `scripts/pre-publish-smoke.sh:442,463,668` — asserts FR-11, FR-17 |

---

## 9. Open Questions

**All blockers resolved 2026-08-27.** Q-04–Q-06 follow as consequences and are resolved here.

| ID | Question | Status | Resolution |
|---|---|---|---|
| Q-01 | Offline / no-`gh` behaviour | **Resolved — option D** | `unavailable` does not affect the exit code by default; `--require-remote` opts into failing. Rationale: `gh` is absent on most machines, and a diagnostic that fails because a tool is missing gets removed from CI rather than fixed. The flag exists for an **adopting project's** CI, where the team can guarantee `gh`. It is **not** wired into the scaffold repository's own CI (see the scope note below) |
| Q-02 | Detected gap: gate or dashboard | **Resolved — option B** | Severity `high`, exit 1, reusing `doctor`'s existing rule. `high` already means "a core guarantee is inert", which is exactly what these checks detect. `critical` stays reserved for a broken installation. The earlier contingency — that this would fail on the scaffold's own repo — **no longer applies**: the scaffold repo is not a governed project |
| Q-03 | Repository resolution | **Resolved — option C** | `gh repo view --json nameWithOwner` with a `--repo` override, identical to `setup-branch-protection.sh:60`. The output names the repo it checked, so the fork case (where `gh` correctly returns the fork, not upstream) cannot be misread |
| Q-04 | Ship to generated projects? | **Resolved** | **Yes.** `doctor` already ships, and these checks are most valuable in an adopting team's repo — that is where inert governance is least likely to be noticed |
| Q-05 | Hook content hash, or presence + executable bit? | **Resolved** | **Presence and the executable bit only.** Content verification overlaps the managed-file drift slice deferred to Wave 2 with item 25 |
| Q-06 | Caching / rate limits? | **Resolved** | **None in this slice.** A single run makes a handful of calls, well inside GitHub's limits. Revisit on evidence, not speculation |

> Q-04–Q-06 were resolved as consequences of Q-01–Q-03 and existing scope decisions, not decided
> independently by the maintainer. Any of them can be overridden without reopening approval.

## 10. Dependencies

| Dependency | Type | Status | Notes |
|---|---|---|---|
| `gh` CLI on the user's machine | External | Not controllable | The precedent (`setup-branch-protection.sh`) already requires it and checks for it explicitly |
| GitHub API — branch protection + rulesets | External | **Coarse tier verified anonymously on a public repo** (spike 2026-08-27); authenticated non-admin and private-repo tiers unverified | Query list in `docs/architecture/spike-26-github-api-shape.md` |
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
| R-05 | Item 74's M-04 slips with this item | M | L | Accepted; M-04 is already null with a start condition. **Numbering now matches the analysis** — an earlier revision had R-05/R-06 swapped between the two documents |
| R-06 | Read operations may require `admin:repo` for the **detailed** tier | M | M | **Partly answered by the spike:** the coarse tier reads anonymously on a public repo, so C-01/C-02 reach every user; C-03 is authentication-gated by construction. The private-repo case remains untested |
| R-08 | Org-level rulesets are not addressable under `/repos/{o}/{r}/rulesets/{id}`; the documented C-03 call would 404. The probe ran only against a personal repo | M | M | Branch on `ruleset_source_type`; where the org endpoint is inaccessible report `unavailable`, never "no bypass". **Open design question — HLD** |
| R-09 | `doctor` as specified cannot detect the defect item 75 exists to fix: the spike found the same controls set to opposite values on both surfaces, and C-01 collapses to protected/unprotected | M | M | **Open design question — HLD:** a per-control disagreement signal and an explicit per-control merge rule |

> **R-07** is defined in the analysis only (stale `SECURITY.md` boilerplate) and is out of scope here.

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
| 2.2 | 2026-08-31 | Claude (Cowork) | `/review` fixes. New: FR-06 (ruleset `enforcement` must be `active`), FR-17 (`passed === state==='pass'`; aggregates exclude `unavailable`), FR-36 (no fall-through to an ambient repo), AC-13–AC-18. Amended: FR-01 (surfaces not endpoints), FR-11 (glyph constraint protecting the smoke gates), FR-20 (records the aggregate narrowing instead of claiming pure additivity), FR-34 (cwd threading), FR-33 (adds `cli-reference.md`), NFR-01 (one wall-clock deadline), NFR-02 (path validation), AC-03/06/07/09 testability. R-05/R-06 renumbered to match the analysis; R-08/R-09 added as open HLD questions; GitHub API dependency status updated post-spike |
| 2.1 | 2026-08-27 | Lajin M J / Claude (Cowork) | Maintainer directive: the scaffold repo is not a governed project. FR-16 retargeted from the scaffold's own CI to adopting projects; Q-01 and Q-02 rationales corrected; the "fails on our own repo" contingency withdrawn |
| 2.0 | 2026-08-27 | Lajin M J / Claude (Cowork) | **Approved.** Q-01 = D (report-only by default, `--require-remote` to enforce), Q-02 = B (`high`, exit 1), Q-03 = C (`gh repo view` + `--repo`). Added FR-14–FR-16, FR-24, FR-34, FR-35, BR-06, BR-07, AC-10–AC-12. Q-04–Q-06 resolved as consequences |
| 1.1 | 2026-08-27 | Claude (Cowork) | Verification pass: FR-33/AC-09 retargeted from `SECURITY.md` (which carries no shell-out claim) to the backlog's security-posture bullet; the "~4 day" comparison re-attributed as conversational, not a repo baseline; estimate subtotals corrected; check count 15, not "~20"; S→M escalation recorded; ADR-003 and item 74 BRD labeled cross-branch |
| 1.0 | 2026-08-27 | Claude (Cowork) | Initial draft from backlog item 26 and the companion analysis |
