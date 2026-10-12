# 66 — Objective controls: commit-identity hook (first slice)

## Status

**Plan v2 — 2026-10-10.** The architect review returned APPROVE WITH CHANGES
(2 BLOCK, 4 WARN, 1 NIT); all are applied in the v2 section at the end. Q1 and
Q2 are taken at the plan defaults: generated projects only, and `init` is a
separate gap. The maintainer declined the decision prompt, and item 66 says
the repo exception must not be assumed. Size S–M (backlog).
Branch: `feature/66-commit-msg-hook`.

## Why

AI attribution (`Co-Authored-By:`) recurred on **22 commits** despite
`branching-rules.md:79`, because the `~/.gitmessage` template behind the
2026-05-10 lesson does not cover `git commit -m` or `-F` (backlog item 66,
2026-08-27 note). Agent tools add the trailer by default; a rule an agent can
ignore is prose, not enforcement. The backlog's P1 scope rule says to
"mechanically enforce objective signals first".

## Goal

Every generated project rejects, at commit time, any commit message carrying a
`Co-Authored-By:` trailer, for every agent and for humans, whatever the commit
command.

## Scope decision (from item 66; not assumed)

- **Generated-project enforcement:** the default, shipped. **In scope.**
- **Scaffold-maintainer enforcement in this repo:** requires an **explicit
  exception** to the 2026-08-27 directive that excluded commit gates from this
  repository. **Out of scope unless the maintainer grants it** (Q1).

## Plan

1. **New hook `templates/*/.claude/hooks/commit-msg`** (POSIX `sh`, no
   `jq`/`python`, byte-identical across all 5 profiles):
   - reads the message file `$1`;
   - **ignores comment lines** (`#`-prefixed lines, as git strips them);
   - rejects if any line matches `^Co-Authored-By:` **case-insensitively**,
     after optional leading whitespace, so it is a real trailer and not prose
     that wraps onto a line starting with "Co-authored by" without the colon;
   - on reject: prints which line and how to fix it (`git commit --amend` and
     remove the trailer), then exits 1;
   - `--no-verify` bypasses it, as with every git hook. That is documented;
     branch protection plus CI remain the server-side control.
2. **Install it on `create`:** generalise `installPreCommitHook`
   (`create.js:253`) into installing a fixed list of hooks (`pre-commit`,
   `commit-msg`), with the same best-effort warning semantics. It runs after the
   initial commit (`create.js:238`), as today.
3. **`init` (Q2):** `init` installs **no** hooks today; `pre-commit` is not
   wired either. Proposed: out of scope here and recorded as a gap. `init` runs
   in existing repositories, where hook installation must not clobber the
   team's existing `.git/hooks/*` and needs its own conflict design.
4. **`doctor`:** add check **C-05** "Git commit-msg hook installed", mirroring
   C-04's logic (`governance-checks.js:147-172`), including the Windows
   executable-bit exception.
5. **Packed-artifact gate:** extend `scripts/pre-publish-smoke.sh` to assert
   that the packed tarball contains `commit-msg` for every profile and that a
   generated project has `.git/hooks/commit-msg`. That guards the 2026-07-10
   `npm pack` lesson.
6. **Tests:**
   - hook behaviour: plain message passes; `Co-Authored-By: X <x@y>` rejects;
     `co-authored-by:` rejects; indented trailer rejects; multiple trailers
     reject; prose "co-authored by the team" (no colon) passes; a comment
     line `# Co-Authored-By: …` passes; empty message passes (git handles
     that);
   - **real git commits** in a temp repo for `-m`, `-F`, and an editor commit
     (`GIT_EDITOR` writing the message);
   - `create` installs both hooks; `doctor` C-05 passes and fails correctly.
7. **Docs:**
   - `branching-rules.md` (all 5 profiles): the identity prohibition now names
     the hook as its enforcement;
   - root `CLAUDE.md` maintainer table: unchanged;
   - CHANGELOG `[Unreleased]` → `### Added`.

## Files

- `templates/{generic,golang,laravel,node,python}/.claude/hooks/commit-msg` (new)
- `templates/*/.claude/rules/branching-rules.md`
- `src/cli/commands/create.js`, `src/cli/core/governance-checks.js`,
  `src/cli/commands/doctor.js` (if C-05 needs registering)
