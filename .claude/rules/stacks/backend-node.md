---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/package.json"
---

# Stack Rules: Node.js + TypeScript (Backend)

Append to `.claude/rules/coding-standards.md` for backend stacks containing Node.js or TypeScript.

---

## TypeScript

- **`strict: true`** in `tsconfig.json`. No exceptions without a tracked justification.
- **No `any`** — use `unknown` for truly unknown types, then narrow. A comment is required for each `any`.
- **Typed errors** — define error classes or result types. Not plain `throw new Error('string')`.
- **No `as` casts** without a comment explaining why the type system can't verify it.

---

## Imports and Module Resolution

- **Explicit file extensions** in `import` statements when the extension matters (`.js` for ESM, `.ts` for type-only).
- **No default re-exports that obscure path** — prefer `export { foo } from './foo'` over re-naming.
- **Barrel exports (`index.ts`)** at package and module boundaries. Internal is private.

---

## Schema Validation

Validate at every API boundary using the project's approved library (e.g. Zod, Valibot, ArkType).

```typescript
// CORRECT
import { z } from 'zod'
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
})
type CreateUserInput = z.infer<typeof CreateUserSchema>

// WRONG — validate with if/else or string methods
if (typeof email === 'string' && email.includes('@')) { ... }
```

---

## Async / Await

- **No `.then()` chains** for sequential async work — use `async/await`.
- **No unhandled promise rejections** — every `async` function has its errors handled or propagated.
- **Never `await` inside a non-`async` function** unless using an explicit continuation.

---

## Dependency Injection

```typescript
// CORRECT
class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly mailer: Mailer,
  ) {}
}

// WRONG — concrete dependency created inside
class UserService {
  private repo = new PostgresUserRepository()
}
```

Inject via constructor. Don't use service locators inside business logic.

---

## Error Handling

```typescript
// CORRECT — typed application error
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`)
    this.name = 'NotFoundError'
  }
}

// WRONG — plain string error
throw new Error('User not found')
```

- Use `app.addGlobalErrorHandler()` or equivalent — not scattered try/catch blocks.
- Map domain errors to HTTP status codes at the handler boundary.

---

## Logging

Use structured logging. Never `console.log`.

```typescript
import { logger } from './logger.js'
logger.info('user.created', { userId, tenantId })
```

---

## Testing

```
npm run test:unit -- --run    # unit tests (Vitest/Jest)
npm run test:integration      # integration (real DB)
```

- No mocked database in integration tests.
- Test file lives alongside the source: `users.service.ts` → `users.service.test.ts`.
- Factory functions for test data — no copy-pasted JSON blobs.

---

## Commands Reference

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test:unit     # Vitest / Jest
npm audit --audit-level=high   # CVE check
```
