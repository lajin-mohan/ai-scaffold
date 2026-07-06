# /lessons

Query past root causes and debugging lessons. Makes institutional knowledge from `/investigate` and `/debug-fix` accessible without re-learning the same mistake twice.

---

## Usage

```
/lessons                              # show most recent 10 lessons
/lessons 5                            # show most recent N lessons
/lessons "race condition"             # search by keyword
/lessons --tag debugging              # filter by tag
/lessons --tag security               # filter by tag (security, architecture, workflow, testing, git)
/lessons --all                        # show all lessons, oldest first
```

---

## How It Works

1. Read `.ai-scaffold/tasks/lessons.md`
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

- **Read-only.** Never write to `.ai-scaffold/tasks/lessons.md` from this command. Use `/investigate` or `/debug-fix` to capture new lessons.
- **No AI generation.** This command searches and formats — it doesn't generate new content.
- **If `.ai-scaffold/tasks/lessons.md` doesn't exist:** say "No lessons recorded yet. Run `/investigate` or `/debug-fix` to capture the first lesson."
- **Case-insensitive search.** `"Race Condition"` matches "race condition".

---

## Related Commands

- `/investigate` — captures new debugging lessons
- `/debug-fix` — captures new bug-fix lessons
- `ai-coding-rules.md` — the rules that prevent recurrence