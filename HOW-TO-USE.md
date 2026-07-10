# How to Use AI Scaffold

AI Scaffold gives a project a shared operating model for AI-assisted delivery:
requirements first, planned execution, deterministic guardrails, review, QA, and
human approval.

The scaffold does not make vague work safe. It works best when your BRD/FRD,
task IDs, acceptance criteria, and verification commands are accurate.

---

## 1. Install Or Create

Use `npx` when you do not want a global install:

```bash
npx @lajin.m/ai-scaffold create my-project --profile node
npx @lajin.m/ai-scaffold init --profile node --dry-run
npx @lajin.m/ai-scaffold init --profile node
```

Install globally when you want the short `ais` command:

```bash
npm install -g @lajin.m/ai-scaffold@latest
ais --version
```

Create a new project:

```bash
ais create my-api --profile node
ais create my-python-tool --profile python
ais create my-go-service --profile go
ais create my-project --no-git
```

Install into an existing repo:

```bash
ais init --profile node --dry-run
ais init --profile node
```

`--dry-run` previews the file plan without writing files. Use it first on
existing repositories.

---

## 2. Pick A Profile

| Profile | Use case |
|---|---|
| `generic` | Neutral AI governance without stack defaults |
| `node` | Node.js/JavaScript projects |
| `js`, `javascript`, `nodejs` | Aliases for `node` |
| `python` | Python projects with pytest/ruff/mypy defaults |
| `py`, `python3` | Aliases for `python` |
| `golang` | Go projects with go test/vet/build defaults |
| `go` | Alias for `golang` |
| `laravel` | Light PHP/Laravel profile |

---

## 3. Link Requirements First

The most important setup value is the BRD/FRD location. Link existing
requirements during `init`:

```bash
ais init \
  --profile node \
  --project-name acme-api \
  --display-name "Acme API" \
  --purpose "Internal API for Acme operations" \
  --project-type api \
  --backend-stack "Node.js" \
  --frontend-stack none \
  --database "PostgreSQL" \
  --requirements-source existing-docs \
  --requirements-path docs/requirements/frd.md \
  --test-command "npm test" \
  --lint-command "npm run lint" \
  --typecheck-command "npm run typecheck" \
  --build-command "npm run build"
```

If requirements do not exist yet, choose `create-later` and create them before
serious feature work:

```bash
ais init --profile node --requirements-source create-later
```

Then use `/create-brd` or your normal product process to create the BRD/FRD.
Keep it in the repo location your team prefers, for example
`docs/requirements/frd.md`. AI Scaffold does not create root `docs/` by default
for existing projects; create that folder only when your project needs it.

---

## 4. Update Setup Values Manually

After initialization, update these files when project reality changes:

| File | Purpose |
|---|---|
| `.ai-scaffold.json` | Install metadata and requirements source/path; do not hand-edit version or managed-file hashes unless recovering from a known migration issue |
| `.ai-scaffold/context.md` | Human-readable setup summary and requirements link |
| `.claude/settings-overrides.json` | Project identity, stack, lifecycle, compliance, verification commands |
| `.claude/MEMORY.md` | Long-lived project memory, requirements notes, safety policy, team context |
| `CLAUDE.md` | Main AI operating guide for the project |
| `AGENTS.md` | Cross-agent guide for Codex, Cursor, Copilot, and other assistants |
| `tasks/lessons.md` | Mistakes, decisions, and patterns learned over time |
| `CHANGELOG.md` | Shipped changes and release notes |

Run `ais doctor` after manual edits.

---

## 5. Check Health With Doctor

`doctor` checks whether the installed scaffold is healthy enough to rely on.

```bash
ais doctor
ais doctor --json
ais doctor ./another-project
```

It validates:

- `.ai-scaffold.json`
- `.claude/`
- `.claude/MEMORY.md`
- `.claude/settings-overrides.json`
- `.ai-scaffold/context.md`
- managed files
- meaningful setup values
- wired hooks in `.claude/settings.json`
- verification commands
- git repository presence

Treat `CRIT` and `HIGH` failures as fix-before-use. `MED` findings usually mean
the scaffold works but the project context should be improved.

---

## 6. Start Work On A Task

