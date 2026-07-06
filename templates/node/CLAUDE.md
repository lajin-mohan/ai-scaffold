# CLAUDE.md - AI Project Template

This file governs how Claude, Codex, and other AI tools collaborate on every project in this template. Read it fully before touching any code.

---

> [!IMPORTANT]
> **TEMPLATE STATE — placeholders below are intentional**
>
> If you see bracket-placeholders in the Project Identity or Tech Stack table below, the scaffold has not been bootstrapped for a real project yet. Do not treat them as bugs to fix or guess at values. Run `/bootstrap` instead — it walks through identity, stack, tenancy, and compliance one decision at a time and updates every file that holds a placeholder.
>
> While in template state, the operational gates are deliberately permissive:
> - CI workflow's `detect-stack` job skips Node/PHP jobs when no `package.json` / `composer.json` exists, so a fresh template clone passes CI.
> - `/review` runs with `PRE_REVIEW_ALLOW_UNCONFIGURED=1` set in `.claude/settings.json` so it works without configured lint/typecheck/test commands. `/bootstrap` removes this opt-out as part of stack configuration.
>
> If you are editing this template itself (improving rules, agents, commands), the placeholders stay. If you are starting a real project, run `/bootstrap` first.

---

## Project Identity

| Field | Value |
|---|---|
| **Project** | `{{PROJECT_NAME}}` |
| **Organization** | Project Team |
| **Owner** | {{OWNER_EMAIL}} |
| **Purpose** | {{ONE_LINE_PURPOSE}} |
| **Type** | {{SaaS / Internal Tool / API / Platform}} |
| **Status** | {{Active Development / MVP / Production}} |
| **Multi-tenant** | {{IS_MULTI_TENANT}} |
| **Compliance Scope** | {{COMPLIANCE_SCOPE}} |

---

## Tech Stack

> Replace placeholders before starting. These flow into all agent and skill prompts.

| Layer | Technology |
|---|---|
| **Backend** | {{BACKEND_STACK}} |
| **Frontend** | {{FRONTEND_STACK}} |
| **Database** | {{DATABASE}} |
| **Cache / Queue** | {{CACHE_QUEUE}} |
| **Auth** | {{AUTH_STRATEGY}} |
| **Email** | {{EMAIL_PROVIDER}} |
| **Storage** | {{STORAGE}} |
| **Infra / Cloud** | {{CLOUD_PROVIDER}} |
| **IaC** | {{IAC_TOOL}} |
| **CI/CD** | {{CICD_PLATFORM}} |
| **Project Mgmt** | {{PM_TOOL}} |

---

## Development Workflow

**Every production feature follows the full path unless it qualifies for a documented fast lane** (see task-size policy in `.ai-scaffold/docs/process/task-size-policy.md`).

```
Full path: 1. Analysis → 2. Plan → 3. Arch Design → 4. UX Design → 5. Execution → 6. AI Review → 7. Manual Review → 8. QA → 9. CI/CD → 10. Deploy

Fast lanes: XS/S/M/L gates per task-size-policy.md (no BRD for XS, no architecture for S, etc.)
```

### Gate Rules

- **Step 3 blocks Step 4**: No UX work without approved architecture.
- **Step 4 blocks Step 5**: No coding without approved UX spec.
- **Step 5 blocks Step 6**: No review without self-review checklist completed.
- **Step 6 blocks Step 7**: No manual review without AI review findings addressed.
- **Step 8 blocks Step 9**: No CI/CD trigger without QA sign-off.

---

## Architecture Guidance

```
project-root/
+-- apps/               # Deployable applications (web, api, admin, mobile)
+-- packages/           # Shared libraries and domain modules
|   +-- domain/         # Entities, value objects, business rules
|   +-- services/       # Application services, use cases
|   +-- repositories/   # Data access layer
|   +-- shared/         # Types, utils, constants
+-- infra/              # Infrastructure as code (Terraform / CDK)
+-- scripts/            # Dev, migration, seed, CI scripts
+-- .ai-scaffold/docs/               # Architecture, BRD, estimates, UX.ai-scaffold/_ai/I, QA, deployment
+-- _ai/                # AI-generated drafts, experiments (not production code)
```

