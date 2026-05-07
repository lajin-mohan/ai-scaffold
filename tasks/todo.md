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

### Pending future phases (not started yet — require user approval)

- [ ] Phase 2 — Add `.claude/rules/ai-coding-rules.md` (hallucination guards, plan-and-confirm protocol, production-grade mandate, AI-readability rules, verification mandate)
- [ ] Phase 3 — Plug productivity gaps (`/start-task` command, Definition of Ready, expand `/review`)
- [ ] Phase 4 — Scaffold real artifacts (CI workflow, `.env.example`, `.editorconfig`, example files in `apps/`/`packages/`, wire `pre-review.sh` as a real hook)
