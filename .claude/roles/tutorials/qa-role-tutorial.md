# QA Role Tutorial

**Role:** `qa` | **Default command:** `/qa-plan` | **Purpose:** Test planning, test generation, QA review, and live browser verification

---

## When to Use This Role

You are the **qa** when you need to:
- Plan tests for a new feature
- Generate test cases and test files
- Review implementation for correctness and edge cases
- Run live browser QA to verify UI behavior
- Sign off on a feature's completeness

**Not the QA role:** writing production code, designing systems, project orchestration.

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "qa"
}
```

### 2. Begin with QA planning

```bash
/qa-plan
```

This reads the feature spec, designs a test approach (unit/integration/E2E), identifies test data requirements, and surfaces edge cases.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/qa-plan` | Design test strategy for a feature | Test matrix, test types, edge cases, data requirements |
| `/gen-tests` | Generate runnable test files | Unit + integration tests with assertions |
| `/qa-review` | Review implementation for correctness | BLOCK/WARN/QUESTION findings on business rules |
| `/qa-auth` | QA sign-off with auth verification | Auth flow + permission gate verification |
| `/qa` | Live browser QA with headless browser | Rendering, interaction, console issue detection |
| `/lessons` | Record a test gap or mistake pattern | Saved to `tasks/lessons.md` |
| `/reflect` | Review QA session outcome | Saved to memory |

---

## Step-by-Step Workflow

### Feature QA from Spec

```
1. Run /qa-plan
   → Read the feature spec
   → Identify test types: unit / integration / E2E
   → List edge cases: empty, max, null, concurrent, auth failure
   → Identify test data requirements

2. Generate tests: /gen-tests
   → Happy path test
   → 2+ edge/failure case tests
   → Auth failure (401) test
   → Permission failure (403) test
   → Tenant isolation test (for multi-tenant)

3. Run /qa-review
   → Business rule validation
   → Schema correctness
   → Response contract verification

4. Live browser QA: /qa
   → Desktop light, desktop dark
   → Mobile (~390px) light, mobile dark
   → Verify all states: loading, error, empty, populated
```

### Regression Testing

```
1. Run /qa-review on changed files
   → Identify test paths that could break
   → Run relevant test suites

2. Run /qa for UI changes
   → Walk the feature flow end-to-end
   → Verify no console errors
```

---

## Test Pyramid

```
         /\
        /E2E\         ← Few, slow, critical user flows only
       /------\
      /  Integ  \     ← Database, API, service integration
     /------------\
    /     Unit      \ ← Business logic, domain rules, utilities
   /------------------\
```

**Unit tests:** Fast, isolated, no I/O. For business logic, domain rules, pure functions.

**Integration tests:** Real database, real service calls. For repositories, API endpoints.

**E2E tests:** Real browser or API client against running app. For critical flows only.

---

## Required Evidence Gates

Before claiming "QA sign-off":

- [ ] `schema_validation` — DB schema supports the feature
- [ ] `response_contract` — API responses match spec
- [ ] `db_validation` — data persistence works correctly
- [ ] `business_rule_validation` — state transitions, edge cases handled
- [ ] `timing_performance` — NFRs met (p99 < Xms)
- [ ] `idempotency` — write retries produce same result
- [ ] `security` — auth/permission checks verified

---

## Blocked Actions (Human Required)

| Action | Why Blocked |
|---|---|
| `merge_main` | Requires human approval + CI green |
| `deploy_production` | Requires deployment review + sign-off |
| `destructive_changes` | Requires explicit human consent |
| `secrets_access` | Out of scope for AI |
| `schema_migration_without_approval` | Requires tech lead sign-off |

---

## Test Coverage Requirements

| Layer | Target Coverage |
|---|---|
| Domain / business logic | 90%+ |
| Services | 80%+ |
| API routes (integration) | 70%+ |
| Frontend components | 60%+ |

Coverage is a minimum bar, not a goal.

---

## Common Scenarios

### Scenario 1: New API endpoint

```
User: "Add GET /api/v1/projects and test it"

1. /qa-plan
   → Happy path: returns 200 with paginated list
   → Empty state: returns 200 with empty array
   → Auth failure: returns 401 without token
   → Permission failure: returns 403 without permission
   → Pagination: page boundaries, total counts

2. /gen-tests
   → Integration tests for the endpoint
   → Auth/permission tests
   → Pagination tests

3. /qa-review
   → Business rule validation
   → Response contract verification
```

### Scenario 2: UI feature with form

```
User: "Add a project creation form"

1. /qa-plan
   → Happy path: form submits, project created
   → Validation: required fields, email format, max length
   → Error state: API returns 400 with field errors
   → Loading state: submit shows spinner, disables button

2. /gen-tests
   → Frontend: form validation, submission handling
   → Backend: API validation, entity creation

3. /qa (live browser)
   → Desktop + mobile
   → Light + dark theme
   → All states: loading, error, success
```

### Scenario 3: Multi-tenant data isolation

```
User: "Verify tenant isolation for projects"

1. /qa-review
   → Tenant A cannot access Tenant B projects
   → Repository layer enforces tenant_id scoping
   → Returns 404 (not 403) for cross-tenant access

2. /gen-tests
   → Tenant isolation test (CROSS_TENANT = 404)
   → Auth failure test (NO_TOKEN = 401)
   → Permission failure test (NO_PERM = 403)
```

---

## Calling Specialist Agents

Invoke these for deep analysis:

```
@qa-reviewer            — business rule validation, test correctness
@security-reviewer     — auth/permission verification
@frontend-reviewer     — UI component test review
@backend-reviewer       — API integration test review
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No tests exist for a feature | Run `/gen-tests` — don't skip this |
| Tests fail on first run | Expected — implementation may not be complete yet |
| "I don't know" response | This is correct. Ask or research — don't guess at expected behavior |
| Edge case not covered | Add it to the test plan, generate new test, add regression test |
| Live browser QA fails | Document the failure, create ticket for fix, don't sign off until fixed |

---

## Related Files

- Role config: [qa.yaml](qa.yaml)
- Testing rules: [.claude/rules/testing-rules.md](../rules/testing-rules.md)
- Test case template: [.claude/templates/test-case-template.md](../templates/test-case-template.md)
- DoD rules: [.claude/rules/dod-rules.md](../rules/dod-rules.md)