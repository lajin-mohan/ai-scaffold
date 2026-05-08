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

- [x] Created `.claude/rules/ai-coding-rules.md` — hallucination guards, plan-and-confirm, production-grade mandate, AI-readability hard limits, verification mandate
- [x] Mirrored 5-rule summary into `.cursorrules` and `.github/copilot-instructions.md`
- [x] Updated `CLAUDE.md` Operating Rules to lead with ai-coding-rules supremacy

### Phase 3 — Productivity gaps ✅ DONE (chore/productivity)

- [x] Created `.claude/rules/definition-of-ready.md` — gates `BACKLOG → IN PROGRESS`
- [x] Created `.claude/commands/start-task.md` — 5-phase plan-and-confirm execution ritual
- [x] Extended `.claude/commands/review.md` — 5 reviewers in parallel (was 3)
- [x] Created `.claude/rules/manual-review-checklist.md` — Stage 7 four-question framework
- [x] Registered new files in `CLAUDE.md` and `HOW-TO-USE.md`

### Phase 4 — Real scaffolding artifacts ✅ DONE (chore/scaffolding)

- [x] Created `.github/workflows/ci.yml` — 7-job pipeline: lint, test-unit, test-integration (real Postgres service), build, audit, coverage, ci-passed gate. PHP block included as commented-out template.
- [x] Created `.env.example` — every runtime variable declared with placeholder + comment, organised by concern (runtime, DB, cache, auth, multi-tenancy, email, storage, rate-limit, frontend, observability)
- [x] Created `.editorconfig` — 2-space indent default, 4-space for Python/PHP, tabs for Makefiles, LF line endings except .bat/.cmd/.ps1
- [x] Created `.gitattributes` — fixes the CRLF warnings, enforces LF on shell scripts, normalises lockfiles, marks binary types, linguist hints
- [x] Created `LICENSE` — Proprietary, Techversant Infotech, 2026
- [x] Created `CONTRIBUTING.md` — entry point pointing to CLAUDE.md, HOW-TO-USE.md, ai-coding-rules.md, branching/review/DoD/DoR rules
- [x] Created `SECURITY.md` — vulnerability reporting policy, response timeline, scope, safe-harbour
- [x] Created example layered code in `apps/api/src/`:
  - `routes/applications.route.ts` — thin handler with Zod validation + permission check + envelope response
  - `services/applications.service.ts` — business logic + typed errors + audit + jobs
  - `repositories/applications.repository.ts` — SQL only, tenant-scoped, optimistic locking
- [x] Created `packages/domain/src/application.ts` — pure entity with `ApplicationStatus` enum, state-machine via `canTransition` + `transitionApplication`, `InvalidTransitionError`
- [x] Created `apps/api/migrations/0001_create_applications.sql` — reversible migration with tenant_id, partial indexes, status CHECK constraint
- [x] Created `apps/api/src/README.md` — layered architecture quick reference
- [x] Wired `.claude/hooks/pre-review.sh` into `.claude/settings.json` as a `UserPromptSubmit` hook with matcher `/review` and 300s timeout
- [x] Added permission allow-list entries for `npm run lint*`, `npm run typecheck*`, `npm test*`, `npm run test*`, `git status*`, `git diff*`, `git log*`, `git branch*`, `bash .claude/hooks/pre-review.sh` so the hook + dev verification run without permission prompts
- [x] Added "Reference example" section in `CLAUDE.md` linking to the example files

### Results — All Phases

The scaffold is now self-instructing for AI tools and self-bootstrapping for new projects:

1. **Phase 1** fixed broken references and added Stage 0 detection — `/what-next` now correctly identifies an uninitialized scaffold and routes to `/bootstrap`.
2. **Phase 2** added the top-priority `ai-coding-rules.md` — codifies hallucination guards, plan-and-confirm, production-grade mandate, AI-readability hard limits, and verification mandate. Mirrored into Cursor and Copilot.
3. **Phase 3** added `/start-task` (the productivity command), Definition of Ready, expanded `/review` from 3 to 5 reviewers, and the Stage-7 manual review checklist.
4. **Phase 4** turned the scaffold into a working starter: real CI workflow, real `.env.example`, real `.gitattributes` (no more CRLF noise), license + contributing + security policy, and a complete layered example flow (route → service → repo → domain) with a migration template — so AI cold-starts can read real code instead of guessing.

### Merge order (when reviewing PRs)

The branches must be merged into `dev` in this order to avoid conflicts:
1. `chore/ai-coding-rules` first (Phase 2 — adds the foundational rule file)
2. `chore/productivity` next (Phase 3 — references ai-coding-rules.md)
3. `chore/scaffolding` last (Phase 4 — independent of the above, but conflicts on `tasks/todo.md` if Phase 1's results aren't merged first)

If a `tasks/todo.md` conflict arises, take the most-recent (most complete) version — it will be the most informative.
