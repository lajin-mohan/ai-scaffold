# CLAUDE.md - AI Project Template

This file governs how Claude, Codex, and other AI tools collaborate on every project in this template. Read it fully before touching any code.

---

## Project Identity

| Field | Value |
|---|---|
| **Project** | `{{PROJECT_NAME}}` |
| **Organization** | Techversant Infotech |
| **Owner** | Lajin M J - lajinmj@gmail.com |
| **Purpose** | `{{ONE_LINE_PURPOSE}}` |
| **Type** | `{{SaaS / Internal Tool / API / Platform}}` |
| **Status** | `{{Active Development / MVP / Production}}` |
| **Multi-tenant** | `{{IS_MULTI_TENANT}}` — `true` / `false`. When `true`, every mutable entity carries `tenant_id` and tenant isolation rules in `.claude/rules/security-rules.md` apply. |
| **Compliance Scope** | `{{COMPLIANCE_SCOPE}}` — applicable frameworks: `GDPR`, `ISO27001`, `HIPAA`, `SOC2`, `PCI-DSS`, or `N/A`. Drives `.claude/rules/compliance-rules.md`. |

---

## Tech Stack

> Replace placeholders before starting. These flow into all agent and skill prompts.

| Layer | Technology |
|---|---|
| **Backend** | `{{BACKEND_STACK}}` - e.g., Node.js + TypeScript + Fastify, Laravel + PHP, Python + FastAPI |
| **Frontend** | `{{FRONTEND_STACK}}` - e.g., React + Vite + TypeScript, Vue 3, Next.js |
| **Database** | `{{DATABASE}}` - e.g., PostgreSQL 16, MySQL 8, MongoDB |
| **Cache / Queue** | `{{CACHE_QUEUE}}` - e.g., Redis, pg-boss, BullMQ |
| **Auth** | `{{AUTH_STRATEGY}}` - e.g., opaque sessions, JWT, OAuth2 |
| **Email** | `{{EMAIL_PROVIDER}}` - e.g., Resend, SendGrid |
| **Storage** | `{{STORAGE}}` - e.g., AWS S3, Cloudflare R2 |
| **Infra / Cloud** | `{{CLOUD_PROVIDER}}` - e.g., AWS ECS + Fargate, GCP Cloud Run |
| **IaC** | `{{IAC_TOOL}}` - e.g., Terraform, Pulumi, CDK |
| **CI/CD** | `{{CICD_PLATFORM}}` - e.g., GitHub Actions, GitLab CI |
| **Project Mgmt** | `{{PM_TOOL}}` - e.g., Jira, Linear, GitHub Projects |

---

## Development Workflow

Every feature follows this exact sequence. No skipping gates.

```
1. Analysis      → Understand problem, identify stakeholders, surface assumptions
2. Plan          → Sprint-ready tasks, acceptance criteria, risk flags
3. Arch Design   → System design, data model, ADR for key decisions
4. UX Design     → Wireframes, user flows, component spec, Figma handoff
5. Execution     → Feature branch coding against approved spec
6. AI Review     → Claude code review + security review (parallel)
7. Manual Review → Peer review, domain correctness check
8. QA            → Test matrix, regression, smoke test
9. CI/CD         → Automated gates (lint, typecheck, tests, build)
10. Deploy       → Staged rollout; smoke test on target env
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
+-- docs/               # Architecture, BRD, estimates, UX, API, QA, deployment
+-- _ai/                # AI-generated drafts, experiments (not production code)
```

### Architectural Invariants

> **Setup note:** The invariants below are defaults for a multi-tenant SaaS product. During project setup, review each one and explicitly accept, modify, or remove it based on your system type (single-tenant, API-only, mobile, website, etc.). Record any changes as ADRs in `docs/architecture/adr/`.

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

- **Correctness > speed > elegance** - in that order, always.
- **Explicit over magic** - no hidden conventions, no framework black boxes in critical paths.
- **No dead code** - if it isn't used, delete it.
- **No partial implementations** - a half-finished feature is worse than no feature.
- **Comments only for non-obvious WHY** - never document what the code already says.
- **Functions do one thing** - if you need "and" to describe it, split it.
- **Error handling at boundaries only** - don't catch what you can't handle.
- **SOLID principles** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Inject dependencies, never instantiate them** - services depend on interfaces, not concrete classes.
- **No magic values** - every non-0/1 number and every key string is a named constant or env-backed config.
- **DRY** - extract on the second occurrence; shared utilities live in `packages/shared/`.
- **Composition over inheritance** - hierarchies deeper than two levels are a smell.
- **Linting is a hard gate** - zero lint/typecheck errors before any code review.

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

