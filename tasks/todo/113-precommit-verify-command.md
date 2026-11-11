# 113 — Pre-commit runs a configurable verify command (monorepo `--no-verify` cause)

**Priority:** P1 · **Wave:** C (0.20.0), row C3 · **Size:** S (~0.5 day AI-assisted)
**Source:** Engyne upgrade, 2026-11-11. Precursor to item 87.

## Problem

`templates/node/.claude/hooks/pre-commit:100` runs `npm test` whenever a `test`
script exists. In monorepos the root `test` often runs every package, including
integration tests that need a database, so the hook fails and developers commit
with `--no-verify` — which also skips the security gates. The hook has run
`npm test` since before 0.18.0; it began to bite when 0.18.0 activated hooks on
update (not a 0.19.0 change).

## Scope

- Resolution order: `verify.command` in `.claude/settings-overrides.json` →
  `verify` script → `test:unit` script → `npm test`.
- On failure, the message explains how to configure a faster command instead
  of suggesting `--no-verify`.
- A configured command that does not exist fails closed.
- All five profiles; each keeps its own stack-specific default.
- Item 87 later adopts the same resolution for CI and the agent.

## Acceptance (packed tarball, generated projects)

- [ ] Monorepo fixture whose root `test` needs a database commits cleanly once
      a verify command is configured.
- [ ] Missing configured command blocks the commit with a clear message.
- [ ] Default behaviour unchanged when nothing is configured.
- [ ] Tested on Windows and Linux.
