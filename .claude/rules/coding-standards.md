# Coding Standards

These rules apply to **all code** regardless of language or framework. Stack-specific rules live in `.claude/rules/stacks/`. Read this file first, then the relevant stack overlay(s).

---

## Hard Gates

These are non-negotiable on every project. Violations are BLOCK in review.

- Parameterized queries — no string interpolation in SQL
- Input validated at every API boundary
- No secrets in code — use environment variables
- No PII in logs — mask or omit
- Tests required — happy path + edge cases + auth/tenant isolation
- Lint + typecheck pass before any review (using the project's configured tools)
- `tenant_id` scoped on every query *(multi-tenant projects only)*
- No partial implementations shipped

---

## Correctness

- **The spec is the contract.** Update the spec first, then the code. If they diverge, that's a bug.
- **No half-finished features.** A stub that ships is worse than nothing — it misleads the team.
- **Handle every failure path.** Every function that can fail must have its failure handled at the appropriate boundary.
- **No silent failures.** If something goes wrong, it must be observable — logged, thrown, or returned as an error.
- **Errors are typed where the language supports it.** Use typed exceptions or result types rather than plain strings.

---

## Readability

- **Name for what it IS, not what it does.** `userRepository` not `getUserStuff`. `pendingApplications` not `apps`.
- **Functions do one thing.** Split if you need "and" to describe it.
- **No magic numbers.** Extract constants with meaningful names.
- **No abbreviations** unless universally understood (`id`, `url`, `api`, `db`).
- **Comments only for non-obvious WHY.** Never explain what the code says. Explain a constraint, a workaround, or a non-obvious invariant.
- **One concept per line.** Avoid chained ternaries, deeply nested expressions, and one-liners that require a double-take.

---

## Layer Architecture

Every layer has a single responsibility. Dependencies flow in one direction only.

```
Routes / Handlers → Services → Repositories → Domain / Entities
                    (business   (data access   (pure logic,
                     logic)      delegation)   no infra)
```

### Routes / Handlers
- Validate input
- Check authorization
- Call a service
- Format and return the response
- **Nothing else.**

### Services
- Own all business logic and workflow orchestration
- Receive validated, authorized input — don't re-validate
- Delegate persistence to repositories
- Trigger side effects (email, jobs) only after the primary operation succeeds
- **No database calls.** Delegate to repositories.

### Repositories
- Own all data access
- Accept and return domain types — not raw query results
- Scope every query by `tenant_id` *(multi-tenant projects)*
- Use parameterized queries only
- Handle not-found as `null` / empty collection — not a thrown error (unless specified)

### Domain / Entities
- Pure business logic and invariants
- No infrastructure dependencies (no DB calls, no HTTP, no file I/O)
- No awareness of how they are stored

---

## Dependency Injection

- **Never instantiate dependencies inside a class.** Receive them via constructor, method parameter, or DI container.
- **Depend on abstractions, inject implementations.** The consumer does not know whether it's using PostgreSQL, MySQL, or a test double.
- **DI container configuration lives in one place** — not scattered across files.
- **Don't use service locators inside business logic.** That hides dependencies and makes testing harder.
- **Test doubles are the proof.** If you can't swap in a mock without changing the class, the DI is wrong.

---

## Configuration and Constants

Non-obvious values must never appear as literals. Extract them so the codebase communicates intent and changes require one edit.

### What must be a named constant
- Any number that is not `0`, `1`, or `-1`
- Any string used as a key, code, status, or identifier
- Any timeout, retry count, limit, threshold, or TTL
- Any URL, path, or hostname
- Any behaviour that may need to change per environment

### Where constants live
- **Business rule constants** (limits, thresholds, status values): `packages/shared/constants/`
- **Infrastructure config** (URLs, ports, timeouts): environment variables via a validated config module
- **Status / enum values**: typed enums or `as const` objects in the domain layer — not plain strings scattered across files

### Environment variables
- All env vars declared in `.env.example` with a description comment
- Access only through a validated config module — never raw environment reads in business logic
- Config module throws at startup if required vars are missing — fail fast

---

## Code Reusability

### DRY — Don't Repeat Yourself
- **Extract when duplication is stable and the abstraction is clearer than repetition.**
- Duplication that differs subtly is worse than identical duplication — it diverges silently.
- **Premature abstraction is more expensive than reasonable duplication.** If you're not sure, wait for the third occurrence.
- Test setup code may be duplicated if sharing it would couple unrelated tests.

### Where shared code lives

```
packages/
  shared/
    utils/       ← pure functions (formatters, validators, parsers)
    constants/   ← enums, named values, status codes
    types/       ← shared types and interfaces
  domain/        ← business logic shared across services
```

- **Never copy a utility across `apps/`.** Put it in `packages/shared/` and import it.
- **Never put shared logic in an app** — other apps can't depend on it without circular dependency risk.
- A function reused in three or more places must have a unit test.
- Shared utilities must be pure — no side effects, no I/O.

### Composition over inheritance
- Prefer composing behaviours from small, focused pieces over deep class hierarchies.
- Hierarchies deeper than two levels are a smell.
- Multiple inheritance is banned — it creates invisible coupling.

---

## Module Boundaries

- **Each layer imports only from the layer below it.** Never sideways, never upward.
- **No cross-feature imports at the same layer.** Share via domain types or an explicit shared module.
- **Barrel exports at module boundaries.** Internal structure is private; the public API is what the barrel exports.
- **No circular dependencies.** Domain ← Services ← Repositories ← Routes. Never backwards.

---

## SOLID — Contextual Guidance

SOLID is guidance for architecture, not a strict enforcement tool. BLOCK only in critical paths (auth, billing, tenant isolation). Preferences elsewhere.

- **SRP**: If you need "and" to describe a class, split it.
- **OCP**: Extend behaviour with new classes, not new conditionals in stable code.
- **LSP**: Subtypes must be fully substitutable for their base types.
- **ISP**: Split large interfaces into focused ones — `Readable`, `Writable`, `Searchable` over one fat contract.
- **DIP**: High-level modules depend on abstractions — the foundation for testability.

---

## Linting and Static Analysis

Linting is not style preference — it is the first line of automated correctness checking.

### Required checks
| Check | Purpose | Minimum gate |
|---|---|---|
| **Linter** | Enforce rules, catch common bugs | Zero errors |
| **Type checker** | Catch type mismatches | Zero errors |
| **Dependency audit** | Detect known CVEs | No HIGH or CRITICAL |
| **Dead code / unused imports** | Keep codebase clean | Zero warnings |

*(Use the tools configured for your stack. See the relevant stack overlay for commands.)*

### Rules
- **Linting runs in CI and blocks merge.**
- **No lint disable without a reason.** Inline comment required.
- **Fix the root cause, don't suppress.** Disabling a rule is a last resort.
- **New lint rules are introduced with a cleanup commit** — don't add a rule that immediately fails CI.

---

## Testing

Full rules: `.claude/rules/testing-rules.md`

- Unit tests for pure business logic and domain rules
- Integration tests for data access — use a real database, not mocks
- E2E tests for critical user flows only
- Every test independently runnable — no shared mutable state
- Test names describe the scenario: `"returns 403 when user lacks submit permission"` — not `"test1"`
- At least two edge/failure cases per feature (in addition to happy path)

---

## Database Standards

- Schema changes via migrations only — never alter production directly
- Every migration must be reversible
- `NOT NULL` as default — nullable only with documented reason
- `tenant_id UUID NOT NULL` on every table that holds tenant data *(multi-tenant projects)*
- Indexes on all foreign keys and commonly filtered columns
- Soft delete: `deleted_at` timestamp — no hard deletes of business entities
- Timestamps: `created_at` and `updated_at` on every table

---

## Error Handling

- Throw typed errors with machine-readable codes
- Catch only at boundaries (handlers, job runners, script entry points)
- Log with context: `{ error, tenant_id, user_id, operation }`
- Never expose stack traces or internal messages to the client
- Never swallow exceptions silently

---

## Security

- Parameterized queries only — no string interpolation
- Authorization checked **after** authentication, **before** any data access
- Deny by default — access requires explicit permission
- On unauthorized access for tenant data: return `404 NOT_FOUND` (don't leak existence)
- File uploads: validate type by content, enforce size limits
- Secrets in env vars only — never committed to version control