### Reference example

A working layered example lives in `apps/api/src/` — read it before generating new code:
- `apps/api/src/routes/applications.route.ts` — thin route handler with validation + auth
- `apps/api/src/services/applications.service.ts` — business logic, side effects, typed errors
- `apps/api/src/repositories/applications.repository.ts` — SQL only, returns domain types
- `packages/domain/src/application.ts` — pure entity with state machine
- `apps/api/migrations/0001_create_applications.sql` — reversible migration with tenant scoping

See `apps/api/src/README.md` for the layered architecture quick reference.

### Architectural Invariants

> **Setup note:** The invariants below are defaults for a multi-tenant SaaS product. During project setup, review each one and explicitly accept, modify, or remove it based on your system type (single-tenant, API-only, mobile, website, etc.). Record any changes as ADRs in `.ai-scaffold/docs/architecture/adr/`.

#### Universal (apply to all project types)
- **Domain logic lives in `packages/domain`** - never in route handlers or controllers.
- **No ORM magic in hot paths** - use direct SQL or a lightweight query builder.
- **All state changes are audited** - append-only audit log, immutable records.
- **Idempotency on every write endpoint** - idempotency key + version column.
- **No business logic in the frontend** - the frontend renders; the backend decides.

#### SaaS / multi-tenant only (remove or modify for single-tenant, internal tools, or API-only systems)
- **Every mutable entity carries `tenant_id`** - enforce at repository layer, not application layer.

---

## Coding Standards (Summary)

Full rules: `.claude/rules/coding-standards.md`

Rules are split into **hard gates** (always enforce) and **preferences** (contextual):

**Hard gates — never skip:**
- Parameterized SQL only (no string interpolation)
- Input validated at every API boundary
- Tests required (happy path + edge cases + auth/tenant isolation)
- No secrets in code, no PII in logs
- `tenant_id` scoped on every tenant-data query
- Lint + typecheck pass before any review

**Preferences — apply by context:**
- DRY: extract when duplication is *stable* and the abstraction is *clearer*
- SOLID: guidance for architecture; BLOCK only in critical paths (auth, billing, data access)
- Comments: only non-obvious WHY; never explain what the code says
- Functions: one purpose; split if you need "and"
- No magic values; inject dependencies

---

## Security Rules (Summary)

Full rules: `.claude/rules/security-rules.md`

- SQL via parameterized queries only - no string concatenation.
- Input validated at every API boundary.
- `tenant_id` scoped on every DB query *(SaaS/multi-tenant only).*
- PII never in logs, never in URLs.
- Secrets in env vars only - never committed.
- Auth checked before any data access - no route that silently returns empty.

---

## Collaboration Model

| Role | Responsibility |
|---|---|
| **Claude** | Planner, architect, reviewer, AI pair-programmer |
| **Codex / Cursor** | Executor - writes code against approved specs |
| **Human** | Approves plans, specs, merges; owns production decisions |

### AI Role-Based Operating Mode

Pick an AI role to get relevant commands, evidence requirements, and output styles. Set your active AI role in `.claude/settings.local.json` as `{"role": "dev"}`.

| AI Role | Purpose | Default Entry |
|---|---|---|
| `dev` | Implementation, bug fixes, commits | `/start-task` |
| `qa` | Test planning, QA review, verification | `/qa-plan` |
| `architect` | Architecture, API contracts, system review | `/architecture-review` |
| `ux` | UX creation, review, accessibility | `/ux-analyze` |
| `owner` | Project orchestration, status, risk | `/what-next` |

AI role configs live at `.claude/roles/`. Human-facing AI role docs live at `.ai-scaffold/docs/ai-os/`. AI role routing for `/what-next` and `/loop` is planned for Phase 3.

### Claude's Operating Rules

