# Command: /settings

View and update project feature flags. Settings are stored in `.claude/settings-overrides.json` (generated, gitignored). Edit `.claude/settings-overrides.template.json` to change defaults for future projects. Local overrides go in `.claude/settings.local.json` (gitignored).

## Usage

```
/settings                     # Show current settings summary
/settings --list              # Show all feature flags with current + default values
/settings enable <feature>    # Enable a feature (sets to true)
/settings disable <feature>   # Disable a feature (sets to false)
/settings set <feature> <value>  # Set to a specific value (e.g. "minimal", "full")
/settings reset <feature>     # Reset to default for current project type
/settings project             # Show project identity section
/settings --help              # Show this help
```

## Examples

```
/settings                     # Shows summary: project type, enabled features
/settings --list             # Shows table of all features with current vs default
/settings enable sast         # Enables SAST (Semgrep) security scanning
/settings enable accessibility  # Enable WCAG 2.1 AA compliance
/settings disable iso27001   # Disable ISO 27001 controls
/settings set cicd full       # Set CI/CD to full pipeline
/settings set iac deferred    # Set IaC to deferred (not set up yet)
/settings reset auditLog     # Reset auditLog to project-type default
```

## Features Reference

| Feature | Type | Values | Description |
|---|---|---|---|
| `accessibility` | boolean | `true` / `false` | WCAG 2.1 AA compliance (axe-core testing, screen reader support) |
| `gdpr` | boolean | `true` / `false` | GDPR data subject rights, lawful basis documentation |
| `iso27001` | boolean | `true` / `false` | ISO 27001 access control, encryption, logging requirements |
| `sast` | boolean | `true` / `false` | SAST scanning (Semgrep) in CI — SQL injection, hardcoded secrets |
| `preCommitFull` | boolean | `true` / `false` | Run lint + typecheck + tests in pre-commit hook |
| `iac` | string | `true` / `false` / `"deferred"` | Infrastructure as Code setup (Terraform/Pulumi) |
| `cicd` | string | `"minimal"` / `"full"` | CI/CD pipeline complexity |
| `mfa` | boolean | `true` / `false` | Multi-factor authentication for privileged access |
| `auditLog` | boolean | `true` / `false` | Audit trail service for all state changes |
| `asyncJobs` | boolean | `true` / `false` | Background job system (pg-boss, BullMQ, etc.) |

## Project Types

| Type | Default behaviour |
|---|---|
| `mvp` | All features off by default. Enable as needed. |
| `production-saas` | Compliance (GDPR, ISO), security (SAST, MFA), audit on by default. |
| `internal-tool` | preCommitFull on; compliance and audit off by default. |
| `public-api` | SAST, MFA, full CI/CD on by default; compliance off. |

## How Commands Use These Settings

Commands read from `.claude/settings-overrides.json` and `.claude/settings.local.json`:

- `/review` — skips `qa-reviewer` checks for disabled compliance features
- `/what-next` — shows disabled features as "disabled by project settings"
- `/create-brd` — includes/excludes GDPR/ISO compliance sections based on flags
- `/architecture-review` — activates/inactivates compliance rules based on flags

## Local Overrides

Create `.claude/settings.local.json` to experiment locally without affecting the team:

```json
{
  "role": "dev",
  "features": {
    "preCommitFull": false,
    "auditLog": true
  }
}
```

This file is gitignored and never committed. Shared team settings stay in `settings-overrides.json`.

## Verification

After changing settings, run `/what-next` to see updated stage recommendations.

---

## Notes

- Changes to `settings-overrides.json` affect the entire team — commit and PR review required.
- Changes to `settings.local.json` are local only — no git tracking.
- `/bootstrap --check` reports any features left as `{{TBD}}`.
- To change project type, edit `settings-overrides.json` directly (no command for this — it's a deliberate choice).
