# Placeholder Resolution

## Purpose

`create` and `init` must install a usable scaffold, not a directory full of unresolved `{{PLACEHOLDER}}` tokens. The CLI resolves placeholders before files reach the target project.

## Inputs

The CLI must collect these values through prompts or flags:

| Value | Example | Required |
|---|---|---|
| Project name | `billing-api` | Yes |
| Display name | `Billing API` | Yes |
| Purpose | `Subscription billing service` | Yes |
| Project type/kind | `api`, `web-app`, `full-stack`, `library`, `cli`, `mobile`, `infra`, `data`, `internal-tool`, `saas` | Yes |
| Lifecycle stage | `discovery`, `active-development`, `production`, `maintenance`, `legacy-modernization` | Yes |
| Owner email | `owner@example.com` | Yes |
| Backend stack | `Laravel + PHP` | Yes |
| Frontend stack | `none`, `react`, `nextjs`, `vue`, `nuxt`, `flutter`, `other` | Yes |
| Database | `PostgreSQL 16` | Yes |
| Multi-tenant | `true` or `false` | Yes |
| Data sensitivity | `public`, `internal`, `confidential`, `regulated` | Yes |
| Compliance scope | `[]`, `["GDPR"]`, `["GDPR", "SOC2"]` | Yes |
| Requirements source | `existing-docs`, `create-later`, `create-now` | Yes |
| Requirements path | `docs/requirements/brd.md` or empty | Yes |
| Profile | `generic`, `node`, `laravel` | Yes |

Optional values may use defaults:

- Cache or queue
- Auth strategy
- Email provider
- Storage
- Cloud provider
- IaC tool
- CI/CD platform
- Project management tool
- First epic name

## Non-Interactive Mode

`--yes` allows non-interactive installs.

Rules:

- Explicit flags always win.
- Missing required values receive conservative defaults.
- Defaults must be recorded in `.ai-scaffold.json` under `defaultedValues`.
- `doctor` should warn when important values were defaulted.

Suggested conservative defaults:

```json
{
  "projectType": "saas",
  "lifecycleStage": "active-development",
  "backend": "none",
  "frontend": "none",
  "database": "none",
  "multiTenant": false,
  "dataSensitivity": "internal",
  "complianceScope": [],
  "requirementsSource": "create-later"
}
```

Select prompts must use explicit `{ "title": "...", "value": "..." }`
choices. Do not pass plain string choices to `prompts`; plain strings can be
stored as numeric indexes, which makes generated project context useless.

## Pipeline

1. Resolve the target path.
2. Select a complete profile template.
3. Copy template files into a staging area.
4. Collect bootstrap values.
5. Replace placeholders in every staged text file.
6. Generate `README.md` from `README.template.md`.
7. Generate `.claude/MEMORY.md` from `.claude/MEMORY.template.md`.
8. Generate `.claude/settings-overrides.json` from `.claude/settings-overrides.template.json`.
9. Validate that no managed text file still contains unresolved project identity placeholders.
10. Build the safe file plan.
11. Apply writes, respecting protected files and conflicts.
12. Write `.ai-scaffold.json`.

## Generated Files

These files are generated per project and should not be copied directly from the template:

- `.ai-scaffold.json`
- `.ai-scaffold/README.md`
- `.ai-scaffold/context.md`
- `README.md`
- `.claude/MEMORY.md`
- `.claude/settings-overrides.json`

Tracked template files:

- `README.template.md`
- `.claude/MEMORY.template.md`
- `.claude/settings-overrides.template.json`

## Manifest Fields

`.ai-scaffold.json` must include bootstrap state:

```json
{
  "version": "1.0.0",
  "profile": "laravel",
  "bootstrapped": true,
  "bootstrapCompletedAt": "2026-06-29",
  "installedAt": "2026-06-29",
  "updatedAt": "2026-06-29",
  "source": "ai-scaffold",
  "project": {
    "slug": "billing-api",
    "displayName": "Billing API",
    "purpose": "Subscription billing service",
    "kind": "api",
    "lifecycleStage": "active-development",
    "owner": "owner@example.com"
  },
  "stack": {
    "primary": "Node.js",
    "backend": "Node.js",
    "frontend": "none",
    "database": "PostgreSQL"
  },
  "risk": {
    "multiTenant": false,
    "dataSensitivity": "internal",
    "complianceScope": []
  },
  "requirements": {
    "source": "existing-docs",
    "paths": ["docs/requirements/brd.md"]
  },
  "defaultedValues": [],
  "managedFiles": []
}
```

## Doctor Checks

`doctor` must report:

- `BLOCK`: `bootstrapped` is false.
- `BLOCK`: managed files still contain `{{...}}`.
- `HIGH`: `.claude/settings-overrides.json` is missing.
- `HIGH`: `.claude/settings-overrides.json` contains placeholder values.
- `MEDIUM`: setup context contains numeric prompt-choice values.
- `MEDIUM`: required values were defaulted during `--yes`.
- `MEDIUM`: `.claude/MEMORY.md` is missing.

## Conflict Rules

During `init`, existing application files win by default.

- Existing protected files require explicit confirmation.
- Existing managed files show a diff and allow overwrite, keep, or skip.
- Existing `.claude/` without `.ai-scaffold.json` requires confirmation before writing.
- Files outside the manifest are never deleted.
