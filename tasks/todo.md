# Task Plan

This file tracks the current task plan. Claude writes here before starting any non-trivial work.

**Format:**
- [ ] Pending task
- [x] Completed task

Update in real time. One task in progress at a time. Add a Results section when done.

---

## Active: Scaffold Audit Fixes — Phase 1 (Broken/stale references + bootstrap detection)

**Stack confirmed:** PHP + Node.js + TypeScript + ReactJS + PostgreSQL + AWS, multi-tenant SaaS.
**Plan-and-confirm rule:** mandatory for tasks with > 3 steps or long-running processes.

### Phase 1 — Broken references & bootstrap ✅ DONE

- [x] 1. Add Stage 0 (Bootstrap) detection to `.claude/commands/what-next.md`
- [x] 2. Create `.claude/commands/bootstrap.md` — interactive scaffold initializer (one decision at a time)
- [x] 3. Remove dead `security-review` skill row from `CLAUDE.md:203`
- [x] 4. Add `{{COMPLIANCE_SCOPE}}` and `{{IS_MULTI_TENANT}}` rows to `CLAUDE.md` Project Identity table
- [x] 5. Delete stale committed `.claude/settings.local.json` (gitignored; users copy from `.example.json`)
- [x] 6. Fix `_ai/README.md` vs `.gitignore` contradiction — keep all `_ai/` outputs gitignored
- [x] 7. Replace `src/` references in `.cursorrules:138` and `_ai/README.md` with `apps/`/`packages/` (lines 99 and 108 were valid `apps/api/src/` patterns)
- [x] 8. Gate `tenant_id` defaults in `api-contract-template.md` and `database-optimization.md` behind `{{IS_MULTI_TENANT}}`
- [x] 9. Reconcile JWT phrasing: `security-reviewer.md` ↔ `security-rules.md`
- [x] 10. Add snapshot/visual-regression section to `testing-rules.md` so `qa-reviewer.md:38` mandate has backing
- [x] 11. Fix typos: `.claude/memory/architecture-decisions.md:21`, `CLAUDE.md:351-352`
- [x] 12. Bonus: register `/bootstrap` in `CLAUDE.md` Custom Commands table and `HOW-TO-USE.md` Quick Reference + "Applying This Template" section

### Results — Phase 1

- `/what-next` now starts at Stage 0 and detects an uninitialized scaffold instead of jumping to Stage 1.
- `/bootstrap` walks through identity, stack, tenancy, and compliance one decision at a time, confirms before writing, and is idempotent + resumable.
- Dead skill reference removed; CLAUDE.md identity table now includes multi-tenancy and compliance flags.
- Three internal contradictions reconciled (JWT phrasing, `_ai/generated/` tracking, `src/` layout).
- `tenant_id` rules in templates/skills now correctly gated behind `{{IS_MULTI_TENANT}}` so single-tenant projects won't inherit them.
- Snapshot + visual-regression testing now documented in `testing-rules.md`, backing the existing `qa-reviewer` mandate.

**Phase 1 verification:** any further `{{PLACEHOLDER}}` survivors in CLAUDE.md / .cursorrules / README.md / .github/copilot-instructions.md are now expected — they will be filled by `/bootstrap` at first run.

### Phase 2 — AI coding rules ✅ DONE (chore/ai-coding-rules)

- [x] Created `.claude/rules/ai-coding-rules.md` — 5 operating principles, 8 hallucination guards (H1–H8), plan-and-confirm protocol with mandatory threshold (>3 steps OR long-running), 8 production-grade rules (P1–P8), AI-readability hard limits (function ≤50 lines, file ≤300, params ≤5, complexity ≤10, depth ≤4), 8 readability rules (R1–R8), 7 verification rules (V1–V7), 4 drift-prevention rules (D1–D4), severity table, prompt-priming card
- [x] Added rule file to `CLAUDE.md` Rules Reference table (top of list, marked top-priority)
- [x] Rewrote `CLAUDE.md` Operating Rules — now leads with ai-coding-rules supremacy, plan-and-confirm gate, "ask don't guess", verify-before-done
- [x] Mirrored 5-rule summary into `.cursorrules` under new "AI Coding Rules (top priority)" section
- [x] Mirrored 5-rule summary into `.github/copilot-instructions.md` Project Context section

### Phase 3 — Productivity gaps ✅ DONE (chore/productivity)

- [x] Created `.claude/rules/definition-of-ready.md` — gates `BACKLOG → IN PROGRESS` parallel to dod-rules.md (story / sprint / feature levels)
- [x] Created `.claude/commands/start-task.md` — 5-phase plan-and-confirm execution ritual (context priming → plan → wait → execute → verify)
- [x] Extended `.claude/commands/review.md` — now invokes 5 reviewers in parallel: backend + frontend + security + qa + architect (was 3); added Reviewer Selection Matrix; added AC compliance + architectural drift sections to output
- [x] Created `.claude/rules/manual-review-checklist.md` — Stage 7 four-question framework (product fit, user fit, architecture fit, team-knowledge transfer); time budgets per PR size; reviewer anti-patterns
- [x] Registered `/start-task` in `CLAUDE.md` Custom Commands table and `HOW-TO-USE.md` Quick Reference
- [x] Registered `definition-of-ready.md` and `manual-review-checklist.md` in `CLAUDE.md` Rules Reference table

### Phase 4 — Real scaffolding artifacts (next: chore/scaffolding branch)

- [ ] Create `.github/workflows/ci.yml` — Node + PHP + React + Postgres jobs per declared stack
- [ ] Create `.env.example` with placeholder DB/auth/email/storage/aws vars
- [ ] Create `.editorconfig` — shared formatting baseline
- [ ] Create `.gitattributes` — fix CRLF warnings, declare text/binary, force LF for shell scripts
- [ ] Create `LICENSE` — Proprietary, Techversant
- [ ] Create `CONTRIBUTING.md` — points to CLAUDE.md and HOW-TO-USE.md
- [ ] Create `SECURITY.md` — vulnerability reporting policy
- [ ] Add example file in `apps/api/` showing route → service → repository → domain pattern
- [ ] Add example file in `packages/domain/` showing pure domain entity
- [ ] Wire `.claude/hooks/pre-review.sh` into `.claude/settings.json` as a real `PostToolUse` hook
