# Spike — GitHub API shape for item 26's enforcement checks

**Date:** 2026-08-27
**Timebox:** 0.5 day (4 hours). Stop at the timebox and record what is known.
**Owner:** Lajin M J
**Status:** **Run 2026-08-27 — partially complete.** The anonymous tier is established; the authenticated tiers are not. See Results.
**Gates:** the 13.1-day implementation estimate in `docs/estimates/26-drift-aware-doctor-estimate.md`
**Probe:** `scripts/spike-26-probe.sh` (not shipped — the `package.json` `files` allowlist ships only `scripts/token-report.js`)

> A spike produces a written summary or a PoC, never shippable code
> (`docs/process/task-size-policy.md`). The probe script is throwaway; nothing from it merges into
> `src/`.

---

## Why this spike exists

The item 26 BRD is Approved and its behaviour is decided. What is **not** known is whether the
GitHub API will support the checks at all, for the users who will run them. Two questions decide
that, and both change the design rather than the effort:

1. **Can a normal user read enforcement state, or does it need `admin:repo`?**
   `scripts/setup-branch-protection.sh` requires `admin:repo` — but that is for **writing**.
   What reading requires is unverified. If reads also need `admin:repo`, most adopters will not
   grant it for a diagnostic, and `unavailable` becomes the common case rather than the fallback.
2. **Must legacy branch protection and rulesets both be queried, and what is "effective" when they
   disagree?** A repository can be protected by either mechanism, both, or neither. Querying one
   surface and reporting "unprotected" from its absence is a false negative — and `BR-04` says a
   false "unprotected" is worse than no check.

---

## Hypothesis worth testing explicitly

There appear to be **two tiers of readability**, and if so the design should prefer the lower tier:

| Tier | Endpoint | Expected access | Detail |
|---|---|---|---|
| Coarse | `GET /repos/{o}/{r}/branches/{branch}` | read | a `protected` boolean only |
| Coarse | `GET /repos/{o}/{r}/rules/branches/{branch}` | read | rules **in effect** for a branch |
| Detailed | `GET /repos/{o}/{r}/branches/{branch}/protection` | admin | full config incl. `enforce_admins` |
| Detailed | `GET /repos/{o}/{r}/rulesets` | admin (?) | ruleset definitions and bypass actors |

**If the coarse tier is readable without `admin:repo`,** item 26 can give every user a real answer to
"is this branch protected at all", and reserve `unavailable` for the detailed checks (C-03 admin
bypass in particular). That is a materially better product than all-or-nothing, and it is the single
most valuable thing this spike can establish.

**These endpoint names and access levels are candidates, not verified facts.** Establishing them is
the spike's job — do not copy this table into the HLD until the probe has confirmed it.

---

## Method

Run `scripts/spike-26-probe.sh` against this repository, twice:

1. **As maintainer**, with the existing `admin:repo`-scoped token — establishes the ceiling.
2. **With a reduced-scope token** (`gh auth login` with default scopes, or a fine-grained PAT with
   repo *read* only) — establishes the floor, which is what most users will actually have.

The delta between the two runs is the answer to question 1.

---

## Decision table

Record the outcome against each row before writing the HLD.

| Finding | Consequence for the design |
|---|---|
| Coarse tier readable without `admin:repo` | C-01 works for everyone. C-03 degrades to `unavailable` without admin. **Best case — design for two tiers** |
| Everything needs `admin:repo` | C-01–C-03 are `unavailable` for most users. Q-01's `--require-remote` becomes the main path, and the item's reach is mostly the scaffold's own CI. **Re-open scope with the maintainer** |
| `rules/branches/{branch}` returns effective rules from both mechanisms | One call answers C-01. The "merge two surfaces" problem may not exist |
| Rulesets and branch protection must be merged by hand | Define "effective" explicitly: a branch is protected if **either** mechanism protects it; bypass exists if **either** allows it. Most-permissive-wins for bypass, most-restrictive-wins for protection |
| Bypass actors are only in ruleset definitions (admin-gated) | C-03 is admin-only by construction. Say so in the check's `unavailable` reason rather than implying a transient problem |
| Required-check *history* is not retrievable | C-02's "observed reporting" needs a defined lookback over recent PRs, or it drops to configured-only with the limitation stated |
| Any endpoint is deprecated or moved | Record the replacement; do not design against a deprecated surface |

