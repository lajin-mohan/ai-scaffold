---
description: QA automation planning via qa-reviewer agent. Coverage matrix: Requirement → Scenario → Test → Result.
---

# /ais-qa-plan

QA automation planning. Uses the `qa-reviewer` agent to design a full automation strategy and coverage matrix for a feature. Produces a traceable test plan: Requirement → Scenario → Test → Result format.

---

## Usage

```
/ais-qa-plan                               # interactive — prompted for feature/ticket
/ais-qa-plan "PROJ-142 csv import"         # feature description
/ais-qa-plan --ticket PROJ-142             # link to ticket
/ais-qa-plan --auth "login and sessions"   # auth-specific plan: strategies, failure cases, tenant isolation
```

---

## When to Run

- Stage 8 (QA) before writing any automated tests
- After `/ais-review` and `/ais-ux-review` pass
- Before `/ais-gen-tests` runs — this command designs the strategy, `/ais-gen-tests` implements it
- When test coverage gaps are identified in `/ais-review`

---

## Process

### QA Evidence Framework

Every QA plan must cover or explicitly mark N/A for these 7 evidence categories: schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, and security.

### Step 1 — Understand the Feature

Read the linked ticket, spec, or BRD. If none given, ask the user.

Identify:
- User-facing behaviours (what the user can and cannot do)
- Edge cases (empty, max, invalid, concurrent, permission denied)
- Auth and tenant isolation paths (if multi-tenant)
- Non-functional requirements (performance, accessibility)

### Step 2 — Invoke qa-reviewer Agent

```
Use the qa-reviewer agent with this input:

Feature: {{name}}
Spec: {{path or description}}
Stack: {{detected from package.json/composer.json/pyproject.toml}}
Coverage target: 80% for auth areas, 70% for happy path

Agent should produce:
1. Traceability matrix (Requirement → Scenario → Test → Result)
2. Test types by scenario (unit, integration, component, E2E)
3. Framework recommendation (based on detected stack)
4. Auth-specific test matrix (if applicable)
```

### Step 3 — Present Coverage Matrix

```
## QA Plan — {{feature}}

### Traceability Matrix

| # | Requirement | Scenario | Test | Type | Status |
|---|---|---|---|---|---|
| Q1 | Users can submit a CSV | Valid CSV with 100 rows | uploadCsv_100rows | E2E | Pending |
| Q2 | Users can submit a CSV | Duplicate detection | uploadCsv_duplicates | Integration | Pending |
| Q3 | Users cannot submit invalid CSV | Missing required column | uploadCsv_missingColumn | Integration | Pending |
| Q4 | Tenant isolation | Cross-tenant upload blocked | uploadCsv_crossTenant | Integration | Pending |

### Auth Test Matrix (if applicable)

| Test | Happy Path | 401 | 403 | Session Expired | Token Invalid |
|---|---|---|---|---|---|
| Upload CSV | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download report | ✅ | ✅ | ✅ | ✅ | ✅ |

### Test Type Distribution
- E2E: 2 tests
- Integration: 3 tests
- Unit: 1 test (parser logic)

### Recommended Framework
Vitest + Playwright (detected stack: Node.js)

### Next Step
Run `/ais-gen-tests` to implement this plan.
```

---

## Rules

- **QA evidence categories** — every plan must cover or explicitly mark N/A: schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, security.
- **Traceability is mandatory.** Every requirement must map to at least one test.
- **Auth failures are non-negotiable.** Every protected endpoint needs 401 and 403 tests.
- **Tenant isolation is non-negotiable** for multi-tenant projects.
- **Coverage target: 80% for auth areas**, 70% for general features.
- **This command designs, `/ais-gen-tests` implements.** Don't skip to implementation without a plan.

---

## Related Commands

- `/ais-review` — reviews test coverage quality
- `/ais-qa-plan --auth` — auth-specific test planning (deeper auth analysis)
- `/ais-gen-tests` — implements the test plan
- `/ais-qa` — live-site browser verification
- `qa-reviewer` agent — generates the strategy

---

## Auth test planning (`--auth`)

Plans authentication and authorization coverage.

### When to Run

- Before any new auth flow is coded (design-time test plan)
- Before writing auth tests (Stage 5 or Stage 8)
- When adding MFA, password reset, SSO, or tenant permissions
- After `/ais-qa-plan` — this is the auth-specific deep-dive

---

### Auth Test Matrix

#### Core Auth Flows (All Strategies)

| Test | Login | Logout | Session Start | Session Refresh | Session Expired |
|---|---|---|---|---|---|
| Happy path | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wrong password | ✅ | — | — | — | — |
| Invalid email format | ✅ | — | — | — | — |
| Account locked | ✅ | — | — | — | — |
| Rate limited | ✅ | — | — | — | — |

#### Token-Based Auth (JWT / Bearer)

| Test | Token Valid | Token Expired | Token Malformed | Token Missing | Token Revoked |
|---|---|---|---|---|---|
| Happy path | ✅ | — | — | — | — |
| API call | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Session-Based Auth (Cookie / Opague Token)

| Test | Session Valid | Session Expired | Session Revoked | CSRF Token Invalid |
|---|---|---|---|---|
| Happy path | ✅ | — | — | — |
| API call | ✅ | ✅ | ✅ | ✅ |

#### OAuth2 / SSO

| Test | Auth Code Flow | Refresh Token | Scope Escalation | PKCE Required |
|---|---|---|---|---|
| Happy path | ✅ | ✅ | — | ✅ |
| Redirect URI mismatch | — | — | — | ✅ |
| PKCE missing (if required) | — | — | — | ✅ |

---

### Tenant Isolation (Multi-Tenant Only)

Every auth test has a tenant-isolation variant:

| Test | Same Tenant | Cross-Tenant |
|---|---|---|
| View resources | ✅ | ✅ (404) |
| Modify resources | ✅ | ✅ (404 or 403) |
| Access tenant settings | ✅ | ✅ (404) |

> **Important:** Deny-by-default means unauthorized cross-tenant access returns `404 NOT_FOUND` — not `403 FORBIDDEN`. This prevents existence leakage.

---

### Authorization Matrix

| Role | Resource A | Resource B | Admin Panel | Billing |
|---|---|---|---|---|
| Owner | read/write | read/write | write | read |
| Admin | read/write | read | — | read |
| Member | read | — | — | — |
| Viewer | read | read | — | — |
| Guest | — | — | — | — |

Every cell with "—" must have a negative test (access denied returns 404).

---

### Password & MFA

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

### Stack Detection

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

### Output Format

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
Run `/ais-gen-tests` with this matrix as input.
```

---

### Rules

- **401 and 403 are both mandatory.** Every protected endpoint needs both.
- **Tenant isolation on every endpoint** for multi-tenant projects.
- **Token/session expiry is not optional.** Must test both valid and expired.
- **Rate limiting is security-relevant.** Test that it actually blocks abuse.
- **80% coverage target for auth areas** (higher than general 70%).
