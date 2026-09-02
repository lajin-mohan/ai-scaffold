# ADR-006: Readiness contract for long-running profile commands

**Date:** 2026-09-01
**Status:** **Proposed — revision required.** Independent review 2026-09-01 raised BLOCK-2: the evidence cited as decisive does not support the probe target selected, because the spike's own remedy would return 200 in the broken state. The `200`-only status set is upheld; the probe target and rationale must be corrected to probe both the health route and the documented entry point.
**Deciders:** Lajin M J (Technical Lead)
**Consulted:** `docs/brd/65b-laravel-skeleton-spike.md` (observed data), BRD FR-22 / AC-02, HLD §5–§6

---

## Context

Item 65b runs every command a generated project's documentation tells a user to run. Most are
finite: install, migrate, test. One class is not — `dev` / `serve` starts a process that never
exits. CI must decide when that process is "working" and then stop it.

The BRD requires a bounded start/health check but **does not define readiness**. That gap is
the largest flakiness risk in the item: a readiness signal that is too weak reports broken
applications as healthy, and one that is too slow or too clever produces intermittent CI
failures that erode trust in the gate faster than having no gate.

Three candidate signals exist: process liveness, a log line, and an HTTP probe. The spike ran
all of the relevant cases against a real minimal Laravel application.

**The decisive observation:** the exact failure mode this gate must catch —
`routes/web.php` referencing a view that no longer exists — returned a **valid HTTP 500**.
The process was alive. The port was bound. The server answered correctly and promptly. Only
the status code distinguished a working application from a broken one.

---

## Decision

A long-running command is **ready** when all three hold **before the deadline**:

1. **The process is still alive.** Checked at every probe, not only at the deadline.
2. **An HTTP GET to the profile's health route returns exactly `200`.**
3. Both occur within the configured deadline.

Concretely:

| Parameter | Value |
|---|---|
| Health route | `/up` (Laravel's conventional health path) |
| Accepted status | **`200` only** |
| Probe interval | 250 ms |
| Deadline | 30 s (spike observed readiness at ~750 ms) |
| Bind address | `127.0.0.1` |

**A valid HTTP 500 is a failure, not readiness.** So is any other non-200 response.

**Log-line matching is diagnostic only.** Captured output appears in failure reports to help a
human diagnose, and is never consulted to decide readiness.

Three failure modes are reported **distinctly**, never collapsed into "not ready":

| Observed | Reported as |
|---|---|
| Process died before the deadline | `process-exited` — with exit status |
| Alive, nothing ever bound the port | `never-bound` |
| Bound, but never returned 200 | `never-healthy` — with the last status seen |

---

## Rationale

**Why 200 only, and not 2xx/3xx.** This is the load-bearing part of the decision. Accepting
"any valid HTTP response" would have declared the spike's broken application ready — it
returned a well-formed 500 in milliseconds. Accepting 2xx/3xx is safer but still wrong for
this purpose: a 302 to a login page proves routing works, not that the application booted
correctly. The gate exists to catch applications that *look* alive, so the signal must be the
narrowest one that means "the documented entry point works."

**Why liveness at every probe.** Without it, a process that dies at 200 ms costs the full 30 s
deadline before reporting, and reports the wrong cause — the log would say "never became
healthy" when the truth is "it crashed."

**Why probes rather than restarts.** A service needing a second start is a defect the gate
should surface, not smooth over. Restart-on-failure is the standard way flaky infrastructure
hides real non-determinism.

**Why `/up`.** Laravel ships it conventionally, so this is not a scaffold invention that
adopters must learn. Profiles that add a long-running command later declare their own route;
the contract is "a profile-defined health route," with `/up` as laravel's binding.

---

## Alternatives considered

**A — Process liveness only.** Rejected: the spike's broken application stayed alive
indefinitely. This is the weakest possible signal and would have passed the exact defect the
item exists to catch.

**B — Log-line matching (`Server running on…`).** Rejected as primary. Laravel prints that
line *before* the application can serve a request, so it proves the process started, not that
it works. It is also the most brittle signal available: any framework version that rewords its
banner breaks the gate silently. Retained as diagnostic output.

**C — Accept any valid HTTP response.** Rejected on direct evidence. The spike's failing case
returned a valid 500 in ~200 ms. This alternative reports it ready.

**D — Accept 2xx/3xx.** Rejected as insufficiently narrow. A redirect proves the router
answered, not that the application booted. `200` on a health route is the tightest signal that
still means what we need it to mean.

---

## Consequences

**Positive**

- The gate's central failure mode — a valid response from a broken application — is caught by
  construction, on evidence rather than reasoning.
- Distinct reason strings mean a red build names its own cause; a maintainer does not re-derive
  it from logs.
- No framework-version coupling: no banner text is parsed.
- ~40× deadline headroom over observed readiness makes timeout flakiness unlikely.

**Negative / accepted**

- Every profile with a long-running command must expose a health route returning exactly 200.
  For laravel this is free; a future profile without one must add it, and that cost is
  accepted as the price of a signal that means something.
- A future application legitimately returning 3xx on `/` cannot use `/` as its probe. Mitigated
  by probing a dedicated health route rather than the site root.

**Neutral**

- The 250 ms / 30 s parameters are configuration, not contract. Changing them does not reopen
  this ADR; changing the accepted status set does.

---

## Implementation notes

- The three reason strings (`process-exited`, `never-bound`, `never-healthy`) are part of the
  reported contract and are asserted by the harness's own tests.
- Readiness logic must be independent of port allocation (HLD §4) and termination (HLD §5),
  both of which are still PROPOSED. This ADR must not be read as accepting either.

---

## Review date

Revisit if a profile with a long-running command that cannot expose a 200 health route is
added, or if observed readiness approaches the deadline on any CI runner.

---

## Related ADRs

- ADR-004 — subprocess transport with an injected runner; the same testability concern applies
  to the process runner here.