### Claude's Operating Rules

1. **Never implement without an approved spec** - plan first, code second.
2. **Surface assumptions before starting** - use `solution-analyst` agent.
3. **Self-review before handing off** - use review checklist in `.claude/rules/review-rules.md`.
4. **Flag risks explicitly** - never silently skip a concern.
5. **No .env access** - treat secrets as out of scope.
6. **Match the existing style** - don't refactor what isn't broken.

---

## Custom Agents

Invoke via `@agent-name` or through commands.

| Agent | Purpose | When to Use |
|---|---|---|
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
| `/review` | Parallel code review: backend + frontend + security reviewers | Stage 6 |
| `/gen-tests` | Writes complete runnable tests with assertions (unit, integration, component, snapshot) | Stage 5/8 |
| `/deployment-review` | Deployment readiness checklist, migration plan, smoke tests, rollback procedure | Stage 10 |

---

## Custom Skills

Referenced internally by agents and commands.

| Skill | Purpose |
|---|---|
| `design-system` | Color tokens, typography, spacing, component patterns |
| `backend-api-design` | REST API patterns, error handling, versioning |
| `frontend-patterns` | Component structure, state management, accessibility |
| `database-optimization` | Schema design, indexing, query tuning |
| `cloud-deployment` | Container deployment, scaling, observability |
| `iac-best-practices` | Infrastructure-as-code patterns and pitfalls |
| `project-delivery-workflow` | Sprint flow, ticket lifecycle, estimation |
| `ux-audit` | UX clarity, hierarchy, cognitive load analysis |
| `accessibility-check` | WCAG 2.1 AA validation |

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
| `.claude/rules/coding-standards.md` | Universal, backend, frontend, database coding rules |
| `.claude/rules/api-standards.md` | URL design, response envelope, pagination, idempotency |
| `.claude/rules/security-rules.md` | SQL injection, tenant isolation, auth, input validation, secrets |
| `.claude/rules/testing-rules.md` | Test pyramid, coverage expectations, CI requirements |
| `.claude/rules/review-rules.md` | Pre-review checklist, severity labels, merge rules |
| `.claude/rules/branching-rules.md` | Branch model, commit format, PR rules, release tagging |
| `.claude/rules/token-usage-rules.md` | When to use AI, model selection, cost awareness |
| `.claude/rules/dod-rules.md` | Definition of Done - story, sprint, and release level |
| `.claude/rules/compliance-rules.md` | GDPR and ISO 27001 requirements and severity table |

---

## Claude Operating Instructions

How Claude plans, executes, self-improves, and maintains quality on this project.

### Planning

- Enter plan mode for **any non-trivial task** (3+ steps, architectural decisions, or anything that touches multiple files)
- Write a detailed spec upfront - ambiguity caught before coding costs 10× less than ambiguity caught after
- If something goes sideways mid-task, **stop and re-plan** - don't push through with a broken approach
- Use plan mode for verification steps, not just building

### Subagent Strategy

- Use subagents to keep the main context window clean
- Offload research, codebase exploration, and parallel analysis to Explore subagents
- For complex problems, use multiple subagents in parallel - one focused task per agent
- Never delegate understanding - synthesise subagent findings yourself before acting on them

### Self-Improvement Loop

After **any correction from the user**, record the pattern in `tasks/lessons.md`:
- What the mistake was
- Why it happened
- The rule that prevents it recurring

Review `tasks/lessons.md` at the start of each session for this project. Ruthlessly iterate until the mistake rate drops.

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

1. Write a plan to `tasks/todo.md` with checkable items before starting any non-trivial work
2. Mark items complete as you go - one task in progress at a time
3. Add a results summary when the task is done
4. Capture lessons in `tasks/lessons.md` after any correction

---

## Working Agreement

- **Correctness is non-negotiable** - a slow correct answer beats a fast wrong one.
- **Explicit is better than implicit** - name things clearly, document decisions in ADRs.
- **Decisions are recorded** - use `docs/architecture/adr/` for every significant choice.
- **The spec is the contract** - if the spec is wrong, update it before the code.
- **Done means tested** - untested code is not done.
- **Changes are controlled** - any post-sign-off scope change requires a CR (see `cr-template.md`).
- **Releases are documented** - every production release has release notes and a UAT sign-off.
- **Mistakes are learned from** - every correction goes into `tasks/lessons.md`.

---

## Current State

> Update this section at the start of each epic.

- **Current Epic**: `{{EPIC_NAME}}`
- **Next Milestone**: `{{MILESTONE_DATE}}`
- **Blockers**: `{{NONE or list}}`
- **In-Flight Branches**: `{{list}}`