---

## Output contract

The spike is done when `docs/architecture/spike-26-github-api-shape.md` carries a **Results**
section with:

1. A per-endpoint table: endpoint, status code at admin scope, status code at read scope, and the
   fields actually needed by C-01–C-03.
2. A one-line answer to each of the two questions.
3. The decision-table rows marked with what was observed.
4. **The query list** — the exact calls the implementation will make. This becomes both the
   implementation contract (`FR-23`) and item 74's M-04 extraction contract (`FR-27` of the item 74
   BRD).

Until that section exists, the 13.1-day estimate stays LOW confidence and is not commitable.

---

## Explicitly not in this spike

- Any implementation in `src/`
- Non-GitHub forges — they are `unavailable` by decision, not by investigation
- Rate-limit behaviour (Q-06 resolved: no caching in this slice)
- The Wave 2 managed-file drift surface

---

## Results — run 2026-08-27, anonymous tier only

**Probed against `lajin-mohan/ai-scaffold` (public) with no credentials at all.** This is a *lower*
floor than the read-only-token run the method called for — and it turned out to be the informative
one.

### Per-endpoint access

| Endpoint | Anonymous | Carries |
|---|---|---|
| `GET /repos/{o}/{r}` | **200** | repo metadata, `private: false` |
| `GET /repos/{o}/{r}/branches/{b}` | **200** | `protected` boolean, `protection_url` |
| `GET /repos/{o}/{r}/rules/branches/{b}` | **200** | **rules in effect** for the branch, with `ruleset_id` |
| `GET /repos/{o}/{r}/rulesets` | **200** | id, name, target, `enforcement` |
| `GET /repos/{o}/{r}/rulesets/{id}` | **200** | `rules` + full `parameters` — but **no `bypass_actors` key at all** |
| `GET /repos/{o}/{r}/branches/{b}/protection` | **401** | `{"message": "Requires authentication"}` |
| `GET /repos/{o}/{r}/commits/{ref}/check-runs` | **200** | actual check runs and conclusions |
| `GET /repos/{o}/{r}/pulls?state=closed` | **200** | PR history for C-02's lookback |

### Question 1 — do reads need `admin:repo`?

**Partially answered: no, not for the coarse tier — on a public repo, not even a token.**

The `protected` boolean, the effective-rules list, the ruleset list and full ruleset rule
*parameters* are all readable anonymously. **C-01 can therefore give every user a real answer**,
which is the good outcome the hypothesis was hoping for.

**`bypass_actors` is absent from the anonymous ruleset detail** — not empty, the key is not present.
`enforce_admins` lives only in `/branches/{b}/protection`, which is 401. **C-03 is authentication-
gated by construction** and must say so in its `unavailable` reason rather than implying a transient
problem.

### Question 2 — must both surfaces be queried and merged?

**Answered: yes, and the proof is in this repository.**

| Branch | `protected` | `/rules/branches/{b}` | Protected by |
|---|---|---|---|
| `main` | `true` | `deletion`, `non_fast_forward`, `pull_request` (ruleset 18470539 `protected-main`, `enforcement: active`) | **Ruleset** |
| `dev` | `true` | **`[]` — empty** | **Legacy branch protection** (inferred: protected with no ruleset rules) |

This repository uses **a different mechanism per branch**. Querying only `/rules/branches/{b}` would
report `dev` as unruled; querying only `/branches/{b}/protection` returns 401 without auth. Either
single-surface implementation misreports one of the two branches.

**`BR-04` — "a false 'unprotected' is worse than no check" — was not a theoretical risk. It is the
live state of this repo.**

**"Effective" is therefore defined as:** a branch is protected if **either** mechanism protects it
(most-restrictive-wins for protection); a bypass exists if **either** mechanism allows one
(most-permissive-wins for bypass).

### Decision-table outcomes

