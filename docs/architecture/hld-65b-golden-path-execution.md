# High-Level Design — Packed-artifact golden-path execution (item 65b)

**Date:** 2026-09-01
**Author:** Claude (Cowork session)
**Status:** **Draft — pending independent architecture review**
**Source spec:** `docs/brd/65-golden-path-execution-brd.md` (v1.0, Q-01…Q-04 decided)
**Evidence:** `docs/brd/65b-laravel-skeleton-spike.md` (spike run 2026-09-01)
**Estimate:** `docs/estimates/65-golden-path-execution-estimate.md` (approved 12.0 days, MEDIUM–HIGH)

> **Two questions in this document are deliberately left UNRESOLVED** — dynamic port
> allocation (§4) and cross-platform process-tree termination (§5). Both are marked
> **PROPOSED**, not decided, and the architecture review must accept a concrete design before
> implementation. Everything else is settled by decision or by spike evidence.

---

## 1. Overview

Today the release gate greps a generated README for `composer install` and `composer test`. It
greps for a command it never runs, and does not grep the two that are broken. This design
replaces that with execution: generate a project **from the packed npm artifact** and run every
command its own documentation tells a user to run.

Two layers, kept separate and reported separately (FR-40):

| Layer | Asks | Owns |
|---|---|---|
| **Static** | Is each capability declared as a real command or `none`, and rendered correctly? | Manifest shape, placeholder detection, README rendering |
| **Execution** | Does the command actually work in a generated project? | Running commands, readiness, cleanup |

Static never executes. Execution never re-validates rendering. A failure in one must not mask
the other.

---

## 2. Boundary: what is under test

```
npm pack                      → tarball
npm install <tarball>         → CLI under test, in a scratch dir
<that CLI> create <project>   → project under test
run documented commands       → in <project>
```

The harness **must not** invoke `bin/ai-scaffold.js` from the working tree. That is the whole
point of the item: `npm pack` applies the `files` allowlist, and every packaging defect this
project has shipped — the missing `composer.json`, the excluded `.gitignore`, inert hooks —
was invisible to anything reading the source tree.

**Provenance is asserted, not assumed (G-05):** the harness records the tarball SHA and the
resolved CLI path, and fails if the CLI resolves outside the scratch install.

---

## 3. Command sourcing and the `none` contract

Commands come from **one canonical source**: the profile manifest consumed by
`content-templates.js`. The README is *rendered from* that source, so the README is never
parsed to discover commands — parsing generated prose to decide what to execute would make the
harness's correctness depend on Markdown formatting.

| Declared value | Static layer | Execution layer |
|---|---|---|
| Real command | Assert not a placeholder; assert rendered inside a fenced block | **Execute; must exit 0** |
| `none` | Assert rendered as prose; assert **absent** from every fenced block | **Skip, and record as skipped** — never silently pass |
| Placeholder / no-op | **FAIL** (FR-02) | Not reached |

A `none` capability that is skipped is reported as `skipped`, distinct from `passed`. A summary
that counts skips as passes is the same false-green this item exists to remove.

**Cross-check (adversarial case 12):** the static layer asserts the rendered README agrees with
the manifest. Disagreement is a failure of the *static* layer, attributed there, not a mystery
execution failure later.

### Placeholder detection rule

Examine the **first token of the first command in the pipeline**, after stripping leading
whitespace and env-var assignments. It is a placeholder if that token is one of
`echo`, `printf`, `true`, `:`, or if the entire command matches `^\s*exit\s+0\s*$`.

Deliberately narrow. `npm test` is not a placeholder because it *contains* the word echo
somewhere downstream; only the leading token is inspected. Both directions are tested: a stub
must fail, and a legitimate command containing `echo` in a later pipeline stage must pass.

---

## 4. Port allocation — **PROPOSED, UNRESOLVED**

**The race is real and cannot be fully eliminated.** Any "ask the OS for a free port, close it,
hand the number to a child" scheme has a window in which another process binds it
(adversarial case 1).

**Proposed design — allocate, attempt, retry:**

1. Bind a listener to `127.0.0.1:0`, read the OS-assigned port, close it.
2. Pass the port **explicitly** to the child (`--port=N`, or `PORT=N` in the child env).
   Never rely on a default or an inherited value.
3. Start the child. If it exits non-zero within the bind window **and** its captured output
   matches a bind-failure signature, treat it as a collision: allocate again and retry, up to
   3 attempts.
4. Exhausting attempts is a failure, reported as a port-allocation failure — not as a
   readiness failure, which would misattribute the cause.

Binding to `127.0.0.1` rather than `0.0.0.0` keeps the surface local (§9).

**Why this is unresolved:** step 3 depends on recognising a bind failure from a child process's
output, which is profile-specific and brittle. The reviewer should decide whether that is
acceptable, or whether the harness should instead hold the listener open and pass the socket,
which removes the race but requires child cooperation most CLIs do not offer.

---

## 5. Process lifecycle and termination — **PROPOSED, UNRESOLVED**

`php artisan serve` spawns a **child PHP process**. Killing the parent alone leaves it serving
(adversarial case 2). The spike confirmed clean termination **on macOS only**; Linux and
Windows are unverified and are the largest portability risk in the item.

