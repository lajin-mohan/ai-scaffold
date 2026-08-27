# Effort Estimate — Drift-aware `doctor`, enforcement slice (backlog item 26)

**Date:** 2026-08-27
**Estimated By:** Claude (Cowork session), following `.claude/agents/estimator.md`
**Reviewed By:** TBD — Technical Lead sign-off pending
**Confidence:** **LOW→MEDIUM** — the GitHub API shape is unverified. LOW until the spike lands, MEDIUM after.
**Status:** Draft — **not commitable until Q-01–Q-03 are resolved and the spike has run**
**Source spec:** `docs/brd/26-drift-aware-doctor-brd.md` (Draft v1.0)

> **Template adaptation.** `.claude/templates/estimation-template.md` assumes a web feature
> (migrations, repository layer, page components, staging/production deploys). This is a CLI command
> extension with no UI, no database and no deploy. Those rows are replaced with the real work items;
> Deployment becomes release inclusion. Three-point method and section order unchanged.

---

## Scope Summary

**Included:** the P0 enforcement slice — checks C-01…C-04, honest degradation, `--json` extension,
the documented query contract M-04 consumes, unit tests, and the `SECURITY.md` correction.

**Excluded:**
- Managed-file drift and the `update` change/customisation boundary — Wave 2, with item 25
- Any mutation of repository settings — that stays in `setup-branch-protection.sh`
- Non-GitHub forge support beyond reporting `unavailable`

---

## Assumptions

1. `gh` is the transport (A-01). Raw `fetch` plus token handling would add ~2 days and a security review.
2. `doctor` is extended, not rewritten. The existing 346 lines and ~20 checks stay.
3. The existing `--json` shape is extended additively, so no consumer migration is budgeted.
4. Q-01–Q-03 are resolved before implementation starts. They change behaviour, not volume — except Q-02, which can add a smoke-gate fix if a detected gap starts failing CI on this very repo.
5. Single maintainer, working serially.
6. Mocked API fixtures are acceptable for AC-01…AC-03. Live-API integration tests are not budgeted.

---

## Task Breakdown

Business days, 1 day = 7.5 productive hours.

| Task | Optimistic | Realistic | Pessimistic | Risk notes |
|---|---|---|---|---|
| **Spike (first, gates the rest)** | | | | |
| Token scope for reads; rulesets vs branch-protection merge semantics; produce the query list | 0.25 | 0.5 | 1.0 | Answers R-05 and R-01. Also the item 74 spike deferred here |
| **Analysis** | | | | |
| Resolve Q-01–Q-03 with maintainer; fold into the BRD | 0.25 | 0.5 | 0.5 | Decisions, not discovery |
| **Implementation** | | | | |
| `src/cli/core/` query module — `gh` invocation, both protection surfaces, merge, timeout | 0.5 | 1.5 | 3.0 | 1.3× third-party API. Largest single unknown |
| C-01 branch / ruleset coverage | 0.25 | 0.5 | 1.0 | |
| C-02 required checks configured **and** reporting | 0.5 | 1.0 | 2.0 | "Observed reporting on recent PRs" needs a defined lookback window |
| C-03 administrator bypass (`enforce_admins` + ruleset bypass actors) | 0.25 | 0.5 | 1.0 | Two sources to merge |
| C-04 real `.git/hooks/pre-commit` check, kept separate from `checkHooksWired` | 0.25 | 0.25 | 0.5 | Pure filesystem. Lowest risk item in the set |
| Degradation paths — no `gh`, no auth, no remote, non-GitHub, timeout | 0.5 | 1.0 | 2.0 | Five paths, each needing a distinct reason string |
| `--json` extension + `state`/`verifiedBy`/`reason` fields | 0.25 | 0.5 | 1.0 | |
| Documented query contract for M-04 | 0.25 | 0.5 | 0.75 | |
| **Testing** | | | | |
| Unit tests with mocked API fixtures (25% of implementation) | 0.7 | 1.4 | 2.8 | |
| `--json` backward-compatibility test (AC-07) | 0.25 | 0.5 | 0.75 | |
| **Docs** | | | | |
| `SECURITY.md` shell-out claim + backlog text, same commit (FR-33) | 0.25 | 0.25 | 0.5 | |
| **Review & QA** | | | | |
| AI review + fixes | 0.25 | 0.5 | 1.0 | |
| Human code review | 0.25 | 0.5 | 0.5 | Self-review in practice — no independent reviewer exists |
| QA sign-off | 0.25 | 0.5 | 1.0 | |
| **Release** | | | | |
| Release inclusion + packed-tarball check | 0.25 | 0.25 | 0.5 | Per the 2026-07-10 lesson: verify the tarball, not the working tree |
| **Subtotal** | **4.95** | **10.15** | **19.8** | |
| **Buffer (15%)** | 0.74 | 1.52 | 2.97 | |
| **TOTAL** | **5.7** | **11.7** | **22.8** | |

