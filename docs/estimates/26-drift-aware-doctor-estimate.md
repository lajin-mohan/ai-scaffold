# Effort Estimate — Drift-aware `doctor`, enforcement slice (backlog item 26)

**Date:** 2026-08-27
**Estimated By:** Claude (Cowork session), following `.claude/agents/estimator.md`
**Reviewed By:** Lajin M J — remaining spike only approved 2026-08-31; full estimate pending
**Confidence:** **MEDIUM** — spike run 2026-08-27, anonymous tier established and the query list documented. Two questions remain open (authenticated non-admin reads; private repositories), so this is not yet HIGH.
**Status:** Remaining spike approved (0.25 realistic days); full **14.0-day** estimate pending — **re-opened 2026-08-31** after `/review` corrected the arithmetic and priced Stage 3. Q-01–Q-03 are resolved and the spike was partially run 2026-08-27. **Re-confirm before committing the total: the private-repo case is untested and it is the case most adopters are in.**
**Source spec:** `docs/brd/26-drift-aware-doctor-brd.md` (**Approved v2.2**, 2026-08-31)

> **Template adaptation.** `.claude/templates/estimation-template.md` assumes a web feature
> (migrations, repository layer, page components, staging/production deploys). This is a CLI command
> extension with no UI, no database and no deploy. Those rows are replaced with the real work items;
> Deployment becomes release inclusion. Three-point method and section order unchanged.

---

## Scope Summary

**Included:** the P0 enforcement slice — checks C-01…C-04, honest degradation, `--json` extension,
the documented query contract M-04 consumes, unit tests, and the correction to the backlog's
security-posture bullet (**not** `SECURITY.md`, which contains no shell-out claim).

**Excluded:**
- Managed-file drift and the `update` change/customisation boundary — Wave 2, with item 25
- Any mutation of repository settings — that stays in `setup-branch-protection.sh`
- Non-GitHub forge support beyond reporting `unavailable`

---

## Assumptions

1. `gh` is the transport (A-01). Raw `fetch` plus token handling would add ~2 days and a security review.
2. `doctor` is extended, not rewritten. The existing 346 lines and **15** checks stay.
3. The existing `--json` shape is extended additively, so no consumer migration is budgeted.
4. Q-01–Q-03 were resolved 2026-08-27 (D / B / C). They change behaviour, not volume. **No smoke-gate contingency** — see the withdrawal note below.
5. Single maintainer, working serially.
6. Fixtures are recorded `gh` **stdout + exit code**, not HTTP responses — the transport is a subprocess. Live-API integration tests are not budgeted. NFR-05 requires an injected runner so the boundary is swappable.

---

## Task Breakdown

Business days, 1 day = 7.5 productive hours.

| Task | Optimistic | Realistic | Pessimistic | Risk notes |
|---|---|---|---|---|
| **Spike (first, gates the rest)** | | | | |
| ~~Anonymous tier + merge semantics + query list~~ — **DONE 2026-08-27** | — | — | — | Query list documented in the spike doc |
| Remaining spike: authenticated non-admin reads, and a private repo | 0.1 | 0.25 | 0.5 | The private-repo case is the one that matters — most adopters are private |
| **Analysis** | | | | |
| Resolve Q-01–Q-03 with maintainer; fold into the BRD | 0.25 | 0.5 | 0.5 | Decisions, not discovery |
| **Implementation** | | | | |
| `src/cli/core/` query module — `gh` invocation, both protection surfaces, merge, timeout | 0.5 | 1.5 | 3.0 | 1.3× third-party API. Largest single unknown |
| C-01 branch / ruleset coverage | 0.25 | 0.5 | 1.0 | |
| C-02 required checks configured **and** reporting | 0.5 | 1.0 | 2.0 | "Observed reporting on recent PRs" needs a defined lookback window |
| C-03 administrator bypass (`enforce_admins` + ruleset bypass actors) | 0.25 | 0.5 | 1.0 | Two sources to merge. **Confirmed authentication-gated** — `bypass_actors` is absent from anonymous ruleset detail and `/protection` returns 401 |
| C-04 real `.git/hooks/pre-commit` check, kept separate from `checkHooksWired` | 0.25 | 0.25 | 0.5 | Pure filesystem. Lowest risk item in the set |
| Degradation paths — no `gh`, no auth, no remote, non-GitHub, timeout | 0.5 | 1.0 | 2.0 | Five paths, each needing a distinct reason string |
| `--require-remote` flag + docs for adopting projects (Q-01 = D) | 0.25 | 0.25 | 0.5 | Reuses the `unavailable` state machine. **Not** wired into the scaffold repo's own CI |
| Repo resolution via `gh repo view` + `--repo` override + naming the repo in output (Q-03 = C) | 0.25 | 0.5 | 1.0 | Delegates SSH/HTTPS/rewrite handling to `gh` |
| `--json` extension + `state`/`verifiedBy`/`reason` fields | 0.25 | 0.5 | 1.0 | |
| Documented query contract for M-04 | 0.25 | 0.5 | 0.75 | |
| **Testing** | | | | |
| Unit tests with mocked API fixtures (25% of implementation) | 0.7 | 1.4 | 2.8 | |
| `--json` backward-compatibility test (AC-07) | 0.25 | 0.5 | 0.75 | |
| **Docs** | | | | |
| Backlog security-posture bullet, same commit (FR-33) | 0.25 | 0.25 | 0.5 | `SECURITY.md` has no shell-out claim to correct |
| **Review & QA** | | | | |
| AI review + fixes | 0.25 | 0.5 | 1.0 | |
| Human code review | 0.25 | 0.5 | 0.5 | Self-review in practice — no independent reviewer exists |
| QA sign-off | 0.25 | 0.5 | 1.0 | |
| **Release** | | | | |
| Release inclusion + packed-tarball check | 0.25 | 0.25 | 0.5 | Per the 2026-07-10 lesson: verify the tarball, not the working tree |
| **Stage 3 — Architecture** | | | | |
| HLD + ADR: `gh` transport wrapper, two-surface merge semantics, pass/fail/unavailable state machine, permission-dependent degradation | 0.5 | 1.0 | 2.0 | `task-size-policy.md` requires HLD + ADR at size M. Unpriced until the 2026-08-31 review |
| **Subtotal** | **6.30** | **12.15** | **22.80** | |
| **Buffer (15%)** | 0.95 | 1.82 | 3.42 | |
| **TOTAL** | **7.3** | **14.0** | **26.2** | |

