# Production Checklist

For every deployment to staging or production. Run through before smoke testing.

---

## Pre-Deploy Checklist

### Config Validation
```
[ ] All required env vars present in target environment (no missing vars at startup)
[ ] Config module validates and throws on missing required vars — fail fast
[ ] No hardcoded credentials or connection strings (check .env.example vs actual env)
[ ] Database connection string uses credentials from secret manager, not literal
[ ] Feature flags in target env match expected values for this release
```

### Structured Logging
```
[ ] All services use structured JSON logging (not console.log/print statements)
[ ] Log fields include: timestamp, level, service, trace_id, tenant_id (masked), user_id (if authenticated)
[ ] Sensitive fields (PII) never appear in logs — verify with grep before deploy
[ ] Error logs include error code, context, and stack trace (not message text alone)
[ ] Log level configured per environment (DEBUG in staging, INFO in production)
```

### Health Check Endpoint
```
[ ] GET /health returns 200 with JSON: { status: 'ok', version: '<app-version>', uptime: <seconds> }
[ ] GET /health/db checks DB connectivity (if database is a dependency)
[ ] GET /health/ready returns 503 if the service is starting up or draining
[ ] Health endpoints are unauthenticated (they are for load balancers and orchestrators)
[ ] Health check documented in the service's README
```

### Error Envelope
```
[ ] All API responses use the standard envelope: { data, meta, error }
[ ] 4xx errors never expose stack traces, SQL errors, or internal file paths
[ ] 5xx errors return a correlation ID (shown to client, logged server-side with full context)
[ ] Error responses include a machine-readable code: VALIDATION_FAILED, NOT_FOUND, INTERNAL_ERROR, etc.
[ ] No raw HTML in JSON error responses
```

### Database Migrations
```
[ ] Migration tested in staging environment before production deploy
[ ] Migration is reversible (has a DOWN section that restores the previous state)
[ ] Large table alterations use CREATE INDEX CONCURRENTLY (no table locks in production)
[ ] Soft-delete pattern used for business entities (no hard DELETE of user data)
[ ] If adding a NOT NULL column, all existing rows must have a default or the column is pre-populated
[ ] Migration script reviewed for performance impact on large tables
```

### Rollback Plan
```
[ ] Previous version docker image / deployment artifact is available
[ ] Database migrations are backwards-compatible (old code can run against new schema)
[ ] Rollback command documented: how to revert to previous version in < 5 minutes
[ ] Rollback does NOT require a database migration rollback (if avoidable)
[ ] If rollback requires a DB rollback, the rollback migration is tested
[ ] On-call contact for this deploy documented
```

---

## Audit Log Checklist

**Audit logs are mandatory for production SaaS.** The audit service is a plug-and-play component:

### Using the AuditService
```typescript
import { AuditService } from './services/audit.service.js'

// Inject as a dependency — never instantiate inside a service
class ApplicationService {
  constructor(
    private readonly repo: ApplicationRepository,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateApplicationInput, actor: User) {
    const created = await this.repo.create(input)
    // Record in the same transaction — atomic
    await this.audit.record({
      tenantId: input.tenantId,
      actorId: actor.id,
      action: 'application.created',
      resourceType: 'application',
      resourceId: created.id,
      before: null,
      after: { status: created.status, version: created.version },
      metadata: { ip: actor.ip, userAgent: actor.userAgent },
    })
    return created
  }
}
```

### What Must Be Audited
- Every state-changing operation (create, update, delete, status transition)
- Auth events (login, logout, permission changes, session invalidation)
- Admin actions (role changes, tenant config changes, data exports)
- Any operation that modifies another user's data

### What Must NOT Be Audited
- Read-only operations (list, search, view)
- Sensitive field values (password, token, secret — these are masked by `maskSensitive()`)

### Audit Log Table
See `apps/api/migrations/0002_create_audit_logs.sql`:
- Immutable: no UPDATE/DELETE path
- Composite (tenant_id, resource_id) index covers all lookup patterns
- before_state and after_state stored as JSONB
- Sensitive fields masked before storage

---

## Post-Deploy Smoke Test

Run these immediately after deploy, before handing off:

```
[ ] Health endpoint returns 200
[ ] One authenticated request succeeds (login + API call)
[ ] One write operation succeeds (create or update)
[ ] Error request returns the correct 4xx code with no internal details exposed
[ ] Logs appear in the logging platform with correct structured fields
[ ] No new ERROR-level logs from the deployed version
```

---

## Quick Reference Card

| Check | Pass criteria |
|---|---|
| Config | App starts without missing-var crash |
| Logging | JSON output, no PII in any log line |
| Health | `/health` → 200, `/health/ready` → 200 when ready |
| Errors | 4xx = no internals, 5xx = correlation ID |
| Migration | Tested in staging, reversible, no lock |
| Rollback | Previous image available, tested |

---

## Reference Files

- Audit service: `apps/api/src/services/audit.service.ts`
- Audit migration: `apps/api/migrations/0002_create_audit_logs.sql`
- Error envelope spec: `.claude/rules/api-standards.md` §Response Envelope
- Structured logging example: `apps/api/src/middleware/error-handler.ts`