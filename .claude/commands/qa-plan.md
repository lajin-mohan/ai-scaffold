# /qa-plan

QA automation planning. Uses the `qa-automation-engineer` agent to design a full automation strategy and coverage matrix for a feature. Produces a traceable test plan: Requirement → Scenario → Test → Result format.

---

## Usage

```
/qa-plan                               # interactive — prompted for feature/ticket
/qa-plan "HIRE-142 csv import"         # feature description
/qa-plan --ticket HIRE-142             # link to ticket
```

---

## When to Run

- Stage 8 (QA) before writing any automated tests
- After `/review` and `/ux-review` pass
- Before `/gen-tests` runs — this command designs the strategy, `/gen-tests` implements it
- When test coverage gaps are identified in `/qa-review`

---

## Process

### Step 1 — Understand the Feature

Read the linked ticket, spec, or BRD. If none given, ask the user.

Identify:
- User-facing behaviours (what the user can and cannot do)
- Edge cases (empty, max, invalid, concurrent, permission denied)
- Auth and tenant isolation paths (if multi-tenant)
- Non-functional requirements (performance, accessibility)

### Step 2 — Invoke qa-automation-engineer Agent

```
Use the qa-automation-engineer agent with this input:

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
Run `/gen-tests` to implement this plan.
```

---

## Rules

- **Traceability is mandatory.** Every requirement must map to at least one test.
- **Auth failures are non-negotiable.** Every protected endpoint needs 401 and 403 tests.
- **Tenant isolation is non-negotiable** for multi-tenant projects.
- **Coverage target: 80% for auth areas**, 70% for general features.
- **This command designs, `/gen-tests` implements.** Don't skip to implementation without a plan.

---

## Related Commands

- `/qa-review` — reviews test coverage quality
- `/qa-auth` — auth-specific test planning (deeper auth analysis)
- `/gen-tests` — implements the test plan
- `/qa` — live-site browser verification
- `qa-automation-engineer` agent — generates the strategy