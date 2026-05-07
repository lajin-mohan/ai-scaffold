# /bootstrap

Initialise this scaffold for a real project. Walks through identity, stack, tenancy, and compliance decisions **one at a time**, then writes the answers into every file that holds a `{{PLACEHOLDER}}`.

`/bootstrap` is the only valid response to a Stage 0 result from `/what-next`. It exists because every later stage gate (BRD, architecture, estimation, review) reasons about a declared project — and the scaffold ships with no declarations.

---

## Usage

```
/bootstrap                      # interactive mode — walks through one decision at a time
/bootstrap --resume             # continue an interrupted bootstrap
/bootstrap --check              # validate the scaffold is fully bootstrapped (no placeholders left)
```

---

## Operating Rules

1. **One decision at a time.** Ask the user for one value, wait for the answer, confirm understanding, then move on. Never present a single mega-question with 12 fields.
2. **Confirm before writing.** After each answer, restate the decision in one sentence. After all decisions are gathered, present a single summary block and ask for explicit approval before any file is touched.
3. **Idempotent.** If `/bootstrap` is run on a partially-initialised scaffold, detect what's already filled in and only ask for what's missing. Do not overwrite a real value with a placeholder.
4. **No assumptions.** If the user is unsure of a value, mark it `{{TBD}}` and add it to the open questions in `tasks/todo.md` — never guess.
5. **Plan-and-confirm protocol** (see `.claude/rules/coding-standards.md` and the AI coding rules) applies here too — restate the change list before applying it.

---

## Decisions Gathered

Ask in this order. Stop after each block; confirm; continue.

### Block 1 — Project Identity

1. **Project name** — short, machine-friendly slug (`hire-ats`, `billing-portal`). Used in package names, docker tags, repo name.
2. **Display name** — human-readable (`Hire ATS`, `Billing Portal`). Used in README, release notes.
3. **One-line purpose** — what this project does, in one sentence. Drives BRD and SOW summaries.
4. **Project type** — pick one: `SaaS` / `Internal Tool` / `Public API` / `Platform` / `Mobile App` / `Website`.
5. **Status** — pick one: `Active Development` / `MVP` / `Production` / `Maintenance`.
6. **Owner email** — defaults to the value in `CLAUDE.md`. Confirm or override.

### Block 2 — Tech Stack

For each row, ask the user. Offer the **Techversant default** as the suggestion (PHP/Node + TypeScript + ReactJS + PostgreSQL + AWS, multi-tenant SaaS) but accept any answer.

7. **Backend** — e.g. `Node.js 20 + TypeScript + Fastify`, `PHP 8.3 + Laravel 11`, `Python 3.12 + FastAPI`.
8. **Frontend** — e.g. `React 18 + Vite + TypeScript`, `Next.js 14`, `Vue 3`.
9. **Database** — e.g. `PostgreSQL 16`, `MySQL 8`, `MongoDB 7`.
10. **Cache / Queue** — e.g. `Redis 7`, `pg-boss`, `BullMQ`. May be `None` for small projects.
11. **Auth strategy** — e.g. `Opaque session tokens (HttpOnly cookies)`, `OAuth2 + sessions`, `SSO via SAML`.
12. **Email provider** — e.g. `Resend`, `SendGrid`, `AWS SES`. May be `None` if no transactional email.
13. **Storage** — e.g. `AWS S3`, `Cloudflare R2`. May be `None`.
14. **Cloud / hosting** — e.g. `AWS ECS Fargate`, `GCP Cloud Run`, `On-prem`.
15. **IaC tool** — e.g. `Terraform`, `Pulumi`, `AWS CDK`. May be `None` for early projects.
16. **CI/CD platform** — e.g. `GitHub Actions`, `GitLab CI`, `CircleCI`.
17. **Project mgmt tool** — e.g. `Jira`, `Linear`, `GitHub Projects`. Drives the `jira-sync.py` hook configuration.
18. **Test framework (backend)** — e.g. `Vitest`, `Jest`, `PHPUnit`, `pytest`.
19. **Test framework (frontend)** — e.g. `Vitest + @testing-library/react`, `Playwright`.
20. **Linter/formatter** — e.g. `ESLint + Prettier`, `Biome`, `PHP CS Fixer + PHPStan`, `Ruff + Black`.

### Block 3 — Multi-Tenancy & Compliance

21. **Multi-tenant?** `true` / `false`. Drives the `tenant_id` rule in `.claude/rules/security-rules.md`, the database schema defaults, and the API contract template. **If false**, all tenant-isolation rules become inactive.
22. **Compliance scope** — pick all that apply: `GDPR`, `ISO27001`, `HIPAA`, `SOC2`, `PCI-DSS`, or `N/A`. Drives `.claude/rules/compliance-rules.md`. Default Techversant assumption: `GDPR + ISO27001`.

