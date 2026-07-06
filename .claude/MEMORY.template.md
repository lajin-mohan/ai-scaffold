# Project Memory Template

Living index for project memory and session compactions.

Copy this file to `.claude/MEMORY.md` during `/bootstrap`, then replace the bracketed values with the adopting application's real context. Do not copy ai-scaffold build history into application repositories.

---

## Project Snapshot

| Field | Value |
|---|---|
| Project | [PROJECT_NAME] |
| Purpose | [ONE_LINE_PURPOSE] |
| Current epic | [CURRENT_EPIC] |
| Active AI role | [dev/qa/architect/ux/owner or not configured] |
| Last updated | [DATE] |

---

## Core Memory Files

| File | Purpose | Updated |
|---|---|---|
| [project-context.md](memory/project-context.md) | Sprint state, blockers, in-flight work, team | Per sprint |
| [architecture-decisions.md](memory/architecture-decisions.md) | ADRs, standing invariants, deferred decisions | Per ADR |
| [business-rules.md](memory/business-rules.md) | Non-obvious business logic, edge cases | Per discovery |
| [known-issues.md](memory/known-issues.md) | Active bugs, workarounds, technical debt | Per issue |

---

## Session Compaction History

Append-only log of session compactions. Each entry captures: stage, decisions made, open questions, files touched, and a next-session brief.

### [DATE] - Initial Bootstrap

**Stage:** Project bootstrap
**Reason:** Scaffold adopted for [PROJECT_NAME]

### Decisions Made
- [Initial project setup decisions]

### Open Questions
- [Open project questions]

### Files Touched
- [Files initialized or changed]

### Current State
- [Current project state]

### Next Session Brief
[Brief handoff for the next AI session.]

---

## How Memory Is Used

At the start of every session:
1. Read `.claude/MEMORY.md` to orient to active state and recent changes.
2. Read `.claude/memory/project-context.md` for sprint/work status.
3. Run `/lessons --recent 3` when lessons exist.

Before planning or architecture work:
- Read `.claude/memory/architecture-decisions.md`.
- Read `.claude/memory/business-rules.md`.

Before debugging or investigating:
- Read `.claude/memory/known-issues.md`.
- Search lessons for similar past issues.

---

## Memory Hygiene Rules

- Code and current specs win over stale memory.
- Archive stale entries instead of deleting useful history.
- Project memory only: do not install or depend on global/user-home memory by default.
- Never store secrets, credentials, API tokens, production data, private customer data, or client-confidential text unless explicitly approved for this repo.
- Treat memory edits as reviewed project changes; prefer small, factual updates with source context.
- Keep local-only notes in ignored files such as `.claude/memory/*.local.md`.

---

Update this index when new memory files are created or existing memory files are archived.
