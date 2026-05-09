# /bootstrap

Initialise this scaffold for a real project. Walks through 7 essential identity questions, then sets smart feature defaults based on project type.

`/bootstrap` is the only valid response to a Stage 0 result from `/what-next`.

---

## Usage

```
/bootstrap                      # interactive mode — 7 questions + feature summary
/bootstrap --resume             # continue an interrupted bootstrap
/bootstrap --check              # validate the scaffold is fully bootstrapped
/bootstrap --project-type       # show default feature flags for each project type
```

---

## Core Principle

**Identity questions first. Feature flags are shown, not asked.**

The team chooses a project type (MVP, Production SaaS, Internal Tool, Public API) and the scaffold auto-enables appropriate features. The team can override any flag before confirming — but the default is sensible and requires no fine-tuning for a standard project.

---

## Bootstrap Flow (3 Steps)

### Step 1 — Project Identity (7 questions)

Ask one at a time. Confirm after each. Default shown in brackets.

1. **Project name** — short slug for package names, docker tags, repo name (e.g. `hire-ats`)
2. **Display name** — human-readable (e.g. `Hire ATS`)
3. **One-line purpose** — what this project does in one sentence
4. **Project type** — pick one:
   - `mvp` — fast start, all features off by default, enable as needed
   - `production-saas` — GDPR, ISO27001, SAST, MFA, audit on by default
   - `internal-tool` — preCommitFull on, compliance off by default
   - `public-api` — SAST, MFA, full CI/CD on by default
5. **Multi-tenant?** `true` / `false` — drives tenant_id scoping in all queries
6. **Owner email** — defaults to value in CLAUDE.md (just confirm)
7. **First epic name** — the initial body of work (e.g. `Core application workflow`)

### Step 2 — Feature Flags Summary

After the 7 questions, show the defaults for the selected project type:

```
## Feature flags for [project-type] (defaults)

  accessibility    off      WCAG 2.1 AA (screen readers, keyboard nav)
  gdpr             on       GDPR data subject rights, lawful basis
  iso27001         on       ISO 27001 access control, encryption, logging
  sast             on       SAST (Semgrep) — SQL injection, hardcoded secrets
  preCommitFull    on       lint + typecheck + tests in pre-commit hook
  iac              on       Infrastructure as Code (Terraform/Pulumi)
  cicd             full     Full CI/CD pipeline
  mfa              on       Multi-factor authentication for privileged access
  auditLog         on       Audit trail for all state changes
  asyncJobs        on       Background job system (pg-boss, BullMQ)

Edit any before confirming? (y/n)
```

- If `n` → proceed with defaults
- If `y` → show the settings file in an editor-friendly block, the team copies and edits, pastes back. Bootstrap reads the edited version before writing.

### Step 3 — Confirm and Write

```
## Bootstrap Summary — confirm to write files

Project Identity:
  Name:          hire-ats
  Display name:  Hire ATS
  Purpose:       Applicant tracking system for SMBs
  Type:          production-saas
  Multi-tenant:  true
  Owner:         lajinmj@gmail.com
  Epic:          Core application workflow

Feature Flags:
  gdpr: on  |  iso27001: on  |  sast: on  |  preCommitFull: on
  iac: on   |  cicd: full     |  mfa: on   |  auditLog: on  |  asyncJobs: on
  accessibility: off

Files to write/modify:
  - CLAUDE.md (project identity + tech stack placeholders resolved)
  - .cursorrules, .github/copilot-instructions.md, README.md
  - .claude/settings-overrides.json (identity + features)
  - .gitignore (add settings-local.json)

Reply 'confirm' to proceed.
```

---

## Write Step

On `confirm`, write in this order:

1. **`.claude/settings-overrides.json`** — the single source of truth. Contains project identity + all feature flags. This file is committed and shared.

2. **`CLAUDE.md`** — replace all `{{PLACEHOLDER}}` tokens with values from settings-overrides.json. Sections updated:
   - Project Identity (name, display, purpose, type, status, owner, multi-tenant)
   - Tech Stack (backend, frontend, DB, etc. — ask in a follow-up sub-step if not already in settings)
   - Current State (firstEpic)
   - Remove the "TEMPLATE STATE" banner after all placeholders resolved
   - **Applicable stack overlays** — append to the Coding Standards section:
     ```
     Applicable coding standards:
     - .claude/rules/coding-standards.md
     - .claude/rules/stacks/backend-<STACK>.md   ← based on detected backend
     - .claude/rules/stacks/frontend-<STACK>.md  ← based on detected frontend
     ```

3. **`.cursorrules`**, **`.github/copilot-instructions.md`**, **`README.md`** — identity sections only

4. **`.gitignore`** — ensure `settings-local.json` is gitignored

5. **Compliance docs** — only created if their feature flag is `true`:
   - `accessibility: true` → create `docs/compliance/accessibility.md`
   - `gdpr: true` → ensure GDPR section in `compliance-rules.md` is active
   - `iso27001: true` → ensure ISO 27001 section in `compliance-rules.md` is active

6. **`settings-local.example.json`** — add reference showing local override format

---

## Tech Stack (Sub-step if not in settings)

If `.claude/settings-overrides.json` has no `techStack` section (first bootstrap), ask after identity:

