# 26 — Drift-aware `doctor`, enforcement slice (Wave 1, rank 3, P0)

## Status

**Stage 1 — Analysis complete. BRD DRAFTED, NOT APPROVED.**
Blocked on Q-01, Q-02, Q-03. Stage 2 artifacts exist but are **not commitable**
until those resolve and the 0.5-day spike has run.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-analysis.md` | Draft |
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-brd.md` | Draft — approval blocked |
| 2 — Plan | `docs/estimates/26-drift-aware-doctor-estimate.md` | Draft — spike-gated, LOW confidence |
| 2 — Plan | `docs/process/26-drift-aware-doctor-scope.md` | Draft |
| 3 — Architecture | transport + protection-surface merge | **Real decision exists — unlike item 74** |

## Size

**M** per `docs/process/task-size-policy.md` — full workflow. Unlike item 74,
this item has genuine architecture to design (transport choice, two-API merge
semantics, degradation model), so ADR-003's exception does **not** extend here.

## Open decisions (blockers)

- **Q-01** Offline / no-`gh`: `unavailable` without affecting exit code, or failure?
- **Q-02** Detected gap: gate (exit 1) or dashboard (exit 0)?
- **Q-03** Which repository is checked, and how is it resolved?

Non-blocking: Q-04 (ship to generated projects), Q-05 (hook content vs presence),
Q-06 (caching / rate limits).

## Next action

**Run the 0.5-day spike.** Two questions against this repo's own API:
do reads of `enforce_admins`, required-check state and rulesets need `admin:repo`;
and must both protection surfaces be queried and merged. Output is a documented
query list that becomes both the implementation contract and item 74's M-04
extraction contract.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-27 | Transport is the `gh` CLI, not `fetch` + token | `scripts/setup-branch-protection.sh` already uses `gh api` and already checks presence, auth and scope. Raw `fetch` means this CLI handles a long-lived token — new secret surface, gitleaks exposure, and a contradiction of the documented OIDC posture |
| 2026-08-27 | Both legacy branch protection **and** rulesets are queried and merged | A repo may use either or both. Querying one surface reports a false "unprotected", which is worse than no check at all (BR-04) |
| 2026-08-27 | `doctor` stays read-only; writing stays in `setup-branch-protection.sh` | A diagnostic that mutates state is not safe to run, and blurs two tools' responsibilities |
| 2026-08-27 | `unavailable` is a first-class third state, never collapsed into pass or fail | With `gh` absent on most user machines, a silent pass would make the whole command dishonest |
| 2026-08-27 | Branched from `origin/dev`, not stacked on the item 74 branch | Per the 2026-07-14 lesson: stacked PRs conflict under a squash-merge policy |
| 2026-08-27 | Commit only the 0.5-day spike, not the 11.7-day total | Committing to an estimate that rests on an unverified external API shape is how estimates become fiction |
