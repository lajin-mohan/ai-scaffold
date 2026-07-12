---
description: Deployment readiness checklist, migration plan, smoke tests, rollback procedure
---

# Command: /deployment-review

Reviews deployment readiness for a feature or release. Invokes `devops-engineer` and `qa-reviewer` agents. Produces a go/no-go recommendation with a smoke test plan.

## Usage

```
/deployment-review                          # Review current branch for deployment readiness
/deployment-review --env staging            # Review for staging deployment
/deployment-review --env production         # Full production release review
/deployment-review --release v1.2.0         # Named release review
```

## Process

1. **Inventory changes** — list all merged features, migrations, and config changes
2. **Check CI status** — all gates must be green
3. **Review migration safety** — are pending migrations forward-compatible?
4. **Assess rollback complexity** — can this be rolled back in <15 minutes?
5. **Produce smoke test plan** — critical paths to verify after deployment
6. **Check runbook** — is there a deployment runbook? Is it current?
7. **Go/No-Go decision** — with explicit blocking conditions

## Feature Flags (Settings)

This command reads `.claude/settings-overrides.json`. Sections are shown/hidden based on active features:

| Feature flag | Effect on deployment review |
|---|---|
| `iac: true` | IaC/repo setup checks included; infrastructure migration path reviewed |
| `iac: deferred` | IaC section marked as "deferred — not reviewed" |
| `auditLog: true` | Audit log migration compatibility checked |
| `asyncJobs: true` | Background job queue migration reviewed |
| `gdpr: true` | Data retention and erasure pipeline verified |
| `mfa: true` | MFA configuration rollout checked |

## Deployment Checklist

### Pre-Deployment
- [ ] All CI gates passing (lint, typecheck, tests, build)
- [ ] Security review completed for any auth/data changes
- [ ] All BLOCK code review findings resolved
- [ ] QA sign-off recorded
- [ ] Database migrations reviewed — additive only, no destructive changes
- [ ] Environment variables documented and provisioned in target env
- [ ] Feature flags configured (if applicable)
- [ ] Rollback procedure documented

### Deployment
- [ ] Deploy to staging first — always
- [ ] Smoke test on staging passes
- [ ] Migration runs successfully on staging
- [ ] No unexpected errors in logs within 10 minutes of staging deploy
- [ ] Performance metrics stable (no latency spike)

### Post-Deployment (Production)
- [ ] Smoke test on production passes
- [ ] Error rate within baseline for 15 minutes
- [ ] Key business flows verified manually
- [ ] Stakeholder notified

## Output Format

```
## Deployment Review — [Release / Feature Name]
Target Environment: [staging / production]
Date: [date]

### Go/No-Go: GO ✅ / NO-GO 🔴

### Blockers (No-Go Conditions)
- [Issue that prevents deployment]

### Warnings (Deploy with Caution)
- [Issue to monitor closely]

### Migration Plan
- [Migration file] — [what it does] — [reversible? Y/N]

### Smoke Test Plan
| Step | Action | Expected Result |
|---|---|---|
| 1 | Login as [role] | Dashboard loads |
| 2 | [Key action] | [Expected outcome] |

### Rollback Procedure
1. [Step]
2. [Step]
Estimated rollback time: [n] minutes

### Deployment Window
Recommended: [time window and reason]
```
