# 104 — Native Codex and Cursor adapters from one shared core

## Status

Proposed, P1, 2026-11-05. Added by the maintainer-requested reprioritization
after the 2026-11-04 effectiveness review
(`docs/process/effectiveness-review-2026-11-04.md`). Builds the adapters that
item 67 describes and item 98 validates; it does not replace either. Design and
estimate required before implementation.

## Problem

A team mostly on Codex or Cursor gets little of the scaffold today:

- `AGENTS.md` (2.3 KB) tells the agent to read `CLAUDE.md` and
  `.claude/rules/`. Codex does not load those by default, so rule coverage
  depends on the agent choosing to open them.
- Cursor gets a single `.cursorrules` file that mirrors the 10-stage workflow
  with placeholders. Cursor's current project-rule format is
  `.cursor/rules/*.mdc`, and a plain `.md` file in that folder is ignored.
- No safety control reaches either tool. Deny/ask rules and hooks live only in
  Claude's `.claude/settings.json`.

## Scope

1. **One canonical core.** `AGENTS.md` becomes the shared core (target about
   150 lines, produced by item 84). Claude Code, Codex and Cursor all read
   `AGENTS.md`; the exact Claude Code mechanism is verified in item 98 before
   `CLAUDE.md` is reduced to a pointer or import.
2. **Cursor:** `.cursor/rules/core.mdc` (always applied) plus glob-scoped `.mdc`
   rules generated from the same sources as Claude's `paths:` rules;
   `.cursor/hooks.json` wiring `beforeShellExecution` and `beforeReadFile` to the
   shared guard scripts (exit 2 blocks in both tools) with `failClosed: true`.
   Retire `.cursorrules` through `ais update`.
3. **Codex:** nested `AGENTS.md` where scoped guidance applies;
   `.codex/config.toml` with `workspace-write` sandbox and `on-request`
   approvals; `.codex/rules/*.rules` `prefix_rule` entries that `forbid` or
   `prompt` for force-push, recursive delete and similar. Codex rules are
   documented as experimental and load only for a trusted project layer.
4. **Copilot:** keep `.github/copilot-instructions.md` generated from the core;
   no new controls claimed until verified.
5. Generation happens in `create`/`init`/`update` from one source per profile,
   so the five profiles and the tool files cannot drift.

## Acceptance and validation

- [ ] All tool files for a profile are generated from the same core; a CI check
  fails when any generated file differs from its source.
- [ ] In a packed-artifact project, each claimed tool is exercised in the tool
  itself (item 98 matrix): the core rule is followed in a controlled task, a
  scoped rule loads only for matching files, and a blocked command/read is
  blocked. Unverified behaviour is marked unverified, not supported.
- [ ] Cursor hooks block on exit 2, fail closed on crash and timeout, and do not
  block a benign command (false-positive case recorded).
- [ ] Codex rules carry inline `match` / `not_match` examples that run in CI; a
  `forbidden` and a `prompt` case are verified in a trusted project.
- [ ] `ais update` migrates existing adopters: `.cursorrules` retired only when
  unmodified, user rules and existing `.cursor/` / `.codex/` config preserved.
- [ ] Docs state per tool what is enforced, what is instruction only, and what
  is unsupported (for example, Codex secret-read restriction until verified).

## Dependencies

84 (small core to share), 98 (in-tool verification), 97 (same probe set),
25 (update migrations, done). 34 is not required; generation is per profile.

## Exit

A Codex-only and a Cursor-only team each get the core rules, scoped rules and
the safety policy natively, verified in their tool on a packed project.
