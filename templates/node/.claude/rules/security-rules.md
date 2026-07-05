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
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### Content-Security-Policy (CSP) Configuration

The CSP header value depends on the application's rendering mode. Set via
`apps/api/src/middleware/security-headers.ts`.

**JSON API (no browser rendering — preferred):**
```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
  form-action 'self'; base-uri 'self'; object-src 'none'
```
Restrictive API-only CSP: no scripts, no frames, no inline styles. See
`security-headers.ts` for the exact header value used.

**SPA with browser JS (React/Vue/Next.js frontend):**
```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
  connect-src 'self' https://api.example.com; frame-ancestors 'none'
```
Note: `'unsafe-inline'` for styles is a compromise for SPA development.
Use a nonce or hash-based CSP for stricter security — see OWASP CSP Cheat Sheet.

### OWASP Top 10 Mapping

Each OWASP Top 10 category maps to specific rules and implementations:

| OWASP Category | How This Project Addresses It |
|---|---|
| **A01 — Broken Access Control** | `tenant_id` scoping at repository layer; permission-based auth (`permissions.includes()`); 404 vs 403 distinction hides existence of hidden resources |
| **A02 — Cryptographic Failures** | bcrypt ≥12 for passwords; AES-256 at rest (DB-level); TLS 1.2+ in transit; opaque session tokens (no JWT embedded claims) |
| **A03 — Injection** | Parameterized SQL only (`$1`, `?` placeholders); input validation at every API boundary (Zod schemas); no string interpolation in queries |
| **A04 — Insecure Design** | Threat modeling in BRD; security review at Stage 6; architectural review gate; `/architecture-review` command |
| **A05 — Security Misconfiguration** | Security headers middleware (HSTS, CSP, X-Frame-Options); CORS middleware with origin allowlist; explicit opt-out documentation for unauth routes |
| **A06 — Vulnerable Components** | `npm audit --audit-level=high` in CI; Semgrep SAST (`p/owasp-top-10` rule); monthly outdated-package review |
| **A07 — Auth Failures** | Opaque session tokens with absolute + inactivity timeouts; 5-failure login lockout; MFA requirement documented for privileged access (ISO 27001) |
| **A08 — Data Integrity Failures** | Transactional outbox pattern for durable side effects; idempotency keys (composite `(tenant_id, key)` PK); version column for optimistic locking |
| **A09 — Logging & Monitoring Failures** | Audit log service (`audit.service.ts`); structured logging with `tenant_id`, `user_id` context; Sentry integration (`SENTRY_DSN`); alerting on auth failures |
| **A10 — Server-Side Request Forgery** | No URL-fetching from user input; if needed, enforce explicit allowlist of outbound IPs/domains via env vars |

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
