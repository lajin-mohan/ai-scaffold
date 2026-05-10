# Lessons Learned

This file records patterns from mistakes and corrections. Claude reads this at the start of every session.

**Format for each entry:**
- **Mistake:** What went wrong
- **Why:** Root cause
- **Rule:** The principle that prevents recurrence

---

<!-- Add lessons below as they are captured. Most recent at the top. -->

## 2026-05-10 - Co-Authored-By added to every commit

- **Mistake:** Every commit included `Co-Authored-By: Claude Opus 4.7`, adding an AI identity to the git history. User explicitly required all commits under the git owner's identity only.
- **Why:** AI default behavior includes Co-Authored-By without being prompted to omit it. The existing rules didn't explicitly prohibit it.
- **Rule:** **Never add Co-Authored-By or any AI identity attribution to commits.** All commits must use the human owner's identity only. The git global commit template (`~/.gitmessage`) now enforces this — it contains no Co-Authored-By block. If a template ever includes AI attribution, remove it immediately.

## 2026-05-10 - Plan-and-confirm gate skipped on multi-step task

- **Mistake:** Executed a 28-file, multi-agent, multi-day task without writing a plan first or getting explicit "go" approval. The work spanned multiple architectural layers, multiple agents, and weeks of content.
- **Why:** The task started as what felt like a small continuation but grew organically. No checkpoint was set to trigger the plan-and-confirm gate. The "I'll plan as I go" approach replaced the required written plan.
- **Rule:** **Plan-and-confirm is mandatory for any task with >3 logical steps, multi-file scope, or multi-layer impact.** Write the plan first, wait for explicit "go", then execute. Silence is not approval. CLAUDE.md now has an explicit plan-and-confirm gate in the "Claude Operating Instructions" section. If mid-task the scope grows beyond the original plan, stop and re-plan before continuing.

## 2026-05-10 - Lessons not recorded immediately after correction

- **Mistake:** User corrected the Co-Authored-By issue, but the lesson was not recorded to `tasks/lessons.md` after the correction. The lesson sat unwritten until a later session.
- **Why:** Lesson recording was treated as a future task ("I should add that to lessons") rather than an immediate action triggered by the correction itself.
- **Rule:** **Record lessons immediately when corrected — not at end of session.** The user correction is the trigger. Open `tasks/lessons.md` and write the entry before continuing any other work.

## 2026-05-10 - Per-ticket task tracking not followed

- **Mistake:** Used `TodoWrite` (session-local, ephemeral) for tracking a large multi-file task instead of creating `tasks/todo/<TICKET-ID>-<slug>.md` as required by CLAUDE.md's Working Agreement.
- **Why:** TodoWrite is fast and requires no file creation. Per-ticket files feel heavyweight. But TodoWrite results are session-local and invisible to future sessions or other AI instances.
- **Rule:** **Non-trivial work (anything spanning >1 session or multiple files) must use `tasks/todo/<TICKET-ID>-<slug>.md`.** TodoWrite is for in-conversation step tracking only. Per-ticket files are tracked, persistent, and survive session boundaries. Move completed files to `tasks/done/` on completion.

## 2026-05-08 - Shared mutable status files cause merge conflicts under parallel work

- **Mistake:** During the four-phase audit, three `chore/*` branches forked from `dev` independently. Each modified `tasks/todo.md` to mark its own phase done and the others pending. When merged sequentially, every merge hit a conflict on `tasks/todo.md` because each branch had its own snapshot of cross-phase status.
- **Why:** `tasks/todo.md` was a single tracked file that every parallel work stream needed to update with its own status. Adjacent edits on the same lines guaranteed conflicts. The conflict was structural, not accidental.
- **Rule:** **Never put cross-stream status tracking in a single tracked file.** Use one of:
  1. **Per-ticket files** — one markdown file per ticket under `tasks/todo/<ID>-<slug>.md`, archived to `tasks/done/` on completion. Status is implicit from folder location.
  2. **Append-only logs** — `CHANGELOG.md` (with `merge=union` driver in `.gitattributes`). Adds from parallel branches auto-combine.
  3. **External SoT** — Jira / Linear / GitHub Projects for status; the repo carries only the spec, not the status.

  AI working state (planning, scratch) goes in `.claude/work/` (gitignored). Project work goes in `tasks/todo/` + `tasks/done/`. Permanent record of what shipped goes in `CHANGELOG.md`. **None of these conflict on parallel work.**
