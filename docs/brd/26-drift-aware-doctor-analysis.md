# Solution Analysis: Drift-aware `doctor` — enforcement verification slice (backlog item 26)

**Analyst:** Claude (Cowork session), following `.claude/agents/solution-analyst.md`
**Date:** 2026-08-27
**Status:** DRAFT — Pending stakeholder review
**Confidence:** MEDIUM — the intent is clear and the transport has a precedent; the GitHub API shape is the open unknown
**Scope:** the **P0 enforcement slice only.** Managed-file drift and the `update` change/customisation boundary are the medium lifecycle slice, paired with item 25 in Wave 2.

---

## Problem Statement

`ais doctor` (`src/cli/commands/doctor.js`, 346 lines, ~20 checks) reports installation health. Every
check reads the local filesystem; there is no network call anywhere in `src/cli/`. It can tell you a
file is missing. It cannot tell you whether a single governance gate is actually enforced.

**Its own hook check is the exemplar of the problem.** `checkHooksWired` passes when
`.claude/settings.json` contains a non-empty `hooks` object. It never checks whether
`.git/hooks/pre-commit` exists or is executable — the hook item 54 installs on `create`. A project
whose hook was deleted, never copied, or left non-executable passes this check today.

That is precisely the failure the backlog names: *"configured intent is not a pass."* It is
currently true inside `doctor` itself.

---

## Stakeholders

| Role | Name / Team | Input Required |
|---|---|---|
| Requester | Lajin M J (maintainer) | Exit-code semantics, severity assignment, ship-to-generated-projects decision |
| End Users | Adopting teams running `ais doctor` in a generated project | Whether `gh` is realistically installed on their machines |
| Approver | Lajin M J | BRD sign-off |
| Affected Systems | `src/cli/commands/doctor.js`, `scripts/setup-branch-protection.sh`, `SECURITY.md`, item 74's M-04 | |

---

## Assumptions (Must Be Confirmed)

| # | Assumption | If Wrong: Impact |
|---|---|---|
| A-01 | **`gh` CLI is the transport**, not `fetch` plus a token. Precedent: `scripts/setup-branch-protection.sh` already uses `gh api` and already checks `command -v gh`, `gh auth status` and token scope | Raw `fetch` means the CLI handles a long-lived token — new secret-handling surface, gitleaks exposure, and a direct contradiction of the documented OIDC / no-long-lived-token posture |
| A-02 | Every check is **read-only**. `doctor` never mutates repository settings — writing stays in `setup-branch-protection.sh` | A diagnostic that changes state is no longer safe to run, and the two tools' responsibilities blur |
| A-03 | Remote checks apply to GitHub-hosted repos only. Other forges and local-only repos report **unavailable**, not fail | Reporting "unprotected" for a GitLab repo is a false negative that destroys trust in the whole command |
| A-04 | The query layer built here is what item 74's **M-04 reuses** (`FR-27` of the item 74 BRD) | Two implementations of the same queries, and the M-04 metric is delayed further |
| A-05 | `doctor`'s existing severity model (`critical`/`high`/`medium`/`low`), `--json` output shape and exit-code rule are **extended, not replaced** | Breaking `--json` breaks any CI consuming it, including the smoke gates that assert doctor is CRIT/HIGH-clean |
| A-06 | No new runtime dependency (7 deps today; none is an HTTP client) | Contradicts the security posture and NFR-04 of the wider programme |

---

## Ambiguities (Must Be Resolved Before BRD)

| # | Question | Blocker? | Owner |
|---|---|---|---|
| Q-01 | **What does `doctor` do when remote checks cannot run** — no `gh`, not authenticated, no remote, or an offline machine? Pass silently, report `unavailable` without affecting exit code, or fail? This decides whether `doctor` is usable offline and in CI | **YES** | Maintainer |
| Q-02 | **Is a detected gap a failure or a report?** If admin bypass is enabled or a required check is missing, is that `critical`/`high` (exit 1) or `medium` (exit 0)? This is the difference between `doctor` being a gate and being a dashboard | **YES** | Maintainer |
| Q-03 | **Which repository does `doctor` check?** Run inside a generated project it should presumably check that project's own remote — but the scaffold repo checking itself is a different case, and a monorepo or a fork is a third | **YES** | Maintainer |
| Q-04 | Does the enforcement slice **ship to generated projects**, or is it maintainer-only? `doctor` already ships | NO | Maintainer |
| Q-05 | Does the local hook check verify **content** (hash against the shipped hook) or only presence and the executable bit? Content checking overlaps the managed-file drift slice deferred to Wave 2 | NO | Maintainer |
| Q-06 | Any caching or rate-limit handling for repeated runs? | NO | Maintainer |

