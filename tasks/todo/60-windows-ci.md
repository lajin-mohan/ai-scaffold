# 60 — Windows CI runner

## Status

**Plan v2 — 2026-10-10.** The architect review returned APPROVE WITH CHANGES
(2 BLOCK, 2 WARN, 4 NIT); every finding is applied in the v2 section at the
end. In implementation. Size M (backlog).
Branch: `chore/60-windows-ci`.

## Why now

Every Windows-only defect so far shipped unnoticed, because CI is
`ubuntu-latest` only (`.github/workflows/ci.yml:25,112,151`):
- 2026-07-15: the `path.relative()` backslash bug left `MEMORY.md` and
  `settings-overrides.json` ungenerated on Windows in every release (PR #94).
- 2026-10-09 audit: `pre-secret-guard.sh` and `pre-dangerous-bash-guard.sh`
  fail open on stock Windows (no `jq`, Microsoft Store `python3` stub).

The CLI's whole job is writing files to a user's filesystem, and a large share
of its users are on Windows. Item 25's BRD (NFR-01, AC-10) also needs Windows
evidence.

## Goal

Every PR to `dev`/`main` runs the CLI's test suite and the packed-artifact
smoke gate on `windows-latest`, as a required check, and the remaining
path-handling call sites are audited.

## Plan

1. **Add a `windows-checks` job** to `.github/workflows/ci.yml`:
   - `runs-on: windows-latest`, `timeout-minutes: 20`, default shell `bash`
     (Git Bash on the runner);
   - steps: checkout → setup-node (`env.NODE_VERSION`, npm cache) → `npm ci` →
     `npm run lint` → `npm run typecheck` → `npm test` (full vitest suite: unit
     plus `tests/` e2e) → `bash scripts/pre-publish-smoke.sh`.
   - **Not included:** audit, gitleaks, shellcheck, release checks and the
     version-drift check. They are OS-independent and already run on ubuntu.
     The golden path (PHP/Python/Go toolchains) is also out; it stays
     ubuntu-only for this item (see Q2).
2. **Wire it into the gate:** add `windows-checks` to `ci-passed.needs` and its
   result check, so it becomes required through the existing `CI passed` check
   without changing branch protection.
3. **Path audit** (`path.relative` / `path.sep` sites in `src/cli`, verified
   2026-10-09):
   - `copy.js:127`: display only. No change.
   - `file-plan.js:198`: already wrapped in `toPosixPath`. No change.
   - `token-report.js:53`: **emits backslashes on Windows** (seen in a local
     run: `.claude\rules\ai-coding-rules.md`). Wrap in `toPosixPath`, and add a
     unit assertion that `perFile[].path` contains no `\`.
4. **Triage the first Windows run.** Any failure is either fixed in this PR,
   if it is a Windows bug in the CLI or scripts, or recorded as a known issue
   with a ticket and explicitly skipped **with a reason**. Never silently
   skipped.
5. **Compatibility statement:** add a short "Tested on" line to `README.md`
   (ubuntu-latest and windows-latest, Node 24). The Node range is item 89 and
   stays out of scope.
6. **CHANGELOG** `[Unreleased]` → `### Changed`.

## Files

- `.github/workflows/ci.yml`: new job and `ci-passed` wiring
- `src/cli/core/token-report.js`: `toPosixPath`
- `src/__tests__/core.test.js`: assertion
- `README.md`, `CHANGELOG.md`
- possibly `scripts/pre-publish-smoke.sh` and test files, if step 4 finds
  Windows defects

**Out of scope:** the hook-portability fixes (item 81), the Node version
matrix (item 89), golden path on Windows, and macOS.

## Verification

- Locally: `npm run lint` and `npm run typecheck`. `npm test` cannot run here
  (local Node 21.2; vitest 4 needs 22+), so CI is the test gate.
- **CI:** the new `windows-checks` job is green on the PR, and `CI passed`
  shows it in `needs`.
- **Negative check:** the job demonstrably runs the suite. Its log shows the
  vitest file count and the smoke "Results:" line, not a skipped or empty
  step.

## Risks / open questions

- **Q1. The smoke gate's Unix assumptions.** `pre-publish-smoke.sh` uses
  `/tmp` (lines 69, 735) and chmod checks. Git Bash maps `/tmp`, but some gates
  may legitimately differ on Windows (for example executable bits, which
  `governance-checks.js` already treats specially). These are triaged per step
  4.
- **Q2. Golden path on Windows.** It is worth it eventually, since the laravel
  and python paths are the most OS-sensitive, but it needs Windows toolchain
  setup for PHP, Python and Go and would roughly double this item. Proposed as
  a follow-up.
- **Q3. Hook fail-open will NOT reproduce on the runner.** GitHub's Windows
  image ships real `jq` and Python, so the 2026-10-09 defect needs a test that
  removes both from `PATH`. That belongs to item 81 (hook portability), not
  here.
- **Q4. Cost and flakiness.** Windows runners are slower (`npm ci` plus vitest
  is roughly 2–3× ubuntu). If the job proves flaky, keep it required but fix
  the flake; do not make it optional.

## Plan v2 — changes from the architect review (2026-10-10)

Each finding was checked against the code before it was applied.

- **B1. Applied.** `src/__tests__/gh-runner.test.js:138-150` writes an
  extensionless `#!/bin/sh` `gh` stub that `spawnSync('gh')` cannot run on
  Windows, and the runner has a real `gh.exe` on PATH. That describe block is
  wrapped in `describe.skipIf(process.platform === 'win32')` with a reason,
  following the precedent at `governance-checks.test.js:168`.
- **B2. Applied.** Smoke Gate 6b would pass falsely on Windows:
  `golden-path.js:53` uses `shell: true` (`cmd.exe`), so `command -v` at `:138`
  always fails, and `--skip-missing-toolchain` turns that into PASS. The gate
  now skips explicitly on Windows, printing "skipped: golden path is
  ubuntu-only", and the `cmd.exe` issue is recorded under Q2.
- **W3. Applied.** The job has no standalone `npm test` step, because smoke
  Gate 1 (`pre-publish-smoke.sh:50`) already runs it. `timeout-minutes` is 30.
- **W4. Applied.** Job-level `defaults.run.shell: bash` (Git Bash). The first
  step logs `which bash jq python3` and `bash --version`, which records whether
  the runner's `python3` is real (evidence for Q3 and item 81).
- **N5. Kept.** The job is required through `ci-passed` from the start.
- **N6. Recorded.** No autocrlf step: `.gitattributes:4` (`* text=auto eol=lf`)
  overrides the runner's `core.autocrlf=true`.
- **N7.** The path audit is confirmed complete; `token-report.js:53` is the
  only fix.
