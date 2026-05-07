# Coding Standards

These rules apply to all code written in this project regardless of language or layer. They are non-negotiable.

---

## Universal Rules

### Correctness
- **The spec is the contract.** If your implementation differs from the approved spec, update the spec first, then the code.
- **No partial implementations.** A half-finished feature is worse than no feature — it misleads the team and breaks trust.
- **Handle all error paths.** Every function that can fail must have its failure handled at the appropriate boundary.
- **No silent failures.** If something goes wrong, it must be observable — logged, thrown, or returned as an error value.

### Readability
- **Name for what it IS, not what it does.** `userRepository` not `getUserStuff`. `applicationStatus` not `appSt`.
- **Functions do one thing.** If you need "and" to describe a function, split it.
- **No magic numbers.** Extract constants with meaningful names.
- **No abbreviations** unless universally understood (`id`, `url`, `api`, `db`).
- **Comments only for non-obvious WHY.** Never explain what the code says — explain a constraint, a workaround, or a non-obvious invariant.

### Structure
- **Thin controllers/handlers.** Route handlers validate input, call a service, return a response. Nothing more.
- **Services own business logic.** No database calls in services — delegate to repositories.
- **Repositories own data access.** Return domain objects, not raw query results.
- **Domain entities are pure.** No infrastructure dependencies in entities or value objects.

### Dependencies
- **No circular dependencies.** Domain ← Services ← Repositories ← Routes. Never backwards.
- **No shared mutable state.** No global variables, no module-level caches without explicit lifecycle.
- **Inject dependencies, don't import them.** Makes testing and replacement possible.

---

## SOLID Principles

Apply these to every class, module, and service. Violations are WARN in code review; repeated violations in a critical path are BLOCK.

### Single Responsibility
- Every class or module has exactly one reason to change.
- A service that sends emails AND updates the database AND formats a PDF violates SRP — split it.
- Test: if you need "and" to describe what a class does, split it.

### Open / Closed
- Extend behaviour without modifying existing code.
- Use strategy patterns, plugins, or configuration instead of adding `if/else` branches to stable code.
- New business rules = new classes, not new conditionals in existing ones.

### Liskov Substitution
- Subtypes must be fully substitutable for their base types without changing program correctness.
- If you override a method and throw an exception the base never throws, that is a violation.
- Prefer composition over inheritance when substitutability is unclear.

### Interface Segregation
- Clients should not depend on methods they don't use.
- Split large interfaces into role-specific ones: `Readable`, `Writable`, `Searchable` over one fat `Repository`.
- This applies to TypeScript interfaces, Python protocols, PHP contracts, etc.

### Dependency Inversion
- High-level modules depend on abstractions, not on concrete implementations.
- Services depend on a repository *interface*, not the concrete database class.
- This is what makes unit testing possible — mock the abstraction, not the implementation.

---

## Dependency Injection

- **Never instantiate dependencies inside a class.** Receive them via constructor, method parameter, or DI container.
- **Depend on interfaces, inject implementations.** The service does not know whether it's talking to PostgreSQL, Redis, or a test double.
- **DI container configuration lives in one place** — a dedicated `container.ts`, `AppServiceProvider`, or `dependencies.py`. Not scattered across files.
- **Don't use service locators** (`container.get(...)` inside business logic). That hides dependencies and makes testing harder.
- **Test doubles are the proof.** If you can't swap in a mock without changing the class, the DI is wrong.

```typescript
// CORRECT — dependency injected via constructor
class ApplicationService {
  constructor(
    private readonly repo: ApplicationRepository,
    private readonly mailer: Mailer
  ) {}
}

// WRONG — concrete dependency created inside
class ApplicationService {
  private repo = new PostgresApplicationRepository()
}
```

---

## Configuration and Constants

Non-obvious values must never appear as literals in code. Extract them so the codebase communicates intent and changes require one edit, not a grep.

### What must be a named constant or config value
- Any number that is not `0`, `1`, or `-1`
- Any string used as a key, code, status, or identifier (not user-facing text)
- Any timeout, retry count, limit, threshold, or TTL
- Any URL, path, or hostname
- Any feature behaviour that may need to change per environment

```typescript
// WRONG
if (attempts > 3) { ... }
await delay(5000)
const url = 'https://api.example.com/v1'

// CORRECT
const MAX_LOGIN_ATTEMPTS = 3
const AUTH_RETRY_DELAY_MS = 5_000
const API_BASE_URL = config.get('API_BASE_URL')
```

### Where constants live
- **Business rule constants** (limits, thresholds, status values): `packages/shared/constants/`
- **Infrastructure config** (URLs, ports, timeouts): environment variables via `config` module — never hardcoded
- **Enums / status values**: typed enum or `as const` object in the domain layer, not plain strings scattered across files

### Environment variables
- All env vars declared in `.env.example` with a description comment
- Access only through a validated config module — never `process.env.X` directly in business logic
- Config module validates and throws at startup if required vars are missing — fail fast, not silently

---

## Code Reusability

### DRY — Don't Repeat Yourself
- If the same logic appears in two places, extract it on the second occurrence, not the third.
- Duplication that differs subtly is worse than duplication that is identical — it diverges silently over time.
- Exception: test setup code may be duplicated if sharing it would couple unrelated tests.

