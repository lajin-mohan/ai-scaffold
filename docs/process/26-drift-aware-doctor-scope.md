# Scope Statement — ai-scaffold / Item 26, Drift-aware `doctor` (enforcement slice)

**Version:** 1.1
**Date:** 2026-08-27
**Owner:** Lajin M J (PM, Tech Lead and Product Owner are the same person on this project)
**Status:** **Approved** — Q-01–Q-03 resolved 2026-08-27 (D / B / C). Stage 2 closed. Implementation remains spike-gated.

> Per `.claude/agents/pm.md` format 1. Scope detail governed by
> `docs/brd/26-drift-aware-doctor-brd.md` §3 and §5.

---

## In Scope

- **C-01 branch / ruleset coverage** — `main` and `dev` actually protected, by legacy branch
  protection or a ruleset or both, queried on **both** surfaces and merged.
- **C-02 required checks** — configured *and* observed reporting. A required check that never runs
  blocks every PR; a configured-but-absent one blocks nothing.
- **C-03 administrator bypass** — `enforce_admins` plus ruleset bypass actors.
- **C-04 real hook installation** — `.git/hooks/pre-commit` exists and is executable, reported
  separately from the existing settings-file check.
- **Honest degradation** — `unavailable` as a first-class third state with a reason and a suggested
  action, for: no `gh`, not authenticated, no remote, non-GitHub remote, timeout. Does not affect the
  exit code by default; **`--require-remote`** makes it fail, for use in an **adopting project's**
  CI. The scaffold repository is out of scope — it is the tool, not a governed project.
- **Repository resolution** via `gh repo view --json nameWithOwner` with a `--repo` override,
  identical to the write-side script. The output names the repo it checked.
- **Detected gaps are `high` and fail the exit code.** `doctor` becomes a gate for gaps it can
  actually see, while staying a report for checks it cannot run.
- **`--json` extension**, additive only, with `state` / `verifiedBy` / `reason`.
- **A documented query contract** that item 74's M-04 consumes rather than reimplements.
- **Correction to the backlog's security-posture bullet** in the same commit, since adding a `gh`
  shell-out falsifies its "only shell-out is `spawnSync('git', [args])`" claim. **`SECURITY.md` is
  not the target** — it contains no such claim; it is un-customised disclosure-policy boilerplate
  whose Scope section still names `apps/`, `packages/` and `infra/`, none of which hold this
  project's code. Fixing that is a separate `docs/*` ticket.

## Out of Scope

- Managed-file drift and the `update` change/customisation boundary — the medium lifecycle slice,
  Wave 2, paired with item 25.
- **Any mutation of repository settings.** `doctor` is read-only by contract; writing stays in
  `scripts/setup-branch-protection.sh`.
- Non-GitHub forges beyond reporting `unavailable`.
- Live-API integration tests. Mocked fixtures only.
- Any GitHub token handled by this CLI. Authentication is `gh`'s responsibility.

## Deferred (Considered but Pushed)

| Item | Pushed to | Reason |
|---|---|---|
| Hook **content** verification (hash vs shipped hook) | Wave 2 drift slice | Overlaps managed-file drift; C-04 checks presence and the executable bit only, pending Q-05 |
| Caching / rate-limit handling | After first real usage | No evidence yet that repeated runs hit limits (Q-06) |
| Raw `fetch` + token transport | Not planned | Would add token handling, gitleaks surface, and contradict the OIDC / no-long-lived-token posture |

## Assumptions

1. `gh` is the transport, following `scripts/setup-branch-protection.sh`.
2. `doctor` is extended, not rewritten; existing checks and `--json` consumers are unaffected.
3. Q-01–Q-03 are resolved before implementation; they change behaviour, not volume.
4. Mocked API fixtures suffice for the check tests.
5. Single maintainer, working serially.

---

## Decisions Flagged to the Tech Lead

Per `.claude/agents/pm.md` — the PM produces the communication and flags the decision.

| # | Decision needed | Why it is not decided here |
|---|---|---|
| 1 | ~~Q-01~~ | **Resolved — D.** Report-only by default; `--require-remote` enforces |
| 2 | ~~Q-02~~ | **Resolved — B.** `high`, exit 1. No contingency — see below |
| 3 | ~~Q-03~~ | **Resolved — C.** `gh repo view` + `--repo`; output names the repo |
| 4 | **Spike first.** Commit the remaining 0.25-day spike, not the 14.0-day total, until the GitHub API shape is verified | **Resolved 2026-08-31.** Remaining spike approved; full estimate stays pending |
| 5 | **Size escalation S → M.** Update the backlog rank table, or reject the escalation and re-scope | **Resolved 2026-08-27.** Backlog rank table and item definition now say `M` |

**Contingency withdrawn (2026-08-27).** An earlier version of this statement budgeted +0.5 to +2 days
for `doctor` failing against this repository's own protection settings. The maintainer has since
scoped the governance to **generated projects only** — the scaffold repo is the tool, not a governed
project — so `--require-remote` is not wired into its CI and there is nothing here for the checks to
fail against. **No contingency is carried.**

---

## Delivery Shape

| Stage | Realistic | Note |
|---|---|---|
| Spike | 0.5 d total; **0.25 d remaining** | Remaining private/non-admin probe approved 2026-08-31 |
| Stage 3 — HLD + ADR | 1.0 d | Required at size M; unpriced until the 2026-08-31 review |
| Implementation + tests + docs + review | 12.75 d | One coherent unit — the checks share the query module |
| **Total** | **14.0 d** | ~20.0 calendar days at 0.7 capacity |

> An indicative ~4 days was given in conversation on 2026-08-27 and is **not recorded in this
> repository**. The original backlog sized item 26 `S`, and `task-size-policy.md` has no size-to-days mapping.
> This estimate is 3.5× that conversational figure, which omitted the query module, the five
> degradation paths, the test fixtures and the `--json` compatibility guarantee.
>
> **Size escalated S → M; the backlog rank table and item definition are updated.**

---

**Approved by:** Lajin M J (PM) | Lajin M J (Tech Lead) | N/A (no external client)
**Date:** 2026-08-27

> No independent approval exists. PM, Tech Lead and Product Owner are the same person.