**Proposed design:**

| Platform | Start | Terminate |
|---|---|---|
| macOS / Linux | `spawn(..., { detached: true })` — child leads a new process group | `kill(-pid, 'SIGTERM')` → grace period → `kill(-pid, 'SIGKILL')` |
| Windows | `spawn(..., { detached: false })` | `taskkill /pid <pid> /T /F` — `/T` is the tree, `/F` is forced |

Escalation is time-boxed: `SIGTERM` → wait (proposed 5 s) → `SIGKILL`. Windows has no graceful
equivalent worth modelling; `taskkill /T /F` is the single step.

**Cleanup verification is a first-class assertion, not a best-effort courtesy:**

1. The process group is gone.
2. The port can be **re-bound** by the harness — proof it was actually released, not merely
   that a PID disappeared.

**A cleanup failure fails the run even when the profile's commands all passed** (adversarial
case 9). Cleanup results are reported in their own section so a profile failure cannot conceal
an orphaned process — precisely the way today's gate conceals laravel.

**Why this is unresolved:** the Windows path is written from documentation, not from a run.
`detached` semantics, console-group behaviour and `taskkill` exit codes need verification on a
real Windows runner before this is accepted.

---

## 6. Time budgets and retry

| Scope | Proposed budget | Note |
|---|---|---|
| Dependency install | 300 s | Measured 14 s for laravel, the heaviest |
| Migration | 60 s | SQLite, no service |
| Test | 300 s | |
| Readiness | 30 s | Spike observed 750 ms — ~40× headroom |
| Profile total | 900 s | Bounds a hung profile independently of any single command |

**Retry policy: probe, do not restart.** Readiness retries are repeated probes at a 250 ms
interval within one deadline. A process that starts is never restarted — restarting masks
non-determinism, and a service that needs a second start is a defect the gate should surface.

Dependency installation is the single exception: a **network** failure may retry twice with
backoff, because that is infrastructure flakiness rather than a property of the profile. A
non-network install failure does not retry.

Timeout during install (adversarial case 6) is reported as a timeout at the install step, with
its own reason string — never as a generic profile failure.

---

## 7. Output capture and artifact retention

- stdout and stderr are captured **per command**, interleaved, capped at **1 MiB** per command
  via a head + tail ring buffer (first 256 KiB, last 768 KiB, with an explicit elision marker).
  Unbounded capture is a memory risk on a hung, chatty process (adversarial case 8).
- On **failure**, the report carries: profile, capability, command, exit status, duration, and
  the output tail (AC-08).
- On **success**, output is discarded. Retaining it makes the log unreadable and hides the
  failures it exists to surface.
- Full captured output is written to a per-profile artifact **only on failure**, uploaded by
  CI, retained per the platform default.

---

## 8. Where it runs

| Trigger | Scope |
|---|---|
| PR / push touching `templates/**`, `package.json` (`files`), `src/cli/core/**`, or the harness | Full matrix |
| Pre-publish gate | **Authoritative.** Runs against the packed tarball |

**Matrix:** OS × profile. Ubuntu is the baseline for all five profiles. macOS and Windows run
at minimum the profiles with long-running commands, because §5's termination path is where
platform divergence bites — a matrix that runs only Ubuntu would leave the item's largest risk
untested.

Dependency caching is keyed on the profile's lockfile where one exists. **Caching must never
be keyed on the tarball**, or a packaging change would hit a stale cache and the gate would
validate the previous artifact (adversarial case 10).

---

## 9. Security

The commands executed originate from **profile manifests in this repository**, changed only
through reviewed PRs. The harness does not fetch, infer, or accept commands from any external
source, and does not execute anything parsed out of generated prose.

That said, `composer install` and `npm install` execute third-party code by design. That
exposure already exists in CI and is not introduced here. Boundaries:

- Everything runs in a scratch directory, never the repository working tree.
- Servers bind `127.0.0.1`, never `0.0.0.0` — no listener is exposed off-host.
- No elevated privileges; no credential is available to the harness.
- The harness never evaluates a command string through a shell where an array form will do.

---

## 10. Testing the harness

A gate that cannot be shown to fail is indistinguishable from one that checks nothing — the
defect class this item removes, reproduced one level up.

| Case | Expectation |
|---|---|
| Deliberately broken profile command | Fails; names profile, capability, exit status, tail (AC-08) |
| Stub exiting zero | Fails at the **static** layer, before execution |
| Readiness returns 500 | Fails — not ready. A valid HTTP response is not success |
| Process alive, never binds | Fails at the deadline; reported as never-bound, not as a 500 |
| Process binds, never returns 200 | Fails at the deadline; distinct reason from never-bound |
| Orphan left behind | Cleanup section fails **even when every command passed** |
| README disagrees with manifest | Fails at the static layer, attributed there |

---

## 11. What this HLD does not decide

- **Port allocation (§4)** and **process-tree termination (§5)** are PROPOSED. The
  architecture review must accept a concrete design; Windows behaviour needs a real run.
- Whether the `laravel` profile is eventually renamed to `php` — FR-14, separate approval.
- Metric reporting built on this signal — item 74 consumes it.
- Any profile beyond the five that exist today.
