# Memory Index

Living index of all memory files and session compactions. Use this to orient before reading individual memory files.

---

## Core Memory Files

| File | Purpose | Updated |
|---|---|---|
| [project-context.md](memory/project-context.md) | Sprint state, blockers, in-flight work, team | Per sprint |
| [architecture-decisions.md](memory/architecture-decisions.md) | ADRs, standing invariants, deferred decisions | Per ADR |
| [business-rules.md](memory/business-rules.md) | Non-obvious business logic, edge cases | Per discovery |
| [known-issues.md](memory/known-issues.md) | Active bugs, workarounds, technical debt | Per issue |

---

## User Preferences & Patterns

User-specific preferences persist here — loaded at session start for personalization.

| File | Purpose |
|---|---|
| [user_preferences.md](memory/user_preferences.md) | User role, collaboration style, token budget preference |
| [feedback_per_phase_snapshots.md](memory/feedback_per_phase_snapshots.md) | Per-phase approval snapshots — before executing each major action, present a 1-2 sentence rationale and wait for explicit "go" |
| [engyne-to-scaffold-adoption.md](memory/engyne-to-scaffold-adoption-2026-05-22.md) | Phase 1 execution plan for Engyne→ai-scaffold adoption |

---

## Session Compaction History

Append-only log of session compactions. Each entry captures: stage, decisions made, open questions, files touched, and a Next Session Brief.

> **Why this section exists:** A session that reaches 300K+ tokens becomes unreliable. Compacting writes the state to disk so the next session starts fresh without losing context. Every entry is a handover note to future-you.

### How to read this section

- Recent entries (top) are the most relevant — they describe where the project currently stands
- Each entry includes a "Next Session Brief" — start here if you're picking up after a compact
- Older entries are archived reference; they're not deleted, just moved below the fold

### Compact History

*(No entries yet — /compact has not been run)*

---

## How Memory Is Used

At the **start of every session**:
1. Read `MEMORY.md` (this file) — orient to what's active and what changed recently
2. Read `memory/project-context.md` — understand current sprint state
3. Run `/lessons --recent 3` — check for patterns from past corrections to avoid repeating

Before **planning or architecture work**:
- Read `memory/architecture-decisions.md` — know what's been decided and why
- Read `memory/business-rules.md` — know non-obvious rules that aren't in the code

Before **debugging or investigating**:
- Run `/lessons "debug"` — find similar past issues and how they were resolved
- Read `memory/known-issues.md` — know what's already broken before digging

---

## Memory Hygiene Rules

- **Stale memory wins over no memory** — but code wins over stale memory (ai-coding-rules.md H3)
- **Archival, not deletion** — old entries are marked `[Archived]` not removed
- **Never store secrets or credentials** — memory files are in the repo; use only safe data
- **Phased compaction** — use `/compact --deep` monthly to prune and archive

---

*Update this index when new memory files are created or existing ones are archived.*