# /reflect

Post-task reflection to capture lessons, patterns, and process improvements. Run after any significant work session — debugging, architecture, planning, or implementation. Writes findings to `.ai-scaffold/tasks/lessons.md` and the audit log.

Use `/reflect` when `/lessons` has no relevant entries for what you just worked through.

---

## Usage

```
/reflect                    # interactive — prompts for each section
/reflect "what happened"    # quick reflection with brief note
/reflect --after "<task>"  # targeted post-task reflection
```

---

## When to Run

**Run `/reflect` when:**
- A debugging session found a root cause worth remembering
- An architecture decision was made that wasn't documented
- A pattern emerged that contradicts past assumptions
- An estimation was significantly wrong (over or under)
- A task took unexpectedly long due to a process issue
- A lesson was learned that `/investigate` and `/debug-fix` didn't capture

**Do NOT run `/reflect` when:**
- The work was routine with no new learning
- You're mid-task — finish the task first
- There's nothing worth capturing for next time

---

## Process

### Step 1 — Identify the Session Type

What kind of work was this session?

| Type | Focus | Example |
|---|---|---|
| Debugging | Root cause, pattern, fix | "Race condition in job queue — fixed with retry limit" |
| Architecture | Decision, trade-off, constraint | "Chose repository pattern over ORM for hot-path queries" |
| Planning | Estimation quality, scope clarity | "Phase estimate off by 3× — missed complexity in data migration" |
| Implementation | Code quality, pattern, refactor | "Should've split this service earlier — 3 responsibilities" |
| Process | Workflow, handoff, tooling | "Pre-commit hooks caught a secret — good signal" |

### Step 2 — Capture the Lesson

For each lesson, capture:

```
### [Lesson Tag] {{YYYY-MM-DD}}
**Session type:** {{type}}
**What happened:** {{2-3 sentences — the event or discovery}}
**Why it matters:** {{what pattern or principle this teaches}}
**How to apply:** {{when/where this shows up again}}
**Related:** {{link to relevant file, rule, or past lesson if any}}
```

Tags: `debugging` `architecture` `security` `workflow` `testing` `git` `performance` `frontend` `ai-governance` `estimation`

### Step 3 — Write to .ai-scaffold/tasks/lessons.md

Append to `.ai-scaffold/tasks/lessons.md`. Entries are append-only — never edit past lessons, only add new ones.

### Step 4 — Audit Log Entry

Append to `.claude/memory/audit-log.jsonl`:
```json
{"ts":"{{ISO8601}}","event":"reflect","session_type":"{{type}}","lessons":{{N}},"open_questions":{{N}}}
```

On session start, also write a session_start event:
```json
{"ts":"{{ISO8601}}","event":"session_start","purpose":"{{brief one-line purpose}}"}
```

### Step 5 — Report

```
## /reflect — Post-Session Reflection

**Session type:** {{type}}
**Lessons captured:** {{N}}
**Open questions:** {{N}}

### Top Lesson
{{2-sentence summary of the most important lesson}}

### Related Commands
- `/lessons` — query all past lessons
- `/investigate` — if root cause was found
- `/health` — if token efficiency was a factor
```

---

## Quick Mode

When given a brief note (`/reflect "brief description"`), expand it into a full lesson entry:

1. Classify the session type from the description
2. Identify the root cause or principle embedded in the note
3. Write a complete lesson entry
4. Report the full entry back for confirmation

---

## Rules

- **Append-only.** Never edit past lessons — add new ones that supersede.
- **One lesson per session is enough.** Quality over quantity.
- **If in doubt, write it.** A lesson that turns out to be obvious is still worth recording — it trains the pattern recognition.
- **Cross-reference.** Link to related lessons, files, or rules where relevant.
- **"I don't know" is valid.** If the lesson is "I still don't understand why X happened", write that. Unknowns are tracked too.

---

## Audit Trail (Phase 3 ready)

`/reflect` writes to both `.ai-scaffold/tasks/lessons.md` and `.claude/memory/audit-log.jsonl`. The audit log entry enables future observability: session quality trends, recurring patterns, estimation accuracy.

---

## Related Commands

- `/lessons` — query past lessons by keyword or tag
- `/investigate` — captures debugging lessons via the 3-strike rule
- `/debug-fix` — captures bug-fix lessons via the 5-status report
- `/compact` — runs `/reflect` as part of Step 4 before compacting