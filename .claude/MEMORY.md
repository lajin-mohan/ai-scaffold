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

### 2026-05-25 14:30 — Phase 2 Complete + Revised Roadmap Adopted

**Session duration:** ~45 minutes
**Stage:** ai-scaffold — Phase 2 (Token & Memory) just pushed to dev; full 6-phase roadmap revised
**Reason:** Phase 2 complete, user feedback on Phases 4–6 incorporated, adjusted plan approved

### Decisions Made
- Phase 2 token budget hooks in `settings.json` skipped — `tokenBudget` field not in Claude Code settings schema; governance thresholds operationalized via `/compact` and `/what-next --brief` instead
- `/bootstrap` split dropped — highly stateful, fragile inter-dependencies; 12.8KB size acceptable
- Phase 6 (stack-aware scripts) deferred — utility, not core OS; nice-to-have post-MVP
- Phase 4.5 (Agent System) inserted as highest priority gap — closes "nothing that orchestrates across rules" gap
- Phase 5 skills files capped at ~200 lines — token efficiency constraint confirmed by user review

### Open Questions
- Phase 4.5 Supervisor + Critic agent templates — user said "Go" and then called `/compact` before I could generate these
- Phase 3 observability files not yet built (audit-log.jsonl, `/reflect`, session metrics in `/health`)
- Phase 4 enhanced rules not yet built (ai-coding-rules §8-10, dod-rules UX gates, handoff protocol)

### Files Touched
- `.claude/commands/compact.md` — Phase 2 delivered
- `.claude/MEMORY.md` — Phase 2 delivered
- `.claude/commands/what-next.md` — Phase 2 delivered
- `.claude/rules/governance.md` — Phase 2 delivered
- `CLAUDE.md` — Phase 2 delivered
- Committed: `72a8863` — pushed to origin/dev

### Current State
- Phase 1 (Governance + Anti-Hallucination) — ✓ complete, pushed
- Phase 2 (Token & Memory) — ✓ complete, pushed to dev
- Phase 3 (Observability) — next: audit-log.jsonl, `/reflect`, session metrics in `/health`
- Phase 4 (Enhanced Rules + Handoff) — queued: ai-coding-rules §8-10, dod-rules UX gates, agent-handoff-protocol.md
- Phase 4.5 (Agent System) — queued: Supervisor Agent, Critic Agent
- Phase 5 (Skills) — deferred: ux-system/ (5 files), systematic-debugging, ux-review, design-system update
- Phase 6 (Scripts) — deferred indefinitely

### Next Session Brief
ai-scaffold now has governance engine and memory hygiene. Next priority is Phase 3 observability: build the audit log, `/reflect` command, and session metrics in `/health`. After that, Phase 4 adds formal rules sections and the agent handoff protocol. Then Phase 4.5 (Supervisor + Critic agents) closes the biggest remaining gap — the scaffold has rules but nothing that orchestrates across them. Phase 5 and 6 can follow in order.

### Lessons Captured
- `tokenBudget` not in Claude Code settings schema — don't try to add governance thresholds there; operationalize via commands and output instead

---

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