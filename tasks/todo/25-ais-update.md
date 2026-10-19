# 25 — Safe `ais update`

## Status

**Slices 1–3 merged (#149, #156, #157, #158). Slice 4 (apply): contracts approved for documentation (2026-10-19); implementation awaits approval of these contracts. Full design acceptance, remaining budget and release approval remain separate.** Design reconciled (BRD v1.3, HLD v2.2, ADR-007 rev 3, 2026-10-15; merged in lajin-mohan/ai-scaffold#156) after the round-3 review; FR-09 corrected after the round-4 review (2026-10-16). Round 3 found the round-2 changes had reached the HLD only; see `docs/architecture/review-25-ais-update.md` § Round 3. FR-20 is decided: restore by default with persisted per-rule exceptions (FR-39).
- The independent review returned **REVISE** (5 BLOCK, 9 WARN, 7 NIT):
  `docs/architecture/review-25-ais-update.md`. It was recovered after a squash
  merge lost it (see the `tasks/lessons.md` entry of 2026-10-12).
- The maintainer **approved B1 and B5 on 2026-10-12**.
- BRD v1.2, HLD v2, ADR-007 revision 2 and the re-cut estimate addressed every
  round-1 and round-2 finding; round 3 (2026-10-15) found the BRD and ADR had
  not been brought in line with the HLD, now reconciled in BRD v1.3, HLD v2.2
  and ADR-007 revision 3.

**Release:** 0.16.0 shipped item 94 (security), item 60 and item 66 first,
by maintainer decision (a) on 2026-10-12. **Current target: 0.17.0**
(maintainer clarification, 2026-10-13). Design v2.1 merged in
lajin-mohan/ai-scaffold#149; three maintainer decisions are still pending
(estimate sign-off, ADR-007 acceptance, BRD *(C)* and v1.3 clarifications; FR-20 since decided).
Merging the design does not resolve them or approve implementation. Execution
priority and validation are in `docs/process/pre-npm-publish-todo.md`
(2026-10-13 review).

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/25-ais-update-analysis.md` | **Decided:** D-Q1…D-Q5 |
| 1 — Spike | `docs/brd/25-render-roundtrip-spike.md` | **Passed** for `create` (994 files, 0 mismatches after F1); `init` not covered (B2) |
| 1 — BRD | `docs/brd/25-ais-update-brd.md` | **v1.3:** B1/B5 approved; *(C)* and v1.3 clarifications pending re-confirmation. FR-01–FR-41, AC-01–AC-21 |
| 2 — Estimate | `docs/estimates/25-ais-update-estimate.md` | **Revised:** 26.79 d total PERT; 25.17 d remaining (85%: 26.5 independent to 29.7 correlated); awaiting sign-off |
| 3 — HLD | `docs/architecture/hld-25-ais-update.md` | **Draft v2.2:** round-3 reconciliation applied |
| 3 — ADR | `docs/architecture/adr/007-update-classification-and-apply-semantics.md` | **Proposed, revision 3** |
| 3 — Review | `docs/architecture/review-25-ais-update.md` | Round 1 **REVISE**; round 2 **APPROVE WITH CHANGES**; round 3 consistency findings 1–6 (reconciled) |

## Key facts carried forward

- Install-time sha256 hashes exist (`manifest.js:111`, `copy.js:98`) from
  **0.8.6** onward, and `doctor` detects drift, so update is a classifier
  and an applier.
- `create` records **every** file it writes, including application files
  (`README.md`, `routes/**`, migrations). Update owns only the managed set
  (B1).
- `init` plans with `existingTarget: true` (`init.js:126`), a different file
  set; the install mode must be recorded and honoured (B2).
- `git` must be spawned through `exec-path.js` (item 94); `doctor` already
  does so.
- The Corrective phase (79–89) ships through this item's deletion path and its
  base-aware merge.

## Slice 2 (foundations): checkpoint, 2026-10-16

**Authorised:** slice 2 only, about 5 focused working days (maintainer,
2026-10-15). Apply, migrations, restoration, deletion and recovery stay out.
Full remaining estimate, release and PR #156 merge are not approved by it.

| Step | Commit | Result |
|---|---|---|
| S0 contracts: FR-09 bidirectional hashing, FR-42 context-aware ownership, NFR-07 determinism | `c30d8cc` (on #156) | Architect review round 3b: APPROVE WITH CHANGES, all applied |
| S1 `hashing.js` | `bfccd23` | 16 tests |
| S2 `ownership.js` | `a9017ee` | 52 tests |
| S3 `render.js`, injected UTC clock | `dc7c7a1` | Byte-identical guard; **found and fixed** a Windows-only `init` defect (`.ai-scaffold/README.md` planned twice, generic README won) |
| S4 `buildFilePlan` `ignoreDisk` | `a3a7daa` | 13 tests |
| S5 `valuesFromManifest`, `install.mode`, conditional `hashLf` | `40cc81c` | 22 tests |
| S6 round-trip (FR-29) | `93c5a2e` | 12 cases (5 profiles × create/init + 2 non-default): 0 mismatches |
| Review fixes | `be4d502` | Backend review APPROVED WITH WARNINGS; warnings applied |

**S7 packed-artifact evidence (local Windows, fixed-date preload):** control
(packed vs packed) 0 diffs over 1,638 files. Packed tarball vs published
0.16.1: every file byte-identical except the intended Windows `init` README
fix (5 files) and its manifest hash; manifests otherwise differ only in
`$.install` (new, correct mode in all 10 projects). No `hashLf` recorded; all
dates equal under the fixed clock.

**Progress and forecast:**
- Effort: actual focused effort is unknown, so the effort-overrun trigger
  could not be assessed. Scope grew by the Windows `init` fix, the clock
  threading and the round-4 hashing correction.
- Remaining forecast: approximately **20 focused working days** for slices
  3–5, based on the remaining work breakdown, not on demonstrated delivery
  speed. It is not an approved budget.
- Round 4 (2026-10-16, maintainer-supplied review): `isPristine` accepted
  `a\r\r\n` against a raw `a\r\n` record because normalised content was
  compared with the raw hash. FR-09, the implementation and the regression
  test were corrected together; the S1 test that accepted the behaviour was
  replaced.
- Carried to slice 3: apply the `installedAt` clock rule and fallback chain;
  report `unknown`-mode files that will never update (FR-42); report legacy
  CRLF records that cannot prove the LF direction.
- Local test environment: three pre-existing failures on this machine (bash
  hook, planted-binary control, merge-commit timeout) pass in CI; slice 2
  added none.

## Slice 3 (preview): checkpoint after migrations and the first planner, 2026-10-16

**Authorised:** slice 3 only, about 10.5 focused working days (maintainer,
2026-10-16). No apply, separate release or remaining-project budget.

| Step | Commit | Result |
|---|---|---|
| S0 contracts: FR-43 safe reads, FR-44 check order (lock before journal), FR-45 JSON, FR-46, FR-02 `--force` error, FR-35 tri-state base, NFR-08 | `84317e3` | BRD v1.3, HLD §10a |
| S1 `containment.js` | `15ffab5` | lexical, lstat walk (symlinks and junctions rejected), real-path check; 80 tests with ownership |
| S2 `update-policy.js` | `11355c7` | 16 tests |
| S3 migrations, schema-2 | `8f5b87e` | 17 tests |
| S4 `update-render.js`, `update-plan.js` | `5af8a7b` | 23 tests on generated projects, with a read recorder |

**Completed:** S0–S4. **Remaining:** S5 settings merge preview; S6 report,
JSON envelope, `update.js` orchestration with lock and interrupted
detection; S7 packed-tarball CLI script in CI; S8 no-write-attempt tests
across fixtures; review and PR.

**Scope changes and new uncertainties:**
- The schema-2 migration triggers on `manifestSchema` below 2, not on a
  version crossing (FR-26 wording): every existing install needs it, and
  on `dev` the CLI version would never cross a 0.17.0 key. Later
  migrations stay version-keyed (FR-25).
- `pre-publish-smoke.sh` runs the working-tree CLI, not the tarball, so
  the packed CLI tests need a new script (S7), as recorded in HLD §10a.
- `create` does not yet record `manifestSchema`, classes or
  `settingsBase`; the migration derives them. Recording them at install is
  apply-slice work (FR-34).
- The legacy-CRLF conflict reason is a heuristic (the template renders
  CRLF and the checkout has none); the recorded content itself cannot be
  recovered from a hash.

**Time:** calendar interval between the first and last slice 3 commits,
2026-10-16 12:07Z to 12:18Z (commit timestamps; includes any gaps).
Focused effort was not tracked separately and is unknown. Remaining
forecast for S5–S8 and review: about 6 focused days from the breakdown
(settings merge 2.67, report and orchestration about 1.5, packed CLI
tests 0.75, no-write tests and fixtures about 0.75, review about 0.5),
not from measured speed.

## Slice 3 (preview): implemented, review/merge pending, 2026-10-16

| Step | Commit | Result |
|---|---|---|
| S5 settings merge preview | `053da15` | 28 tests; HLD §5 rows, unknown base never empty |
| S6 preview command, report, docs | `3a21586` | 21 tests; FR-44 order, FR-45 document |
| S7 packed-tarball CLI script in CI | `54da86f` | 17 checks; Ubuntu and Windows jobs |
| S8 no write attempts | `c00999e` | 7 fixtures plus a positive control |
| Review fixes | `798c5af` | Security: no critical/high; M1–M3, L1–L3 fixed. Backend: approved with warnings; all applied. 27 regression tests |

**Acknowledged, not changed:**
- Hard links pass containment (documented in FR-43, HLD §10a).
- The `fstat` identity check narrows but cannot close a race with a
  concurrent local process.
- `cac` errors raised before any command runs (for example a malformed
  argument list) still print plain text; every `update` option mistake
  now reaches the preview and yields JSON.
- The `removed` settings group stays empty until a release declares a
  retired list.

**Time:** calendar interval between the first and last slice 3 commits,
2026-10-16 12:07Z to the final commit (commit timestamps; includes gaps
and a usage-limit pause). Focused effort was not tracked and is unknown.
