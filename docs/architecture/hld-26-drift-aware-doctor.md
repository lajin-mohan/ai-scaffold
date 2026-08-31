# High-Level Design — Drift-aware `doctor`, enforcement slice (item 26)

**Date:** 2026-08-31
**Author:** Claude (Cowork session)
**Status:** Draft — Stage 3 artifact, pending Tech Lead approval
**Spec:** `docs/brd/26-drift-aware-doctor-brd.md` (Approved v2.2)
**Decisions:** ADR-004 (`gh` transport), ADR-005 (effective-protection merge)

> **No HLD template exists** and `docs/architecture/README.md` defines no naming convention for one —
> it names only `adr/`, `diagrams/` and `overview.md`. `.claude/templates/lld-template.md` is
> web-app shaped (tables, migrations, background jobs, caching). This document follows its spirit —
> module breakdown, specifications, sequence, error paths, security — and drops the sections that do
> not apply. **Recorded so the gap is visible: the scaffold ships an LLD template and no HLD
> template, while `task-size-policy.md` requires an HLD at size M.**

---

## 1. Overview

`doctor` gains four checks (C-01…C-04) that report **effective** governance rather than configured
intent. Three require GitHub; one is local. The design problem is not the checks — each is a few
lines once the data is in hand — it is everything around them: a subprocess boundary that must be
testable, two protection mechanisms that must be merged without inventing a false answer, a third
result state that must not break an existing contract, and a permission model whose shape is
**still partly unknown**.

### The unknown, and how this design handles it

The spike established that GitHub exposes two tiers of readability on a **public** repository:

| Tier | Endpoints | Anonymous (public repo) |
|---|---|---|
| **Coarse** | `GET /branches/{b}` → `protected`; `GET /rules/branches/{b}` → effective rule types | **200** |
| **Detailed** | `GET /branches/{b}/protection` → `enforce_admins`, required checks; `GET /rulesets/{id}` → `bypass_actors`, `enforcement` | **401** |

**Private repositories are untested, and most adopters are private.** Rather than wait on that
answer or assume one, this design makes **tier availability a runtime discovery, not a design-time
assumption**: the query layer probes what it can read and degrades per tier. That is the correct
design either way — the same code serves a public repo read anonymously, a private repo read with a
scoped token, and a repo whose owner granted only `repo:read`. **The private-repo probe therefore
stops being a blocker on Stage 3 and becomes a confirmation of behaviour the design already covers.**

---

## 2. Module breakdown

```
src/cli/commands/doctor.js        existing — wires C-01..C-04 into runDiagnostics()
src/cli/core/gh-runner.js         NEW — the subprocess boundary (ADR-004)
src/cli/core/github-protection.js NEW — query, tier discovery, merge (ADR-005)
```

| Module | Responsibility | Does not |
|---|---|---|
| `gh-runner` | Invoke `gh` via `spawnSync` array form; map process outcome to a typed result; enforce the shared wall-clock budget | Know about branches, rulesets or checks |
| `github-protection` | Resolve the repo, probe tiers, fetch, merge two surfaces, emit a typed protection report | Spawn processes, format output, decide severity |
| `doctor.js` | Turn the report into checks with `state`/`severity`/`reason`; render; aggregate; set exit code | Talk to GitHub |

The direction of dependency is one-way — `doctor.js` → `github-protection` → `gh-runner` — matching
the existing `commands/` → `core/` split. `core/` today does filesystem I/O only; this introduces
process and network into that layer, which is why the boundary is injected (ADR-004).

---

## 3. Interfaces

```js
// gh-runner.js
runGh(args, { cwd, budget })
  -> { ok: true,  stdout }                                   // exit 0
   | { ok: false, reason: 'gh-missing' | 'unauthenticated'
                        | 'forbidden' | 'not-found'
                        | 'timeout'   | 'unknown', detail }
```

`reason` is the vocabulary the whole feature degrades on. It exists because **`gh` collapses distinct
HTTP outcomes onto exit 1** — a 401, a 403 and a 404 are indistinguishable by exit code alone, and a
missing binary is `status === null` with `error.code === 'ENOENT'`. Mapping happens once, here, and
nowhere else.

```js
// github-protection.js
getProtection({ targetDir, repoOverride, budget, run })
  -> { repo, tiers: { coarse: 'ok'|'unavailable', detailed: 'ok'|'unavailable' },
       branches: { [name]: {
         protected: true|false|null,          // null = unavailable
         sources: { legacy: bool|null, ruleset: RulesetRef[]|null },
         requiredChecks: { configured: string[]|null, observed: string[]|null },
         bypass: { present: true|false|null, via: [...] },
         disagreements: [ { control, legacy, ruleset } ],   // R-09
       } },
       unavailableReasons: { [tier]: reason } }
```

`null` is the wire form of `unavailable` and is never coerced to `false`. **A false negative is the
failure mode this feature exists to avoid** (`BR-04`).

---

## 4. The three-state model

| `state` | `passed` | Human glyph | In aggregates? | Exit code |
|---|---|---|---|---|
| `pass` | `true` | `✓` | counted as success | — |
| `fail` | `false` | `✗ [CRIT/HIGH/MED/LOW]` | counted | 1 if critical/high |
| `unavailable` | `false` | `? [SKIP]` + reason | **excluded by default**; counted as failure under `--require-remote` | per FR-20 |

