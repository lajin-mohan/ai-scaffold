# Scope Statement — ai-scaffold / Item 26, Drift-aware `doctor` (enforcement slice)

**Version:** 1.0
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
  exit code by default; **`--require-remote`** makes it fail, and the scaffold's own CI uses it.
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
| 2 | ~~Q-02~~ | **Resolved — B.** `high`, exit 1. Contingency below is now live |
| 3 | ~~Q-03~~ | **Resolved — C.** `gh repo view` + `--repo`; output names the repo |
| 4 | **Spike first.** Commit the 0.5-day spike, not the 13.1-day total, until the GitHub API shape is verified | Still open. Estimation discipline, flagged not decided |
| 5 | **Size escalation S → M.** Update the backlog rank table, or reject the escalation and re-scope | Still open. Sizing selects the gate set — a PM cannot change it unilaterally |

**Contingency, now live and outside the estimate:** Q-02 = B means this repository's own protection
settings may fail `doctor` the first time the checks run, and FR-16 puts `--require-remote` in the
scaffold's CI so they will run. That is a *finding*, not a defect in this item. Budget +0.5 to +2
days against the roadmap. If it fires, item 26 worked.

---

## Delivery Shape

| Stage | Realistic | Note |
|---|---|---|
| Spike | 0.5 d | Gates the rest; also the spike item 74 deferred here |
| Implementation + tests + docs + review | 12.6 d | One coherent unit — the checks share the query module |
| **Total** | **13.1 d** | ~18.7 calendar days at 0.7 capacity |

> An indicative ~4 days was given in conversation on 2026-08-27 and is **not recorded in this
> repository**. The backlog sizes item 26 `S`, and `task-size-policy.md` has no size-to-days mapping.
> This estimate is 3.3× that conversational figure, which omitted the query module, the five
> degradation paths, the test fixtures and the `--json` compatibility guarantee.
>
> **Size escalated S → M and the backlog rank table not yet updated — flagged to the Tech Lead.**

---

**Approved by:** Lajin M J (PM) | Lajin M J (Tech Lead) | N/A (no external client)
**Date:** 2026-08-27

> No independent approval exists. PM, Tech Lead and Product Owner are the same person.
