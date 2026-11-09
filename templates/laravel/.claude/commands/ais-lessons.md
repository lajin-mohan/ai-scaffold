---
description: Search past root causes and lessons in tasks/lessons.md (read-only), or record a new lesson with --write.
---

# /ais-lessons

Query past root causes and debugging lessons. Makes institutional knowledge from `/ais-debug` and `/ais-debug` accessible without re-learning the same mistake twice.

---

## Usage

```
/ais-lessons                              # show most recent 10 lessons
/ais-lessons 5                            # show most recent N lessons
/ais-lessons "race condition"             # search by keyword
/ais-lessons --tag debugging              # filter by tag
/ais-lessons --tag security               # filter by tag (security, architecture, workflow, testing, git)
/ais-lessons --all                        # show all lessons, oldest first
/ais-lessons --write                      # record a lesson from this session (the only mode that writes)
/ais-lessons --write --quick              # one-line lesson
```

---

## How It Works

1. Read `tasks/lessons.md`
2. Parse entries (separated by `## ` headings with ISO dates)
3. Apply filters (search term or tag)
4. Output matching entries with relevance context

---

## Tag Taxonomy

| Tag | Covers |
|---|---|
| `debugging` | Root cause investigation, hypothesis testing, scope lock |
| `architecture` | Design decisions, layering, coupling, ADRs |
| `security` | Auth, injection, tenant isolation, secrets, PII |
| `workflow` | Plan-and-confirm, phase gates, DoR/DoD, sprint process |
| `testing` | Test coverage, mocking, integration vs unit |
| `git` | Commits, branching, merges, force-push, Co-Authored-By |
| `performance` | N+1, indexing, caching, query optimization |
| `frontend` | CSS variables, dark mode, mobile, design tokens |
| `ai-governance` | Hallucination, token usage, context management, self-critique |

Tag format in lessons.md:
```
tags: debugging, workflow
```

---

## Output Format

```
## Lessons — N results for "{{query}}"

### [Date] Lesson title
**Tags:** debugging, workflow
**Mistake:** ...
**Why:** ...
**Rule:** ...

---
```

---

## Rules

- **Read-only unless `--write` is given.** Search and listing never modify `tasks/lessons.md`; only `--write` appends an entry.
- **No AI generation when searching.** Search mode only finds and formats existing entries.
- **If `tasks/lessons.md` doesn't exist:** say "No lessons recorded yet. Run `/ais-debug` or `/ais-debug` to capture the first lesson."
- **Case-insensitive search.** `"Race Condition"` matches "race condition".

---

## Related Commands

- `/ais-debug` — captures new debugging lessons
- `/ais-debug` — captures new bug-fix lessons
- `ai-coding-rules.md` — the rules that prevent recurrence

---

## Writing a lesson (`--write`)

Records what a session taught.

### When to Run

**Run `/ais-lessons --write` when:**
- A debugging session found a root cause worth remembering
- An architecture decision was made that wasn't documented
- A pattern emerged that contradicts past assumptions
- An estimation was significantly wrong (over or under)
- A task took unexpectedly long due to a process issue
- A lesson was learned that `/ais-debug` and `/ais-debug` didn't capture

**Do NOT run `/ais-lessons --write` when:**
- The work was routine with no new learning
- You're mid-task — finish the task first
- There's nothing worth capturing for next time

---

### Process

#### Step 1 — Identify the Session Type

What kind of work was this session?

| Type | Focus | Example |
|---|---|---|
| Debugging | Root cause, pattern, fix | "Race condition in job queue — fixed with retry limit" |
| Architecture | Decision, trade-off, constraint | "Chose repository pattern over ORM for hot-path queries" |
| Planning | Estimation quality, scope clarity | "Phase estimate off by 3× — missed complexity in data migration" |
| Implementation | Code quality, pattern, refactor | "Should've split this service earlier — 3 responsibilities" |
| Process | Workflow, handoff, tooling | "Pre-commit hooks caught a secret — good signal" |

#### Step 2 — Capture the Lesson

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

#### Step 3 — Write to tasks/lessons.md

Append to `tasks/lessons.md`. Entries are append-only — never edit past lessons, only add new ones.

#### Step 4 — Audit Log Entry

Append to `.claude/memory/audit-log.jsonl`:
```json
{"ts":"{{ISO8601}}","event":"reflect","session_type":"{{type}}","lessons":{{N}},"open_questions":{{N}}}
```

On session start, also write a session_start event:
```json
{"ts":"{{ISO8601}}","event":"session_start","purpose":"{{brief one-line purpose}}"}
```

#### Step 5 — Report

```
## /ais-lessons --write — Post-Session Reflection

**Session type:** {{type}}
**Lessons captured:** {{N}}
**Open questions:** {{N}}

### Top Lesson
{{2-sentence summary of the most important lesson}}

### Related Commands
- `/ais-lessons` — query all past lessons
- `/ais-debug` — if root cause was found
- `/ais-health` — if token efficiency was a factor
```

---

### Quick Mode

When given a brief note (`/ais-lessons --write "brief description"`), expand it into a full lesson entry:

1. Classify the session type from the description
2. Identify the root cause or principle embedded in the note
3. Write a complete lesson entry
4. Report the full entry back for confirmation

---

### Rules

- **Append-only.** Never edit past lessons — add new ones that supersede.
- **One lesson per session is enough.** Quality over quantity.
- **If in doubt, write it.** A lesson that turns out to be obvious is still worth recording — it trains the pattern recognition.
- **Cross-reference.** Link to related lessons, files, or rules where relevant.
- **"I don't know" is valid.** If the lesson is "I still don't understand why X happened", write that. Unknowns are tracked too.
