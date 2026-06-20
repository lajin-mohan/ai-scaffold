# Lessons Learned

This file records patterns from mistakes and corrections. Claude reads this at the start of every session.

**Format for each entry:**
- **Mistake:** What went wrong
- **Why:** Root cause
- **Rule:** The principle that prevents recurrence

---

<!-- Add lessons below as they are captured. Most recent at the top. -->

## 2026-06-20 - ponytail-mode is OFF by default; per-call intensity only; gates always win

- **Mistake:** A "lazy senior developer" ruleset was added to the scaffold. Without an explicit off-by-default and per-call scoping rule, the agent auto-applied the ladder and tried to skip Stage 1 (BRD), bypass tenant scoping, and stop at "one runnable check" instead of the test pyramid.
- **Why:** The plugin's default behavior is to activate at SessionStart and persist across the session. The reflex-driven mode (`/ponytail lite|full|ultra`) conflicts with the scaffold's stage-gated workflow, layered architecture, and DoD floor. Without an explicit subordination rule, the agent treats the ladder as a parallel enforcement system and the gates as advisory.
- **Rule:** **ponytail-mode is OFF by default in this scaffold.** Intensity is per-call via `/start-task --intensity lite|full|ultra` and never persists. The ladder never overrides the gates, DoD, layered architecture, security rules, or the test pyramid — it is a pressure layer *below* them, not a parallel driver. See [`.claude/rules/ponytail-ladder.md`](../.claude/rules/ponytail-ladder.md) "What This Rule Does NOT Override" for the full list. Any review finding that says "this should have been caught by gates" while intensity was set should cite this lesson.

## 2026-05-10 - Phase estimation missing from project workflow

- **Mistake:** Phase-level work (Phase 0, Phase 1, etc.) was planned and documented without formal three-point estimates. The team discovered the gap late.
- **Why:** Phase-level work was treated as documentation/planning, not as a development deliverable requiring an estimate. The `/estimate` command existed for features but was never invoked for phases.
- **Rule:** **Every phase and epic requires a formal three-point estimate before work begins.** Invoke `/estimate` for Phase-level work the same as for feature-level work. The estimate must be reviewed by Tech Lead and signed off before Phase kickoff. This is enforced in `/what-next` Stage 2 (Plan) — Phase estimates are a required artifact. Phase-level work without an estimate is a hard gate in `/what-next` Phase-Level Pre-Check.

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
