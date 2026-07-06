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

---

## 2026-06-08 — v0.6.0 / v0.6.1: Agent-Side Enforcement Hooks

**Stage:** H1-H8 hallucination guard hooks shipped

### Key Changes
- Added 3 pre/post hooks: `pre-write-fact-check.sh`, `post-write-console-warn.sh`, `pre-bash-quality-gate.sh`
- Pre-review hook (`pre-review.sh`) enforces lint + typecheck + tests before `/review`
- Template mode settings keep fresh scaffold clones working without configuration
- Bug fix: exact canonical-path match in fact-check bypass detection

### Decision
- Hooks fail open in template state (exit 0 with no checks run) so the scaffold stays CI-green before `/bootstrap`
- Downstream projects must keep their own pre-commit hooks and gate configuration up to date

---

## 2026-06-29 — v0.6.2 (Current Work): AI Scaffold CLI Development

**Stage:** Phase 0 stabilize + Phase 1 planning complete; CLI implementation next

### Key Changes (Planned)
- Create distributable CLI tool (`npx @lajin/ai-scaffold`)
- Commands: `create`, `init`, `status`, `doctor`, `update`
- Profiles: generic, laravel, nextjs, golang, flutter, python, java, dotnet
- Placeholder-resolution pipeline prevents `{{...}}` tokens from reaching adopted projects
- Version tracking via `.ai-scaffold.json`

### Scaffold Stabilization Actions (Phase 0)
- Untracked `.claude/MEMORY.md` from git — was leaking build history to adopted projects
- Split `.claude/settings-overrides.json` into template + generated
- Marked Vue/Nuxt as "planned, not ready" until overlay exists
- Created `docs/cli/placeholder-resolution.md` spec
- Set `PRE_REVIEW_ALLOW_UNCONFIGURED` for template mode

### Architectural Decisions
- Pre-merged complete profiles (no runtime profile merging)
- `.ai-scaffold.json` tracks version, profile, bootstrap state, and file hashes
- Generated per-project files: `.claude/MEMORY.md`, `.claude/settings-overrides.json`, `.ai-scaffold.json`

### Lesson (Pending)
- Placeholder propagation is the #1 risk for CLI adoption — template files must never ship unresolved tokens
