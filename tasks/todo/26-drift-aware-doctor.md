# 26 — Drift-aware `doctor`, enforcement slice (Wave 1, rank 3, P0)

## Status

**Stage 5 IN PROGRESS.** First slice — `src/cli/core/gh-runner.js` + tests —
complete: 18 tests, suite 92/92. Next: `github-protection.js` (tier discovery,
ADR-005 merge), then the `doctor.js` wiring.

**Stages 1–4 CLOSED 2026-08-31. `/kickoff` = 🟢 GO.** BRD v2.2, the 15.4-day
estimate, and the HLD are all approved; ADR-004 and ADR-005 accepted; Stage 4
(UX) recorded N/A. **Stage 5 (Execution) is unblocked** — two conditions carried,
below.

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
| 3 — Architecture | `docs/architecture/hld-26-drift-aware-doctor.md` | **Approved 2026-08-31** |
| 3 — Architecture | `docs/architecture/adr/004-gh-subprocess-transport-with-injected-runner.md` | Accepted |
| 3 — Architecture | `docs/architecture/adr/005-effective-protection-merge-semantics.md` | Accepted |
| 5 — Execution | `src/cli/core/gh-runner.js` + `src/__tests__/gh-runner.test.js` | **Slice 1 done** — 18 tests |
| 4 — UX | **N/A — recorded, not skipped** | No UI. `task-size-policy.md` marks UX "Required (if UI)" at size M; `doctor` is a CLI whose only surface is stdout and `--json`. Recorded so `/kickoff` sees a decision rather than an absence |

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

## `/kickoff` — 2026-08-31 · 🟢 GO

| Gate | | Note |
|---|---|---|
| 1 — Requirements | ✅ | BRD Approved v2.2 — 26 FRs, 6 NFRs, 18 ACs, analysis closed |
| 2 — UX / Design | ✅ N/A | No UI; `doctor`'s only surface is stdout and `--json`. Recorded as a decision |
| 3 — Architecture | ✅ | HLD approved; ADR-004 + ADR-005 accepted; `/architecture-review` run |
| 4 — Estimation | ✅ | Approved at 7.8 / 15.4 / 28.8; 13 risks across BRD + estimate |
| 5 — QA Strategy | ⚠️ | Fixtures and test mapping in HLD §8. **No UAT plan** — likely N/A for a maintainer-facing check, but undecided |
| 6 — Governance | ⚠️ | CR template, DoD rules, escalation path all exist. **RACI is one person** — recorded, not resolvable at this team size |

**Blockers: none.** Both prior blockers — the Draft HLD and the unrun
`/architecture-review` — are closed.

**Conditions carried into Stage 5** (per `/kickoff`'s rules, each needs an owner):

1. **UAT decision** — produce a plan or record N/A with a reason. Owner: maintainer.
2. **Private-repo probe** — does not block the design (tier availability is a
   runtime discovery), but determines whether C-01 reaches most adopters or only
   admin-token users. Owner: maintainer. **Worth closing before spending 15 days.**

## `/architecture-review` — 2026-08-31

**Verdict: APPROVED WITH CHANGES** (architect) / **CHANGES REQUIRED** (security).
Not a redesign — both reviewers found the structural decisions sound. Four
findings changed the design and are fixed:

- **C1** the tier model contradicted the spike on `/rulesets/{id}`: 200 with
  `bypass_actors` **absent**, not 401. A status-driven model would have read the
  missing key as "no bypass" — the false negative `BR-04` exists to prevent, on
  observed data. Fixed by ADR-005 rule 3: field absence is unavailability.
- **C3** the smoke-gate safety argument covered only remote checks. C-04 is
  local; `init.js` has no git logic, so `INIT_DIR` has no `.git`, and at `high`
  the gate at `pre-publish-smoke.sh:667-673` would fail every release. Fixed by
  an explicit C-04 state table: no `.git` → `unavailable`.
- **Security BLOCK-1** `detail` had no defined sink; raw `gh` stderr would have
  reached `--json` → CI logs, carrying private repo names and Enterprise
  hostnames. Same class as the spike-probe fix. Stderr now never leaves the runner.
- **Security BLOCK-2** "read-only" was unenforceable — `gh api` POSTs on any
  `-f`/`-F`. The runner is now a closed constructor taking an endpoint path.

Also fixed: env inheritance stated as a deliberate decision (FR-16 depends on
it); branch validation tightened (`main#x` would have silently read the coarse
endpoint); bypass actors reported by type not identity; two false claims of mine
withdrawn.

**Deferred to implementation** — the reviewers' remaining Significant items are
§3/§5 precision (the `reason` enum overflowing its own table, per-field reason
slots, the `doctor.js` line-by-line change list, the branch-name source, and
splitting the pure merge module). Each is the kind of thing the first fixture
forces. **Recorded so they are chosen, not forgotten.**

## Open design questions — RESOLVED by Stage 3 (2026-08-31)

- **R-08** org-level rulesets → **ADR-005**: branch on `ruleset_source_type`; where
  the org endpoint is inaccessible the bypass contribution is `null`, never "no bypass".
- **R-09** two-surface control disagreement → **ADR-005 rule 4**: reported at
  `medium` alongside the merged verdict, so the read side can see the defect
  item 75 exists to fix. Initial control set is three; extending it is additive.
- **Mock seam** → **ADR-004**: an injected runner (`{ run = defaultGhRun } = {}`).
  Fixtures are recorded `gh` stdout plus exit code, so no `vi.mock` of
  `child_process` is needed — the suite has no such precedent and this avoids
  establishing one.

**The private-repo question is no longer a Stage 3 blocker.** The HLD makes tier
availability a **runtime discovery** rather than a design-time assumption, so the
same code serves a public repo read anonymously and a private one read with a
scoped token. The probe still matters — it tells us the product's *reach* — but it
no longer gates the design.

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
| 2026-08-31 | Stage 3 written before the private-repo probe, deliberately | The HLD treats tier availability as runtime discovery, not a design-time assumption, so the design is correct either way. The probe now confirms reach rather than shaping architecture |
| 2026-08-31 | Stage 4 (UX) recorded N/A rather than skipped | `doctor` is a CLI; its only surface is stdout and `--json`. Same discipline as ADR-003 — a silent skip is the pattern this scaffold exists to catch |
| 2026-08-31 | BRD v2.2 and the full 15.4-day estimate approved | Signed scope includes the 1.0 d Stage 3 row and the 1.25 d v2.2-requirements row. Changing the requirement set or dropping Stage 3 is a >20% deviation requiring re-estimation |
| 2026-08-31 | Approve the remaining 0.25-day spike only; keep the full estimate pending | Superseded the same day by the full approval above. The authenticated non-admin and private-repository behaviour still determines product reach and architecture confidence |