---

## Risk Register

| Risk | Likelihood | Impact | Multiplier applied | Mitigation |
|---|---|---|---|---|
| **Confirmed live in this repo:** `main` is ruleset-protected, `dev` is legacy-protected. Either single-surface implementation misreports one branch | **Certain** | High | 1.3× on the query module | FR-01 and BR-04 stand, now on evidence rather than caution |
| ~~Reads may require `admin:repo`~~ — **disproved for the coarse tier on a public repo** (readable with no token at all) | — | — | — | C-01 and C-02 reach every user of a public repo |
| **Private repositories are untested.** Anonymous access worked because this repo is public; most adopters are private | **High** | **High** | — | Highest-value remaining question. Close it before committing the total |
| `gh` absent on most user machines | High | Med | — | Degradation paths are 1.0 realistic day of the estimate precisely because of this |
| ~~Q-02 = B turns this repo's own gaps into CI failures~~ — **withdrawn.** The scaffold repo is not a governed project | — | — | — | No contingency carried |
| Unclear requirements | Low | — | **not applied** | Requirements are specific; the unknown is an external API, which is priced as third-party risk, not requirement risk |

**Contingency withdrawn (2026-08-27).** An earlier version of this estimate budgeted +0.5 to +2 days
for `doctor` failing against the scaffold repository's own protection settings. The maintainer has
since scoped the governance to **generated projects only** — the scaffold repo is the tool, not a
governed project — so `--require-remote` is not wired into its CI and there is nothing here for the
checks to fail against. **No contingency is carried.**

**The premise that makes this safe, now stated rather than assumed.** Under Q-02 = B / FR-24 a
detected gap is `high` and exits 1 *without* `--require-remote`, and
`scripts/pre-publish-smoke.sh:442,463,667` grep for `✗ [CRIT|HIGH]`. Those gates are safe only
because they run `doctor` against freshly generated temp projects with **no remote**, so every remote
check is `unavailable` (FR-14, FR-17). If a future gate runs `doctor` against a repo that has a
remote, the conclusion no longer holds. FR-11 and AC-18 exist to protect that path.

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
| Optimistic | 7.3 | 10.3 |
| Realistic | **14.0** | **20.0** |
| Pessimistic | 26.2 | 37.5 |

> **Corrected 2026-08-31.** The previous subtotals (5.95 / 11.4 / 21.3) did not equal their own task
> rows: when the spike row was replaced by the 0.1 / 0.25 / 0.5 remainder, the original
> 0.25 / 0.5 / 1.0 was never subtracted — a 0.15 / 0.25 / 0.50 overstatement, giving a true 12.8
> rather than 13.1. Pricing the missing Stage 3 row then moves the realistic total to 14.0.
> **Re-add the column after editing any row** — this is the second arithmetic error in this document
> from that same cause.

**Approved commitment:** the **remaining 0.25-day spike only** (2026-08-31), then re-confirm. The
full spike was estimated at 0.5 days; its anonymous/public portion is already complete. Committing
14.0 days against an unverified external API shape is how estimates become fiction.

**Against the earlier indicative figure.** An indicative ~4 realistic days was given for item 26 in
conversation on 2026-08-27. **That figure is not recorded anywhere in this repository** — the
original backlog sized item 26 `S` ("small enforcement slice") and `task-size-policy.md` contains no
size-to-days mapping, so `S` cannot be converted to a day figure either. Against that conversational
~4, this estimate is **3.5× higher**: it prices the query module, the five degradation paths, the
mocked test fixtures and the `--json` compatibility guarantee, none of which the indicative number
included.

**Size escalation, recorded.** The backlog now sizes this `M`; 14.0 realistic days exceeds the
original `S` framing. `task-size-policy.md` permits escalation and says it "is not failure — it
means the initial sizing was imprecise."

---

## Spike Required?

**Yes — 0.5 realistic days total, before implementation.** The anonymous/public portion is
complete; the authenticated non-admin/private-repository remainder is approved at 0.25 realistic
days.

Answers: (1) does reading `enforce_admins`, required-check state and rulesets need `admin:repo`?
(2) must both protection surfaces be queried and merged, and what is "effective" when they disagree?

Output: a documented query list, which becomes both the implementation contract and item 74's M-04
extraction contract.

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Technical Lead | Lajin M J | 2026-08-31 | Remaining spike approved; full estimate pending |
| Product Owner | Lajin M J | 2026-08-31 | Remaining spike approved; full estimate pending |

> Both roles are the same person; this estimate has had no independent review. Recorded so a later
> reader does not mistake the sign-off for assurance.
