# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the **permanent record of what shipped**. In-flight working state lives in `tasks/todo/` (per-ticket files) and `.claude/work/` (gitignored AI ephemera). Each merging PR adds an entry here.

This file is configured with `merge=union` in `.gitattributes` so parallel additions from multiple branches do not conflict.

---

## [Unreleased]

### Changed
- **Tasks workflow restructured** — `tasks/todo.md` retired. Replaced with per-ticket files under `tasks/todo/<TICKET-ID>-<slug>.md`, archived to `tasks/done/` on completion. Eliminates the shared-mutable-state merge-conflict pattern observed during the Phase 1-4 audit work.
- **AI ephemera relocated** — `.claude/work/` is now the gitignored home for AI scratch / planning / intermediate state. Previously these landed in `tasks/todo.md`, mixing with project history.
- **Quality gates fail-closed** — `.claude/hooks/pre-review.sh` now exits non-zero when no checks are configured. Bypass via `PRE_REVIEW_ALLOW_UNCONFIGURED=1` (the template repo opts in by default; downstream projects remove this once `/bootstrap` configures real checks).
- **CI gracefully no-ops on the template** — every Node/PHP job in `.github/workflows/ci.yml` is now gated on `hashFiles('package.json')` / `hashFiles('composer.json')` so a fresh template clone passes CI; real checks activate once a stack is bootstrapped.
- **Template state explicit** — `README.md` and `CLAUDE.md` now carry a TEMPLATE banner so the unbootstrapped state is intentional, not a defect.
- **`/bootstrap` covers more files** — `.claude/commands/bootstrap.md` now lists `.env.example`, `.github/workflows/ci.yml`, and `.claude/hooks/pre-review.sh` among the files it modifies, so a successful bootstrap leaves the operational scaffold consistent.
- **Ladder-compliance wording** — verification report line for `Ladder compliance` now reads "stopped at rung `<N>`; higher rungs rejected because `<reason>`" instead of the misleading "walked 6 rungs per code unit". Aligns with the ladder's "first rung that answers, don't run all six" rule.
- **`/ponytail-debt` allowlist** — harvest now includes `*.sql` and `*.sh` (regex already supported `#` and `--` comment syntax; migrations and scripts are exactly where shortcut markers live). YAML excluded because it's config, not source code.

### Added
- `CHANGELOG.md` (this file) — permanent record replacing the tracked `tasks/todo.md`.
- `tasks/todo/` and `tasks/done/` directories for per-ticket workflow files.
- `.claude/work/` directory (gitignored) for AI ephemera.
- `apps/api/src/middleware/error-handler.ts` — global `AppError → envelope` mapping (Finding 5).
- `Idempotency-Key` handling in the example route + service + migration (Finding 4).
- DB-transaction wrapper around `repo.create + audit.record` in the example service (Finding 6, atomicity).
- `docs/architecture/patterns/transactional-outbox.md` — pattern doc for durable side-effects (Finding 6, full pattern).
- `docs/setup/branch-protection.md` + `scripts/setup-branch-protection.sh` — Track 5 enforcement of branching-rules.md.
- `merge=union` driver in `.gitattributes` for `CHANGELOG.md`, `tasks/lessons.md`, `docs/architecture/adr/**` (thin Track 4).
- **Hook-based enforcement for H1-H8 hallucination guards** — three new agent-side hooks wired into `.claude/settings.json`: `pre-write-fact-check.sh` (PreToolUse, warns when an edit targets a file cited as `file:line` but not Read in this session; backing H1/H2/H7), `post-write-console-warn.sh` (PostToolUse, diff-based detection of new `console.log` / `print(` / `println!(` — also scans untracked files), `pre-bash-quality-gate.sh` (PreToolUse, runs `.claude/hooks/pre-commit` inline before `git commit` / `git push` lands). All three fail open in template state and are documented in `ai-coding-rules.md` §1 "Hook Enforcement" and `governance.md` "Enforcement Chain".
- **`/ponytail-audit` and `/ponytail-debt` commands** — curated integration of Dietrich Gebert's `ponytail` YAGNI-pressure toolkit, scoped to the scaffold's actual source-code paths and aligned with `/start-task --intensity`. Source: `https://github.com/DietrichGebert/ponytail` (MIT). See `.claude/rules/ponytail-ladder.md` for the rule and the ladder.

