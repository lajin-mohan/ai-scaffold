# Architecture Review — Packed-artifact golden-path execution (item 65b)

**Date:** 2026-09-01
**Reviewer:** independent `architect` agent — did not author the documents under review
**Under review:** `hld-65b-golden-path-execution.md` (v1.0), `adr/006-readiness-contract-for-long-running-commands.md` (Proposed)
**Verdict:** **ACCEPT WITH CHANGES** — 8 BLOCK findings. Neither document is accepted as written.

---

## Why this file exists

The review found eight blocking defects. Recording only the verdict, or leaving the findings
in a chat transcript, would reproduce the failure this whole item exists to remove: a control
that was performed but left no evidence. Three findings below were independently re-verified by
running the code, not by reading it; those are marked **[verified]**.

---

## BLOCK findings

| # | Finding | Status |
|---|---|---|
| 1 | **The placeholder rule does not detect the stubs the item exists to catch.** HLD §3 inspects the first token of the *manifest* command. Node declares `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev` — first token `npm`, all four pass. The `echo` stubs live one indirection away in `templates/node/package.json` scripts. Requires resolving one level of script indirection. | **[verified]** |
| 1b | **`exit 0` is not evidence, and HLD §3 makes it the execution contract** — which BR-02 forbids. `node --test` in a directory with zero test files exits 0. Needs a per-capability effect assertion (≥1 test executed). | **[verified]** |
| 2 | **ADR-006's decisive evidence does not support the probe it selects.** The spike's remedy replaced the failing route with a viewless JSON `/up`; that route would have returned **200 in the broken state** the ADR cites as decisive. Status set is right, target selection and rationale are wrong. Probe both `/up` (200) and `/` (non-5xx). | Accepted |
| 3 | **HLD §3's "one canonical source" is false.** There is no manifest — the source is `applyProfileDefaults` (a defaults table). `none` is unrepresentable for preset capabilities (`prompts.js` coerces it back). Node's README hardcodes its commands rather than rendering them. | Accepted |
| 4 | **AC-04 is violated today, unconditionally.** A freshly generated laravel README renders `N/A    # Production build`, `N/A     # Lint and typecheck`, `N/A     # Seed development data` **inside a fenced bash block**. `{{TYPECHECK_COMMAND}}` has no entry in `resolvePlaceholders` at all. | **[verified]** |
| 5 | **HLD §7 self-contradicts** (1 MiB ring buffer vs "full captured output") and omits the rule that pipes must be drained even when output is discarded — otherwise the child blocks at the pipe buffer and reports a false `never-healthy`. | Accepted |
| 6 | **NFR-02 reproducibility is false by construction.** No profile ships a lockfile, so an upstream release or a registry outage turns the authoritative gate red with no scaffold defect. | Accepted |
| 7 | **Spike carried-item #5 was dropped**, and the skeleton's paths were absent from both `package.json` `files` and `CREATE_ROOT_FILES_BY_PROFILE` — the two silent-omission enumerations. | **Fixed** in `b750279` |
| 8 | **HLD §9 contradicts §3 on shell evaluation.** §9 forbids shell evaluation "where an array form will do"; §3 reasons about pipelines, and `pip install -e ".[dev]"` cannot be naively tokenised. | Accepted |

## Unresolved questions — now decided

**Port allocation.** Reject output-signature matching; replace with a deterministic **re-bind
test**. The reviewer flagged an unverified hazard — `artisan serve` auto-incrementing to the
next free port, which would leave an orphan while the cleanup check passed trivially.
**Verified 2026-09-01: it does not.** With an explicit `--port`, `artisan serve` **exits** when
the port is held. The hazard does not exist and the re-bind classification is sound.

**Process termination.** POSIX design accepted with three corrections: `ESRCH` is success, not
failure; pipes must be drained continuously; do not `unref()` the child. Windows rejected —
`taskkill /T` cannot reach orphaned grandchildren, and the re-bind cleanup proof is unsound
there because `SO_REUSEADDR` can succeed while a listener is still serving.

## What the reviewer endorsed

HLD §5's cleanup contract: **a cleanup failure fails the run even when every command passed**,
reported in its own section. That is the single element that would have caught the concealment
pattern this item exists to remove. To be preserved through all revisions.

## Consequence for scope

BLOCK-3, BLOCK-4 and BLOCK-6 imply work not in the approved estimate (README command-block
restructuring across five profiles, a real manifest with sticky `none`, per-profile lockfiles).
This is expected to trigger the approved ">20% realistic effort" re-estimate condition.
Re-estimation is deferred until the documents are revised, so the estimate is cut against a
corrected design rather than a known-defective one.
