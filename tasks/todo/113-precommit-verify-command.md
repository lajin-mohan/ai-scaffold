# 113 — Pre-commit runs the project's verify script (monorepo `--no-verify` cause)

**Priority:** P1 · **Wave:** C (0.20.0), row C3 · **Size:** S (~0.5 day AI-assisted)
**Source:** Engyne upgrade, 2026-11-11. First half of item 87.

## Status

Implemented 2026-11-13 on `feature/113-precommit-verify` (PR pending).

## Problem

`templates/node/.claude/hooks/pre-commit` runs `npm test` whenever a `test`
script exists. In monorepos the root `test` often runs every package, including
integration tests that need a database, so the hook fails and developers commit
with `--no-verify` — which also skips the security gates. The hook has run
`npm test` since before 0.18.0; it began to bite when 0.18.0 activated hooks on
update (not a 0.19.0 change).

## Design decision (2026-11-13)

The original scope put the command in `.claude/settings-overrides.json`
(`verify.command` → `verify` script → `test:unit` → `npm test`). Replaced, at
the maintainer's request, with the design that is best for a team:

- **One committed `scripts/verify`**, run with `bash`, in place of the stack's
  test step. Versioned and reviewed, identical for every developer, stack
  neutral, and the same file item 87 wires into CI and the agent.
- **No per-developer override.** `settings-overrides.json` is gitignored and
  user data, so a gate configured there differs per developer and is invisible
  to CI and review.
- **No `test:unit` fallback.** It would silently skip integration tests in
  projects that have one, contradicting "default unchanged".
- **No default `scripts/verify` shipped yet.** Per-profile default contents are
  item 87.
- Failure messages no longer suggest `--no-verify`; the header comment keeps
  the emergency note.

## Acceptance (packed tarball, generated projects)

- [x] Monorepo fixture whose root `test` needs a database commits cleanly once
      `scripts/verify` is committed (`tests/pre-commit-hook.test.js`).
- [x] A failing `scripts/verify`, or one calling a missing command (exit 127),
      blocks the commit with a clear message.
- [x] Default behaviour unchanged when no `scripts/verify` exists.
- [x] All five profiles byte-identical.
- [ ] Packed-tarball check on Windows and Linux (Linux via CI).
