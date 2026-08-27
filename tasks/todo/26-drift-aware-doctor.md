# 26 — Drift-aware `doctor`, enforcement slice (Wave 1, rank 3, P0)

## Status

**Stages 1 and 2 COMPLETE (2026-08-27).** BRD Approved v2.0, estimate and scope
statement approved. No open blockers.
**Next: run the spike.** Designed at `docs/architecture/spike-26-github-api-shape.md`
with a runnable probe at `scripts/spike-26-probe.sh` (throwaway, not shipped).
The HLD waits on the spike results — writing it first would design against an
unverified API. Implementation remains spike-gated.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-analysis.md` | Draft |
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-brd.md` | **Approved v2.0** |
| 2 — Plan | `docs/estimates/26-drift-aware-doctor-estimate.md` | Approved — spike-gated, LOW confidence, **13.1 d realistic** |
| 2 — Plan | `docs/process/26-drift-aware-doctor-scope.md` | **Approved** |
| 3 — Architecture | `docs/architecture/spike-26-github-api-shape.md` + `scripts/spike-26-probe.sh` | **Spike designed — not yet run** |
| 3 — Architecture | HLD + ADR | Blocked on spike results |

## Size

**Escalated S → M.** The backlog sizes item 26 `S` ("small enforcement slice");
the estimate is 12.25 realistic days, which is `M`. `task-size-policy.md` permits
this — "Escalation is not failure. It means the initial sizing was imprecise."
**The backlog rank table still says `S`. Flagged to the Tech Lead**, because size
selects the gate set this ticket then claims to follow.

Unlike item 74, this item has genuine architecture to design (transport choice,
two-API merge semantics, degradation model). ADR-003's no-architecture exception
does **not** extend here — and note ADR-003 lives on the unmerged
`feature/74-…` branch, so it is a cross-branch reference, not a resolvable
artifact on this one.

## Decisions (all closed 2026-08-27)

- **Q-01 = D** — `unavailable` does not affect the exit code by default;
  `--require-remote` opts into failing, and the scaffold's own CI uses it.
- **Q-02 = B** — a detected gap is `high` and fails the exit code. `critical`
  stays reserved for a broken installation.
- **Q-03 = C** — repo resolved by `gh repo view --json nameWithOwner` with a
  `--repo` override; the output names the repo it checked.
- **Q-04–Q-06** resolved as consequences: the checks ship to generated projects;
  C-04 verifies presence and the executable bit only; no caching in this slice.

**Live contingency:** Q-02 = B plus FR-16 means `doctor --require-remote` will
run against this repo's own settings in CI and may fail immediately. Budget
+0.5 to +2 days against the roadmap. If it fires, item 26 worked.

## Next action

**Run `scripts/spike-26-probe.sh` twice** — once with your `admin:repo` token,
once with a read-only token — and diff the outputs. Then fill in the Results
section of `docs/architecture/spike-26-github-api-shape.md`.

The delta between the two runs answers the question that decides this item's
reach: whether ordinary users can read enforcement state at all, or whether
`unavailable` becomes the normal case for everyone outside the scaffold's own CI.

Timebox 4 hours. Stop there and record what is known.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-27 | Transport is the `gh` CLI, not `fetch` + token | `scripts/setup-branch-protection.sh` already uses `gh api` and already checks presence, auth and scope. Raw `fetch` means this CLI handles a long-lived token — new secret surface, gitleaks exposure, and a contradiction of the documented OIDC posture |
| 2026-08-27 | Both legacy branch protection **and** rulesets are queried and merged | A repo may use either or both. Querying one surface reports a false "unprotected", which is worse than no check at all (BR-04) |
| 2026-08-27 | `doctor` stays read-only; writing stays in `setup-branch-protection.sh` | A diagnostic that mutates state is not safe to run, and blurs two tools' responsibilities |
| 2026-08-27 | `unavailable` is a first-class third state, never collapsed into pass or fail | With `gh` absent on most user machines, a silent pass would make the whole command dishonest |
| 2026-08-27 | Spike designed before the HLD, not after | Two of the HLD's core decisions — whether to design one tier or two, and whether the two protection surfaces must be merged by hand — are determined by the probe results. Writing the HLD first would be designing against an unverified API, then rewriting it |
| 2026-08-27 | Probe script lives in `scripts/` and is verified not shipped | `package.json` `files` ships only `scripts/token-report.js`; checked programmatically with picomatch. A spike produces a PoC, never shippable code (task-size-policy) |
| 2026-08-27 | Q-01 = D — report by default, `--require-remote` to enforce | `gh` is absent on most machines. A diagnostic that fails because a tool is missing gets removed from CI rather than fixed. The flag enforces where `gh` is guaranteed |
| 2026-08-27 | Q-02 = B — detected gap is `high`, exit 1 | `high` already means "a core guarantee is inert" in doctor's model, which is exactly what these checks detect. Reuses the existing exit rule with no new semantics |
| 2026-08-27 | Q-03 = C — `gh repo view` + `--repo` override | Identical to `setup-branch-protection.sh:60`. Read side and write side disagreeing on "which repo" would be a defect |
| 2026-08-27 | Inability to check and a detected gap never share an exit code (BR-06) | Not being able to verify is an environment problem the user may not control; finding a gap is one they can fix. Collapsing them is what makes diagnostics get ignored |
| 2026-08-27 | FR-33 targets the backlog's security-posture bullet, not `SECURITY.md` | `SECURITY.md` contains no shell-out claim — it is un-customised boilerplate whose Scope section names `apps/`, `packages/`, `infra/`, none of which hold this project's code. An earlier draft pointed FR-33 and AC-09 at a claim that does not exist |
| 2026-08-27 | Branched from `origin/dev`, not stacked on the item 74 branch | Per the 2026-07-14 lesson: stacked PRs conflict under a squash-merge policy |
| 2026-08-27 | Commit only the 0.5-day spike, not the 12.25-day total | Committing to an estimate that rests on an unverified external API shape is how estimates become fiction |
