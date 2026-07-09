# How to Use AI Scaffold

This guide explains how every role can use AI Scaffold — in the right order, at the right phase, for the right purpose.

---

## What This Scaffold Gives You

Use AI Scaffold when you want one consistent AI operating model across a project. It gives teams:

- shared governance rules for AI-assisted delivery
- reusable Claude/Codex/Cursor guidance files
- stage gates from analysis through deployment
- role-specific workflows for developers, QA, architects, UX, and project owners
- project memory, lessons, review commands, QA commands, and release checks
- safer setup for both new projects and existing repositories

It does **not** replace human approval, real engineering judgment, project-specific CI, security review, or production release ownership.

---

## How It Helps Each Role Day To Day

| Role | Before the scaffold | With the scaffold |
|---|---|---|
| Developer | Starts from an issue and asks AI for code, often without enough context | Starts with `/start-task`, reads memory/lessons, follows coding rules, runs verification, then uses `/review` |
| QA | Receives late, uneven handoffs and manually reconstructs acceptance coverage | Uses `/qa-plan`, `/gen-tests`, `/qa-review`, and UAT templates tied back to requirements |
| Architect | Gets pulled in after implementation has already made design decisions | Uses architecture review, ADRs, API contracts, invariants, and risk checks before code starts |
| UX | Receives partial requirements and creates designs without consistent state coverage | Uses UX analysis, design prompt, viewport/state checks, accessibility gates, and `/ux-handoff` |
| PM / owner | Tracks scope, blockers, and readiness manually across chats and documents | Uses `/what-next`, BRDs, estimates, scope summaries, CRs, and release readiness checks |
| Reviewer | Reviews AI output without knowing what assumptions or checks were used | Reviews against shared BLOCK/WARN/NIT severity, DoD, security rules, and evidence expectations |

The practical benefit is not just "AI writes faster code." The benefit is that every AI-assisted step leaves behind enough context for the next person to inspect, correct, approve, or reject it.

---

## Installing The Scaffold

Use the npm package with `npx @lajin.m/ai-scaffold`. After installation, the CLI command is `ais`.

### Create a new project

```bash
npx @lajin.m/ai-scaffold my-project
npx @lajin.m/ai-scaffold create my-project
npx @lajin.m/ai-scaffold create my-node-app --profile node
npx @lajin.m/ai-scaffold create my-js-app --profile js
npx @lajin.m/ai-scaffold create my-project --no-git
```

`create` generates a new project directory with the scaffold files, project README, `.ai-scaffold.json`, `.ai-scaffold/context.md`, `.claude/MEMORY.md`, and `.claude/settings-overrides.json`. It initializes git by default, creates an initial scaffold commit when git is available, and writes `.gitattributes` for append-only governance files. Use `--no-git` if you want to initialize git yourself.

### Install into an existing project

From inside the target repository:

```bash
npx @lajin.m/ai-scaffold init
npx @lajin.m/ai-scaffold .
npx @lajin.m/ai-scaffold init --profile node
npx @lajin.m/ai-scaffold init --profile javascript
npx @lajin.m/ai-scaffold init --profile laravel
```

Preview before writing files:

```bash
npx @lajin.m/ai-scaffold init --profile node --dry-run
npx @lajin.m/ai-scaffold . --dry-run
```

Use defaults without prompts:

```bash
npx @lajin.m/ai-scaffold init --profile node --yes
```

Pass explicit project context:

```bash
npx @lajin.m/ai-scaffold init \
  --profile node \
  --project-name acme-api \
  --display-name "Acme API" \
  --purpose "Internal API for Acme operations" \
  --project-type api \
  --owner-email team@example.com \
  --backend-stack "Node.js" \
  --frontend-stack none \
  --database "PostgreSQL" \
  --no-multi-tenant \
  --data-sensitivity internal \
  --requirements-source existing-docs \
  --requirements-path docs/requirements/brd.md \
  --compliance GDPR,SOC2 \
  --test-command "npm test" \
  --lint-command "npm run lint" \
  --typecheck-command "npm run typecheck" \
  --build-command "npm run build"
```

