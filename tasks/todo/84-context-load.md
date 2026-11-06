# 84 — Lean shared core: stop auto-loading the process corpus

## Status

Proposed, P1. Listed in the corrective phase (C3) since 2026-10-09; ticket file
created 2026-11-06 when Wave B was amended
(`docs/process/pre-npm-publish-todo.md`, "Wave B amendments (2026-11-06)").
Evidence: `docs/research/reports/AI repo instruction practices.md`. Depends on
the row 1 measurement (item 74 M-08 per-tool fix and item 99 smoke subset)
landing first. Design and estimate required before implementation.

## Problem

A generated project loads roughly 37K est-tokens of scaffold instructions at
every Claude Code session start (static estimate, 0.18.0), several times the
median root instruction file in large public repositories. Sixteen rules load
unconditionally, including the 10-stage delivery process, readiness/done
checklists and the handoff protocol. Codex sees only a 2.3 KB `AGENTS.md`
pointer, so the content is both too heavy for Claude and absent for Codex.

## Budget definition

**≤ 5K est-tokens of scaffold-controlled startup context per supported
tool/surface**, each counted separately:

- root instruction file(s) and everything they import;
- unscoped rules (Claude rules without `paths:`, Cursor `alwaysApply`,
  Copilot repository-wide instructions);
- skill, command and agent descriptions loaded at session start;
- duplication where a surface loads more than one of our files.

Bytes are reported alongside tokens. Codex's `project_doc_max_bytes` (32 KiB
default) bounds the combined instruction chain including the user's global
file, so the core must leave headroom for nested `AGENTS.md` files.

## Scope

1. **Canonical core in `AGENTS.md`** (about 150 lines): commands, repository
   map, conventions, non-obvious gotchas, universal security boundaries and
   "ask before push, PR, release or any outward action". No emphasis words, no
   model names, no lifecycle stages.
2. **`CLAUDE.md` imports `AGENTS.md`** and adds only Claude-specific lines. The
   import mechanism is verified in Claude Code on a packed project before the
   switch (item 98 owns cross-tool conformance).
3. **Copilot instructions** are generated from the core; check whether surfaces
   that load both `AGENTS.md` and `.github/copilot-instructions.md` would
   duplicate it, and generate a delta instead if so. `.cursorrules` retires
   (Cursor reads `AGENTS.md`); native `.cursor/rules` and hooks stay item 104.
4. **Relocate the 16 unscoped rules**, each to exactly one place:
   - scoped rules in each tool's native format (`paths:`, `.mdc` `globs`,
     `applyTo`) for API, UX, testing and stack/architecture detail;
   - an on-demand delivery skill for the 10-stage process, DoR/DoD, manual
     review checklist and handoff protocol (the full `ais add process` pack is
     item 90);
   - deletion for duplicated or outdated content (item 105 lists it).
5. **Conditional content:** multi-tenant and compliance material only when the
   bootstrap answers select it.

## Acceptance and validation

- [ ] `npm run token-report` (per-tool, item 74) shows ≤ 5K static estimate for
  every supported surface of a packed-tarball project, all five profiles, with
  byte counts and the Codex chain headroom.
- [ ] Observed context recorded where a tool exposes it (Claude Code
  `/context`), with tool version, settings and working directory; surfaces
  without such a report are marked "observed: unavailable".
- [ ] Positive and negative loading checks per scoped rule: it loads when a
  matching file is touched and not otherwise, in each tool's format.
- [ ] Item 99 smoke tasks: thresholds written before the run; result reported
  as "no regression observed on these tasks" or the regression found.
- [ ] Shared files identical across the five profiles; stack-specific files
  untouched.
- [ ] `ais update` from a packed 0.18.0 install removes pristine retired files,
  keeps edited ones with a notice, and a second apply changes nothing.

## Dependencies

74 (per-tool measurement), 99 (smoke subset), 25 (update removals, done).
Coordinates with 105 (provenance, stale checks), 69 (UX aliases), 90 (packs),
98 (conformance), 104 (native Codex/Cursor config).

## Exit

Every supported tool starts with a short, identical core, and the process
corpus loads only when asked for.
