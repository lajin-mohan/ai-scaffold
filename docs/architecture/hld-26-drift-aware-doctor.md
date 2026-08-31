# High-Level Design — Drift-aware `doctor`, enforcement slice (item 26)

**Date:** 2026-08-31
**Author:** Claude (Cowork session)
**Status:** **Approved** — 2026-08-31, Lajin M J (Technical Lead). Amended the same day after `/architecture-review`; see §1, §4, §7 and ADR-005 rule 3
**Spec:** `docs/brd/26-drift-aware-doctor-brd.md` (Approved v2.2)
**Decisions:** ADR-004 (`gh` transport), ADR-005 (effective-protection merge)

> **No HLD template exists.** `.claude/templates/` ships an LLD template only, while
> `task-size-policy.md` requires an HLD at size M. The naming convention was added to
> `docs/architecture/README.md` in the same commit as this file. `.claude/templates/lld-template.md` is
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
| **Coarse** | `GET /branches/{b}` → `protected`; `GET /rules/branches/{b}` → effective rule types; `GET /rulesets/{id}` → `rules`, `parameters`, `enforcement` | **200** |
| **Detailed** | `GET /branches/{b}/protection` → `enforce_admins`, required checks | **401** |
| **Field-gated** | `bypass_actors`, inside the ruleset response | **200, key absent** |

> **The third row is the one that bites.** The spike recorded `/rulesets/{id}` returning **200 with no
> `bypass_actors` key at all** — the key is *absent*, not empty. A status-code-driven degradation
> model never flips `detailed` to `unavailable` for that call, so a naive merge reads the missing key
> as "no bypass actors" and reports `bypass.present: false`. **That is the false negative `BR-04`
> exists to prevent, on observed data.** Hence FR-A below: field absence is an unavailability signal
> in its own right, independent of transport status.

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
// gh-runner.js — a closed constructor, NOT an argv passthrough
runGhApi(endpointPath, { cwd, budget })
  -> { ok: true,  json }                                     // exit 0, parsed
   | { ok: false, reason: 'gh-missing' | 'unauthenticated'
                        | 'forbidden' | 'not-found'
                        | 'timeout'   | 'unknown' }
