# Security Rules

These are non-negotiable. A security violation is a BLOCK — no exceptions.

---

## SQL Injection

- **Parameterized queries only.** No string concatenation, no template literals, no format strings in SQL.
- Any SQL query with user-provided values must use placeholders: `$1`, `?`, or equivalent.

```typescript
// CORRECT
db.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId])

// WRONG — immediate block
db.query(`SELECT * FROM users WHERE id = ${userId}`)
```

---

## Tenant Isolation *(SaaS / multi-tenant projects only — remove this section for single-tenant systems)*

- Every mutable table has a `tenant_id UUID NOT NULL` column.
- Every query that reads or writes tenant data includes `AND tenant_id = $n`.
- Enforced at the **repository layer** — not application layer, not route handler.
- Incorrect tenant isolation = data breach. This is a CRITICAL security defect.

---

## Authentication

- Every route is authenticated by default. Unauthenticated routes must be explicitly opted out with documentation.
- `401 UNAUTHORIZED` for missing or invalid token — not 403, not 404.
- Session tokens are opaque random IDs — not JWTs with embedded claims. User, tenant, and permission data is looked up server-side via the opaque ID.
- Tokens stored in HttpOnly cookies or Authorization header — never in localStorage or sessionStorage.
- Sessions expire: absolute timeout (e.g., 8h) + inactivity timeout (e.g., 30min).

---

## Authorization

- Check permissions, not role names. `user.permissions.includes('applications:submit')` not `user.role === 'recruiter'`.
- Authorization checked **after** authentication, **before** any data access.
- Deny by default — access requires explicit permission, not absence of denial.
- On unauthorized access: return `404 NOT_FOUND` for tenant data (don't leak existence), `403 FORBIDDEN` for actions.

---

## Input Validation

- Validate at **every API boundary** — never trust input from any source.
- Validate: type, format, length, range, enums.
- Reject invalid input with `400 VALIDATION_FAILED` and field-level errors.
- File uploads: validate MIME type by magic bytes (not just extension), enforce size limits.
- No HTML in user-provided text fields unless explicitly required (and sanitize if so).

---

## Output Encoding

- Escape all user-provided content before rendering in HTML.
- JSON API responses are safe by default — no raw HTML concatenation.
- Content-Type header always set explicitly.
- CSP header prevents inline script execution.

---

## Sensitive Data

- **No secrets in code.** Secrets → environment variables → secret manager. Never committed.
- **No PII in logs.** Mask email, phone, name fields in structured logs.
- **No PII in URLs.** Never in path params or query strings — appears in server logs, browser history, referrer headers.
- **No sensitive data in error messages.** Internal errors show a code, not stack traces or DB details.
- Passwords hashed with bcrypt (cost ≥12) or argon2id — never MD5, SHA1, or plain.
- Sensitive fields (`password_hash`, `token`, `secret`) excluded from all API responses via repository projection.

---

## Security Headers

All HTTP responses must include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Rate Limiting

- All auth endpoints: strict rate limiting with progressive delay and lockout.
- All write endpoints: rate limited per user per time window.
- Login: max 5 failures per 15 minutes, then 15-minute lockout.

---

## Dependencies

- No dependencies with known HIGH or CRITICAL CVEs.
- Dependency audit runs in CI: `npm audit --audit-level=high` or equivalent.
- Outdated packages reviewed monthly.

---

## Secrets Management

- `.env` files are never committed.
- `.env.example` contains all required variable names with placeholder values only.
- Production secrets stored in AWS Secrets Manager / HashiCorp Vault / equivalent.
- CI secrets stored in platform-provided secret store — never in YAML files.