---

## Scope Clarity

**In Scope (confirmed by the item definition):**
- Effective branch / ruleset coverage
- Required checks — configured *and* actually reporting
- Administrator bypass
- Repository-hook installation (the real `.git/hooks/` state, not the settings file)
- Honest degradation with no authenticated remote

**Out of Scope (confirmed):**
- Managed-file drift and the `update` change/customisation boundary — the medium lifecycle slice, Wave 2 with item 25
- Any mutation of repository settings — that is `setup-branch-protection.sh`
- Non-GitHub forges beyond reporting `unavailable`

**Unconfirmed Scope (needs decision):**
- Whether this ships to generated projects (Q-04)
- Hook content verification vs presence (Q-05)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| R-01 **Rulesets vs legacy branch protection are two different APIs.** A repo may use either, both, or neither. Querying only `/branches/{b}/protection` reports "unprotected" on a repo protected by a ruleset | **High** | **High** | Query both surfaces and merge. This is the single largest correctness risk: a false "unprotected" is worse than no check |
| R-02 **`gh` is not installed on most user machines.** The highest-value checks then report `unavailable` for the majority of adopters | High | Med | Q-01's answer must make `unavailable` a first-class, clearly-explained state — not a silent pass and not a failure |
| R-03 **The documented security claim changes.** `SECURITY.md` and the backlog state the only shell-out is `spawnSync('git', [args])`. Adding `gh` makes that false | Med | Med | Update `SECURITY.md` **in the same change**. This is exactly the doc-drift class the 2026-08-12 incident was root-caused to |
| R-04 **False confidence.** A passing `doctor` becomes a claim that governance is enforced, and users will cite it as such | Med | High | Every check reports what it actually verified; `unavailable` never renders as a tick |
| R-05 **Item 74's M-04 slips with this item.** Snapshot #2 cannot add bypass frequency until this ships | Med | Low | Accepted and recorded; M-04 is already null with a start condition |
| R-06 **Read scope may exceed a normal token.** `setup-branch-protection.sh` requires `admin:repo` to write; what reading requires is unverified | Med | Med | Spike, below |

---

## Technical Unknowns / Spike Required

**Spike — 0.5 day. This is the spike item 74 deliberately deferred here (`FR-27`).**

Two questions, both answerable by running `gh api` against this repository:

1. **Token scope for reads.** Do `enforce_admins`, required-check state, and ruleset listing return
   with a default `gh auth login` token, or do they need `admin:repo`? If reads need `admin:repo`,
   R-02 gets materially worse — most users will not grant it for a diagnostic.
2. **Ruleset vs branch-protection coverage.** Confirm both surfaces must be queried and merged, and
   establish what "effective" protection means when both exist and disagree.

The spike's output is a documented query list, which becomes the implementation contract and M-04's
extraction contract simultaneously.

---

## Recommended Next Step

**PROCEED TO BRD — with the spike scheduled as the first task, before implementation estimates are
committed to.**

Q-01, Q-02 and Q-03 are BLOCKER ambiguities under `.claude/agents/solution-analyst.md`'s rule
(*"never proceed past this analysis if there are unresolved BLOCKER ambiguities"*). They are
maintainer decisions about semantics, not discoveries — the BRD gives concrete options to decide
against. The BRD must stay Draft until they are resolved.

---

## Open Questions for Stakeholders

1. Offline / no-`gh` behaviour: silent pass, `unavailable`, or failure? (Q-01)
2. Detected gap: exit-code failure, or report only? (Q-02)
3. Which repository is checked, and how is it resolved? (Q-03)
4. Ship to generated projects, or maintainer-only? (Q-04)
5. Hook check: content hash or presence + executable bit? (Q-05)
