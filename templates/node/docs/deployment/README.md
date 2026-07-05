# Deployment Documentation

Runbooks, deployment checklists, and environment configuration.

## Structure

```
deployment/
├── README.md
├── runbook.md               ← Main deployment runbook
├── rollback-procedure.md    ← How to roll back any release
├── environment-config.md    ← Env vars per environment (no secrets)
└── {{release}}-notes.md     ← Per-release notes and post-deploy checks
```

## Deployment Process

1. Run `/deployment-review` — get go/no-go
2. Deploy to staging — smoke test
3. Get QA sign-off on staging
4. Deploy to production (manual approval gate in CI)
5. Smoke test in production
6. Record deployment in release notes

## Environment Config

Document required environment variables (not values) in `environment-config.md`:

```
DATABASE_URL         — PostgreSQL connection string
REDIS_URL            — Redis connection string (if used)
SESSION_SECRET       — Random 32-byte secret
NODE_ENV             — production / staging / development
PORT                 — Application port
```

Actual values in: AWS Secrets Manager / HashiCorp Vault / equivalent.

## Runbook Template

See `.claude/agents/devops-engineer.md` for runbook format.
