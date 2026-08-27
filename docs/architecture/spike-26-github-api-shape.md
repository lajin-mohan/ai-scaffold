# Spike — GitHub API shape for item 26's enforcement checks

**Date:** 2026-08-27
**Timebox:** 0.5 day (4 hours). Stop at the timebox and record what is known.
**Owner:** Lajin M J
**Status:** Designed — not yet run
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

## Results

*Not yet run.*
