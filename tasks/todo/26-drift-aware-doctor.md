# 26 — Drift-aware `doctor`, enforcement slice (Wave 1, rank 3, P0)

## Status

**Stages 1 and 2 CLOSED 2026-08-31.** BRD **v2.2 approved** and the full **15.4-day**
estimate approved; the scope statement is approved. **Stage 3 (HLD + ADR) is the
only open gate**; `/kickoff` follows it.

**Spike run 2026-08-27 — partial.** Anonymous tier established, merge
requirement proven, query list documented **at the anonymous tier** — `FR-23` / item 74 `FR-27`
**provisional** until the authenticated and private-repo tiers are probed.
**Two questions remain: authenticated non-admin reads, and private repositories.**
The private-repo case is untested and is the case most adopters are in.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-analysis.md` | Draft |
| 1 — Analysis | `docs/brd/26-drift-aware-doctor-brd.md` | **Approved v2.2** 2026-08-31 |
| 2 — Plan | `docs/estimates/26-drift-aware-doctor-estimate.md` | **Approved 2026-08-31** — **15.4 d realistic**, MEDIUM confidence |
| 2 — Plan | `docs/process/26-drift-aware-doctor-scope.md` | **Approved** |
| 3 — Architecture | `docs/architecture/spike-26-github-api-shape.md` + `scripts/spike-26-probe.sh` | **Run — partial. Query list documented** |
| 3 — Architecture | HLD + ADR | Unblocked for the two-tier design; private-repo answer still wanted |

## Size

**Escalated S → M.** The backlog rank table and item definition now say `M`; the
estimate is 15.4 realistic days. `task-size-policy.md` permits this — "Escalation
is not failure. It means the initial sizing was imprecise."

Unlike item 74, this item has genuine architecture to design (transport choice,
two-API merge semantics, degradation model). ADR-003's no-architecture exception
does **not** extend here — and note ADR-003 lives on the unmerged
`feature/74-…` branch, so it is a cross-branch reference, not a resolvable
artifact on this one.

## Decisions (all closed 2026-08-27)

- **Q-01 = D** — `unavailable` does not affect the exit code by default;
  `--require-remote` opts into failing, for an **adopting project's** CI. The
  scaffold repository is out of scope; no contingency is carried.
- **Q-02 = B** — a detected gap is `high` and fails the exit code. `critical`
  stays reserved for a broken installation.
- **Q-03 = C** — repo resolved by `gh repo view --json nameWithOwner` with a
  `--repo` override; the output names the repo it checked.
- **Q-04–Q-06** resolved as consequences: the checks ship to generated projects;
  C-04 verifies presence and the executable bit only; no caching in this slice.

**No scaffold-repository contingency is carried.** `--require-remote` is for an
adopting project's CI; this repository does not run the governance gates it
ships.

## Open design questions — Stage 3 inputs (added 2026-08-31)

- **R-08** Org-level rulesets are not addressable under `/repos/{o}/{r}/rulesets/{id}`;
  the probe ran only against a personal repo, and adopting teams are the org case.
- **R-09** `doctor` as specified cannot detect the two-surface control disagreement
  item 75 exists to fix — C-01 collapses to protected/unprotected.
- **Mock seam** — the transport is a subprocess, so a fixture is stdout plus an
  exit code; the suite has no `vi.mock` precedent. Whether NFR-05 requires an
  injected runner is undecided.

## Next action

**Close the two open spike questions**, then write the HLD.

1. Run `scripts/spike-26-probe.sh` against a **private** repository. Anonymous
   access worked only because this repo is public; most adopting teams are
   private, and their floor is untested.
2. Run it with an authenticated **non-admin** token to see whether
   `/branches/{b}/protection` opens up below `admin:repo`.

Then: HLD for the two-tier design + an ADR for the "effective protection"
merge semantics.

## Scope: what this governance applies to

**Maintainer directive 2026-08-27.** The `ai-scaffold` repository is the tool,
not a governed project. It keeps its build/test/release workflows and is **not**
subject to the branch, commit or CI gates it ships. Nothing in this item asserts
a requirement against this repo's own protection settings.

Consequences already applied: FR-16 retargeted to adopting projects; the
"fails on our own repo" contingency withdrawn from the estimate; the spike's
repo-level observations demoted from findings to API evidence.

## One real defect surfaced by the spike

**The shipped `setup-branch-protection.sh` writes only the legacy surface.** It
sets `require_last_push_approval: true` / `dismiss_stale_reviews: true`, while
the ruleset governing `main` here sets both to `false` — and it prints `OK`
regardless. This repo is the specimen, not the problem: the defect is that a
shipped tool configures governance it cannot observe, which is harmless here and
load-bearing in an adopting team's repo. Raised as **backlog item 75**,
sequenced after this one.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-27 | Transport is the `gh` CLI, not `fetch` + token | `scripts/setup-branch-protection.sh` already uses `gh api` and already checks presence, auth and scope. Raw `fetch` means this CLI handles a long-lived token — new secret surface, gitleaks exposure, and a contradiction of the documented OIDC posture |
| 2026-08-27 | Both legacy branch protection **and** rulesets are queried and merged | A repo may use either or both. Querying one surface reports a false "unprotected", which is worse than no check at all (BR-04) |
| 2026-08-27 | `doctor` stays read-only; writing stays in `setup-branch-protection.sh` | A diagnostic that mutates state is not safe to run, and blurs two tools' responsibilities |
| 2026-08-27 | `unavailable` is a first-class third state, never collapsed into pass or fail | With `gh` absent on most user machines, a silent pass would make the whole command dishonest |
| 2026-08-27 | "Effective protection" = most-restrictive-wins for protection, most-permissive-wins for bypass | Derived from the observed split: `main` ruleset-protected, `dev` legacy-protected. A branch is protected if either mechanism protects it; a bypass exists if either allows one |
| 2026-08-27 | C-03 is authentication-gated by construction, not by circumstance | `bypass_actors` is absent from anonymous ruleset detail and `/branches/{b}/protection` returns 401. Its `unavailable` reason must say so rather than implying a transient problem |
| 2026-08-27 | Spike designed before the HLD, not after | Two of the HLD's core decisions — whether to design one tier or two, and whether the two protection surfaces must be merged by hand — are determined by the probe results. Writing the HLD first would be designing against an unverified API, then rewriting it |
| 2026-08-27 | Probe script lives in `scripts/` and is verified not shipped | `package.json` `files` ships only `scripts/token-report.js`; checked programmatically with picomatch. A spike produces a PoC, never shippable code (task-size-policy) |
| 2026-08-27 | Q-01 = D — report by default, `--require-remote` to enforce | `gh` is absent on most machines. A diagnostic that fails because a tool is missing gets removed from CI rather than fixed. The flag enforces where `gh` is guaranteed |
| 2026-08-27 | Q-02 = B — detected gap is `high`, exit 1 | `high` already means "a core guarantee is inert" in doctor's model, which is exactly what these checks detect. Reuses the existing exit rule with no new semantics |
| 2026-08-27 | Q-03 = C — `gh repo view` + `--repo` override | Identical to `setup-branch-protection.sh:60`. Read side and write side disagreeing on "which repo" would be a defect |
| 2026-08-27 | Inability to check and a detected gap never share an exit code (BR-06) | Not being able to verify is an environment problem the user may not control; finding a gap is one they can fix. Collapsing them is what makes diagnostics get ignored |
| 2026-08-27 | FR-33 targets the backlog's security-posture bullet, not `SECURITY.md` | `SECURITY.md` contains no shell-out claim — it is un-customised boilerplate whose Scope section names `apps/`, `packages/`, `infra/`, none of which hold this project's code. An earlier draft pointed FR-33 and AC-09 at a claim that does not exist |
| 2026-08-27 | Branched from `origin/dev`, not stacked on the item 74 branch | Per the 2026-07-14 lesson: stacked PRs conflict under a squash-merge policy |
| 2026-08-27 | Commit only the 0.5-day spike, not the 13.1-day total | Committing to an estimate that rests on an unverified external API shape is how estimates become fiction |
| 2026-08-31 | BRD v2.2 and the full 15.4-day estimate approved | Signed scope includes the 1.0 d Stage 3 row and the 1.25 d v2.2-requirements row. Changing the requirement set or dropping Stage 3 is a >20% deviation requiring re-estimation |
| 2026-08-31 | Approve the remaining 0.25-day spike only; keep the full estimate pending | Superseded the same day by the full approval above. The authenticated non-admin and private-repository behaviour still determines product reach and architecture confidence |
