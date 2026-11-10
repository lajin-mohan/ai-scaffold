# Maintainer effectiveness audit command

Date: 2026-10-26. User requested a reusable command for this repository only.

Delivered root `.claude/commands/ais-effectiveness.md`, a CLAUDE.md pointer and
an Unreleased changelog entry. Default audits are read-only; `--deep` broadens
research; `--update-plan` saves evidence and proposes priorities without
overriding approval or another agent's work. No templates or runtime code change.

Validation:
- `npm run lint`: passed.
- `npm test -- src/__tests__/governance-checks.test.js`: 196 passed, 4 skipped
  across 4 matching suites (the runner also discovered worktree copies).
- `git diff --check`: passed.
- `npm pack --ignore-scripts`, using a temporary cache/destination: produced
  a tarball with no root `.claude/` or `tasks/` files in its pack manifest.
- Manual instruction review covered default/deep modes, missing research
  access, absent prior evidence and dirty/concurrently modified backlog handling.
  A live Claude Code slash-command invocation was not exercised in this session;
  the test counts above validate existing governance code, not audit quality.
