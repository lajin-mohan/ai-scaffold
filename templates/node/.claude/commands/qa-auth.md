---
description: Auth-specific test planning: login, logout, session, token, protected routes, tenant isolation. Framework-agnostic.
---

# /qa-auth

Auth-specific test planning. Designs a complete test matrix for authentication and authorization flows. Generic — works with any auth strategy (session, JWT, OAuth2) and any stack.

---

## Usage

```
/qa-auth                               # interactive
/qa-auth "login with email + password"  # specific flow to plan
/qa-auth --strategy jwt               # plan for JWT-based auth
/qa-auth --strategy session           # plan for session-based auth
/qa-auth --strategy oauth2            # plan for OAuth2
```

---

## When to Run

- Before any new auth flow is coded (design-time test plan)
- Before writing auth tests (Stage 5 or Stage 8)
- When adding MFA, password reset, SSO, or tenant permissions
- After `/qa-plan` — this is the auth-specific deep-dive

---

## Auth Test Matrix

### Core Auth Flows (All Strategies)

| Test | Login | Logout | Session Start | Session Refresh | Session Expired |
|---|---|---|---|---|---|
| Happy path | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wrong password | ✅ | — | — | — | — |
| Invalid email format | ✅ | — | — | — | — |
| Account locked | ✅ | — | — | — | — |
| Rate limited | ✅ | — | — | — | — |

### Token-Based Auth (JWT / Bearer)

| Test | Token Valid | Token Expired | Token Malformed | Token Missing | Token Revoked |
|---|---|---|---|---|---|
| Happy path | ✅ | — | — | — | — |
| API call | ✅ | ✅ | ✅ | ✅ | ✅ |

### Session-Based Auth (Cookie / Opague Token)

| Test | Session Valid | Session Expired | Session Revoked | CSRF Token Invalid |
|---|---|---|---|---|
| Happy path | ✅ | — | — | — |
| API call | ✅ | ✅ | ✅ | ✅ |

### OAuth2 / SSO

| Test | Auth Code Flow | Refresh Token | Scope Escalation | PKCE Required |
|---|---|---|---|---|
| Happy path | ✅ | ✅ | — | ✅ |
| Redirect URI mismatch | — | — | — | ✅ |
| PKCE missing (if required) | — | — | — | ✅ |

---

## Tenant Isolation (Multi-Tenant Only)

Every auth test has a tenant-isolation variant:

| Test | Same Tenant | Cross-Tenant |
|---|---|---|
| View resources | ✅ | ✅ (404) |
| Modify resources | ✅ | ✅ (404 or 403) |
| Access tenant settings | ✅ | ✅ (404) |

> **Important:** Deny-by-default means unauthorized cross-tenant access returns `404 NOT_FOUND` — not `403 FORBIDDEN`. This prevents existence leakage.

---

## Authorization Matrix

| Role | Resource A | Resource B | Admin Panel | Billing |
|---|---|---|---|---|
| Owner | read/write | read/write | write | read |
| Admin | read/write | read | — | read |
| Member | read | — | — | — |
| Viewer | read | read | — | — |
| Guest | — | — | — | — |

Every cell with "—" must have a negative test (access denied returns 404).

---

## Password & MFA

| Test | Requirement |
|---|---|
| Password min length enforced | 8+ chars |
| Password complexity enforced | mixed case + number + special |
| Password change with old password | must verify old |
| Password change without old password | blocked with 403 |
| MFA happy path | TOTP code accepted |
| MFA wrong code | blocked with 401 |
| MFA bypass blocked | 3 wrong codes → lockout |
| Password reset link | expires in 15 minutes |
| Password reset link reuse | blocked, new link required |
| Session fixation prevention | re-auth on privilege escalation |

---

## Stack Detection

Auth patterns vary by strategy:

| Strategy | Detection | Auth Header |
|---|---|---|
| JWT / Bearer | Check for `Authorization: Bearer` in API routes | `Authorization: Bearer {token}` |
| Session / Cookie | Check for `HttpOnly` cookies, `SESSION_ID` | Cookie: `session_id={token}` |
| OAuth2 | Check for `authorization_code`, `client_id` | Varies by grant type |

Detection command:
```bash
# Detect auth strategy from codebase
grep -r "Authorization: Bearer" apps/api/src/routes/  # JWT
grep -r "HttpOnly" apps/api/src/                      # Session
grep -r "authorization_code" apps/api/src/            # OAuth2
```

---

## Output Format

```
## Auth Test Plan — {{feature}}

### Auth Strategy Detected
JWT (Bearer token via Authorization header)

### Coverage Matrix
| Flow | Tests | Coverage |
|---|---|---|
| Login/logout | 6 | 95% |
| Token validation | 5 | 100% |
| Tenant isolation | 4 | 100% |
| Authorization (RBAC) | 8 | 90% |
| Password/MFA | 6 | 85% |

### Missing Test Categories
- [ ] Concurrent session limit (same user, two devices)
- [ ] Token refresh race condition
- [ ] Session revocation propagation delay

### Recommended Test Library
Vitest + @testing-library/jest-dom (Node.js stack detected)

### Next Step
Run `/gen-tests` with this matrix as input.
```

---

## Rules

- **401 and 403 are both mandatory.** Every protected endpoint needs both.
- **Tenant isolation on every endpoint** for multi-tenant projects.
- **Token/session expiry is not optional.** Must test both valid and expired.
- **Rate limiting is security-relevant.** Test that it actually blocks abuse.
- **80% coverage target for auth areas** (higher than general 70%).

---

## Related Commands

- `/qa-plan` — broader QA planning (includes this auth matrix)
- `/qa-review` — reviews auth test quality
- `/gen-tests` — implements this matrix
- `/review` — includes `security-reviewer` for auth correctness