### Check or update an installed scaffold

```bash
ais status
ais doctor
ais update --dry-run
ais update --target-version 0.8.0
```

`update` is currently a Phase 3 placeholder. It reports installed metadata but does not change `.ai-scaffold.json` or apply file migrations yet.

### Profiles

| Profile | Use when | Notes |
|---|---|---|
| `generic` | You want neutral AI governance without stack-specific defaults | Default |
| `node` | You are starting or adopting a Node.js/JavaScript project | Day-one JS profile |
| `js`, `javascript`, `nodejs` | You prefer an alias for Node.js | Resolves to `node` |
| `laravel` | You are adopting a PHP/Laravel project | Light profile |

---

## Role Tutorials

Start with the tutorial for your active AI role:

| Role | Tutorial |
|---|---|
| Developer | [.claude/roles/tutorials/dev-role-tutorial.md](.claude/roles/tutorials/dev-role-tutorial.md) |
| QA | [.claude/roles/tutorials/qa-role-tutorial.md](.claude/roles/tutorials/qa-role-tutorial.md) |
| Architect | [.claude/roles/tutorials/architect-role-tutorial.md](.claude/roles/tutorials/architect-role-tutorial.md) |
| UX | [.claude/roles/tutorials/ux-role-tutorial.md](.claude/roles/tutorials/ux-role-tutorial.md) |
| Owner | [.claude/roles/tutorials/owner-role-tutorial.md](.claude/roles/tutorials/owner-role-tutorial.md) |

Human-readable role overview: [docs/ai-os/README.md](docs/ai-os/README.md).

---

## The Workflow at a Glance

```
Stage 1: Analysis          -> solution-analyst agent + /create-brd
Stage 2: Plan              -> estimator agent + /estimate
Stage 3: Arch Design       -> architect agent + /create-api + /architecture-review + LLD template
Stage 4: UX Design         -> ux-designer agent
         ---- /kickoff ---------------------------------- Gate: GO before any code
Stage 5: Execution         -> coding against approved spec
Stage 6: AI Review         -> /review (runs backend + frontend + security reviewers)
Stage 7: Manual Review     -> peer review against review-rules.md
Stage 8: QA                -> /gen-tests + qa-reviewer agent + UAT template
Stage 9: CI/CD             -> automated (lint, typecheck, tests, build)
Stage 10: Deploy           -> /deployment-review + release-notes template
```

**Gate rule:** Each stage gates the next. No skipping.

## Start by AI Role

Not sure where to begin? Pick your AI role and use the default entry:

| AI Role | Default Entry | When to use |
|---|---|---|
| **dev** | `/start-task` | Building features, fixing bugs, committing code |
| **qa** | `/qa-plan` | Planning tests, reviewing coverage, verifying releases |
| **architect** | `/architecture-review` | Designing systems, reviewing APIs, evaluating trade-offs |
| **ux** | `/ux-analyze` | Creating full UX flows, reviewing UX, checking accessibility |
| **owner** | `/what-next` | Project status, orchestration, cross-cutting view |

Set your active AI role in `.claude/settings.local.json` as `{"role": "dev"}`. Role tutorials: `.claude/roles/tutorials/`. Human overview: `docs/ai-os/`.

---

## Who Does What

| Role | Primary Stages | Key Tools |
|---|---|---|
| **BA / Solution Analyst** | 1 | `solution-analyst` agent |
| **PM** | 1, 2, cross-cutting | `pm` agent, `/create-brd`, CR template |
| **Tech Lead / Architect** | 3 | `architect` agent, `/create-api`, `/architecture-review`, LLD template |
| **UX Designer** | 4 | `ux-designer` agent |
| **Developer** | 5 | Coding against approved spec |
| **Any (self-review)** | 6 | `/review` |
| **Peer Reviewer** | 7 | `review-rules.md` checklist |
| **QA Engineer** | 8 | `qa-reviewer` agent, `/gen-tests`, UAT template |
| **DevOps / Tech Lead** | 9, 10 | `devops-engineer` agent, `/deployment-review` |