### Fixed
- Encoding fragility in code/config files — replaced em-dashes (`—`) and arrows (`→`) with ASCII (`-`, `->`) in `.yml`, `.sh`, `.json`, `.ts`, `.sql`, `.tf` files. Markdown unchanged (renders fine). (Finding 8)
- **`pre-write-fact-check.sh` was a no-op** — the transcript path encoding was wrong (URL-encoding `%2F`/`%2E` instead of Claude Code's leading-dash + slash-to-dash rule), so `TRANSCRIPT` was never set and the hook always failed open silently. The Read-detection regex also required `Read` and `file_path` to appear in flat sequence when the actual JSON nests them under `content[].input.file_path`. Both fixed; verified against a real session transcript with positive and negative cases.
- **`post-write-console-warn.sh` skipped untracked files** — the early `exit 0` when `git diff` was empty ran before the untracked-file fallback, so freshly created untracked files were never scanned. Fixed; verified for TS/Python/Rust untracked files and STRICT mode.

---

## Pre-history (audit Phases 1-4 — merged on 2026-05-08)

Pre-CHANGELOG history captured retroactively. Detailed merge log below.

### Phase 4 (chore/scaffolding, commit `fe2beb6`) — Real scaffolding artifacts
- `.github/workflows/ci.yml` — 7-job pipeline (lint, test-unit, test-integration, build, audit, coverage, ci-passed gate)
- `.env.example`, `.editorconfig`, `.gitattributes`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`
- Layered example flow in `apps/api/src/`: route -> service -> repository -> domain
- `packages/domain/src/application.ts` (pure entity with state machine)
- `apps/api/migrations/0001_create_applications.sql` (reversible migration)
- `.claude/hooks/pre-review.sh` wired into `.claude/settings.json` as `UserPromptSubmit` hook for `/review`

### Phase 3 (chore/productivity, commit `bab1aa6`) — Productivity gaps
- `.claude/rules/definition-of-ready.md` — gates `BACKLOG -> IN PROGRESS`
- `.claude/commands/start-task.md` — 5-phase plan-and-confirm execution ritual
- `.claude/rules/manual-review-checklist.md` — Stage 7 four-question framework for human reviewers
- `.claude/commands/review.md` — extended from 3 to 5 reviewers (added qa-reviewer + architect)

### Phase 2 (chore/ai-coding-rules, commit `7893590`) — AI coding rules
- `.claude/rules/ai-coding-rules.md` — hallucination guards (H1-H8), plan-and-confirm protocol with the > 3-step threshold, production-grade mandate (P1-P8), AI-readability hard limits, verification mandate (V1-V7), drift prevention (D1-D4)
- 5-rule summary mirrored into `.cursorrules` and `.github/copilot-instructions.md`
- `CLAUDE.md` Operating Rules rewritten to lead with ai-coding-rules supremacy

### Phase 1 (initial scaffold + audit fixes, commit `b02f643`) — Foundation
- 12 specialised agents, 9 commands (incl. new `/bootstrap` + Stage 0 detection in `/what-next`), 9 skills, 10 templates, 9 rule files
- Reconciled internal contradictions (JWT phrasing, `_ai/generated/` tracking, `src/` layout)
- `tenant_id` rules now gated behind `{{IS_MULTI_TENANT}}`
- Snapshot/visual-regression testing documented in `testing-rules.md`

---

[Unreleased]: https://github.com/lajin-mohan/ai-scaffold/compare/main...HEAD
