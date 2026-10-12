# 94 — Spawn external tools only from PATH (security)

## Status

**Plan v2 — 2026-10-12.** The architect review returned APPROVE WITH CHANGES
(2 BLOCK, 4 WARN, 5 NIT); all are applied in the v2 section at the end. In
implementation. Size S. P0, security.
Branch: `fix/94-spawn-from-path`. Ships in **0.16.0**: the maintainer chose
option (a) on 2026-10-12, which moves 0.16.0 ahead of item 25.

## Finding (verified 2026-10-12 on Windows, Node 21.2)

On Windows, Node's `spawnSync('name', …)` looks for `name.exe` in the
**working directory before `PATH`**: the `cwd` option if one is given,
otherwise `process.cwd()`. A renamed `node.exe` planted as `gh.exe` or
`git.exe` ran in place of the real tool, both with and without the `cwd`
option. POSIX `execvp` does not search the working directory unless `PATH`
contains an empty or `.` entry.

| Call site | Runs in | Released? | Exposed |
|---|---|---|---|
| `src/cli/core/gh-runner.js:141` `runGhApi` | `cwd` = project (doctor) | **0.15.0, 0.15.1** | **Yes**: `ais doctor` in an untrusted clone runs its `gh.exe` |
| `src/cli/core/gh-runner.js:196` `runGhRepoView` | `cwd` = project | **0.15.0, 0.15.1** | **Yes** |
| `src/cli/core/governance-checks.js:190` `resolveHooksDir` | `cwd` = project | `dev` only (#146) | **Yes** |
| `src/cli/commands/create.js:183` `git --version` | `process.cwd()` | Yes | **Yes**: `ais create` run from inside an untrusted folder |
| `src/cli/commands/create.js` (other `runGit` calls) | the new target directory | Yes | No in practice: the target was just created by the CLI |

## Goal

The shipped CLI never executes a program from the working or project
directory. `gh` and `git` are resolved to an absolute path through `PATH` only.

## Plan

1. **New `src/cli/core/exec-path.js`:** `resolveOnPath(name, { env, platform })`.
   - Walk `env.PATH` split by `path.delimiter`. Skip empty entries, `.`, and
     any relative entry.
   - On `win32`, try `name` + `.exe` and `.com` only, without consulting
     `PATHEXT` broadly. Spawning `.cmd`/`.bat` needs a shell, which this code
     never uses.
   - On POSIX, use the bare name and require the executable bit.
   - Return the first existing absolute path, or `null`.
   - Pure, dependency-free and injectable, for tests.
2. **`gh-runner.js`:** both spawns use `resolveOnPath('gh')`. `null` maps to the
   existing `REASONS.GH_MISSING` (the same outcome as today's `ENOENT`), with
   no new reason code.
3. **`governance-checks.js` `resolveHooksDir`:** uses `resolveOnPath('git')`;
   `null` falls back to `.git/hooks`, as today.
4. **`create.js` `runGit`:** uses `resolveOnPath('git')`. `null` is treated as
   "git not available", like today's failed `git --version` probe.
5. **Tests** (`src/__tests__/exec-path.test.js`):
   - resolver units: empty, `.` and relative PATH entries are skipped; `.exe`
     is found on win32; not found returns `null`; a directory named `gh.exe`
     is not accepted;
   - **regression, Windows CI only:** copy `process.execPath` to `gh.exe` and
     `git.exe` in a temp project. Call `runGhApi` / `runGhRepoView` with
     `cwd` = that project and an empty `PATH`, and run `resolveHooksDir`. The
     planted binaries are never executed: the result is `GH_MISSING` and the
     `.git/hooks` fallback, never node's version string;
   - **POSIX:** a planted executable `gh` in `cwd` with `PATH` lacking `.` is
     not run.
6. **Docs:**
   - `CHANGELOG.md` `[Unreleased]` → `### Security`: describes the fix and the
     affected versions without an exploit recipe;
   - `SECURITY.md` unchanged. Whether to publish a GitHub advisory for 0.15.0
     and 0.15.1 is the maintainer's decision, flagged in the PR.
7. **Backlog:** item 94 entry; the review-25 N7 finding is resolved by this
   item.

## Files

- New: `src/cli/core/exec-path.js`, `src/__tests__/exec-path.test.js`
- Changed: `src/cli/core/gh-runner.js`, `src/cli/core/governance-checks.js`,
  `src/cli/commands/create.js`, `CHANGELOG.md`,
  `docs/process/pre-npm-publish-todo.md`

**Out of scope:** `scripts/*` (maintainer tooling, not shipped in the package);
the shipped shell hooks, which run under git or Claude Code with their own
`PATH` semantics.

## Verification

- `npm run lint`, `npm run typecheck`; `npm test` in CI (Ubuntu and Windows).
- Local Windows reproduction before and after: the planted-binary probe runs
  node before the fix and resolves the real tool (or "missing") after.
- Packed tarball: `ais doctor` on a generated project with a planted `gh.exe`
  never executes it.

## Risks / open questions

- **R1. `gh` installed only as a `.cmd` shim** (some scoop or npm setups)
  would now report "gh missing" on Windows where `spawnSync` with no shell
  could not have run it anyway, so behaviour is unchanged. To verify in
  review.
- **R2. `PATH` entries with quotes** on Windows (`"C:\Program Files\x"`):
  strip surrounding quotes.
- **Q1. Should the resolver also refuse a `PATH` entry inside the project
  directory?** Proposed: no. That would only matter if the adopter put the
  project on their own `PATH`.

## Plan v2 — changes from the architect review (2026-10-12)

- **B1. Applied.** The branch is cut from `origin/dev`, which contains #146.
  The reviewer read a stale local `dev`. Call sites were re-cited on this
  branch: `governance-checks.js:189` `resolveHooksDir`, `gh-runner.js:141` and
  `:196`, and `create.js:183` (probe) and `:279` (`runGit`).
- **B2. Applied.** The Windows regression test uses a **sentinel**, not an
  outcome guess. A copy of `node.exe` is planted as `gh.exe` and `git.exe`, and
  `NODE_OPTIONS=--require <marker.js>` makes any node process write a sentinel
  file.
  - The fixed code paths must leave **no sentinel**.
  - A **positive control** (raw `spawnSync('gh')` in the same cwd) **must**
    write it, or the test fails. That keeps the test from going vacuous if a
    future Node stops searching the cwd.
- **W3. Applied.** The PATH key is looked up case-insensitively on win32
  (`Path`), from the **same env object** that is passed to spawn.
- **W4. Applied.**
  - `statSync().isFile()`; POSIX `accessSync(X_OK)`;
  - env read at call time;
  - a `name` containing a separator is rejected;
  - `path.win32.isAbsolute` rejects drive-relative entries;
  - surrounding quotes are stripped;
  - `.com` is tried before `.exe` (libuv order, unverified; harmless either
    way).
- **W5. Applied.** A positive Windows test: a node copy in an absolute PATH dir
  that emits JSON makes `runGhApi` succeed.
- **W6. Applied.** The budget short-circuit stays first; `null` returns
  `GH_MISSING` in the same shape; `classify`'s ENOENT branch stays as the
  fallback for the gap between resolve and spawn. An assertion pins the
  shape.
- **N7–N11.**
  - The `create` probe becomes `resolveOnPath('git') !== null`, and every
    `runGit` spawns the resolved path.
  - The PR notes CVE-2024-27980 (Node refuses `.cmd`/`.bat` without a shell),
    and notes as out of scope that `git`/`gh` still read an untrusted repo's
    `.git/config` (git's own trust boundary).
  - The CHANGELOG names the exact affected versions.

## Implementation evidence (2026-10-12, local Windows)

Harness: a copy of `node.exe` planted as `gh.exe`/`git.exe`, with
`NODE_OPTIONS=--require marker`. The marker writes a sentinel only when the
running binary is a plant. A positive control (naive spawn with a script
argument) fires in both runs.

| Path | `origin/dev` (before) | this branch (after) |
|---|---|---|
| positive control | ran | ran |
| `runGhApi` | **ran** | not run |
| `runGhRepoView` | **ran** | not run |
| doctor C-05 `git rev-parse` | **ran** | not run |
| source scan: bare-name spawns in `src/cli`, `bin` | 4 | 0 |

**Harness lessons, kept in the test comments:**
- a node binary started with `--version` exits before loading preloads, so
  probes must use a script argument;
- `NODE_OPTIONS` treats backslashes inside quotes as escapes;
- comparing directories fails on 8.3 short names.

`create`'s `git --version` probe cannot be observed by the sentinel (the same
early exit), so the source-scan test is its regression guard.

**Affected published versions (checked by unpacking npm tarballs):** the
`create` probe in 0.8.3–0.15.1; the `doctor` gh spawns in 0.15.0–0.15.1.

**Pre-existing, out of scope:** `gh` reporting "no git remotes found" is
classified as "unrecognised reason" rather than no-repository. The output is
identical before and after this change.