---

## Stage-by-Stage Guide

---

### Stage 1 — Analysis

**Goal:** Fully understand the problem before anything is designed or built.
**Who:** BA / PM / Solution Analyst

#### Step 1.1 — Run Solution Analysis
When a feature request arrives, invoke the solution analyst before writing any requirements.

```
@solution-analyst Analyse this feature request: [paste feature description]
```

This produces a report with:
- Confirmed vs unconfirmed scope
- Every assumption that must be validated
- Ambiguities that would cause rework if left unresolved
- Risk register

**Do not proceed to BRD until all BLOCKER ambiguities are resolved.**

#### Step 1.2 — Write the BRD
Once assumptions are confirmed, generate the BRD.

```
/create-brd
```

Provide: feature description, user personas, business objective, acceptance criteria.

Output goes to `docs/brd/brd-{{feature}}.md`.

**Gate 1 exit:** BRD approved by PM + stakeholder.

---

### Stage 2 — Plan

**Goal:** Sprint-ready tasks, estimation, risk flags.
**Who:** PM + Tech Lead

#### Step 2.1 — Estimate the Feature

```
/estimate
```

Provide: feature scope from the BRD, tech stack, team size.

Output: three-point estimate, risk register, phasing recommendation → `docs/estimates/`.

#### Step 2.2 — Sprint Plan

Use the `pm` agent to produce a scope statement for the sprint.

```
@pm Draft a scope statement for Sprint {{N}}: [list features from estimation]
```

**Gate 2 exit:** Estimation signed off by Tech Lead + PM.

---

### Stage 3 — Architecture Design

**Goal:** System design, data model, API contracts, LLD. Architecture must be approved before UX or code.
**Who:** Tech Lead / Architect

#### Step 3.1 — High-Level Design

```
@architect Design the architecture for: [feature from approved BRD]
```

Produces: component design, data model, trade-offs, ADRs. Store in `docs/architecture/`.

#### Step 3.2 — API Contracts

```
/create-api
```

Provide: feature scope, entities involved, required endpoints.

Output: full REST contract → `docs/api/`.

#### Step 3.3 — Low-Level Design

Use the LLD template for each module:

```
@architect Produce an LLD for the {{module}} module based on the approved HLD and API contract.
```

Store in `docs/architecture/lld-{{feature}}.md`.

#### Step 3.4 — Architecture Review

```
/architecture-review
```

Validates the design against project invariants. Address all BLOCK findings before proceeding.

**Gate 3 exit:** Architecture review approved by Tech Lead.

---

### Stage 4 — UX Design

**Goal:** Requirements → Figma/Claude build prompt → manual Figma build → review → handoff. No coding until UX is approved and `/ux-handoff` exists.
**Who:** UX Designer / PM

UX work follows a staged, task-based path. Each command gates the next — no skipping:

```
1. /ux-analysis       → tasks/<MODULE>-<NNN>/01-requirements.md + 01-task-index.md + 02-open-questions.md
2. /ux-design-prompt  → tasks/<MODULE>-<NNN>/03-design-prompt.md  (self-contained, Figma/Claude-ready)
                       + tasks/<MODULE>-<NNN>/04-figma-build-notes.md
3. Manual Figma build → designer pastes prompt into Figma Make / Claude Design, adjusts, gets UX Lead approval
4. /ux-review         → 32-item check + 4-viewport browser verification (desktop L/D + mobile L/D at 390px)
5. /ux-handoff        → tasks/<MODULE>-<NNN>/05-dev-handoff.md  (hard gate before Stage 5)
```

**Module-level structure:** one folder per UX module under `docs/ux/<module>/` with `module.json`, `state.json`, `00-index.md`, and a `tasks/<MODULE>-<NNN>-<slug>/` subfolder per task.

