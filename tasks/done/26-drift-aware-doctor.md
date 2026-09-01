# 26 — Drift-aware `doctor`, enforcement slice (Wave 1, rank 3, P0)

## Status

**COMPLETE 2026-09-01.** All ten stages closed. Shipped across two pull
requests:

| PR | Contents |
|---|---|
| [#134](https://github.com/lajin-mohan/ai-scaffold/pull/134) | Stage 5 — `gh-runner`, `github-protection`, `github-required-checks`, `governance-checks`, the `doctor` wiring, C-01…C-04, and the nine fixes from `/review` |
| #135 | Documentation and distribution closure — the adopter-facing CLI reference and the package allowlist |

### Acceptance criteria

- [x] C-01 queries **both** protection surfaces and reports the merged result (FR-01)
- [x] C-02 reports a required check satisfied only when configured **and** observed (FR-02)
- [x] C-03 reports bypass from `enforce_admins` **and** ruleset bypass actors (FR-03)
- [x] C-04 verifies the real `.git/hooks/pre-commit`, never inferred from settings (FR-04, FR-05)
- [x] A non-enforcing ruleset contributes nothing and is named, not dropped (FR-06)
- [x] `unavailable` is a first-class third state, never a pass, with a remedy naming one action (FR-10…FR-14, BR-03)
- [x] `--require-remote` enforces remote checks; local unavailable checks are unaffected (FR-15)
- [x] `--json` extended additively but for the documented aggregate narrowing (FR-20, FR-25)
- [x] Every check carries `state`, `verifiedBy` and, when unavailable, `reason` (FR-21, AC-13)
- [x] A detected gap is `high` and exits non-zero; inability to verify does not (FR-24, BR-06)
- [x] `gh` transport, no token accepted/stored/read/logged, no new dependency (FR-30…FR-32)
- [x] Falsified documentation updated in the same commits (FR-33, AC-09)
- [x] Repository resolved as the write side resolves it, `cwd` threaded, output names it (FR-34…FR-36)
- [x] Adopters receive the guidance: generated `.ai-scaffold/cli-reference.md` on both `create` and `init`, and `docs/cli-reference.md` in the packed artifact

### Verification at closure

- Unit suite **224/224**; publish smoke **115 OK / 0 FAIL**
- Packed tarball installed and used to generate a project — guidance present
- All five profiles plus `init` verified to receive the reference
- No runtime dependency added; `eslint .` clean

### Carried forward, deliberately

- **The private-repository / non-admin probe was never run** — no `gh`, no
  credentials, no private repository reachable from the authoring sandbox. The
  design does not depend on the answer: tier availability is runtime discovery,
  and the explicit third state is preserved everywhere behaviour would otherwise
  have to be inferred. R-06 stays open in the BRD as a confirmation task.
- **Item 78** (`init` overwrites the generated scaffold README) was found while
  closing this item and is filed rather than fixed here.
- **Item 75** (the write side is blind to rulesets) remains the counterpart:
  `doctor` can now see a drift that `setup-branch-protection.sh` cannot repair.

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
| 2026-08-31 | A 404 on `/branches/{b}/protection` is a THIRD legacy state (`absent`), not `unavailable` | GitHub answers that sub-resource with 404 for a branch with no legacy protection. Collapsing it into `unavailable` would make **every** unprotected branch report as unknown, which is BR-04's false negative in reverse. It stays a distinct state rather than `ok` because GitHub also masks insufficient permission with 404 on private repositories — and the non-admin/private probe that would separate the two could not be run (no `gh`, no credentials, no private repo reachable from the authoring sandbox). Bypass therefore treats `absent` as "no legacy door" ONLY while nothing else claims the branch is protected; when the coarse flag says protected and no active ruleset explains it, bypass reports `unavailable` rather than inferring |
| 2026-08-31 | A partially-resolved ruleset list is readable for protection but not for bypass | The rulesets we did read still protect (most-restrictive-wins). The one we could not read may carry `bypass_actors`, so its failure reason is carried on the result as `partialReason` and degrades bypass to `unavailable`. Dropping it silently is the same class of false negative as reading an absent `bypass_actors` as empty |
| 2026-08-31 | `unavailable` reasons are ranked by an explicit precedence, not by check order | Several surfaces can be unreadable at once. First-one-wins made the reported reason depend on the order the code happened to check them — a timed-out probe reported `not-found` because the legacy 404 was inspected first. Order is by what the operator must fix first: missing CLI → unauthenticated → forbidden → timeout → not-found → field-absent → unknown |
| 2026-08-31 | `unavailable` renders as `? [UNAVAILABLE] <name> — <condition>`, not `? [SKIP]` | "Skipped" reads as an intentional omission. `unavailable` means verification was attempted and produced no evidence — the opposite claim. FR-11 constrains the glyph and the severity label only, so this is a naming correction inside the approved requirement. `reasonPhrase` names the condition inline; `remedyFor` names the action on the next line (FR-13) |
| 2026-08-31 | Check construction lives in `core/governance-checks.js`, not inside `doctor.js` | The HLD's module table put it in `doctor.js`. Splitting it changes no dependency direction (`commands/` → `core/` is unchanged) and is what makes AC-13's `passed === (state === 'pass')` invariant assertable without a filesystem, a subprocess or a rendered line. Every check leaves that module through one constructor, so the invariant cannot be violated by adding a check |
| 2026-08-31 | `normalizeLocalCheck` is idempotent, and pass-time notes use `note`, not `message` | Two defects found by the first green run, not by review. (a) Deriving `state` from `passed` for every check flattened C-04's third state into a verified `fail` — inventing a gap that was never observed. (b) Several pre-existing checks set `message` unconditionally, so rendering a note on a passing check printed "Not a git repository" beside a green tick |
| 2026-08-31 | `--require-remote` counts only `verifiedBy: 'api'` checks | A flag about remote enforcement cannot speak to a local check that verified nothing. C-04 with no `.git` stays out of the counts in both modes |
| 2026-08-31 | A verified gap outranks an unreadable branch in C-01 and C-03 | If `main` is provably unprotected and `dev` timed out, the answer is "unprotected: main", not "unavailable". BR-06 separates the two failures precisely so the one the user can fix is not hidden behind the one they may not control. The unreadable branch is still named in the message |
| 2026-08-31 | Remote checks short-circuit before any subprocess when the target has no `.git` and no `--repo` | `gh repo view` would spend the budget to report what a `pathExists` already knows, making every release smoke run slower for the same `unavailable`. FR-36 is unaffected: the result is still `unavailable`, never a fall-through to the ambient repository |
| 2026-08-31 | C-02 (required checks) is NOT in this slice | Its second half — "observed reporting on recent pull requests" — is a distinct data source with its own call budget and its own unavailability modes (list recent PRs, then check-runs per head SHA). Wiring it into the same commit as C-01/C-03/C-04 would make both harder to review. Registering it now as a permanently `unavailable` check would be a fake check, which is BR-01 in reverse. Next slice |
| 2026-08-31 | The reported "3 high-severity failures" beside two `? [UNAVAILABLE]` lines was correct; the sample was truncated | Raised as a possible contradiction in review. The elided output lines held two more verified failures (`MEMORY.md`, `settings-overrides.json`). Settled by a hand-built fixture with EXACTLY three high checks — one verified fail, two unavailable — asserting `highFailed === 1` and exit 1 by default, `highFailed === 3` and exit 1 under `--require-remote`, and that no unavailable check is described as failed or rendered with `✗`. The reading was wrong; the risk it named is now regression-guarded |
| 2026-08-31 | C-02 lookback contract: up to 5 most recent **merged** pull requests into the first governed branch | A closed-unmerged PR may have been abandoned before its checks ran, so its silence proves nothing; merged PRs are exactly the population the gates let through. The scan short-circuits once every configured context has been seen, so the healthy case costs one pull request. Evidence source is check runs **and** commit statuses on the PR head — a status-only CI would otherwise read as "never reported" |
| 2026-08-31 | C-02 evaluates the first governed branch only, and names it | Required contexts are per-branch: unioning them across `main` and `dev` and observing on one would fail a dev-only requirement against main's history — a fabricated gap. Observation also costs a call per pull request against ONE 10s deadline (NFR-01); doing it twice would push the common case into `timeout`, converting a verified answer into an unavailable one |
| 2026-08-31 | A truncated check-run scan yields `unavailable`, never `fail` | Not finding a check run is evidence of absence only when the scan was complete. `total_count` above what the page budget read sets `truncated`, and an unobserved context under truncation reports `evidence-truncated` — the same discipline as an absent `bypass_actors` |
| 2026-08-31 | Field-absence is asymmetric between the two surfaces for `required_status_checks`, deliberately | On the legacy surface an omitted key reads as "none configured": that endpoint is all-or-nothing (401 without admin), so a 200 body is a complete body, and the worst case is a visible `fail`, never a silent pass. On the ruleset surface a `required_status_checks` RULE with no parameters key is a partial body and IS unavailable, exactly as `bypass_actors` is (ADR-005 rule 3) |
| 2026-08-31 | A commit status can satisfy an app-blind requirement but never an app-qualified one | Not every CI posts check runs, so ignoring the Statuses API would report a false gap for status-based pipelines. A status carries no app identity, so accepting one for a requirement that names an `app_id`/`integration_id` would assert an identity that was never observed |
| 2026-08-31 | `rate-limited` is a distinct reason, ranked above `forbidden` | GitHub returns 403 for rate limiting as well as for permission. The remedies are opposite — wait versus obtain access — and a rate limit blocks every remaining call regardless of repository, so it must outrank a per-surface permission gap in the precedence order |
| 2026-08-31 | `mergeBranch` carries the tagged inputs as `raw`, which never reaches `details` | C-02's configured half reads bodies `getProtection` already fetched, so it costs no extra requests. Ruleset bodies carry bypass actor ids and `--json` is echoed into CI logs, so `raw` is deliberately excluded from every check's `details` |
| 2026-08-31 | `/review` (adversarial subagent) found 10 defects; 9 fixed, 1 kept with its assumption stated | Fixes: (1) a partially-resolved ruleset list could produce a confident "not protected" — the unread ruleset may be the one protecting the branch, so a partial resolve now supports only the POSITIVE verdict; (2) a check-run scan that spent its page budget with no `total_count` in the body reported `truncated: false`, turning a page limit into evidence of absence; (3) the hardcoded `['main','dev']` made every repository without a `dev` branch permanently `unavailable`, and exit 1 under `--require-remote` — a 404 on the coarse branch endpoint is now `absent` and excluded; (4) C-02's window was one page of 20 CLOSED pull requests, so unmerged ones could crowd out the merges and produce a stale, biased population while the output claimed "the 5 most recent" — the listing now pages until it has enough merges or marks itself truncated, and reports the window it actually examined; (5) a 200 whose `/rules/branches` body was not an array was read as "no rulesets", yielding a confident `fail` on C-01 and a green `pass` on C-03 from a body nobody parsed; (6) C-03 printed a green tick for a branch with no protection at all — bypass is now scored only over branches that are protected or unreadable, and reports `not-protected` when none are; (7) `reason` came from the precedence table while `remedy` came from whichever branch was first in iteration order, so "insufficient permission" could be printed over a timeout remedy; (8) disagreement detection read non-enforcing rulesets (a `disabled` ruleset could manufacture a finding the same note called "not counted") and compared only the first `pull_request` rule; (9) `ruleset_id` and a pull-request head `sha` came from the API and were interpolated into request paths unvalidated. **Kept:** an omitted legacy `required_status_checks` still reads as "none configured" — the endpoint is all-or-nothing, and the worst case is a visible `fail`, never a silent pass — but the message now states that assumption rather than leaving it implicit |
| 2026-08-31 | `runGhApi` and `runGhRepoView` are now tested against a `gh` stub on `PATH` | The review's fairest criticism: the module's headline guarantees — closed argv, "raw stderr NEVER leaves this module", the pre-spawn budget short-circuit, the `JSON.parse` failure path — had zero coverage, because only the pure helpers were tested. The stub asserts the exact argv, that a token sentinel, a private repository name and an Enterprise hostname in stderr reach no output, and that an exhausted budget returns in well under a second rather than hanging on `spawnSync`'s `timeout: 0` |