`passed === (state === 'pass')` (FR-25). The glyph constraint is not cosmetic:
`scripts/pre-publish-smoke.sh:442,463` grep `✗ \[(CRIT|HIGH)\]` and require zero, and `:668` greps
`"criticalFailed": 0`. **Generated projects have no remote, so every remote check is `unavailable`
there — that path is guaranteed on every release.** `? [SKIP]` and the narrowed aggregates are what
keep those gates green (FR-11, AC-18).

`--require-remote` flips `unavailable` into the failure count. It is the only mode in which the
aggregates and the exit code disagree with the default, and FR-20 defines both.

---

## 5. Primary sequence

```
doctor(targetDir)
 └─ local checks (15 existing + C-04)                      always run, no network
 └─ github-protection.getProtection({ targetDir, budget: 10s })
     ├─ resolve repo:  gh repo view --json nameWithOwner   cwd = targetDir   (FR-34)
     │    └─ fails → tiers all 'unavailable', reason from runner; RETURN
     ├─ validate owner/repo + branch against NFR-02 patterns before any path interpolation
     ├─ probe coarse:  GET /branches/{b}
     │    └─ 401/403 → coarse 'unavailable'  (private repo, no token — the untested case)
     ├─ coarse:        GET /rules/branches/{b}
     ├─ probe detailed:GET /branches/{b}/protection
     │    └─ 401/403 → detailed 'unavailable'; C-03 reports unavailable *by construction*
     └─ detailed:      GET /rulesets/{id}  |  GET /orgs/{org}/rulesets/{id}   (ADR-005)
 └─ merge → checks → render → aggregate → exit code
```

**Budget.** One 10s deadline for the whole run (NFR-01), decremented and passed down. `spawnSync`
blocks, and the call list is ~7 serial calls across two branches; a per-call timeout would total
~70s. On expiry the remaining checks are `unavailable` with reason `timeout` — never a failure.

---

## 6. Error and degradation paths

| Condition | Detected by | Result |
|---|---|---|
| `gh` not installed | `status === null`, `ENOENT` | all remote `unavailable`, reason names the install step |
| `gh` present, not authenticated | exit 1 + stderr match | `unavailable`, reason names `gh auth login` |
| No remote / not GitHub | `gh repo view` fails | `unavailable`, reason distinguishes "no remote" from "not GitHub" |
| Private repo, insufficient scope | coarse probe 401/403 | **coarse `unavailable`** — the case the private-repo probe will confirm |
| Public repo, no token | detailed probe 401 | coarse `ok`, detailed `unavailable`; C-01/C-02 answer, C-03 does not |
| Org-level ruleset, no org access | `/orgs/…` 403/404 | bypass `null`, **never "no bypass"** (R-08, ADR-005) |
| Budget exhausted | deadline | remaining `unavailable`, reason `timeout` |

Every reason names **one action** that would make the check available (FR-13). None renders as a
pass (FR-11).

---

## 7. Security

- **No token is accepted, stored, read from disk or logged** (FR-31, AC-15). Authentication is
  `gh`'s; this CLI never sees a credential. ADR-004 records why that decision drove the transport.
- **Array-form `spawnSync` only** — no shell, no interpolation into a command string.
- **Path validation before interpolation** (NFR-02): array form prevents shell injection but does
  **not** sanitise the API path. `owner/repo` must match `^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`, branch
  must be non-empty and whitespace-free, and both are rejected on `..` — otherwise a crafted
  `--repo` could redirect a `gh api` call to an arbitrary endpoint under the user's token.
- **Read-only by contract** (BR-02). No `-X`/`--method` other than GET reaches `gh api`; writing
  stays in `scripts/setup-branch-protection.sh`.
- The documented "only shell-out is `spawnSync('git', …)`" claim becomes false when this ships, and
  changes in the same commit along with `docs/cli-reference.md` (FR-33, AC-09, BR-05).

---

## 8. Testing

Fixtures are recorded **`gh` stdout plus exit code**, not HTTP responses — the transport is a
subprocess. `run` is injected (ADR-004), so no `vi.mock` of `child_process` is needed; the suite has
no such precedent today and this design avoids establishing one.

| Covers | Fixture |
|---|---|
| AC-01 | ruleset-only protection |
| AC-02 | required check configured, never observed |
| AC-03 | `enforce_admins: false` **and** ruleset `bypass_actors` |
| AC-17 | ruleset `enforcement: evaluate` → not protected |
| AC-05, AC-10 | `gh` absent, with and without `--require-remote` |
| AC-16 | `--repo`/cwd threading |
| AC-18 | no remote → `? [SKIP]`, smoke-gate greps still return 0 |

---

## 9. What this HLD does not decide

- **Whether the coarse tier is readable on a private repository.** Handled as runtime discovery
  (§1), so the design does not depend on the answer — but the *product reach* does, and that is a
  roadmap fact, not a design one.
- **The per-control disagreement set** beyond the three controls named in ADR-005. Extending it is
  additive.
- **Item 75's write side.** Sequenced after this item deliberately: the read side must define
  "effective" before the write side converges on it.