**UX module structure is the live reference:** see `docs/ux/` for the UX module folder conventions and task artifacts.

**For quick fixes and spikes** (single screen, color/spacing), use `/ux-create` directly — bypasses the staged path.

**State coverage requirement (hard gate):** every data-rendering screen must cover all 7 states: loading, empty, error, permission-denied, success, form-validation, mobile. Not 4.

**See also:** `.claude/rules/ux-rules.md` for the full 10 hard gates. UX role tutorial: `.claude/roles/tutorials/ux-role-tutorial.md`. UX workflow skill: `.claude/skills/ux-workflow/SKILL.md`.

**Gate 4 exit:** `/ux-handoff` exists + `/ux-review` passed + PM/stakeholder approved.

---

### Gate Check — Run /kickoff Before Writing Any Code

Before any developer starts work, run the project readiness check:

```
/kickoff "{{feature or sprint name}}"
```

This checks all six gates:
1. Requirements (BRD approved)
2. UX (wireframes approved)
3. Architecture (HLD + API + LLD approved)
4. Estimation (effort signed off)
5. QA strategy (test plan defined)
6. Governance (DoD agreed, CR process in place)

**A NO-GO result means stop. Fix the blockers first.**

---

### Stage 5 — Execution

**Goal:** Build against the approved spec.
**Who:** Developers

Rules during execution:
- Code against the LLD and API contract — the spec is the contract
- If the spec is wrong, update it first (raise a CR if post-sign-off), then change the code
- Run `@solution-analyst` if a new ambiguity surfaces mid-sprint
- Use `@architect` to resolve any architectural question that arises

---

### Stage 6 — AI Review

**Goal:** Catch logic errors, security issues, and quality problems before human review.
**Who:** Developer (self-initiated)

```
/review
```

This runs backend-reviewer + frontend-reviewer + security-reviewer in parallel.

- **BLOCK** findings must be fixed before opening a PR
- **WARN** findings must be acknowledged in the PR description
- **NIT** findings are optional
- **UI / Component / UX findings:** After all BLOCK findings are resolved, run `/qa` for live-site verification before handing to human review

---

### Stage 7 — Manual Review

**Goal:** Domain correctness, business logic, team knowledge transfer.
**Who:** Peer reviewer

Reviewer follows the checklist in `.claude/rules/review-rules.md`.

Two approvals required for production-bound changes: AI review + human review.

---

### Stage 8 — QA

**Goal:** Verify the feature works as specified. Get QA sign-off.
**Who:** QA Engineer

#### Step 8.1 — Generate Test Cases

```
/gen-tests
```

Provide: feature spec, acceptance criteria.

Output: test matrix with P0/P1/P2 priority levels. Fill into `test-case-template.md`.

#### Step 8.2 — QA Review

```
@qa-reviewer Review the QA results for: [feature]
```

Produces: acceptance criteria status, missing coverage, regression risk, release recommendation.

#### Step 8.3 — UAT

Fill and execute `uat-template.md` with the client. No release without UAT sign-off.

**Gate 8 exit:** QA sign-off + UAT client sign-off.

---

### Stage 9 — CI/CD

Automated. CI must be green before deployment review.

Required gates: lint, typecheck, unit tests, integration tests, build, dependency audit.

---

### Stage 10 — Deploy

**Goal:** Safe, documented production deployment.
**Who:** DevOps / Tech Lead

#### Step 10.1 — Deployment Review

```
/deployment-review
```

Produces: go/no-go decision, migration plan, smoke test table, rollback procedure.

#### Step 10.2 — Release Notes

Use `release-notes-template.md` to document the release.

```
@documentation-writer Produce release notes for v{{version}} based on the merged PRs and UAT sign-off.
```

---

## Fast Lane — Bug Fixes, Hotfixes, Spikes, and Micro-Changes

Not every change needs the full 10-stage workflow. Use the fast lane for:

| Type | Definition | Reduced Path |
|---|---|---|
| **Bug fix** | Defect in existing behaviour, no new feature | Stages 5, 6, 7, 8, 9, 10 only |
| **Hotfix** | Production incident fix, time-critical | Stages 5, 6 (AI review only), 10 |
| **UI micro-change** | Copy, colour, spacing, < 10 lines, no logic | Stages 5, 6, 7 only |
| **Spike / PoC** | Exploratory work — output is learning, not shippable code | Branch `spike/*`, no gates, never merges to `dev` |
| **Internal tooling** | Non-production scripts, internal admin utilities | Stages 5, 6, 7 only |

### Fast Lane Rules

- **Fast lane only applies when the scope truly fits.** If you start a "bug fix" and discover it requires a new API endpoint or schema change, escalate to the full workflow.
- **Hotfixes still require AI review** (`/review`) before deploy — speed does not waive security.
- **Spikes never merge to `dev` or `main`.** Output is a written summary or PoC — not production code.
- **Any fast-lane change that touches auth, payments, or data access** automatically escalates to the full security review (Stage 6).
- **Run `/what-next`** if you are unsure which lane applies.

### Fast Lane: Bug Fix

```
1. Reproduce the bug and identify root cause
2. Branch: fix/{{ticket-id}}-description from dev
3. Implement fix (Stage 5)
4. Run /review — address all BLOCK findings (Stage 6)
5. Open PR — one human reviewer (Stage 7)
6. QA: verify fix + regression check for the affected flow (Stage 8)
7. CI must be green (Stage 9)
8. Deploy via /deployment-review (Stage 10)
```

### Fast Lane: Hotfix (Production Incident)

```
1. Branch: hotfix/description from main
2. Implement fix (Stage 5)
3. Run /review — address all BLOCK findings (Stage 6)
4. Tech Lead approval (expedited Stage 7)
5. Run /deployment-review — deploy to production (Stage 10)
6. Cherry-pick or merge back to dev
```

---

## Handling Changes Mid-Project

If a requirement changes after BRD or sprint sign-off:

1. **Do not change the code yet**
2. Fill in `cr-template.md`
3. Get PM + Tech Lead + Client approval
4. Once approved, update the BRD/spec first, then implement

```
@pm Summarise the impact of this change request: [describe the change]
```

---

## Monitoring Project Health

At sprint end or on request:

```
@pm Produce a sprint health summary for Sprint {{N}}: [paste sprint data from Jira]
```

For stakeholder updates:

```
@pm Produce a status update for week ending {{DATE}}: [paste sprint progress]
```

For escalations:

```
@pm Draft an escalation notice for: [describe the blocker]
```

---

## Quick Reference — All Commands

