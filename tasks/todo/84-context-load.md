# 84 — Lean shared core: stop auto-loading the process corpus

## Status

**Parts 1 and 2 shipped in 0.19.0 (2026-11-10).** Open, P1, for the remainder
below (Wave C, PR C2, and items 104/98). Listed in the corrective phase (C3)
since 2026-10-09; ticket file
created 2026-11-06 when Wave B was amended
(`docs/process/pre-npm-publish-todo.md`, "Wave B amendments (2026-11-06)").
Evidence: `docs/research/reports/AI repo instruction practices.md`. Depends on
the row 1 measurement (item 74 M-08 per-tool fix and item 99 smoke subset)
landing first. Design and estimate required before implementation.

## Progress (Wave B)

**PR 3 — shared core (2026-11-06).** `AGENTS.md` is the canonical core in all
five profiles; `CLAUDE.md` imports it; `.claude/AGENTS.md` retired.
`.cursorrules` and `.github/copilot-instructions.md` are not installed in
generated projects (`EXCLUDED_DEFAULT_PATTERNS` in `file-plan.js`
excludes `.github/**` and `.cursorrules`), so scope item 3 has nothing to generate today; native Cursor
and Copilot files stay with item 104.

Interim static estimate (`npm run token-report`, packed tree, all profiles):

| Surface | Before (0.18.0, node) | After PR 3 (range over profiles) |
|---|---|---|
| Claude Code | ~39.7K | ~34.6K (unscoped rules unchanged; PR 4) |
| Codex | ~0.6K, 2.3 KB | ~1.3K, 5.1–5.2 KB of 32 KiB |
| Cursor | ~8.1K | ~2.4K |
| Copilot CLI | ~8.1K | ~2.4K |

Not yet verified: a live Claude Code probe that the `@AGENTS.md` import loads
(the session that built PR 3 could not authenticate a child `claude`). The
command is in the PR. Observed context: unavailable.

**PR 4 — rule relocation (2026-11-06).** Code-area rules carry `paths:`;
process documents moved to the opt-in delivery skill's `references/`;
`token-usage-rules.md` deleted; tenant and compliance wording conditional.
Static estimate after PR 4 (node): Claude Code ~5.4K, of which ~1.3K is the
still-unscoped `ponytail-ladder.md` that PR 5 retires. Cursor/Copilot ~2.4K,
Codex ~1.3K. Glob checks are static (`rule-scope.test.js`); runtime loading
per tool remains item 98.

The ≤ 5K budget and its enforcement shipped in 0.19.0 (PR 5,
`scripts/check-governance.js`, item 105).

**Still open (2026-11-10):**

- **`ais init` and the `@AGENTS.md` import (Wave C, PR C2).** `ais create`
  writes a `CLAUDE.md` that imports `AGENTS.md`. `ais init` into a repository
  that already has its own `CLAUDE.md` keeps that file, so nothing imports the
  core and Claude Code never loads it. Fix: add the import line without
  overwriting the adopter's file, idempotently, and say so in the init report.
  Acceptance: packed-tarball `init` into a fixture with an existing
  `CLAUDE.md` and one without; a second `init` adds nothing.
- Live check that Claude Code loads `AGENTS.md` through the import (signed-in
  terminal; observed context).
- Cursor/Copilot scoped rules and runtime loading checks (items 104, 98).

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
