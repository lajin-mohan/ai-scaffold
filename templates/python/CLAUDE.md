# CLAUDE.md — {{PROJECT_DISPLAY_NAME}}

@AGENTS.md

The shared instructions above apply to Claude Code as written. Precedence
between rules is set in [`constitution.md`](constitution.md). The notes below
cover only what is specific to Claude Code.

## Claude Code specifics

- **Rules load by path.** Files in `.claude/rules/` that declare `paths:` load
  when you work on matching files. Read the relevant rule file yourself when a
  task touches its area before any matching file is open.
- **Hooks are gates.** `.claude/settings.json` runs `.claude/hooks/pre-commit`
  before `git commit` and `git push`, and warns on edits to files you cited but
  did not read. When a hook blocks, report or fix the cause; do not bypass it.
- **Commands.** `/start-task` plans and executes multi-step work after
  approval; `/debug-fix` handles bugs root cause first; `/review` runs the
  reviewer agents before a pull request; `/commit-changes` checks the branch and
  evidence before committing; `/what-next` reports where the work stands.
- **Delivery workflow.** The staged process (analysis, design, review, QA,
  release) is the `project-delivery-workflow` skill. Use it only when the user
  asks for that workflow or a command that depends on it.
- **Memory.** `.claude/memory/` and `tasks/lessons.md` record past decisions and
  root causes. When they disagree with the code, the code wins; update the note.
- **Lessons.** After a correction from the user, record the pattern in
  `tasks/lessons.md` in the same session.
- **Task tracking.** One file per active ticket in `tasks/todo/`, moved to
  `tasks/done/` when complete; scratch work goes in `.claude/work/`, which is
  not committed.