| Command | When | Output |
|---|---|---|
| `/bootstrap` | First-time use of this scaffold (Stage 0) | Fills project identity, tech stack, tenancy, and compliance placeholders interactively |
| `/what-next` | Any time — when unsure what to do next | Current stage (including Stage 0), blockers, single next action |
| `/kickoff` | Before any execution begins | Go/no-go across 6 readiness gates |
| `/create-brd` | Stage 1 — requirements | BRD document |
| `/create-api` | Stage 3 — architecture | Full REST API contract including async operations pattern |
| `/architecture-review` | Stage 3 — after HLD | Architecture critique + compliance check + ADR recommendations |
| `/estimate` | Stage 2/3 — planning | Three-point estimate + risk register + phasing |
| `/start-task` | Stage 5 — any non-trivial task | Plan-and-confirm ritual with mandatory self-critique gate before code output |
| `/review` | Stage 6 — before PR | Parallel BLOCK/WARN/NIT findings: backend + frontend + security + qa + architect |
| `/gen-tests` | Stage 5/8 — QA prep | Complete runnable test files: unit, integration, component, snapshot |
| `/deployment-review` | Stage 10 — pre-deploy | Go/no-go + migration plan + smoke tests + rollback procedure |
| `/investigate` | Any time a bug or error is reported | Systematic debugging: gather evidence → form root cause hypothesis → test → fix. Iron law: no fix without investigation. |
| `/debug-fix` | Pre-fix — bug fix work | Root-cause-first: plan → reproduce → analyze → implement → verify → report. 5-status model. |
| `/health` | Any time (weekly recommended) | Code quality dashboard with hallucination guard sub-score. HARD GATE: show only, never fix. |
| `/lessons` | Any time — query past mistakes | Search `tasks/lessons.md` by keyword or tag. Read-only. |
| `/qa` | Stage 8 — live-site QA | Live browser testing: walk feature flow, find rendering/interaction issues, fix and re-verify. |
| `/qa-plan` | Stage 8 — QA automation planning | Traceability matrix (Requirement → Scenario → Test → Result) via qa-reviewer agent |
| `/qa-review` | Stage 8 — QA coverage review | Validates traceability, independence, data isolation, CI commands. Severity: BLOCK/HIGH/MEDIUM/LOW |
| `/qa-auth` | Stage 8 — auth-specific test planning | Auth test matrix for login, logout, session, token, protected routes, tenant isolation |
| `/commit-changes` | Any time — before commit/merge | Branch safety check, unrelated-changes detection, verification evidence requirement, optional dev/main promotion |
| `/ux-create` | Stage 4 — quick fixes/spikes | Single-screen UX improvements, color/spacing changes, UX exploration (not the primary path) |
| `/ux-analysis` | Stage 4 — UX requirements | Extracts UX requirements from BRD into `tasks/<MODULE>-<NNN>/01-requirements.md`. Task-based; one UX task = one UX deliverable. |
| `/ux-design-prompt` | Stage 4 — design prompt | Self-contained Figma/Claude design prompt at `tasks/<MODULE>-<NNN>/03-design-prompt.md` + build notes at `04-figma-build-notes.md`. Inlines tokens, states, viewports, exclusions, defaults. |
| `/ux-review` | Stage 4/6 — UX verification | 32-item check + 4-viewport browser verification (desktop L/D + mobile L/D at 390px) |
| `/ux-handoff` | Stage 4 — dev handoff | Developer-ready checklist: components, state matrix, tokens, responsive, Figma link (hard gate before Stage 5) |
| `/loop` | Stage 5 — autonomous task queue | Execute numbered task list with one-approval contract. Stop conditions prevent scope creep. |
| `/ponytail-audit` | Any time — periodic YAGNI pressure | Whole-repo over-engineering scan. Tags: delete / stdlib / native / yagni / shrink. Report only, never modifies. |
| `/ponytail-debt` | Any time — periodic debt sweep | Harvest `ponytail:` shortcut markers into `tasks/ponytail-debt.md`. Flags `no-trigger` markers. Read-only by default. |

---

## Ponytail Integration

A curated set of rules and commands adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT). The full plugin is **not** installed — that would conflict with this scaffold's stage gates, layered architecture, and DoD floor. Instead, three pieces are taken; the rest is intentionally left out.

### What was taken

| Asset | Where | Purpose |
|---|---|---|
| The 6-rung ladder (YAGNI → stdlib → native → dep → one line → min) | [`.claude/rules/ponytail-ladder.md`](.claude/rules/ponytail-ladder.md) | Single-page decision flow applied per-task when `--intensity` is set |
| The `ponytail:` shortcut-marker convention | [`.claude/rules/coding-standards.md` "Shortcut Markers"](.claude/rules/coding-standards.md) | Inline self-documentation for deliberate simplifications with a known ceiling and a named upgrade trigger |
| `/ponytail-audit` (whole-repo over-engineering scan) | [`.claude/commands/ponytail-audit.md`](.claude/commands/ponytail-audit.md) | Periodic YAGNI pressure. Tag taxonomy preserved from upstream; severity labels (BLOCK/WARN/NIT) added to match this scaffold's review system |
| `/ponytail-debt` (shortcut debt ledger) | [`.claude/commands/ponytail-debt.md`](.claude/commands/ponytail-debt.md) | Harvests `ponytail:` comments into `tasks/ponytail-debt.md`. Flags `no-trigger` markers |
| `--intensity lite\|full\|ultra` flag on `/start-task` | [`.claude/commands/start-task.md`](.claude/commands/start-task.md) | Per-call opt-in to the ladder. Does not persist across sessions |