```
Tech Stack (enter or press Enter for Techversant defaults):

  Backend:   Node.js 20 + TypeScript + Fastify
  Frontend:  React 18 + Vite + TypeScript
  Database:  PostgreSQL 16
  Cache:     pg-boss
  Auth:      Opaque session tokens (HttpOnly cookies)
  Email:     Resend
  Storage:   AWS S3
  Cloud:     AWS ECS Fargate
  IaC:       Terraform
  CI/CD:     GitHub Actions
  PM:        Linear

Press Enter to accept all defaults, or type values to override.

Available stack overlays (activated automatically):
  Backend:   Node.js | PHP/Laravel | Python | Java/Spring | Go | ColdFusion | .NET/C#
  Frontend:  React | Vue | Next.js
```

These are stored in `settings-overrides.json` under `techStack` and flow into `CLAUDE.md`, `ci.yml`, `package.json` scripts, etc.

---

## Verification

After write, run three checks:

1. `grep -rn '{{[A-Z_]*}}' .` — must return 0 matches
2. `grep 'PRE_REVIEW_ALLOW_UNCONFIGURED' .claude/settings.json` — must return 0 matches
3. Verify `.claude/settings-overrides.json` exists and contains `projectName`, `type`, `multiTenant`, and `techStack`

If any check fails, report the survivors and stop. The scaffold is not "bootstrapped" until all pass.

---

## --check Mode

Validates the scaffold is ready for real project work. Returns one of three verdicts:

### PASS — Scaffold is bootstrapped
```
✅ Bootstrap validation passed.
   projectName:  hire-ats
   type:        production-saas
   multiTenant: true
   techStack:   Node.js 20 + TypeScript + Fastify / React 18 + Vite
   Placeholders: 0 remaining
   preCommitFull: on
```
No action needed. Run `/what-next` to begin Stage 1.

### CONDITIONAL GO — Partial bootstrap (resume recommended)
```
⚠ Bootstrap validation:  N issues found
   - .claude/settings-overrides.json missing techStack section
   - CLAUDE.md contains 3 unresolved {{PLACEHOLDER}} tokens
   - PRE_REVIEW_ALLOW_UNCONFIGURED still present in .claude/settings.json

Run /bootstrap --resume to complete the bootstrap.
```

### FAIL — Scaffold not bootstrapped (run /bootstrap first)
```
❌ Bootstrap validation failed: scaffold is in template state.
   - No settings-overrides.json found
   - package.json does not exist (no project stack configured)
   - CLAUDE.md contains unresolved {{PLACEHOLDER}} tokens

Run /bootstrap to initialize the scaffold for a real project.
```

---

## Idempotency

- If `settings-overrides.json` already exists, read it and only ask for missing values
- Never overwrite a real value with a placeholder
- `--resume` loads partial state from `tasks/bootstrap-state.json` (gitignored)
- Running bootstrap on an already-bootstrapped scaffold → one-line: "Already bootstrapped. Run `/settings` to view or `/bootstrap --check` to verify."

---

## Output

```
## Bootstrap Complete

✅ Project identity written: CLAUDE.md, .cursorrules, README.md
✅ Feature flags written: .claude/settings-overrides.json
✅ Gitignore updated: settings-local.json gitignored
✅ Compliance docs created: [list, if any]

Next: run /what-next — it will evaluate Stage 1 (Analysis) with your feature flags active.
Run /settings --list to see all current feature values.
```

---

## Project Type Reference

### `mvp`
Fast start for prototypes and proof-of-concepts.
```
accessibility: false  gdpr: false  iso27001: false  sast: false
preCommitFull: false  iac: deferred  cicd: minimal  mfa: false
auditLog: false       asyncJobs: false
```

### `production-saas`
Full enterprise-grade setup for multi-tenant SaaS products.
```
accessibility: false  gdpr: true  iso27001: true  sast: true
preCommitFull: true   iac: true   cicd: full       mfa: true
auditLog: true        asyncJobs: true
```

### `internal-tool`
Internal tooling where compliance isn't required but code quality is.
```
accessibility: false  gdpr: false  iso27001: false  sast: false
preCommitFull: true   iac: false   cicd: minimal    mfa: false
auditLog: false       asyncJobs: false
```

### `public-api`
Public APIs with security focus but no compliance overhead.
```
accessibility: false  gdpr: false  iso27001: false  sast: true
preCommitFull: false  iac: false   cicd: full       mfa: true
auditLog: false       asyncJobs: false
```

---

## Stack Overlay Mapping

Based on the tech stack selected, write the corresponding overlay files into CLAUDE.md's "Coding Standards" section.

### Backend stacks
| Stack keyword | Overlay file |
|---|---|
| `node`, `typescript`, `deno`, `bun` | `.claude/rules/stacks/backend-node.md` |
| `php`, `laravel`, `symfony` | `.claude/rules/stacks/backend-php.md` |
| `python`, `fastapi`, `django` | `.claude/rules/stacks/backend-python.md` |
| `java`, `spring`, `springboot` | `.claude/rules/stacks/backend-java.md` |
| `go`, `golang` | `.claude/rules/stacks/backend-golang.md` |
| `coldfusion`, `cfml`, `lucee`, `adobecf` | `.claude/rules/stacks/backend-coldfusion.md` |
| `dotnet`, `csharp`, `c#` | `.claude/rules/stacks/backend-dotnet.md` |

### Frontend stacks
| Stack keyword | Overlay file |
|---|---|
| `react`, `next`, `vite` | `.claude/rules/stacks/frontend-react.md` |
| `vue`, `nuxt` | `.claude/rules/stacks/frontend-vue.md` (create if needed) |

### Rule
Write only the overlays that match the selected stack. Do not reference absent stack files.