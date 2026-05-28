# ai-scaffold Build History

This file preserves historical context from the scaffold's own `.claude/MEMORY.md` before that memory file was cleaned for reuse in adopted applications.

Application repositories should not copy these entries into their project memory. Use `.claude/MEMORY.template.md` as the starting point instead.

---

## 2026-05-28 06:55 - Publish-ready Final Pass

**Stage:** ai-scaffold Phase 1-5 complete, publish-ready on `dev`

### Decisions Made
- Removed the uppercase `.Claude/` duplicate directory; lowercase `.claude/` is the canonical path.
- Replaced active `qa-automation-engineer` references with `qa-reviewer` in scaffold commands/docs.
- Confirmed VS Code task `-p` flag and ESLint settings were already correct.
- Deferred deeper QA automation expansion to a later phase.

### Files Touched
- `.claude/commands/qa-plan.md`
- `CLAUDE.md`
- `HOW-TO-USE.md`

### Current State at the Time
- `dev` was four commits ahead of `main`.
- Publish-readiness score was approximately 9.3/10.
- PR to `main` was ready via GitHub UI.

### Lesson
- Windows can preserve case while Git tracks lowercase paths. Avoid creating case-conflicting `.Claude` and `.claude` directories.

---

## 2026-05-25 14:30 - Phase 2 Complete and Revised Roadmap Adopted

**Stage:** ai-scaffold Phase 2 complete; revised six-phase roadmap adopted

### Decisions Made
- Skipped `tokenBudget` hooks in `settings.json` because that field is not in the Claude Code settings schema.
- Kept `/bootstrap` as one command instead of splitting it, because the flow is stateful and interdependent.
- Deferred stack-aware scripts as useful but not core OS work.
- Added Phase 4.5 for supervisor and critic agents as the highest-priority orchestration gap.
- Capped Phase 5 skill files around 200 lines for token efficiency.

### Files Touched
- `.claude/commands/compact.md`
- `.claude/MEMORY.md`
- `.claude/commands/what-next.md`
- `.claude/rules/governance.md`
- `CLAUDE.md`

### Current State at the Time
- Phase 1: governance and anti-hallucination complete.
- Phase 2: token and memory hygiene complete.
- Phase 3 queued: audit log, `/reflect`, and `/health` session metrics.
- Phase 4 queued: enhanced rules and agent handoff protocol.
- Phase 4.5 queued: supervisor and critic agents.
- Phase 5 deferred: UX system, systematic debugging, UX review, design system update.
- Phase 6 deferred indefinitely.

### Lesson
- Do not add unsupported governance fields to Claude Code settings. Operationalize governance thresholds through commands and output instead.