### What was explicitly NOT taken

- The JavaScript hooks (`ponytail-activate.js`, `ponytail-mode-tracker.js`, statusline) — they write flag files to user-scope config and persist mode across sessions. We want repo-scoped, per-call, no side effects.
- The "lazy senior developer" persona and casual voice — conflicts with this scaffold's enforcement-engine voice.
- The `off` mode default — our scaffold's default stays strict, not lazy.
- Cross-agent packaging (`.cursor/`, `.windsurf/`, `.clinerules/`, `.kiro/`, `.opencode/`, `.openclaw/`, `gemini-extension.json`, `opencode.json`, `.codex-plugin/`) — we don't ship for those agents.
- The MCP server, the benchmark scripts, the examples dir, the Spanish README.

### Default state: OFF

The ladder is **off by default**. To apply it for a specific task:

```bash
/start-task --intensity ultra "rewrite the user-search endpoint"
```

For an on-demand repo scan:

```bash
/ponytail-audit                    # whole repo
/ponytail-audit --path apps/api    # scoped to a subtree
/ponytail-debt --write             # update tasks/ponytail-debt.md
```

### Gates always win

`--intensity ultra` does not bypass Stage 1 (BRD), does not bypass `tenant_id` scoping, does not bypass the test pyramid, and does not bypass lint/typecheck/DoD verification. The ladder simplifies; the gates enforce. See [`.claude/rules/ponytail-ladder.md`](.claude/rules/ponytail-ladder.md) "What This Rule Does NOT Override" for the full list.

### Attribution

Ponytail philosophy, ladder structure, tag taxonomy, and `ponytail:` marker convention adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT). All rule files and commands adapted under the MIT license. See the file-level preamble in each adapted file for the exact attribution block.

---

## Quick Reference — All Agents

| Agent | When to Invoke | How |
|---|---|---|
| `solution-analyst` | Before writing BRD — when a feature request arrives | `@solution-analyst [request]` |
| `architect` | Stage 3 — system design, HLD, LLD | `@architect [feature/question]` |
| `api-architect` | Stage 3 — new endpoints | `@api-architect [endpoint spec]` |
| `ux-requirement-analyst` | Stage 4 — UX requirements | `@ux-requirement-analyst [feature]` — produces `01-requirements.md` and `02-open-questions.md` for a UX task |
| `ux-flow-designer` | Stage 4 — UX flows | `@ux-flow-designer [task-id]` — produces flow artifacts (happy/error/empty/permission paths) |
| `ux-designer` | Stage 4 — screen specs | `@ux-designer [screen]` — produces screen-level layout, state matrix, Figma notes |
| `estimator` | Stage 2/3 — sizing | `@estimator [scope]` |
| `pm` | Cross-cutting — comms, CRs, sprint health | `@pm [task]` |
| `backend-reviewer` | Stage 6 — code review | via `/review` or `@backend-reviewer` |
| `frontend-reviewer` | Stage 6 — UI review | via `/review` or `@frontend-reviewer` |
| `qa-reviewer` | Stage 8 — QA sign-off | `@qa-reviewer [feature]` |
| `security-reviewer` | Stage 6 — auth/data changes | via `/review` or `@security-reviewer` |
| `devops-engineer` | Stage 9/10 — infra/CI changes | `@devops-engineer [change]` |
| `documentation-writer` | Post-implementation | `@documentation-writer [target]` |

---

## Quick Reference — All Templates

