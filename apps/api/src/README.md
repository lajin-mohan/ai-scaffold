# apps/api/src — layered architecture reference

Reading order for any AI tool generating code in this directory:

1. **`routes/`** — HTTP boundary. Validates input, authorises, calls a service, formats response. Catches thrown errors and pipes them through `mapErrorToEnvelope`. No business logic, no SQL.
2. **`services/`** — All business logic. Calls repositories. Wraps multi-step DB writes in a single `db.transaction(...)`. Idempotency check happens at the top of write methods. Throws typed errors that extend `AppError`.
3. **`repositories/`** — All SQL for one entity type. Returns domain objects from `packages/domain`. Every query scoped by `tenantId`. Every write method accepts an optional `tx?: Transaction` parameter so the service can compose a transaction.
4. **`middleware/`** — Cross-cutting infrastructure: error handler, auth guard, request ID, structured logging.
5. **`packages/domain` (external)** — Pure entities, value objects, business rules. No infrastructure dependencies.

Existing example flow:
- [applications.route.ts](./routes/applications.route.ts) → [applications.service.ts](./services/applications.service.ts) → [applications.repository.ts](./repositories/applications.repository.ts) → [@app/domain Application entity](../../../packages/domain/src/application.ts)
- Error mapping: [middleware/error-handler.ts](./middleware/error-handler.ts) (`AppError` base + `mapErrorToEnvelope`)

### Hard rules

- Imports flow downward only: routes import services, services import repositories, repositories import domain. **Never sideways or upward.**
- No SQL outside `repositories/`.
- No `req` / `res` / Express types outside `routes/`.
- No I/O inside `packages/domain/`.
- Every write endpoint produces an audit log entry **inside** the same transaction as the primary write.
- Every write endpoint accepts an `Idempotency-Key` header and forwards it to the service. The service checks the `idempotency_keys` table at the top of the operation and returns the cached response on replay. (See [api-standards.md](../../../.claude/rules/api-standards.md) for the contract.)
- Every list endpoint paginates (no unbounded queries).
- Every query in a multi-tenant context includes `tenant_id` in the WHERE clause — enforced at the repository, not the service or route.
- Errors thrown by services extend `AppError` (defined in [middleware/error-handler.ts](./middleware/error-handler.ts)). Routes catch and pipe through `mapErrorToEnvelope`. Unknown errors map to `INTERNAL_ERROR` 500 without leaking internals.

### Side effects and durability

The example service wraps `insert + audit + idempotency cache` in a single transaction. **Job enqueue happens AFTER the transaction commits** — this is best-effort delivery, suitable for non-critical side effects.

For side effects that must not be lost (welcome emails, partner webhooks, payment events), implement the **transactional outbox pattern**: insert an `outbox_events` row inside the same transaction, run a separate worker that drains the outbox into the queue. Full pattern: [docs/architecture/patterns/transactional-outbox.md](../../../docs/architecture/patterns/transactional-outbox.md).

### Idempotency-Key flow (write endpoints)

```
Client                         Route                  Service                  IdempotencyStore
  |  POST /applications           |                       |                            |
  |  Idempotency-Key: <uuid v4>   |                       |                            |
  |------------------------------>|                       |                            |
  |                               | validate header       |                            |
  |                               | hash request body     |                            |
  |                               |---------------------->| service.create(input,      |
  |                               |                       |   { idempotencyKey, ... }) |
  |                               |                       |--------------------------->| get(key, tenant, endpoint)
  |                               |                       |                            |
  |                               |                       |  cache hit -> return cached body
  |                               |                       |  cache miss -> proceed
  |                               |                       |                            |
  |                               |                       |  begin transaction         |
  |                               |                       |    repo.create(..., tx)    |
  |                               |                       |    audit.record(..., tx)   |
  |                               |                       |    idempotency.set(        |
  |                               |                       |      key, tenant, endpoint,|
  |                               |                       |      hash, response, tx)   |
  |                               |                       |  commit                    |
  |                               |                       |                            |
  |                               |                       |  jobs.enqueue(...)         |  (best-effort, post-commit)
  |  201 Created                  |<----------------------|                            |
  |<------------------------------|                       |                            |
```

Replays of the same `Idempotency-Key` within the TTL (24h) return the cached 201 response without creating a new application or sending a duplicate confirmation email.

### When `/start-task` runs

`/start-task` reads this file as part of its Phase 1 context priming. The plan it produces will reference these layers explicitly.

For the full architecture rules see [.claude/rules/coding-standards.md](../../../.claude/rules/coding-standards.md). For idempotency rules see [.claude/rules/api-standards.md](../../../.claude/rules/api-standards.md).