```

The runner **builds its own argv** — always `['api', '--method', 'GET', endpointPath]` — and accepts
a path, never a command. It is the only thing in the package that spawns `gh`. This is what makes
"read-only" (BR-02) a property of the code rather than an honour-system claim: `gh api` switches to
**POST** on any `-f`/`-F`/`--field`/`--input`, so a free-form `runGh(args)` could not enforce it with
an `-X` check, and would also leave `gh repo delete` reachable.

**`detail` is deliberately absent from the return.** An earlier draft returned raw `gh` stderr
alongside the reason. That stderr carries the endpoint path — hence a **private repository name** —
and the resolved host, hence a **GitHub Enterprise hostname**; and `doctor --json` output is echoed
verbatim into CI logs by `scripts/pre-publish-smoke.sh:672`. It is the same disclosure class already
fixed in `scripts/spike-26-probe.sh`. All user-facing text comes from a fixed `reason` → message
table (FR-13's "one action"), never from `gh` output. Stderr is matched to classify, then dropped.

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

**FR-A — field absence is an unavailability signal.** A 200 response whose expected field is *absent*
yields `null` for that field, with its own reason, exactly as a 401 would. This is checked per field,
not per call: one response can carry a readable `enforcement` and an unreadable `bypass_actors`.
`bypass_actors` is the known case; the rule is general because the next permission-gated field will
behave the same way and will not announce itself.

---

## 4. The three-state model

| `state` | `passed` | Human glyph | In aggregates? | Exit code |
|---|---|---|---|---|
| `pass` | `true` | `✓` | counted as success | — |
| `fail` | `false` | `✗ [CRIT/HIGH/MED/LOW]` | counted | 1 if critical/high |
| `unavailable` | `false` | `? [UNAVAILABLE]` + reason | **excluded by default**; counted as failure under `--require-remote` | per FR-20 |

`passed === (state === 'pass')` (FR-25). The glyph constraint is not cosmetic:
`scripts/pre-publish-smoke.sh:442,463` grep `✗ \[(CRIT|HIGH)\]` and require zero, and `:668` greps
`"criticalFailed": 0`. **Generated projects have no remote, so every remote check is `unavailable`
there — that path is guaranteed on every release.** The distinct glyph and the narrowed aggregates
are what keep those gates green (FR-11, AC-18).

**Amended 2026-08-31 during implementation: the label is `[UNAVAILABLE]`, not `[SKIP]`.** "Skipped"
reads as an intentional omission; `unavailable` means verification was attempted and could not
produce evidence. FR-11 constrains only the glyph and the severity label, so this is a naming
correction within the approved requirement, not a spec change. The rendered line is
`? [UNAVAILABLE] Administrator bypass (GitHub) — insufficient GitHub permission`, with the remedy
on the following line: the condition and the action are different halves of the same sentence and
FR-13 wants both.

**Severity, and the C-04 trap.** §4's safety argument — that release gates stay green because
generated projects have no remote — covers only the three *remote* checks. **C-04 is local**: it
reports a verified negative, not `unavailable`. `src/cli/commands/init.js` contains no git logic, so
`INIT_DIR` in `scripts/pre-publish-smoke.sh:561` has no `.git` at all, and the gate at `:667-673`
requires `"criticalFailed": 0` **and** `"highFailed": 0`. At severity `high` that gate would fail on
every release. The rule:

| C-04 condition | state | severity |
|---|---|---|
| Target has no `.git` | `unavailable` | — (nothing was verified) |
| `.git` present, `pre-commit` present and executable | `pass` | — |
| `.git` present, hook missing or not executable | `fail` | `high` |

The middle case is the defect the check exists for, so `high` is right — and it *should* fail the
smoke gate if `create`'s best-effort hook install (`create.js:253-263`) ever silently degrades. The
first case is what keeps `INIT_DIR` green. C-01–C-03 are `high` when they detect a gap (FR-24).

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
- **Array-form `spawnSync` only** — no shell, no interpolation into a command string. Spawn options
  are **never serialised** into any error, log or output: `options.env` would carry a token.
- **Environment is inherited deliberately.** `spawnSync` passes `process.env` through, so where
  `GH_TOKEN` / `GITHUB_TOKEN` / `GH_ENTERPRISE_TOKEN` are set the credential does transit this
  process. ADR-004's claim is about **custody** — the CLI never reads, stores or logs it — not
  isolation. Inheritance is load-bearing: FR-16 wants generated projects to run
  `doctor --require-remote` in their own CI, where `gh` authenticates by env and nothing else.
  Scrubbing it would break FR-16.
- `stdio: ['ignore', 'pipe', 'pipe']` so `gh` cannot prompt on inherited stdin and stall the budget,
  and `GH_NO_UPDATE_NOTIFIER=1` so update notices do not pollute stderr classification.
- **Path validation before interpolation** (NFR-02). Array form prevents shell injection; it does
  **not** sanitise a request path, and it does not prevent *option* injection. The concrete rules,
  tightened after the 2026-08-31 architecture review:
  - `owner/repo`: `^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`, **and** neither segment may equal `.` or `..`
    or begin with `-`. Segment-wise, not substring — `../..` matches the charset.
  - branch: `^[A-Za-z0-9._/-]{1,255}$`, no segment equal to `.` or `..`, no leading `-`, no leading
    or trailing `/`.
  - **Why the branch rule is not "non-empty and whitespace-free":** `main#x` passes that weaker test
    and makes `gh api` request `…/branches/main` — the **coarse** endpoint — while the code believes
    it read the detailed one. A false verdict reached through a validation gap rather than an
    unavailable tier. `?` appends attacker-chosen query parameters to the same path.
  - Every remote-derived string rendered to the terminal (branch, repo, ruleset name, actor) is
    stripped of control characters first — `doctor` prints through chalk, and ANSI in a governance
    report is terminal spoofing.

> **Proposed AC amendment, flagged not applied:** AC-15 asserts that sentinel `GH_TOKEN` /
> `GITHUB_TOKEN` values never appear in output. It passes green over this whole class, because `gh`
> reliably never echoes tokens — it echoes *hostnames and repo paths*. AC-15 should also assert on a
> `GH_HOST` sentinel and a repo-name sentinel. **That is a BRD change and needs your approval; it is
> not made here.**
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
