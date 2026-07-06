# /compact

Compact the conversation context by writing key session decisions and state to `MEMORY.md`, then signal that the conversation window can be reset. Use when session token count crosses the warning threshold (per `settings.json` `tokenBudget.warningThreshold`) or when the session has reached a natural milestone.

`/compact` does not end the session — it prepares it for continuation with a clean context window.

---

## Usage

```
/compact                      # standard compaction — write MEMORY.md summary
/compact --deep               # aggressive pruning — also prune old audit entries, archive stale memories
/compact --abort              # abort compaction if mid-session interruption occurred
```

---

## When to Run

**Run `/compact` when:**
- Token count approaches `tokenBudget.warningThreshold` (default: 300K)
- A major milestone is reached (phase complete, epic done, sprint wrap)
- `/what-next` or `/health` suggests `/compact`
- After a long debugging session (capture lessons before context degrades)
- Before closing a session that had significant decisions

**Do NOT run `/compact` when:**
- Mid-task with no natural break — finish the task first
- No meaningful decisions were made in this session
- A critical bug is still being investigated (capture the lesson before compacting)

---

## What Gets Written to MEMORY.md

The compaction summary is written as a new entry in `MEMORY.md` (prepended to the `[Compact History]` section). It uses this template:

```markdown
### {{YYYY-MM-DD HH:MM}} — Session Compact

**Session duration:** ~{{N}} minutes
**Stage:** {{current project stage from /what-next}}
**Reason:** {{why compaction was triggered}}

### Decisions Made
- {{Decision 1}} — file:line reference
- {{Decision 2}}

### Open Questions
- {{Question 1}} — who to ask / what to verify
- {{Question 2}}

### Files Touched
- {{file}} — {{nature of change}}

### Current State
- {{What was being worked on}}
- {{What remains to be done}}

### Next Session Brief
{{2-3 sentence summary of where the project stands and what the next session should prioritize.
Written for someone who has no context of this session.}}

### Lessons Captured
- {{Lesson from this session, if any — link to .ai-scaffold/tasks/lessons.md}}

---
```

---

## Process

### Step 1 — Detect Token State

Before compacting, check if the session has meaningful content:
- Was any code written or edited?
- Were any significant decisions made?
- Are there open questions that need to be tracked?

If the session was primarily Q&A with no decisions or code changes, write a minimal entry and skip the detailed sections.

### Step 2 — Determine Session Duration

Use the conversation start time from context or estimate from token count (roughly 1K tokens per 3–5 minutes of active conversation).

### Step 3 — Query /what-next (brief)

Run `/what-next --brief` to capture current stage and blockers for the Next Session Brief.

### Step 4 — Check for Uncaptured Lessons

Run `/lessons --recent 3` to see if any patterns from this session should be added to `.ai-scaffold/tasks/lessons.md`. If a new lesson was learned (root cause, mistake, decision), add it now before compacting.

### Step 5 — Write MEMORY.md Entry

Prepend the compaction summary to the `[Compact History]` section of `MEMORY.md`. Do not edit existing entries — append only.

### Step 6 — Signal Continuation

After writing MEMORY.md, output the completion summary and signal that the conversation window is now compact. The next prompt can continue from the fresh context.

---

## Output Format

```
## /compact — Session Compaction

**Status:** ✅ Compaction complete
**Tokens:** ~{{current estimate}} / {{warningThreshold}}
**Session:** {{duration}} minutes | Stage: {{stage}}
**Decisions:** {{N}} written to MEMORY.md
**Lessons:** {{N}} captured to .ai-scaffold/tasks/lessons.md

---

### MEMORY.md Entry Written

{{2-3 sentence summary of what was captured}}

### Next Session

{{Next Session Brief (2-3 sentences)}}

---

Session context is now compact. Continue with next task.
```

---

## --deep Mode

When `--deep` is specified, also:

1. **Prune audit log** — remove entries older than 90 days from `.claude/memory/audit-log.jsonl` (if it exists)
2. **Archive stale memories** — mark entries in `MEMORY.md` older than 180 days as `[Archived]` (move to a separate section, don't delete)
3. **Prune old compact entries** — keep only the last 20 entries in `[Compact History]`; older ones are archived
4. **Verify memory files** — check that all referenced files in MEMORY.md still exist; remove broken references

Run `--deep` monthly or when MEMORY.md exceeds 50KB.

---

## Rules

- **Never compact mid-task.** Finish the current unit of work first — a decision, a code block, a review. Compact only at natural break points.
- **Next Session Brief is mandatory.** Written for someone with zero context. Include: where the project stands, what was being worked on, what needs to happen next.
- **No deletion — only archival.** Pruning removes broken references and archives old entries; nothing is permanently deleted.
- **Lessons capture first.** If this session produced a lesson (root cause found, mistake corrected, pattern identified), write it to `.ai-scaffold/tasks/lessons.md` before compacting.
- **Compact history is append-only.** Existing entries are never edited after the fact.

---

## Audit Trail (Phase 3 ready)

When `.claude/memory/audit-log.jsonl` exists, append a compaction event:
```json
{"ts":"{{ISO8601}}","event":"compact","session_tokens_approx":{{N}},"decisions":{{N}},"lessons":{{N}}}
```
This is Phase 3 infrastructure — `/compact` writes the entry; Phase 3 makes it observable.

---

## Related Commands

- `/lessons` — query past lessons and debugging patterns
- `/health` — runs token tracking; suggests `/compact` when approaching threshold
- `/what-next` — used to capture current stage for the Next Session Brief