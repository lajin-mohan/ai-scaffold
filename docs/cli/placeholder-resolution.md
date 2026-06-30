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
| Project type | `SaaS`, `Internal Tool`, `API`, `Platform` | Yes |
| Owner email | `owner@example.com` | Yes |
| Backend stack | `Laravel + PHP` | Yes |
| Frontend stack | `None`, `React`, `Next.js` | Yes |
| Database | `PostgreSQL 16` | Yes |
| Multi-tenant | `true` or `false` | Yes |
| Compliance scope | `N/A`, `GDPR`, `ISO27001`, `HIPAA`, `SOC2`, `PCI-DSS` | Yes |
| Profile | `generic`, `laravel` | Yes |

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
  "projectType": "Platform",
  "backend": "TBD",
  "frontend": "TBD",
  "database": "TBD",
  "multiTenant": false,
  "complianceScope": "N/A",
  "cicd": "off"
}
```

## Pipeline

1. Resolve the target path.
2. Select a complete profile template.
3. Copy template files into a staging area.
4. Collect bootstrap values.
5. Replace placeholders in every staged text file.
6. Generate `.claude/MEMORY.md` from `.claude/MEMORY.template.md`.
7. Generate `.claude/settings-overrides.json` from `.claude/settings-overrides.template.json`.
8. Validate that no managed text file still contains `{{...}}`.
9. Build the safe file plan.
10. Apply writes, respecting protected files and conflicts.
11. Write `.ai-scaffold.json`.

## Generated Files

These files are generated per project and should not be copied directly from the template:

- `.ai-scaffold.json`
- `.claude/MEMORY.md`
- `.claude/settings-overrides.json`

Tracked template files:

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
- `MEDIUM`: required values were defaulted during `--yes`.
- `MEDIUM`: `.claude/MEMORY.md` is missing.

## Conflict Rules

During `init`, existing application files win by default.

- Existing protected files require explicit confirmation.
- Existing managed files show a diff and allow overwrite, keep, or skip.
- Existing `.claude/` without `.ai-scaffold.json` requires confirmation before writing.
- Files outside the manifest are never deleted.