| Finding | Observed | Consequence |
|---|---|---|
| Coarse tier readable without `admin:repo` | **Yes** (anonymous, public repo) | Design for two tiers. C-01 works for everyone |
| Everything needs `admin:repo` | No | — |
| `rules/branches/{b}` returns effective rules from both mechanisms | **No** — ruleset rules only; `dev` returns `[]` while being protected | The merge problem is real. FR-01 stands |
| Rulesets and branch protection must be merged by hand | **Yes** | Definition above |
| Bypass actors only in admin-gated data | **Yes** | C-03 is `unavailable` without auth, by construction |
| Required-check history retrievable | **Yes** | `/commits/{ref}/check-runs` and `/pulls` both 200 anonymously |

### Still unanswered — the spike is not finished

1. **Does a non-admin *authenticated* token read `/branches/{b}/protection`?** Only anonymous was
   tested. This decides whether C-03 needs `admin:repo` or merely any authenticated token — a
   materially different ask of the user.
2. **Private repositories.** Anonymous access worked *because this repo is public*. Most adopting
   teams are private, where even the coarse tier needs a token. **The floor for the actual user
   population is untested**, and this is now the highest-value remaining question.
3. Legacy branch-protection detail for `dev` was never seen (401), so `dev`'s protection is inferred
   from `protected: true` plus an empty rules list, not observed directly.

Re-run `scripts/spike-26-probe.sh` with (a) an admin token, (b) a read-only token, and (c) against a
private repo, to close these.

---

## Query list — the implementation contract (`FR-23`)

Also item 74's M-04 extraction contract (`FR-27` of the item 74 BRD).

| Check | Calls | Tier |
|---|---|---|
| C-01 protection | `GET /repos/{o}/{r}/branches/{b}` → `protected`; `GET /repos/{o}/{r}/rules/branches/{b}` → rule types; merge | coarse |
| C-02 required checks | rules/ruleset for a `required_status_checks` rule; `GET /repos/{o}/{r}/commits/{ref}/check-runs` for observed reporting; `GET /repos/{o}/{r}/pulls?state=closed` for the lookback | coarse |
| C-03 admin bypass | `GET /repos/{o}/{r}/branches/{b}/protection` → `enforce_admins`; `GET /repos/{o}/{r}/rulesets/{id}` → `bypass_actors` | **authenticated** |
| C-04 hook | local filesystem — `.git/hooks/pre-commit` exists and is executable | none |
| repo resolution | `gh repo view --json nameWithOwner`, `--repo` override | none |

---

## Observations about this repository

**Scope correction, 2026-08-27.** An earlier version of this section listed two of these as
*governance findings*. They are not. The maintainer has scoped the scaffold's governance to
**generated projects**: the `ai-scaffold` repository is the tool, not a governed project, and is
deliberately not subject to the branch, commit or CI gates it ships. Retained below as **API
observations** — they are evidence about how GitHub behaves, which is what the spike needed.

**1. `main` is ruleset-governed; `dev` is legacy-protected.** Ruleset `protected-main` carries
`deletion`, `non_fast_forward` and `pull_request` (1 approval,
`require_last_push_approval: false`). `dev` reports `protected: true` with an empty effective-rules
list. This is the evidence for FR-01 and BR-04 — a repo really can use a different mechanism per
branch. **Not a criticism of this repo's configuration.**

**2. No status check is required on `main` via the ruleset.** The legacy surface returned 401 and
was not read, so this is an observation about the ruleset only, not a statement about effective
protection. **Not a finding** — this repo is not held to the scaffold's gates.

**3. The shipped write-side script is blind to the surface that governs `main`.** This one **is** a
product defect, and it stands independently of how the scaffold repo is governed.
`scripts/setup-branch-protection.sh` — shipped to all 5 profiles — writes only
`PUT /branches/{b}/protection`. Its payload sets `require_last_push_approval: true` and
`dismiss_stale_reviews: true`; ruleset `protected-main` sets **both to `false`**. The same two
controls carry different values on two surfaces, the script prints `OK` regardless, and nothing
reports which is in force.

This repository is merely the specimen that made the behaviour visible. The defect is that **a
shipped tool configures governance it cannot observe** — which would bite an adopting team, where
the governance is real. Raised as **backlog item 75**, sequenced after item 26.
