# GitHub Copilot Instructions — {{PROJECT_NAME}}

These instructions guide Copilot suggestions for this repository. They complement the rules in CLAUDE.md and .cursorrules.

---

## Project Context

**Organization:** Techversant Infotech
**Stack:** {{BACKEND_STACK}} · {{FRONTEND_STACK}} · {{DATABASE}} · {{CLOUD_PROVIDER}}
**Pattern:** Clean Architecture — Routes → Services → Repositories → Domain

---

## AI Coding Rules (top priority — overrides anything below)

Full file: `.claude/rules/ai-coding-rules.md`. Non-negotiable for Copilot suggestions:

1. **Verify before claim.** Don't suggest a function call, package, or flag that hasn't been verified to exist. No fabrication.
2. **Plan-and-confirm for tasks > 3 steps or long-running.** Multi-file changes need a written plan + explicit human approval before code is generated.
3. **Production-grade only.** No half-implementations, no stubs that ship, no `TODO` without a ticket reference (`// TODO(HIRE-142): ...`).
4. **AI-readability limits.** Functions ≤ 50 lines, files ≤ 300 lines, ≤ 5 params, complexity ≤ 10. No clever one-liners. Match adjacent style.
5. **Verify before "done".** Lint + tests must run and pass before claiming completion.

If a Copilot suggestion would violate any of these, prefer no suggestion over a non-compliant one.

---

## Suggestion Priorities

### Prefer
- Parameterized SQL queries over any form of string interpolation
- Explicit type annotations over inferred types in function signatures
- Early returns over deeply nested conditionals
- Named constants over magic numbers and strings
- Descriptive variable names over short abbreviations
- Structured error objects over throwing plain strings
- Existing utility functions over reimplementing common operations

### Avoid
- Any SQL built with string concatenation
- `any` types in TypeScript (or equivalent in other languages)
- Direct database calls inside route handlers or controllers
- Business logic inside UI components
- `console.log` left in production code
- Hardcoded URLs, IDs, or configuration values
- Synchronous blocking operations in async contexts

---

## API Patterns

All API endpoints follow this structure:

```
POST   /api/v1/{resource}           ← create
GET    /api/v1/{resource}           ← list (paginated)
GET    /api/v1/{resource}/:id       ← get one
PUT    /api/v1/{resource}/:id       ← full update
PATCH  /api/v1/{resource}/:id       ← partial update
DELETE /api/v1/{resource}/:id       ← soft delete (never hard delete)
```

Response envelope:
```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 100 },
  "error": null
}
```

Error envelope:
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable message",
    "fields": { "email": "Required" }
  }
}
```

---

## Security Requirements

**For multi-tenant SaaS projects only:** Every database query must be scoped by `tenant_id`. If `{{PROJECT_TYPE}}` is not multi-tenant SaaS, remove this requirement and the tenant_id column convention.

```typescript
// CORRECT (multi-tenant SaaS)
const result = await db.query(
  'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
  [userId, tenantId]
);

// WRONG — never suggest this
const result = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

Input validation at every endpoint boundary — suggest schema validation (Zod, Joi, or equivalent) for all request bodies.

---

## Testing Patterns

When generating tests, always include:
1. Happy path with valid input
2. Boundary/edge cases (empty, max length, null)
3. Authorization failure case
4. Tenant isolation case — *SaaS/multi-tenant projects only* (ensure data from another tenant is not returned)

```typescript
describe('createUser', () => {
  it('creates a user with valid input', async () => { ... });
  it('rejects when email is missing', async () => { ... });
  it('rejects when user is not authorized', async () => { ... });
  it('cannot access other tenant data', async () => { ... }); // SaaS/multi-tenant only
});
```

---

## Frontend Component Patterns

Components should:
- Accept typed props — no untyped `any` props
- Use design system tokens for all colors, spacing, typography
- Include loading, error, and empty states
- Be accessible: labels on inputs, aria attributes on interactive elements

```tsx
// Preferred pattern
interface Props {
  user: User;
  onUpdate: (data: Partial<User>) => void;
  isLoading?: boolean;
}

export function UserCard({ user, onUpdate, isLoading = false }: Props) {
  // ...
}
```

---

## Database / Migration Patterns

Every migration file must include:
- An `up` function with the forward migration
- A `down` function that fully reverses it
- Indexes on all new foreign keys

```sql
-- migrations/0001_create_users.sql

-- up
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),  -- SaaS/multi-tenant only; remove for single-tenant
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);          -- SaaS/multi-tenant only
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);  -- SaaS/multi-tenant only

-- down
DROP TABLE IF EXISTS users;
```

---

## Commit Message Format

```
feat(users): add bulk import via CSV
fix(auth): handle expired session token gracefully
chore(deps): update pg to 8.12
test(users): add tenant isolation test cases
```

Copilot should suggest commit messages in this format when asked.
