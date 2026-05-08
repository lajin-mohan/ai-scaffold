# apps/api/src — layered architecture reference

Reading order for any AI tool generating code in this directory:

1. **`routes/`** — HTTP boundary. Validates input, authorises, calls a service, formats response. No business logic, no SQL.
2. **`services/`** — All business logic. Calls repositories. Triggers side effects (jobs, audit log) only after the primary operation succeeds.
3. **`repositories/`** — All SQL for one entity type. Returns domain objects from `packages/domain`. Every query scoped by `tenantId`.
4. **`packages/domain` (external)** — Pure entities, value objects, business rules. No infrastructure dependencies.

Existing example flow:
- [applications.route.ts](./routes/applications.route.ts) → [applications.service.ts](./services/applications.service.ts) → [applications.repository.ts](./repositories/applications.repository.ts) → [@app/domain Application entity](../../../packages/domain/src/application.ts)

### Hard rules

- Imports flow downward only: routes import services, services import repositories, repositories import domain. **Never sideways or upward.**
- No SQL outside `repositories/`.
- No `req` / `res` / Express types outside `routes/`.
- No I/O inside `packages/domain/`.
- Every write endpoint produces an audit log entry after success.
- Every list endpoint paginates (no unbounded queries).
- Every query in a multi-tenant context includes `tenant_id` in the WHERE clause — enforced at the repository, not the service or route.

### When `/start-task` runs

`/start-task` reads this file as part of its Phase 1 context priming. The plan it produces will reference these layers explicitly.

For the full architecture rules see [.claude/rules/coding-standards.md](../../../.claude/rules/coding-standards.md).
