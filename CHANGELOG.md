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
- **ai-scaffold CLI** — `bin/ai-scaffold.js` entry point using CAC v6 with subcommands: `create`, `init`, `status`, `doctor`, `update`. Handles template selection, conflict detection, staged copy, and bootstrap prompts.
- **Template profiles** — `templates/generic` (default) and `templates/laravel` (derived from generic + PHP/Laravel overlays). Generic profile is a full scaffold snapshot (`.claude/`, `CLAUDE.md`, `apps/`, `packages/`, `docs/`, etc.).
- **CLI core modules** — `src/cli/core/paths.js` (path resolution: CLI_ROOT, PKG_ROOT, TEMPLATES_DIR), `prompts.js` (interactive bootstrap collection), `file-plan.js` (staged copy plan + filter lists), `conflicts.js` (overlap detection), `copy.js` (staged fs copy), `version.js` (semver check).
- **Path resolution fix** — `PKG_ROOT` correctly resolves to repo root (3 `..` from `src/cli/core/`). Templates at `templates/<profile>/` are now reliably found regardless of where the CLI is invoked from.
- **Unit tests** — `src/__tests__/core.test.js` covering version semver check, prompt defaults, path lists, conflict report structure, and template-not-found error. All 8 tests pass.
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
- **`pre-write-fact-check.sh` env-var reconstruction removed entirely** — the first pass at the fix kept `CLAUDE_SESSION_ID` + `CLAUDE_PROJECT_DIR` reconstruction as a "fallback" on backward-compat grounds. The /review follow-up correctly identified this as a half-fix: the fallback IS the original failure mode. The hand-rolled path reconstruction has been deleted; the hook now reads `transcript_path` via `jq` first, falls back to `python3`, and fails open if neither is available. No third-tier env-var reconstruction exists.
- **`pre-write-fact-check.sh` duplicate-basename bypass closed** — Read detection matched `Read` tool_use blocks by `endswith(basename)` / `contains("/" + basename)`, and Cited detection matched `grep -qF -- "${FILE_BASENAME}:"`. The reviewer reproduced the bypass with a controlled transcript: target `src/a/foo.ts`, citation `src/a/foo.ts:9`, and a `Read` of `src/b/foo.ts` — STRICT mode exited 0 instead of blocking. In any repo with duplicate filenames, the hook was effectively a no-op. Replaced both basename matches with **exact canonical-path comparison**: a new `canon_path` helper resolves the agent's payload `file_path` to an absolute path against the hook's `$PWD` (realpath → python3 os.path.abspath → walk-up fallback chain), and the hook compares that against the absolute `input.file_path` of every `Read` tool_use block via `==`. The regex-fallback Read path was the same class of bypass and has been dropped. Cited detection now checks both the absolute path and the relative-to-cwd form (the latter because agents commonly cite in natural-language form like `.claude/settings.json:42`), but still as exact strings, not substrings. Verified against a controlled transcript reproducing the reviewer's case; STRICT mode now correctly blocks.
- **`post-write-console-warn.sh` skipped untracked files** — the early `exit 0` when `git diff` was empty ran before the untracked-file fallback, so freshly created untracked files were never scanned. Fixed; verified for TS/Python/Rust untracked files and STRICT mode.
- **`post-write-console-warn.sh` PHP support added** — the scope filter now accepts `.php` files and the pattern branch matches `var_dump(`, `print_r(`, `var_export(`, `dd(` (Laravel), `dump(` (Symfony/Laravel), and `error_log(`. Each pattern uses a word-boundary prefix `(^|[^a-zA-Z0-9_])` so `var_dump(` doesn't match the `dump(` substring — same substring-matching class of issue that the fact-check hook bypass fix removed. The final guidance line is now language-aware so PHP authors see `coding-standards.md prefers no var_dump/print_r/dd/dump in committed code` instead of the JS-flavored message.

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