Use the BRD/FRD or task spec as the source of truth.

```text
1. Run `ais doctor`.
2. Open the BRD/FRD and identify the task ID.
3. Confirm acceptance criteria and verification commands are clear.
4. Start work with `/start-task --spec <path>`.
5. Review the plan and say `go` once.
6. Let the AI implement only the approved scope.
7. Run `/review`.
8. Run QA or manual verification.
9. Open PR for human review.
```

Example:

```bash
/start-task --spec docs/requirements/tasks/TASK-001-user-export.md
```

`/start-task` reads the spec, project memory, lessons, rules, agents, and role
guidance. It then produces a plan with files, risks, acceptance criteria, and
verification steps. It must wait for explicit approval before implementation.

---

## 7. Core Commands

You do not need every command on day one. Start here:

| Command | Use it to |
|---|---|
| `/what-next` | Ask what the next project action should be |
| `/start-task` | Plan, approve, implement, and verify a task |
| `/debug-fix` | Reproduce and root-cause a bug before changing code |
| `/review` | Run parallel AI review before human PR review |
| `/commit-changes` | Commit with branch and verification checks |
| `/lessons` | Query or record lessons so mistakes do not repeat |

Inspect what is installed:

```bash
ais list
ais list commands
ais list agents
ais list skills
ais list rules
```

---

## 8. Stage Workflow

Use the full workflow for product features and epics:

```text
1. Analysis      - clarify request, assumptions, BRD/FRD
2. Plan          - estimate, split tasks, identify risks
3. Architecture  - HLD, API contracts, ADRs, LLD when needed
4. UX            - UX requirements, design prompt, review, handoff
5. Execution     - /start-task against approved spec
6. AI Review     - /review
7. Manual Review - human PR review
8. QA            - tests, traceability, UAT when needed
9. CI/CD         - lint, typecheck, test, build, audit
10. Deploy       - deployment review, rollback, release notes
```

Use fast lanes for small fixes, hotfixes, spikes, and internal tooling, but do
not bypass security, verification, or human approval.

---

## 9. Role Guides

| Role | Start here |
|---|---|
| Developer | `.claude/roles/tutorials/dev-role-tutorial.md` |
| QA | `.claude/roles/tutorials/qa-role-tutorial.md` |
| Architect | `.claude/roles/tutorials/architect-role-tutorial.md` |
| UX | `.claude/roles/tutorials/ux-role-tutorial.md` |
| Owner | `.claude/roles/tutorials/owner-role-tutorial.md` |

Human role overview: `docs/ai-os/README.md`.

---

## 10. Where New Project Artifacts Go

AI Scaffold keeps the default install small. It does not create root `docs/`,
`_ai/`, `apps/`, `packages/`, `infra/`, or `scripts/` by default for existing
projects.

Create project-owned folders only when needed:

| Artifact | Suggested location |
|---|---|
| BRD/FRD | `docs/requirements/` |
| ADRs | `docs/architecture/adr/` |
| API contracts | `docs/api/` |
| UX task artifacts | `docs/ux/<module>/tasks/` |
| QA/UAT evidence | `docs/qa/` |
| Deployment notes | `docs/deployment/` |
| Active task notes | `tasks/todo/` |
| Completed task notes | `tasks/done/` |

Templates live under `.claude/templates/`. Copy or adapt them into your chosen
project-owned folders when the work needs them.

---

## 11. Current Update Behavior

There are two versions to understand:

| Version | Meaning |
|---|---|
| `ais --version` | CLI version installed on your machine |
| `ais status` | Scaffold version installed in the current project |

`ais update` is currently a safe placeholder. It does not yet migrate managed
files. Until full migrations land, update carefully:

```bash
ais doctor
ais init --profile <profile> --dry-run
```

Review the dry run before applying any changes.

---

## 12. Local Development For This Repo

When changing AI Scaffold itself:

```bash
node bin/ai-scaffold.js create /private/tmp/test-project --profile node --yes
node bin/ai-scaffold.js init /private/tmp/existing-project --profile javascript --yes --dry-run
npm test
npm run lint
npm run typecheck
npm audit --audit-level=high
bash scripts/pre-publish-smoke.sh
```

Do not publish unless the smoke script passes.