---

## Risk Register

| Risk | Likelihood | Impact | Multiplier applied | Mitigation |
|---|---|---|---|---|
| Rulesets vs legacy branch protection are separate APIs; one surface gives false negatives | High | High | 1.3× on the query module | Spike first; FR-01 and BR-04 require both surfaces |
| Reads may require `admin:repo`, which users will not grant for a diagnostic | Med | Med | in spike | If true, the feature's reach shrinks and Q-01's answer matters more |
| `gh` absent on most user machines | High | Med | — | Degradation paths are 1.0 realistic day of the estimate precisely because of this |
| Q-02 answered as "fail the exit code" turns this repo's own gaps into CI failures | Med | Med | — | Budget contingency below, not in the total |
| Unclear requirements | Low | — | **not applied** | Requirements are specific; the unknown is an external API, which is priced as third-party risk, not requirement risk |

**Contingency, deliberately outside the total:** if Q-02 is answered "detected gaps fail the exit
code", this repo's own protection settings may immediately fail `doctor` in CI. Fixing that is real
work of unknown size — it is a *finding*, not a defect in this item. Budget **+0.5 to +2 days**
against the roadmap, not against this estimate.

---

## Phasing Recommendation

**Do not split, but gate on the spike.**

The spike is 0.5 realistic days and answers the two questions that set the confidence level. Run it,
then re-confirm this estimate. If reads need `admin:repo`, or the two protection surfaces cannot be
merged coherently, the shape of the item changes and re-estimation is cheaper than discovering it in
implementation.

Everything after the spike is one coherent unit — the checks share the query module, and shipping
C-01 without C-03 would report protection while saying nothing about who can override it.

---

## Summary

| Scenario | Total | Calendar days (÷0.7 capacity) |
|---|---|---|
| Optimistic | 5.7 | 8.1 |
| Realistic | **11.7** | **16.7** |
| Pessimistic | 22.8 | 32.6 |

**Recommended commitment:** the **0.5-day spike only**, then re-confirm. Committing 11.7 days
against an unverified external API shape is how estimates become fiction.

**Against the indicative figure:** Wave 1's summary put item 26 at ~4 realistic days. That was
indicative and **too low by roughly 3×** — it priced the checks and omitted the query module, the
five degradation paths, the test fixtures, and the `--json` compatibility guarantee. This is the
signed-off-quality number; the earlier one was not.

---

## Spike Required?

**Yes — 0.5 realistic days, before implementation.**

Answers: (1) does reading `enforce_admins`, required-check state and rulesets need `admin:repo`?
(2) must both protection surfaces be queried and merged, and what is "effective" when they disagree?

Output: a documented query list, which becomes both the implementation contract and item 74's M-04
extraction contract.

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Technical Lead | Lajin M J | | Pending |
| Product Owner | Lajin M J | | Pending |

> Both roles are the same person; this estimate has had no independent review. Recorded so a later
> reader does not mistake the sign-off for assurance.
