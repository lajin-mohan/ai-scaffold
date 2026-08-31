# ADR-005: Effective-protection merge semantics

**Date:** 2026-08-31
**Status:** Accepted (amended 2026-08-31 after `/architecture-review` — rule 3 added, alternative-B evidence corrected)
**Deciders:** Lajin M J (Technical Lead)
**Consulted:** `docs/architecture/spike-26-github-api-shape.md` (observed data), BRD v2.2 FR-01/FR-06/FR-03, R-08, R-09

---

## Context

GitHub protects a branch through **two independent mechanisms**: legacy branch protection
(`/branches/{b}/protection`) and repository or organisation **rulesets** (`/rulesets`,
`/rules/branches/{b}`). A branch may be covered by either, both, or neither.

This is not theoretical. The spike found it live in this repository:

| Branch | `protected` | Effective ruleset rules | Actually protected by |
|---|---|---|---|
| `main` | `true` | `deletion`, `non_fast_forward`, `pull_request` (ruleset `protected-main`, `enforcement: active`) | **Ruleset** |
| `dev` | `true` | **`[]` — empty** | **Legacy branch protection** |

A different mechanism per branch, in one repository. Querying only `/rules/branches/{b}` reports
`dev` as unruled; querying only `/branches/{b}/protection` returns 401 without a token. **Either
single-surface implementation misreports one of the two branches.**

Three further facts constrain the answer:

- **`enforcement` is a mode, not a flag.** A ruleset can be `active`, `evaluate` or `disabled`. An
  `evaluate` ruleset appears in `/rules/branches/{b}` and **blocks nothing**.
- **Org-level rulesets are not addressable under `/repos/{o}/{r}/rulesets/{id}`.** They appear in the
  branch rules list but need `/orgs/{org}/rulesets/{id}`. The probe ran only against a personal repo;
  adopting teams are the org case (R-08).
- **The two surfaces can set the same control to opposite values.** Observed here: ruleset
  `protected-main` sets `require_last_push_approval: false` and `dismiss_stale_reviews_on_push:
  false`, while `setup-branch-protection.sh` writes `true` for both on the legacy surface (R-09).

---

## Decision

**Query both surfaces and merge, with three rules:**

1. **Protection — most-restrictive-wins.** A branch is protected if legacy protection covers it
   **or** an `enforcement: active` ruleset applies rules to it. `evaluate` and `disabled` rulesets
   contribute nothing and are **named in the output** rather than silently dropped (FR-06).
2. **Bypass — most-permissive-wins.** A bypass exists if `enforce_admins.enabled === false` **or**
   any active ruleset carries non-empty `bypass_actors`. Where either source cannot be read, bypass
   is `null` — **never `false`**.
3. **Field absence is unavailability, not a negative.** A 200 response whose expected field is
   *absent* yields `null` for that field, with its own reason — identical treatment to a 401. Checked
   per field, not per call.

   The known case is the one the spike observed: `GET /rulesets/{id}` returns **200 with no
   `bypass_actors` key at all** at the anonymous tier. A status-code-driven model never marks that
   call unavailable, so rule 2 read as-written would evaluate the missing key as "no bypass actors"
   and report `bypass.present: false` — **the false negative this ADR exists to prevent, on data we
   have already seen.** The rule is stated generally because the next permission-gated field will
   behave the same way and will not announce itself.

4. **Disagreement is a finding, not a merge input.** When both surfaces define the same control with
   different values, report it at `medium` alongside the merged verdict. Initial control set:
   `require_last_push_approval`, stale-review dismissal, and required approving review count.

Org-level rulesets are resolved by branching on `ruleset_source_type`; when the org endpoint is
inaccessible, the ruleset's bypass contribution is `null`, not absent.

**Bypass actors are reported by type and count, not by identity.** `bypass_actors` resolves to org
teams, individual users and GitHub Apps. The verdict this check delivers — *a bypass exists* — does
not require naming anyone, and `--json` reaches CI logs (`scripts/pre-publish-smoke.sh:672`) and
transcribed evidence in committed documents. Default output is `[{ type: 'team' }, { type: 'app' }]`;
identities appear only in human terminal output.

---

## Rationale

`BR-04` — *a false "unprotected" is worse than no check* — is what forces both queries. A tool that
reports a protected branch as unprotected destroys trust in every other check it makes, and the
repository that would have triggered it is the one the tool was written in.

The asymmetry between rules 1 and 2 is deliberate. For **protection**, the union is what the platform
actually enforces, so most-restrictive is simply true. For **bypass**, a single open door is open:
reporting "no bypass" because one of two sources was unreadable would be exactly the false negative
`BR-04` prohibits.

**Rule 4** exists because merging alone would hide the defect **item 75 exists to fix**. If C-01
collapses to protected/unprotected, `doctor` reports green on precisely the configuration where a
shipped script is writing one value while a ruleset enforces the opposite — and item 75 would land
with no verification surface. The read side has to be able to see the thing the write side is
being fixed for.

---

## Alternatives considered

### Option A: Query only rulesets
**Why rejected:** reports `dev` as unruled in this very repository. Rulesets are newer and
increasingly default, which makes this tempting and wrong.

### Option B: Query only legacy branch protection
**Why rejected:** 401 without a token, so it discards the spike's most valuable finding — that the
coarse tier answers for every user of a public repo. (An earlier draft also claimed it "would miss
`main` here"; the spike never read `/branches/main/protection`, so that half was unverified and is
withdrawn. The 401 ground alone is sufficient.)

### Option C: Query both, merge, and report disagreement (chosen)
**Why chosen:** the only option that cannot produce a false "unprotected", and the only one that can
see the two-surface disagreement that motivates item 75.

---

## Consequences

### Easier
- C-01 answers correctly regardless of which mechanism a team uses.
- Item 75 gains a verification surface before it is built.
- `evaluate`-mode rulesets stop reading as protection — a silent false pass removed.

### Harder
- Two query paths, two failure modes, and an org-vs-repo branch in the ruleset lookup.
- The per-control disagreement set is a maintained list; GitHub adds ruleset parameters over time.

### New problems
- **A control present on one surface and absent on the other is not a disagreement** — it is
  coverage, and the merge treats it as such. That distinction will be easy to get wrong in
  implementation and is the most likely source of a false `medium` finding.
- Org-level ruleset access depends on permissions this tool may never have, so `null` bypass will be
  common in exactly the org setting where bypass matters most.

### Trade-offs accepted
- More calls per run, inside NFR-01's single 10s budget.
- The initial disagreement set covers three controls, not every ruleset parameter. Extending it is
  additive and does not reopen this decision.

---

## Implementation notes

- `null` is the wire form of `unavailable` and is never coerced to `false` at any layer. Prefer a
  tagged result (`{ status, value, reason }`) over a bare `null` — `null` and `false` are
  falsy-identical, so `!bypass.present` reads wrong and lints clean.
- Ruleset `enforcement` must be read **before** the ruleset's rules are allowed to contribute.
- The disagreement check compares only controls **present on both** surfaces.

---

## Review date

Revisit when GitHub retires legacy branch protection (at which point rule 1 collapses to the ruleset
surface alone), or when a fourth control is added to the disagreement set — the third addition is the
signal that the set wants deriving from a schema rather than a list.

---

## Related ADRs

- ADR-004: `gh` subprocess transport, behind an injected runner
