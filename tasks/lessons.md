# Lessons Learned

This file records patterns from mistakes and corrections. Claude reads this at the start of each session.

**Format for each entry:**
- **Mistake:** What went wrong
- **Why:** Root cause
- **Rule:** The principle that prevents recurrence

---

<!-- Add lessons below as they are captured. Most recent at the top. -->

## 2026-05-08 - Shared mutable status files cause merge conflicts under parallel work

- **Mistake:** During the four-phase audit, three `chore/*` branches forked from `dev` independently. Each modified `tasks/todo.md` to mark its own phase done and the others pending. When merged sequentially, every merge hit a conflict on `tasks/todo.md` because each branch had its own snapshot of cross-phase status.
- **Why:** `tasks/todo.md` was a single tracked file that every parallel work stream needed to update with its own status. Adjacent edits on the same lines guaranteed conflicts. The conflict was structural, not accidental.
- **Rule:** **Never put cross-stream status tracking in a single tracked file.** Use one of:
  1. **Per-ticket files** — one markdown file per ticket under `tasks/todo/<ID>-<slug>.md`, archived to `tasks/done/` on completion. Status is implicit from folder location.
  2. **Append-only logs** — `CHANGELOG.md` (with `merge=union` driver in `.gitattributes`). Adds from parallel branches auto-combine.
  3. **External SoT** — Jira / Linear / GitHub Projects for status; the repo carries only the spec, not the status.

  AI working state (planning, scratch) goes in `.claude/work/` (gitignored). Project work goes in `tasks/todo/` + `tasks/done/`. Permanent record of what shipped goes in `CHANGELOG.md`. **None of these conflict on parallel work.**