1. **Follow `.claude/rules/ai-coding-rules.md` above all else** — it codifies hallucination guards, plan-and-confirm protocol, production-grade mandate, AI-readability limits, and verification mandate. When this conflicts with another rule file, this wins.
2. **Never implement without an approved spec** - plan first, code second.
3. **Plan-and-confirm for any task with >3 steps or any long-running process** — write the plan, wait for explicit approval, never assume silence is consent.
4. **Surface assumptions before starting** - use `solution-analyst` agent.
5. **When uncertain, ask. Don't guess.** Hallucinated code is worse than slow code.
6. **Self-review before handing off** - use review checklist in `.claude/rules/review-rules.md`.
7. **Flag risks explicitly** - never silently skip a concern.
8. **No .env access** - treat secrets as out of scope.
9. **Match the existing style** - don't refactor what isn't broken.
10. **Verify before "done"** — lint, tests, and acceptance criteria walked through; no claims without evidence.

---

## Custom Agents

Invoke via `@agent-name` or through commands.

| Agent | Purpose | When to Use |
|---|---|---|
| `supervisor` | Orchestrator and kernel — reads project state, routes to agents, manages phase transitions, enforces governance gates | Every session — invoked at start for orientation |
| `critic` | Self-verification — checks H1-H8, verifies imports/types, flags uncertainty, applies Decision Brief format | Before any non-trivial output, plan delivery, or architectural decision |
| `solution-analyst` | Surfaces assumptions, ambiguities, risks before planning | Stage 1 - before BRD |
| `architect` | System design, trade-off analysis, HLD, LLD | Stage 3 - new feature or major change |
| `api-architect` | API contract design, RESTful standards, async patterns | Stage 3 - before any new endpoint |
| `ux-designer` | Wireframes, component spec, Figma handoff | Stage 4 - UX design phase |
| `estimator` | Effort estimation, risk-weighted sizing | Stage 2/3 - sprint planning |
| `pm` | Scope statements, stakeholder updates, CR summaries, sprint health | Cross-cutting - PM communication |
| `backend-reviewer` | Server-side code review | Stage 6 - before PR merge |
| `frontend-reviewer` | UI/component code review | Stage 6 - before PR merge |
| `qa-reviewer` | Business-rule and test correctness | Stage 8 - before QA sign-off |
| `security-reviewer` | Security checklist, threat model, GDPR/ISO compliance | Stage 6 - before any auth/data change |
| `devops-engineer` | CI/CD, infra, deployment strategy | Stage 9/10 - before environment changes |
| `documentation-writer` | API docs, README, architecture docs | Post-implementation |

---

## Custom Commands

Run via `/command-name` in Claude Code.