| Template | When to Use | Where to Save |
|---|---|---|
| `brd-template.md` | Stage 1 — requirements | `docs/brd/` |
| `adr-template.md` | Stage 3 — architecture decisions | `docs/architecture/adr/` |
| `api-contract-template.md` | Stage 3 — API design | `docs/api/` |
| `lld-template.md` | Stage 3 — module-level design | `docs/architecture/` |
| `estimation-template.md` | Stage 2/3 — sizing | `docs/estimates/` |
| `sow-template.md` | Project start — client agreement | `docs/` |
| `cr-template.md` | Any time a post-sign-off change is requested | `docs/brd/` |
| `test-case-template.md` | Stage 8 — QA | `docs/qa/` |
| `uat-template.md` | Stage 8 — client acceptance | `docs/qa/` |
| `release-notes-template.md` | Stage 10 — release | `docs/deployment/` |

---

## Self-Improvement Loop

Claude gets better at your project over time through `tasks/lessons.md`.

**After any correction:**
- Claude records: what the mistake was, why it happened, and the rule that prevents it
- At the start of the next session, Claude reads `tasks/lessons.md` and applies the rules

**You can trigger this manually:**
```
Remember this: [describe the correction or preference]
```

Claude will write the lesson to `tasks/lessons.md` immediately.

**Per-ticket task files** live under `tasks/todo/` (active) and `tasks/done/` (archived). Each ticket gets its own `<TICKET-ID>-<slug>.md` file with spec, AC, and decision log.

**AI ephemera** (planning, scratch, intermediate output) lives in `.claude/work/` — gitignored, per-clone.

**Permanent record** of what shipped lives in `CHANGELOG.md` at the repo root. Each merging PR adds an entry under `[Unreleased]`.

`tasks/todo.md` (singular file) is **deprecated** — replaced by `tasks/todo/` + `tasks/done/` per-ticket structure to eliminate the merge-conflict pattern that shared status files cause. The legacy path is gitignored; if it exists locally as a scratch pad, that's fine — it never affects other clones.

---

## Applying This Scaffold To A Project

### New project setup

1. Run `npx @lajin.m/ai-scaffold create <project-name> --profile <profile>`.
2. Review generated project identity and stack values in `.claude/settings-overrides.json`.
3. Confirm the generated initial scaffold commit, or use `--no-git` when you need to manage git initialization yourself.
4. Run `/what-next` — it should report the next project stage.
5. Run `/kickoff` at the start of every epic to verify all gates are met.
6. Follow the 10-stage workflow — no skipping gates.

### Existing project setup

1. From the existing repository, run `npx @lajin.m/ai-scaffold init --profile <profile> --dry-run`.
2. Review the file plan and confirm it does not conflict with application-owned files.
3. Run `npx @lajin.m/ai-scaffold init --profile <profile>`.
4. Review generated context in `.claude/MEMORY.md`, `.claude/settings-overrides.json`, and `.ai-scaffold.json` or the configured scaffold namespace.
5. Run `ais doctor`.
6. Run `/what-next` to begin project work.

### Local CLI development setup

When working on this scaffold repository itself, use local commands:

```bash
node bin/ai-scaffold.js create /private/tmp/test-project --profile node --yes
node bin/ai-scaffold.js init /private/tmp/existing-project --profile javascript --yes --dry-run
npm test
npm run typecheck
bash scripts/pre-publish-smoke.sh
```

The pre-publish smoke script is the release gate. If it fails, do not publish.

---

## Common Mistakes to Avoid

| Mistake | Consequence | Correct Approach |
|---|---|---|
| Starting code before BRD is approved | Rework when requirements change | Run `/kickoff` — it blocks you if BRD isn't ready |
| Skipping solution analysis | Hidden assumptions cause mid-sprint pivots | Always run `@solution-analyst` first |
| Changing requirements without a CR | Scope creep, broken estimates | Fill `cr-template.md`, get three approvals |
| Marking a story Done without tests passing | Defect leakage to production | Check `dod-rules.md` before marking Done |
| Deploying without a deployment review | No rollback plan, no smoke test | Always run `/deployment-review` first |
| Using AI for architecture decisions without review | AI can be wrong on business logic | AI drafts, human (Tech Lead) approves |