- `src/__tests__/*.test.js`, `tests/e2e.smoke.test.js`,
  `scripts/pre-publish-smoke.sh`
- `CHANGELOG.md`; `package.json` `files` needs no change, because
  `templates/*/.claude/hooks/**` is already allowlisted

**Out of scope:** this repo's own commit gate (Q1); `init` hook wiring (Q2); the
CHANGELOG-entry and approval-artifact controls (later slices of item 66).

## Verification

- `npm run lint`, `npm run typecheck`, shellcheck on the new hook (CI);
  `npm test` in CI (local Node 21 cannot run vitest 4).
- Hook behaviour tested with real `git commit` in temp repos, locally under Git
  Bash as well as in CI.
- **Packed artifact:** `npm pack`, then `create` for all 5 profiles. Each has
  `.git/hooks/commit-msg`, and a commit with the trailer is rejected in a
  generated project.

## Risks / open questions

- **Q1 (maintainer decision). Enforce in this repo too?** Item 66 requires an
  explicit exception; it is not assumed.
- **Q2. `init` wiring.** Out of scope as proposed, or include it with
  "install only if absent, else warn"?
- **R1.** A team that legitimately uses `Co-Authored-By` for human pair
  programming is blocked. The hook is the shipped default because the
  scaffold's rule prohibits every third-party identity. Teams can delete the
  hook. Document that in `branching-rules.md`.
- **R2.** The prose false-positive risk is covered by requiring the colon plus
  line-start, and by the test list in step 6.

## Plan v2 — changes from the architect review (2026-10-10)

- **B1. `core.hooksPath`.** Generated projects ship `scripts/install-hooks.sh`,
  which sets `core.hooksPath .claude/hooks` (verified at
  `templates/node/scripts/install-hooks.sh:21`). Git then ignores
  `.git/hooks/*`, so a `.git/hooks` check passes while the hook never runs.
  C-04 has this bug today. Changes:
  - `doctor` finds the hooks directory with `git rev-parse --git-path hooks`
    (C-04 and C-05 share a `checkHookFile` helper);
  - `create` warns when `core.hooksPath` is already set;
  - tests cover both.
- **B2. Matching through git, not hand-rolled.**
  - Cut the `git commit -v` scissors block.
  - Strip CR.
  - `git stripspace --strip-comments`, which honours `core.commentChar`.
  - Then `grep -inE '^[[:space:]]*co-authored-by[[:space:]]*:'`.
  - `#!/bin/sh`, POSIX flags only, shellcheck-clean.
  - `--cleanup=verbatim` keeps comment lines; that is documented.
- **W3. C-05 is a separate check** (C-04's name stays stable for `--json`).
  Its remedy names `scripts/install-hooks.sh`. Existing projects will newly
  fail it, and that goes in the CHANGELOG. A test pins the `--json` change as
  purely additive.
- **W4. The goal is narrowed to "every project from `create`".** The `init`
  gap is recorded in backlog item 66. `ais update` does not exist yet (item
  25), so existing projects get the hook through `scripts/install-hooks.sh`.
- **W5. More tests:** `commit -v` / `--cleanup=scissors`, CRLF messages,
  `--amend`, a merge commit, byte-identical across 5 profiles, and the
  packed-tarball copy being executable.
- **W6. Docs drift (rule 5).** Update the template `CLAUDE.md` "Commit
  Identity" section, its Custom Hooks table, and the `ai-coding-rules.md` hook
  inventory, in all 5 profiles.
- **N7.** The warning names which hook failed to install. No env-var bypass:
  `--no-verify` already exists, and an agent could set an env var itself.

**Correction found during implementation (2026-10-10).** B1 and W4 assumed
generated projects ship `scripts/install-hooks.sh`. They do not: `scripts/**`
is excluded from the default install (`file-plan.js:62`), and only
`setup-branch-protection.sh` reaches `.ai-scaffold/setup/`. The
`core.hooksPath` risk stands (global husky or corporate config), so git-based
resolution stays. Remedies point to copying `.claude/hooks/*` into the
directory `git rev-parse --git-path hooks` names, never to a script adopters
do not have.