### Block 4 — Repository Setup

23. **Initialise git?** `yes` / `no`. If yes, run `git init`, create `main` and `dev` branches, set up the `.gitignore`. If the repo is already a git repo, skip.
24. **Repo URL** — for README and package metadata. Optional — may be `TBD`.
25. **License** — `MIT`, `Apache-2.0`, `Proprietary`, etc. Defaults to `Proprietary` for client work.

### Block 5 — Initial Project Context

26. **First epic name** — the first body of work this project will tackle. Becomes `{{CURRENT_EPIC}}` in `.claude/memory/project-context.md`.
27. **Target milestone date** — first delivery target (ISO date). May be `TBD`.

---

## Confirmation Step

After all answers are gathered, present a single summary block:

```
## Bootstrap Summary — please confirm before I write any files

Project Identity:
  Name:              {{value}}
  Display name:      {{value}}
  Purpose:           {{value}}
  Type:              {{value}}
  Status:            {{value}}
  Owner:             {{value}}

Tech Stack:
  Backend:           {{value}}
  Frontend:          {{value}}
  Database:          {{value}}
  ... (all stack rows)

Tenancy & Compliance:
  Multi-tenant:      {{true|false}}
  Compliance scope:  {{value}}

Repository:
  Init git:          {{yes|no}}
  Repo URL:          {{value}}
  License:           {{value}}

Initial Context:
  First epic:        {{value}}
  Target milestone:  {{value}}

Files I will modify:
  - CLAUDE.md (Project Identity, Tech Stack, Current State sections)
  - .cursorrules (Project Context, Tech Stack rows, Backend/Frontend/Database headings)
  - .github/copilot-instructions.md (Project Context, Stack)
  - README.md (Title, Overview, Tech Stack, Setup commands)
  - .claude/memory/project-context.md (Epic, Milestone)
  - tasks/todo.md (add open questions for any TBD values)
  - .gitignore (only if you said yes to git init and it's missing entries)

Reply 'confirm' to proceed, or correct any value above.
```

Only on explicit `confirm` proceed to the write step. No assumed approval.

---

## Write Step

For every file in the "Files I will modify" list, replace placeholders. Rules:

- **Match adjacent style.** Don't rewrite sections — replace the placeholder and leave surrounding text untouched.
- **Preserve comments and caveats.** The "multi-tenant only" caveats in the rule files must remain even after `{{IS_MULTI_TENANT}} = true` — they document why the rule exists.
- **For SaaS / multi-tenant = true:** keep all `tenant_id` rules active. Tag the project context memory with `multi_tenant: true` so future commands can read it.
- **For multi-tenant = false:** remove or strike-through every `tenant_id` rule, every "tenant isolation" check in agents, and every `tenant_id` column in templates. Add an ADR `docs/architecture/adr/0001-single-tenant-architecture.md` documenting the decision.
- **For compliance = N/A:** add a single line to `.claude/rules/compliance-rules.md` stating "This project's compliance scope is N/A — rules below are reference only and not enforced." Do not delete the file.
- **For each stack value:** replace every occurrence in all files in one pass.

After writing, run a verification pass — grep for any remaining `{{...}}` placeholder and report it.

---

## Output

```
## Bootstrap Complete

✅ Wrote project identity to: CLAUDE.md, .cursorrules, .github/copilot-instructions.md, README.md
✅ Wrote tech stack to: CLAUDE.md, .cursorrules, .github/copilot-instructions.md, README.md
✅ Wrote initial epic to: .claude/memory/project-context.md
✅ Wrote {{N}} TBD items to: tasks/todo.md
✅ Initialised git repo with main and dev branches
✅ Verified: 0 remaining {{PLACEHOLDER}} tokens (or: ⚠ {{N}} remaining — see tasks/todo.md)

Next: run /what-next — it will now evaluate Stage 1 (Analysis).
```

---

## Rules

- Never run any of the placeholder substitutions before the user has typed `confirm`.
- If the user interrupts mid-question, save partial answers to `tasks/bootstrap-state.json` (gitignored) and offer `/bootstrap --resume` on next session.
- A user who runs `/bootstrap` on an already-bootstrapped scaffold should get a one-line response: "Already bootstrapped. Run `/bootstrap --check` to verify, or `/what-next` to see current stage."
- `/bootstrap --check` greps the entire repo for `{{...}}` patterns and lists any survivors. It does not modify files.
- This command never writes secrets or `.env` files. It only writes structural/identity decisions.
