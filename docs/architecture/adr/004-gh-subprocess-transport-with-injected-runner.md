# ADR-004: `gh` subprocess transport, behind an injected runner

**Date:** 2026-08-31
**Status:** Accepted (amended 2026-08-31 after `/architecture-review` — runner is a closed constructor; environment and `detail` handling stated)
**Deciders:** Lajin M J (Technical Lead)
**Consulted:** `docs/brd/26-drift-aware-doctor-brd.md` v2.2 (FR-30, FR-31, NFR-02, NFR-05), `docs/architecture/spike-26-github-api-shape.md`, `scripts/setup-branch-protection.sh`, `src/cli/commands/create.js`

---

## Context

Item 26 needs GitHub data that no local file holds. Something must make an authenticated request.

The package has **7 runtime dependencies and no HTTP client**. The only shell-out in shipped code is
`spawnSync('git', args)` at `src/cli/commands/create.js:267`, array form. The security posture the
backlog advertises is OIDC trusted publishing and no long-lived token.

Two further constraints emerged from review:

1. **`gh` collapses HTTP outcomes.** A 401, a 403 and a 404 all surface as exit 1; a missing binary
   is `status === null` with `error.code === 'ENOENT'`. These must become distinct `unavailable`
   reasons or the degradation model is a lie.
2. **`src/cli/core/` has no subprocess or network precedent** and the test suite has **no `vi.mock`
   anywhere** — one `vi.spyOn` in `src/__tests__/core.test.js`. ESM subprocess mocking is unproven
   here, and `coding-standards.md` is explicit: *"Test doubles are the proof. If you can't swap in a
   mock without changing the class, the DI is wrong."*

---

## Decision

**Remote queries go through the `gh` CLI, invoked with `spawnSync` in array form, behind a single
injected runner** in `src/cli/core/gh-runner.js`:

```js
// the injected boundary
export function getProtection(opts, { run = defaultGhApi } = {}) { … }

// the runner it defaults to — a constructor, not a passthrough
runGhApi(endpointPath, { cwd, budget })   // always argv ['api','--method','GET',endpointPath]
```

**The runner takes an endpoint path, never an argv array.** A free-form `runGh(args)` cannot enforce
BR-02's read-only guarantee: `gh api` switches to POST on any `-f`/`-F`/`--field`/`--input`, so an
`-X` check is insufficient, and nothing would stop `args[0]` being `repo delete`. Constructing the
argv internally makes read-only a property of the code.

The runner maps the process outcome to a closed set of reasons — `gh-missing`, `unauthenticated`,
`forbidden`, `not-found`, `timeout`, `unknown` — and is the only place that mapping exists. A
minimum `gh` version is pinned and reported as `unavailable` when unmet.

---

## Rationale

The transport choice is really a **credential-custody** choice. With `fetch` this CLI accepts,
stores or reads a GitHub token: a new secret surface, a gitleaks concern, and a direct contradiction
of the posture the product sells. With `gh`, the token lives in the user's own keychain and never
enters this process. FR-31 states that as a requirement; this ADR records that it is *why* the
transport was chosen, not a consequence of it.

The injected runner is not ceremony. Under a subprocess transport a fixture is **stdout plus an exit
code**, not an HTTP response. Injection makes that a plain function argument instead of a module
mock, which keeps `core/` unit-testable as it is today — the layer that would otherwise acquire an
untestable dependency on PATH, process and network.

---

## Alternatives considered

### Option A: `fetch` + a token the CLI manages
**Why rejected:** puts a long-lived credential inside a package whose pitch is that it holds none.
The estimate priced it at ~2 extra days plus a security review, and it would require reversing FR-31.

### Option B: `gh` called directly from `github-protection.js`, no injection
**Why rejected:** testable only by mocking `child_process`, which this suite has never done. It also
scatters exit-code interpretation across call sites, which is how a 404 quietly becomes "no bypass".

### Option C: `gh` behind an injected runner (chosen)
**Why chosen:** keeps the token out of the process, keeps `core/` unit-testable without a module
mock, and confines the one genuinely fiddly piece — turning `gh`'s exit codes into honest reasons —
to a single tested function.

---

## Consequences

### Easier
- No credential handling anywhere in the package; FR-31 becomes cheap to satisfy and to test (AC-15).
- Enterprise hosts, rate limits and token refresh are `gh`'s problem.
- Every degradation path is unit-testable with a three-line fake.

### Harder
- **`gh` is not installed on most machines.** The highest-value checks will report `unavailable` for
  many users. That is the honest outcome, and Q-01's answer (report by default, `--require-remote`
  to enforce) exists because of it — but it does cap product reach.
- A binary whose version we do not control sits on the critical path.
- Non-GitHub forges are permanently `unavailable`.

### New problems
- The documented "only shell-out is `spawnSync('git', …)`" claim becomes false. FR-33 requires the
  fix in the same commit; BR-05 is the rule.
- A second shell-out widens the surface a future reviewer must audit.

### Trade-offs accepted
- Subprocess overhead per call, and serial `spawnSync` blocking, bounded by NFR-01's single 10s
  wall-clock budget rather than a per-call timeout.

---

## Implementation notes

- Array form only. Never build a command string; never pass `shell: true`.
- Validate `owner/repo` and branch **before** interpolation into any API path (NFR-02). Array form
  prevents shell injection; it does not sanitise a request path.
- `cwd` is threaded to every invocation (FR-34) — `create.js:266-272` is the precedent.
- The runner is read-only **by construction**: it emits `['api', '--method', 'GET', path]` and
  accepts nothing else.
- **Environment is inherited deliberately.** `spawnSync` passes `process.env`, so where `GH_TOKEN` /
  `GITHUB_TOKEN` is set the credential transits this process. The claim above is about **custody** —
  the CLI never reads, stores or logs it — not isolation. Inheritance is load-bearing: FR-16 wants
  generated projects to run `doctor --require-remote` in CI, where `gh` authenticates by env alone.
  Spawn options are never serialised into an error or log, since `options.env` would carry the token.
- **Raw `gh` stderr never leaves the runner.** It is matched to classify a `reason`, then dropped.
  It carries the endpoint path (private repo name) and resolved host (Enterprise hostname), and
  `doctor --json` is echoed into CI logs — the disclosure class already fixed in
  `scripts/spike-26-probe.sh`. User-facing text comes from a fixed `reason` → message table.
- `stdio: ['ignore','pipe','pipe']` and `GH_NO_UPDATE_NOTIFIER=1`.

---

## Review date

Revisit if `gh` gains a machine-readable error contract that makes the reason mapping unnecessary,
if a non-GitHub forge becomes a supported target, or if `gh` availability proves low enough among
adopters that the checks are `unavailable` in the majority of real runs — which item 74's M-04 will
eventually show.

---

## Related ADRs

- ADR-005: Effective-protection merge semantics
