# 112 — Project content survives upgrades (`PROJECT.md` + project rule overrides)

**Priority:** P1 · **Wave:** C (0.20.0), row C4, after C2 · **Size:** M (~1–1.5 days AI-assisted)
**Source:** Engyne upgrade, 2026-11-11 — project content written into
scaffold-owned `constitution.md` / `AGENTS.md` / `CLAUDE.md` conflicted or went
stale on `ais update`.

## Problem

Adopters have no supported home for project content and no supported way to
override a scaffold rule, so they edit scaffold-managed files. Update then
reports `conflict` (`src/cli/core/update-plan.js:41-43`) or, for the protected
core (`PROTECTED_MANAGED`, `update-plan.js:24`), never refreshes them.

## Scope

1. **`PROJECT.md` at the repository root.** `create` and `update` add a starter
   when absent (same "added only when missing" rule as `CHANGELOG.md`); never
   modified afterwards. An existing hand-made `PROJECT.md` is read as-is.
2. **Load it.** Generated `CLAUDE.md` imports `@PROJECT.md`; `AGENTS.md` carries
   a one-line pointer for Codex, Cursor and Copilot. Existing installs get the
   import through the C2 mechanism (append without overwriting `CLAUDE.md`).
3. **`.claude/rules/project/`** for project rules, with a precedence README.
   Override files declare `overrides: <scaffold rule>` in frontmatter.
   **Security floor, never overridable:** secrets handling, approval for
   destructive commands, tenant isolation (may be strengthened, never relaxed),
   commit identity.
4. **`ais doctor`** warns when a scaffold-owned core file carries project edits
   and points to `PROJECT.md`.
5. **Docs:** "Where project content goes" section in `docs/commands.md` /
   README template, all five profiles identical.

## Acceptance (packed tarball, generated projects)

- [ ] `init` with no `PROJECT.md` creates the starter.
- [ ] A hand-made `PROJECT.md` is byte-identical after `update --apply`.
- [ ] A second update reports `current`.
- [ ] `update` never lists any path under `.claude/rules/project/**`.
- [ ] Fresh Claude Code session: `/memory` lists `PROJECT.md` and the project
      rules. If subfolder rules do not load, fall back to imports from
      `PROJECT.md` and document it (unverified today).
- [ ] Shared changes byte-identical across the five profiles.

## Out of scope

Engyne's own migration (their PR #57). Native Codex/Cursor adapters (104).

## Dependencies

C2 (84 remainder) for the import-append logic.
