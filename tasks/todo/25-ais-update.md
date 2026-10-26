# 25 — Safe `ais update`

## Status

**Slices 1–3 merged (#149, #156, #157, #158). Slice 4 (apply): S0–S6 implemented on draft PR lajin-mohan/ai-scaffold#159; two P1 review findings on `e0ab979` fixed (2026-10-26); S7 and S8 remain. Full design acceptance and release approval remain separate.** Design reconciled (BRD v1.3, HLD v2.2, ADR-007 rev 3, 2026-10-15; merged in lajin-mohan/ai-scaffold#156) after the round-3 review; FR-09 corrected after the round-4 review (2026-10-16). Round 3 found the round-2 changes had reached the HLD only; see `docs/architecture/review-25-ais-update.md` § Round 3. FR-20 is decided: restore by default with persisted per-rule exceptions (FR-39).
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

## Slice 4 (apply): early fault-tested checkpoint, 2026-10-23

**Authorised:** slice 4, about 10.5 focused days, provisional (maintainer,
2026-10-19). No slice 5 or release.

| Step | Commit | Result |
|---|---|---|
| S0 contracts (FR-47–FR-52, NFR-09, HLD §10b) | `aee2a5e`, `4375e95` | Architect review round 5: APPROVE WITH CHANGES (2 BLOCK, 11 WARN), all applied |
| S1 `write-ops.js` | `694887f` | 17 tests |
| S2 `update-apply.js`, `update-lock.js` | `cad6e61` | 14 tests: injected failure at every write step restores exact pre-run bytes; concurrent and post-write edits preserved and reported; backup mismatch abandons; write-scope recorder |
| S2 genuine crash tests | `b90babd` | 10 tests: real SIGKILL at 8 stages and during rollback; every journaled path wholly pre-run or final; nothing outside the write set changed; lock left in place; control run completes |

**Evidence boundary:** local Windows only so far; draft PR
lajin-mohan/ai-scaffold#159 runs the same tests on Ubuntu and Windows CI.
The crash tests use the working-tree source; packed-tarball crash cases
are S7.

**Remaining:** S3 recovery classification and lock reporting; S4 git
safety; S5 settings write, manifest refresh, exceptions; S6 CLI wiring,
apply JSON, doctor, create/init `settingsBase`; S7 acceptance and packed
apply/crash cases; S8 docs, reviews, PR. **S8 includes a fact re-check of
README.md and related docs** (`docs/cli-reference.md`, `HOW-TO-USE.md`,
CHANGELOG, the `update` sections): every claim checked against the packed CLI
and updated (maintainer request, 2026-10-23).

**Scope changes:** the lock refuses a directory without `.ai-scaffold/`
(`MANIFEST_MISSING`) instead of creating one, since the lock now precedes
the manifest read. Crash-test drivers must resolve the native real path,
as the CLI does.

**Time:** calendar interval between the S1 and last S2 commits,
2026-10-23 09:48Z to 09:55Z (commit timestamps, includes gaps). Focused
effort was not tracked and is unknown. Remaining forecast: about 7.5
focused days from the breakdown, not from measured speed.

## Approvals and acceptance criteria for the remaining work, 2026-10-23

**Maintainer approvals (2026-10-23):** acceptance criteria below approved as
the definition of done; **slice 5 approved**, provisional budget about 5
focused days, delivered in the same PR (lajin-mohan/ai-scaffold#159);
autonomy terms approved: push to feature branches, open and update PRs, run
review agents and fix findings; never merge, release, tag, force-push,
delete branches or change settings; stop on a requirement change, a
high/critical security design decision, a CI failure unresolved after 3
attempts, or anything destructive. The 0.17.0 release is not approved.

| ID | Criterion |
|---|---|
| 4.1 | Not a git work tree or no `git` → `--apply` exits 1 `GIT_UNAVAILABLE`; `--allow-no-git` proceeds with `gitSafety: "acknowledged-no-repository"` |
| 4.2 | Uncommitted changes in any planned write/delete path → refuse naming them; `--allow-dirty` proceeds (`dirty-allowed`); untracked `.ais-new` exempt; renames and repo-subdirectory projects handled |
| 4.3 | `git` only via the PATH resolver (item 94), fixed arguments |
| 5.1 | Merged `settings.json` equals the preview decisions (added, replaced, restored, removed; exceptions honoured); unowned keys and order kept; 2-space JSON; no silent widening; invalid JSON → `.ais-new`, never rewritten |
| 5.2 | Manifest after apply: version, `updatedAt`, classes, recorded hashes (B3), `manifestSchema: 2`, `appliedMigrations`, `settingsBase`; `settingsExceptions` saved only on success |
| 5.3 | A second apply reports already current and changes nothing (AC-09) |
| 6.1 | Lock first; exit 0/2/1; one `ais-update-apply/1` JSON document; backup path reported; no file contents printed |
| 6.2 | Conflicts write `.ais-new`; a differing existing sidecar → `SIDECAR_EXISTS`; an identical one is left |
| 6.3 | `doctor` warns while `.ais-new` files exist (FR-31) and uses `hashing.js` |
| 6.4 | `create`/`init` record `manifestSchema: 2`, classes, `settingsBase`; a fresh project previews `current`; packed vs published 0.16.1 differs only in documented manifest fields |
| 7.1 | BRD AC-02/03/04/05/06/08/09/12/13/15/16/17/18/19/20/21 automated on generated projects |
| 7.2 | Packed-tarball smoke covers apply and real-SIGKILL cases on Ubuntu and Windows CI |
| 7.3 | A full CLI apply under the write-scope recorder writes only inside the journaled set |
| 8.1 | README, `docs/cli-reference.md`, `HOW-TO-USE.md`, CHANGELOG updated; every claim checked against the packed CLI |
| 8.2 | Backend and security reviews end with no BLOCK open |
| 8.3 | #159 ready for review, CI green on Ubuntu and Windows, ticket updated |
| 5A | Real installs from npm 0.8.5, 0.14.0, 0.16.1 (`create`: node, laravel, python; plus `init`) previewed and applied with the packed tarball: untouched managed files equal a fresh `create`; application files untouched; user-data byte-identical; 0.8.5 replaces and removes nothing (AC-01, AC-07, AC-11, AC-14) |
| 5B | A Windows clone with `autocrlf=true` classifies as pristine (AC-10) |
| 5C | A CI job runs 5A and 5B on Ubuntu and Windows |
| 5D | Evidence report recorded in this ticket |

## Slice 4 (apply): S3–S6 checkpoint and #159 review, 2026-10-26

| Step | Commit | Result |
|---|---|---|
| S3 recovery classification, lock reporting | `796e76a` | `no-journal` / `all-pre-run` abandoned, `all-final` completed, others refused `INTERRUPTED_APPLY`; lock pid, host, age, liveness |
| S4 git safety | `60dec64` | 9 tests (criteria 4.1–4.3) |
| S5 settings write, manifest after apply | `a3806e7` | 15 settings tests; B3 manifest rule |
| S6 CLI wiring | `e0ab979` | `--apply`, `--allow-dirty`, `--allow-no-git`; FR-46 retired; 8 apply integration tests; doctor `.ais-new` warning and `hashing.js` (6.3); create/init schema 2 (6.4) |
| Packed smoke fixture | `88dcd78` | Older install modelled as pre-schema-2; smoke covers apply on the packed CLI |

**Review of `e0ab979` (maintainer, 2026-10-26): two P1, both reproduced and fixed.**

| Finding | Fix | Evidence |
|---|---|---|
| Recovery deleted any path a journal named as a temporary (crafted `tmp: "README.md"` → README deleted), before git safety | `02830ea`: journal accepted only in the exact apply shape (schema, run id matching its backup directory, contained paths, derived temporary names, directories that are ancestors of journaled paths); recovery derives names itself | 8 tests incl. the reviewer repro; all 7 crafted-journal tests fail against the old code |
| Apply re-read `pre` after planning, so an edit between planning and writing was overwritten (managed files and settings) | `6073c2f`: the planner records the hash or absence it decided on; settings and manifest carry the bytes they were read from; operations use those, so the transaction refuses later changes | 4 tests (pristine file, settings, an add over a new file, the manifest); each fails against the old code |

Lesson recorded in `tasks/lessons.md` (2026-10-26).

**Criterion 6.4 evidence (local Windows, packed tarball vs npm 0.16.1).**
Same project names, clock pinned to 2026-10-15T12:00Z through an `--import`
preload, `create` for node, python and laravel, and `init` for node into an
existing app.

- `create`: only `.ai-scaffold.json` differs. Its differences are
  `install.mode`, `manifestSchema`, `settingsBase` and a `class` on every
  record. All paths and hashes are identical.
- `init`: the same manifest fields, plus `.ai-scaffold/README.md`. That
  file now holds the project README: the slice 2 Windows fix recorded in
  `CHANGELOG.md` (0.16.1 planned the path twice, and the generic README
  overwrote it).
- No unexplained difference.

**Verification at `6073c2f`:**

- lint and typecheck pass;
- full suite 675 passed, 13 skipped, plus the 3 known machine-specific
  failures (they fail on base `3f3d2ee` too);
- packed smoke passes, including apply;
- CI on Ubuntu and Windows was pending at the time of writing.

**Slice 5:** the 2026-10-23 approval above stands (about 5 focused days,
criteria 5A–5D). **Destination changed (maintainer, 2026-10-26): its own PR,
branched from updated `dev` after #159 squash-merges**, not #159, so slice 4's
safety implementation and acceptance evidence stay reviewable on their own.
Not started.

**Added to S7 (maintainer, 2026-10-26):** a `settings.json` classified
`unowned` stays untouched. The earlier review reproduced apply restoring a
deny rule while reporting `skip-unowned`. Fixed: the merge is decided only
when the planner's settings entry is `merge`. A regression test fails
against the old code.

**Before #159 is marked ready:** re-review both P1 fixes (`02830ea`,
`6073c2f`).

## Slice 4: S7 and S8.1 checkpoint, 2026-10-26

| Criterion | Commit | Evidence |
|---|---|---|
| Unowned `settings.json` untouched (added to S7) | `a35d852` | Regression test; fails against the old code (file rewritten, deny rule restored) |
| 7.1 BRD AC-02/03/04/05/06/08/09/12/13/15/16/17/18/19/20/21 | `2a102fb` | `src/__tests__/update-acceptance.test.js`, 17 tests on generated node projects in real git repositories; AC-16/17 SIGKILL the real CLI |
| 7.2 packed smoke covers apply and real SIGKILL | `d544aa4` | `scripts/update-preview-smoke.js` loads a crash hook into the packed CLI; CI green on Ubuntu and Windows at `ac2b98a` |
| 7.3 full CLI apply writes only inside the journaled set | `ac2b98a` | `src/__tests__/update-write-scope.test.js`: fsApi recorder plus whole-tree diff over replace, add into a new directory, remove, sidecar and settings merge; a planted stray write fails it |
| 8.1 docs checked against the packed CLI | `e31751c`, `d3a238c` | README, HOW-TO-USE, CLI reference, CHANGELOG; CLI help banner; 25 claims checked against a freshly packed tarball, all hold |

**Found by 7.1 and fixed (`6e21d5f`):** an FR-41 refusal ended
`rollback-incomplete` because rollback inspected the refused path, which
holds the adopter's edit and never this run's bytes. FR-48 requires a
complete rollback with `CONCURRENT_EDIT`. Rollback now settles entries the
run did not attempt or did not write; a test that enshrined the old outcome
was corrected. HLD §10b updated.

**Also:**
- A version migration can declare retired settings rules and hooks
  (needed for AC-03).
- The packed smoke's doctor gate read JSON through `echo | grep -q` under
  `pipefail`, which raced on Ubuntu; it now uses a here-string (`a7f8228`).
- **AC-16 note:** a killed apply leaves its lock, and the lock wins over the
  journal (FR-44), so the first later run reports the stale lock
  (`not-running`); the interrupted apply is reported once the lock is
  deleted. Nothing changes on disk at any step.

## Slice 4: S8.2 reviews, 2026-10-26 — final fix verification pending

**Backend and security reviews: no BLOCK.** Both P1 fixes (`02830ea`,
`6073c2f`) hold on re-review. Every WARN is fixed, one commit each with a
regression test; each reproducible one fails against the unfixed code.

| Finding | Commit |
|---|---|
| Unsafe dirty path aborted every apply (both reviews) | `299bd2f` |
| `core.fsmonitor` from the project's `.git/config` ran on `git status` (security W5) | `247248a` |
| Crafted journal could remove an empty adopter directory (security W1) | `fa04159` |
| Planted backup directories pushed real backups out (security W2) | `762f5e7` |
| Backups not git-ignored, contrary to BRD Q-01 (security W3) | `ef21377` |
| Crash-left `update.lock` committable (maintainer request) | `72f7dc7` |
| `settings.json` of unexpected shape crashed the merge (backend) | `881e8fd` |
| Missing tests: remove and late sidecar after planning (backend) | `4f3bdda` |
| Recovery message listed no paths for two states (backend) | `3cf351f` |
| `--apply=foo` ran an apply (maintainer request) | `40cb0e5` |
| Bidi and zero-width characters could spoof a path in the report (security N1) | `9da9c85` |

**Accepted and documented (maintainer, 2026-10-26):** backup retention as
HLD §10b specifies; the re-check-to-rename gap and power loss without a
directory fsync. Other NITs are escalated only if they show aliasing,
spoofing or unsafe behaviour.

**Evidence at `72f7dc7`:**
- full suite 717 passed, 13 skipped, plus the 3 known environment failures;
- packed update smoke passes;
- the pre-publish smoke fails the same 5 environment gates on `dev` as on
  this branch (no `jq`, local Go), and passes in CI;
- the packed CLI writes and records `.ai-scaffold/.gitignore` for `create`
  and `init`.

**Fix verification (2026-10-26):** both reviewers re-checked their fixes.
- **Backend: APPROVE**, every WARN closed. Remaining NITs: `pruneBackups`
  calls `fs` directly rather than the injected `fsApi`, and `runUpdate`
  defaults to `process.argv`.
- **Security: APPROVE**, W1–W5 and N1 closed. The re-check found that W5
  was only partly fixed: a filter driver in the project's git config still
  ran during `git status`. The maintainer chose to neutralise drivers, done
  in `9085f30`. The reviewer confirmed it and checked textconv, the pager,
  hooks, the `ident` and `working-tree-encoding` attributes, `includeIf` and
  submodules: none runs a command during this call.
- **Accepted leftovers:**
  - an empty directory in a scaffold namespace can be removed by a crafted
    journal;
  - planted backups can push out older real backups, within retention;
  - a Git LFS file may read as modified;
  - N2–N4.

**8.3:** #159 is marked ready once CI passes on the final commit (the code
of `9085f30` plus `dev`'s documentation-only commits merged in).