### Where shared code lives
```
packages/
  shared/
    utils/       ← pure functions with no side effects (formatters, validators, parsers)
    constants/   ← app-wide enums and named values
    types/       ← shared TypeScript types and interfaces
  domain/        ← business logic shared across services
```

- **Never copy a utility across `apps/`.** Put it in `packages/shared/` and import it.
- **Never put shared logic in an app** — other apps can't depend on it without creating a circular dependency.

### Composition over inheritance
- Prefer composing behaviours from small, focused pieces over deep class hierarchies.
- Hierarchies deeper than two levels are a smell — flatten or extract interfaces.
- Mixins and multiple inheritance are banned — they create invisible coupling.

### Reuse rules
- A function reused in three or more places must have a unit test.
- Shared utilities must be pure (no side effects, no I/O) — functions with side effects belong in services.
- When extracting shared code, name it for what it IS in the domain, not how it is used.

---

## SOLID + Architecture: Module Boundaries

- **Each layer imports only from the layer below it.** Routes → Services → Repositories → Domain. Never sideways, never upward.
- **No cross-feature imports at the same layer.** `users.service` must not import from `applications.service`. Share via domain or an explicit shared module.
- **Barrel exports (`index.ts`) at module boundaries.** Internal structure is private; the public API is what the barrel exports.
- **Version shared packages.** When `packages/shared` changes in a breaking way, bump its version so consuming apps know to update.

---

## Linting and Static Analysis

Linting is not a style preference — it is the first line of automated correctness checking. All lint rules must pass before any code is committed or reviewed.

### Required checks (adapt commands to your stack)

| Check | Purpose | Minimum gate |
|---|---|---|
| **Linter** (ESLint / Ruff / PHP CS Fixer) | Enforce coding rules, catch common bugs | Zero errors |
| **Type checker** (TypeScript / Pyright / PHPStan) | Catch type mismatches at compile time | Zero errors |
| **Dependency audit** (npm audit / pip-audit / composer audit) | Detect known CVEs | No HIGH or CRITICAL |
| **Dead code / unused imports** | Keep codebase clean | Zero warnings allowed in CI |
| **Complexity check** (optional) | Flag cyclomatic complexity > 10 | Warning in CI |

### Rules
- **Linting runs in CI and blocks merge.** A PR with lint errors does not merge — ever.
- **No lint disable comments without a reason.** `// eslint-disable-next-line` must have an inline comment explaining why.
- **Fix the root cause, don't suppress.** Suppressing a lint rule is a last resort, not a convenience.
- **The linter config is version-controlled** (`.eslintrc`, `pyproject.toml`, `phpcs.xml`) — not per-developer.
- **New lint rules are introduced with a cleanup commit** — don't add a rule that immediately fails CI without fixing existing violations first.

### Pre-commit enforcement
Configure the pre-commit hook (`.claude/hooks/pre-review.sh`) to run lint and typecheck before any review. If it isn't configured, lint failures will only be caught in CI — too late.

---

## Backend Standards

### API Handlers
```
handler(request):
  validate(request.body)           // throw 400 on invalid
  authorize(request.user, action)  // throw 403 on denied
  result = service.doThing(data)   // business logic elsewhere
  return respond(result)           // format and return
```

### Services
- Receive validated, authorized input — don't re-validate
- Contain all business logic and workflow orchestration
- Delegate all persistence to repositories
- Trigger side effects (emails, jobs) only after confirming the primary operation succeeded

### Repositories
- Accept and return domain types
- Scope every query by `tenant_id` — no exceptions *(SaaS/multi-tenant only — omit for single-tenant systems)*
- Use parameterized queries — no string interpolation
- Handle not-found as a returned null/undefined, not a thrown error (unless specified)

### Error Handling
- Throw typed errors with machine-readable codes
- Catch only at boundaries (handlers, job runners, script entry points)
- Log with context: `{ error, tenant_id, user_id, operation }`
- Never expose stack traces or internal messages to the client

---

## Frontend Standards

### Component Structure
- One component per file
- Props typed with interfaces, no `any`
- No business logic — components display and capture input only
- No direct API calls — use a data-fetching layer or store action
- All loading/error/empty states specified and implemented

### State Management
- Local state for UI state (open/closed, focused, etc.)
- Shared state for application data (user, tenant, permissions)
- Server state via a caching layer (React Query, SWR, or equivalent)
- No derived state stored — compute it from source

### Styling
- Design system tokens only — no hardcoded colors or spacing
- Mobile-first: write base styles for 390px, add breakpoints upward
- No inline styles except for genuinely dynamic values
- No `!important` — fix specificity instead

---

## Database Standards

- Schema changes via migrations only — never alter production directly
- Every migration must be reversible (include a `down` function)
- `NOT NULL` as default — nullable only with documented reason
- `tenant_id UUID NOT NULL` on every table that holds tenant data *(SaaS/multi-tenant only)*
- Indexes on all foreign keys and commonly filtered columns
- Soft delete: `deleted_at TIMESTAMPTZ` — no hard deletes of business entities
- Timestamps: `created_at` and `updated_at` on every table

---

## Testing Standards

Full rules: `.claude/rules/testing-rules.md`

- Unit tests for pure business logic (services, domain rules)
- Integration tests for database operations (real DB, not mocks)
- E2E tests for critical user flows
- Every test must be independently runnable — no shared state between tests
- Test names describe the scenario: `"returns 403 when user lacks permission"`