| Command | Action | Stage |
|---|---|---|
| `/bootstrap` | Interactive scaffold initializer — fills project identity, tech stack, tenancy, compliance placeholders across all files | Stage 0 (uninitialized scaffold) |
| `/what-next` | Reads project state, identifies current stage, outputs exact next action with blockers | Any time |
| `/kickoff` | Project Readiness Checklist - go/no-go gate across all 6 dimensions before execution begins | Before Stage 5 |
| `/create-brd` | Business Requirements Document from feature description | Stage 1 |
| `/create-api` | Full REST API contract (endpoints, request/response, errors, async pattern, migrations) | Stage 3 |
| `/architecture-review` | Architecture critique against project invariants and compliance rules | Stage 3 |
| `/estimate` | Three-point effort estimate with risk weights and phasing recommendation | Stage 2/3 |
| `/start-task` | Plan-and-confirm execution: read spec → propose numbered plan → wait for approval → execute → verify. Use for any task >3 steps or long-running. Optional `--intensity lite|full|ultra` flag enables the [ponytail ladder](.claude/rules/ponytail-ladder.md) per-call (default OFF; gates always win). | Stage 5 |
| `/review` | Parallel code review: backend + frontend + security + qa + architect reviewers. After UI/Component/UX findings, run `/qa` for live-site verification. | Stage 6 |
| `/gen-tests` | Writes complete runnable tests with assertions (unit, integration, component, snapshot) | Stage 5/8 |
| `/deployment-review` | Deployment readiness checklist, migration plan, smoke tests, rollback procedure | Stage 10 |
| `/investigate` | Root cause debugging: gather evidence → form hypothesis → test → fix. Iron law: no fix without investigation. Run when user reports error or bug. | Pre-fix |
| `/health` | Code quality dashboard: auto-detect tools (tsc, biome, eslint, ruff, pytest, etc.), run them, compute 0-10 composite score, show tabular dashboard. HARD GATE: show only, never fix. Run weekly. | Any time |
| `/lessons` |.ai-scaffold/tasks/ past root causes and debugging lessons from `tasks/lessons.md`. Search by keyword or filter by tag. Read-only — never writes lessons. | Any time |
| `/compact` | Session compaction: write key decisions, stage state, open questions, and Next Session Brief to `MEMORY.md`. Run when approaching token threshold (300K) or at natural milestones. Audit-log ready. | Any time |
| `/reflect` | Post-task reflection: captures .ai-scaffold/tasks/s, patterns, process improvements. Writes to `tasks/lessons.md` and audit log. Run after significant work sessions. | Any time |
| `/qa` | Live-site QA with headless browser: walk the feature flow, detect rendering/interaction/console issues, fix and re-verify. | Stage 8 |
| `/loop` | Autonomous task queue: execute a numbered task list with one-approval contract. Generates tests via `/gen-tests` per task. Stop conditions prevent scope creep. | Stage 5 |
| `/commit-changes` | Git workflow enforcement: branch safety check, unrelated-changes detection, verification evidence requirement. Optional `--dev` / `--main` merge promotion. No Co-Authored-By ever. | Any time |
| `/qa-plan` | QA automation planning via qa-reviewer agent. Coverage matrix: Requirement → Scenario → Test → Result. | Stage 8 |
| `/qa-review` | QA coverage and quality review. Validates traceability, independence, data isolation, CI commands. Severity: BLOCK / HIGH / MEDIUM / LOW. | Stage 8 |
| `/qa-auth` | Auth-specific test planning: login, logout, session, token, protected routes, tenant isolation. Framework-agnostic. | Stage 8 |
| `/ux-create` | UX solution creator: uses `skills/ux-system/`, desktop-first design, 390px mobile check, light/dark theme, organization-overridable tokens. | Stage 4 |
| `/ux-review` | UX review: 32-item check, 4-viewport browser verification (desktop L/D + mobile L/D at 390px). Token-based colours enforced as BLOCK. | Stage 6 |
| `/debug-fix` | Root-cause-first bug fixing: plan → reproduce → analyze → implement → verify → report. 5-status model. Required verification by bug type. | Pre-fix |
| `/ponytail-audit` | Whole-repo over-engineering scan. Tags: delete / stdlib / native / yagni / shrink. Severity: BLOCK / WARN / NIT. Report only, never modifies. Companion to `/start-task --intensity` — when intensity is set, the `Ladder compliance` step in the verification report feeds the audit's scope. | Any time |
| `/ponytail-debt.ai-scaffold/tasks/rvest every `ponytail:` shortcut marker into `tasks/ponytail-debt.md`. Flags `no-trigger` and `malformed` markers. Read-only by default; `--write` updates the ledger. | Any time |

---

## Custom Skills

Referenced internally by agents and commands.

| Skill | Purpose |
|---|---|
| `design-system` | Default baseline for all frontend projects — color tokens, typography, spacing, components, motion, z-index, layout tokens. See `.claude/skills/design-system.md`. Override at `apps/web/src/design-system/` when project brand diverges. |
| `backend-api-design` | REST API patterns, error handling, versioning |
| `frontend-patterns` | Component structure, state management, accessibility |
| `database-optimization` | Schema design, indexing, query tuning |
| `cloud-deployment` | Container deployment, scaling, observability |
| `iac-best-practices` | Infrastructure-as-code patterns and pitfalls |
| `project-delivery-workflow` | Sprint flow, ticket lifecycle, estimation |
| `ux-audit` | UX clarity, hierarchy, cognitive load analysis |
| `accessibility-check` | WCAG 2.1 AA validation |
| `ux-system` | Master UX system: layout, design tokens (CSS variables), component rules, page patterns. Enterprise desktop-first with 390px mobile validation and light/dark theme support. See `.claude/skills/ux-system/SKILL.md`. |
| `systematic-debugging` | Root-cause-first bug investigation: no fix without root cause, 3-strike ru.ai-scaffold/tasks/ope lock, 5-status model. Capture lessons to `tasks/lessons.md`. See `.claude/skills/systematic-debugging/SKILL.md`. |
| `ux-review` | UX artifact review: 32-item check, BLOCK/HIGH/MEDIUM/LOW/NIT severity, CSS variable pattern enforced, 4-viewport browser verification. See `.claude/skills/ux-review/SKILL.md`. |

---

## Custom Hooks

Wired in `.claude/settings.json` and fired deterministically by Claude Code at tool-call time. The rules in `.claude/rules/ai-coding-rules.md` are the *why*; the hooks are the *what*.

| Hook | Event | What it enforces |
|---|---|---|
| `.claude/hooks/pre-review.sh` | UserPromptSubmit on `/review` | Runs lint + typecheck + tests + audit before AI review. Fails closed by default; template state opts out via `PRE_REVIEW_ALLOW_UNCONFIGURED=1`. |
| `.claude/hooks/pre-write-fact-check.sh` | PreToolUse on Edit/Write/MultiEdit | Warns (or blocks in `ECC_FACT_CHECK_STRICT=1`) when the edit targets a file cited as `file:line` in this session but never Read in this session. Enforces H1/H2/H7. |
| `.claude/hooks/post-write-console-warn.sh` | PostToolUse on Edit/Write/MultiEdit | Warns on newly-added `console.log` / `print(` / `println!(` / `var_dump(` / `print_r(` / `dd(` / `dump(` / `error_log(` to `.ts/.tsx/.js/.jsx/.mjs/.cjs/.py/.rs/.php` files (diff-based, so pre-existing statements are not flagged). Enforces the "no debug logs in committed code" preference. |
| `.claude/hooks/pre-bash-quality-gate.sh` | PreToolUse on Bash | Runs `.claude/hooks/pre-commit` inline before `git commit` / `git push` lands. Blocks the commit if pre-commit fails. Respects `--no-verify`. Enforces the "lint + typecheck pass before review" hard gate. |
| `.claude/hooks/pre-commit` | git pre-commit | Branch name + stack detection + lint/typecheck/test + gitleaks. |
| `.claude/hooks/pre-commit-secrets` | git pre-commit (extended) | Heuristic secret detection for common API key patterns. |

All hooks fail open in template state (exit 0 with no checks run) so the scaffold itself stays CI-green before `/bootstrap` configures the stack. Disable any hook with `ECC_<HOOK>_DISABLED=1`. Make hooks executable with `scripts/install-hooks.sh`.

---

## Git Workflow

Full rules: `.claude/rules/branching-rules.md`

```
main          ← production-stable, protected
dev           ← integration, CI must pass
feature/*     ← one feature per branch, from dev
fix/*         ← bug fixes, from dev
chore/*       ← non-functional changes
release/*     ← release candidates, from dev
```

### Commit Format (Conventional Commits)

```
type(scope): short description

body (optional - explain WHY, not WHAT)

Closes #ticket-id
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

---

## Review Checklist (Quick Reference)

Full rules: `.claude/rules/review-rules.md`

Before marking any PR ready:

- [ ] All acceptance criteria met
- [ ] No hardcoded secrets or credentials
- [ ] SQL uses parameterized queries
- [ ] `tenant_id` enforced on all queries *(SaaS/multi-tenant only)*
- [ ] Audit log entries created for state changes
- [ ] Input validation at API boundary
- [ ] Error messages don't leak internals
- [ ] Tests cover happy path + at least two edge cases
- [ ] No commented-out code
- [ ] No TODOs without a ticket reference

---

## Rules Reference

| Rule File | Purpose |
|---|---|
| `.claude/rules/ai-coding-rules.md` | **Top-priority for AI tools.** Hallucination guards, plan-and-confirm protocol, production-grade mandate, AI-readability limits, verification mandate |
| `.claude/rules/coding-standards.md` | Universal, backend, frontend, database coding rules |
| `.claude/rules/api-standards.md` | URL design, response envelope, pagination, idempotency |
| `.claude/rules/security-rules.md` | SQL injection, tenant isolation, auth, input validation, secrets |
| `.claude/rules/testing-rules.md` | Test pyramid, coverage expectations, CI requirements |
| `.claude/rules/review-rules.md` | Pre-review checklist, severity labels, merge rules |
| `.claude/rules/branching-rules.md` | Branch model, commit format, PR rules, release tagging, **required GitHub branch protection settings** (single source of truth — applied via `.ai-scaffold/docs/setup/branch-protection.md` UI walkthrough or `scripts/setup-branch-protection.sh`) |
| `.claude/rules/token-usage-rules.md` | When to use AI, model selection, cost awareness |
| `.claude/rules/dod-rules.md` | Definition of Done - story, sprint, and release level |
| `.claude/rules/definition-of-ready.md` | Definition of Ready - gates `BACKLOG → IN PROGRESS` (parallel to DoD) |
| `.claude/rules/manual-review-checklist.md` | Stage 7 human-reviewer checklist — what AI reviewers can't catch (product fit, UX coherence, architecture direction, team-knowledge transfer) |
| `.claude/rules/compliance-rules.md` | GDPR and ISO 27001 requirements and severity table |
| `.claude/rules/governance.md` | **Top-level enforcement engine.** Aggregates all rules into enforcement chains, escalation paths, authority limits, human-in-the-loop gates, AI-to-AI handoff protocol, and the multi-agent verification pipeline. |

---

## Claude Operating Instructions

How Claude plans, executes, self-improves, .ai-scaffold/tasks/intains quality on this project.

### Session Start

Read `tasks/lessons.md` at the start of every session before doing anything else. Apply the rules from past corrections. Do not repeat the same mistakes.

### Planning

- Enter plan mode for **any non-trivial task** (3+ steps, architectural decisions, or anything that touches multiple files)
- Write a detailed spec upfront - ambiguity caught before coding costs 10× less than ambiguity caught after
- If something goes sideways mid-task, **stop and re-plan** - don't push through with a broken approach
- Use plan mode for verification steps, not just building

### Plan-and-Confirm Gate (Non-Negotiable)

The plan-and-confirm gate is **mandatory** before executing any task that involves:
- More than 3 logical steps
- Multi-file edits, schema migrations, infra changes, or data backfills
- More than one architectural layer (route + service + repository, or backend + frontend)
- Critical paths (auth, payments, tenant isolation, audit, billing)
- Destructive or hard-to-reverse operations

**When the gate triggers:** Write the plan using the required template (see ai-coding-rules.md), wait for explicit "go" approval, then execute. **Silence is not approval.**

**Plan template must include:**
1. Goal (one sentence)
2. Numbered steps with file-level specificity
3. Files in scope AND out of scope
4. Verification commands
5. Risks / open questions

Reply "go" to proceed. Any other response requires clarification before starting.

### Subagent Strategy

- Use subagents to keep the main context window clean
- Offload research, codebase exploration, and parallel analysis to Explore subagents
- For complex problems, use multiple subagents in parallel - one focused task per agent
- Never delegate understanding - synthesise subagent findings yourself before acting on them

### Self-Improvement Loop.ai-scaffold/tasks/r **any correction from the user**, record the pattern in `tasks/lessons.md` **immediately** (not end of session):
- What the mistake was
.ai-scaffold/tasks/it happened
- The rule that prevents it recurring

Review `tasks/lessons.md` at the start of each session for this project. Ruthlessly iterate until the mistake rate drops.

### Commit Identity (Non-Negotiable)

**All commits must use the git owner's identity only.** Never add `Co-Authored-By`, AI attribution, or any third-party identity to commit messages. The git commit template enforces this — it has no Co-Authored-By block.

If a commit template ever includes AI attribution, remove it immediately. This rule overrides any AI tool's default behavior.

### Quality Bar

Before presenting any non-trivial output, ask: **"Would a staff engineer approve this?"**

- Is there a more elegant solution? If a fix feels hacky, pause and find the clean approach
- Skip this for simple, obvious one-liners - don't over-engineer
- For changes that touch critical paths (auth, data access, payments): extra scrutiny, not less

### Verification Before Done

Never mark a task complete without proving it works:
- Run the relevant tests
- Check that the change behaves correctly end-to-end
- For bug fixes: confirm the original bug no longer reproduces
- For features: verify the acceptance criteria are visibly met

### Autonomous Bug Fixing

When given a bug report: **fix it** - don't ask for hand-holding.
- Read the logs, errors, and failing tests
- Identify the root cause - not the symptom
- Implement a real fix, not a workaround
- Confirm the fix works before reporting back

### Task Tracking

There are three places for work-state, separated by lifecycle:

1. **`.claude/work/`** (gitignored) — AI ephemera: planning, .ai-scaffold/tasks/h, intermediate outputs. Per-clone, never committed.
2. **`tasks/todo/<TICKET-ID>-<slug>.md`** (tracked) — one file per .ai-scaffold/tasks/ ticket. Spec, acceptance criteria, decision log. Move to `tasks/done/` when complete. Per-ticket files prevent the merge-conflict pattern that shared status files cause.
3. **`.ai-scaffold/CHANGELOG.md`** (tracked, `merge=union`) — permanent record of what shipped. Each mergin.ai-scaffold/tasks/dds an entry. Source of truth for "what was done", replaces the legacy `.ai-scaffold/tasks/todo.md` "history" role.

Workflow:
- Start a non-trivial task: create `tasks/todo/<TICKET-ID>-<slug>.md` with the spec and AC. Do planning notes in `.claude/work/` (gitignored).
- During work: update the per-ticket file as decisions are made. Use the `TodoWrite` tool for in-conversation step tracking .ai-scaffold/tasks/session-local, .ai-scaffold/tasks/mmitted).
- Complete a task: move the file `git mv tasks/todo/<file>.md tasks/done/<file.ai-scaffold/tasks/ add a .ai-scaffold/CHANGE.ai-scaffold/tasks/ entry under `[Unreleased]`, capture any lessons in `tasks/lessons.md`.

The legacy `tasks/todo.md` is gitignored and untracked — do not commit it. It survives locally as a scratch pad if you prefer single-file working notes, but it never affects other clones.

---

## Working Agreement

- **Correctness is non-negotiable** - a slow correct answer beats a fast wrong one.
- **Explicit is better than implicit** - name things clearly, document decisions in ADRs.
- **Decisi.ai-scaffold/docs/re recorded** - use `docs/architecture/adr/` for every significant choice.
- **The spec is the contract** - if the spec is wrong, update it before the code.
- **Done means tested** - untested code is not done.
- **Changes are controlled** - any post-sign-off scope change requires a CR (see `cr-template.md`).
- **Releases are documented** - every production rele.ai-scaffold/tasks/s release notes and a UAT sign-off.
- **Mistakes are learned from** - every correction goes into `ta.ai-scaffold/tasks/ssons.md`.
- **Working state is separated from history** - `.claude/work/` is per-clone scratch, `tasks/todo/` is per-ticket spec, `.ai-scaffold/CHANGELOG.md` is the permanent record. No shared mutable status files (lesson learned 2026-05-08).
- **Releases are recorded in `.ai-scaffold/CHANGELOG.md`** - format: [Keep a Changelog](https://keepachangelog.com). Each merging PR adds an entry under `[Unreleased]`. Configured with `merge=union` so parallel branches don't conflict on it.

---

## Current State

> Update this section at the start of each epic.

- **Current Epic**: CLI distribution and profile support (v0.7.x)
- **Next Milestone**: Phase 1 CLI MVP — `create`, `init`, `status`, `doctor` commands
- **Blockers**: None
- **In-Flight Branches**: `dev` — Phase 0 committed, Phase 1 next
