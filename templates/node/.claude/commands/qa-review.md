# /qa-review

QA coverage and quality review. Validates that tests provide genuine coverage, not just checkbox testing. Checks traceability, independence, data isolation, and CI command correctness. Uses the `qa-reviewer` agent.

---

## Usage

```
/qa-review                             # interactive
/qa-review --ticket PROJ-142          # review tests for specific ticket
/qa-review --suite api                # review API integration tests only
/qa-review --suite unit               # review unit tests only
```

---

## When to Run

- After `/gen-tests` generates tests
- Before QA sign-off (Stage 8 gate)
- When `/qa` finds regressions
- During `/review` as part of the parallel review

---

## Review Dimensions

### QA Evidence Framework

Every QA review must verify or explicitly mark N/A for these 7 evidence categories: schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, and security.

### 1. Traceability

Every test maps to a requirement or acceptance criterion.

```
Requirement → Test trace:
  AC-01 (CSV upload) → uploadCsv.test.ts ✅
  AC-02 (Duplicate detection) → uploadCsv_duplicates.test.ts ✅
  AC-03 (Tenant isolation) → uploadCsv_crossTenant.test.ts ✅
  AC-04 (Invalid file) → uploadCsv_invalidFile.test.ts ⚠ MISSING
```

**BLOCK if:** A requirement has no test. Every AC must be covered.

### 2. Test Independence

Each test can run standalone, in any order.

```
Independence check:
  uploadCsv.test.ts — ✅ no shared state, isolated DB transaction
  uploadCsv_duplicates.test.ts — ⚠ depends on uploadCsv.test.ts running first

BLOCK: Tests that depend on execution order are not tests — they're scripts.
```

**BLOCK if:** A test fails when run alone or in reverse order.

### 3. Data Isolation

Tests don't share data. They create and clean up their own fixtures.

```
Data isolation check:
  Tests use factory/fixture functions — ✅
  Tests truncate tables between runs — ✅
  Tests don't depend on data from other tests — ✅
```

**BLOCK if:** Test data leaks between tests.

### 4. CI Command Correctness

Each test has a correct CI command that runs it in isolation.

```
CI command check:
  Unit:      npm run test:unit -- --run          ✅
  Integ:     npm run test:integration             ✅
  E2E:       npm run test:e2e                     ✅
  All:       npm test                             ✅ (runs unit + integration)
```

**WARN if:** No CI command documented for a test suite.

### 5. Edge Case Coverage

Happy path + at least two edge/failure cases per feature.

```
Edge case analysis (AC-01 CSV Upload):
  Happy path:    valid CSV 100 rows          ✅
  Edge:          CSV with 50,000 rows       ✅
  Edge:          CSV with special chars     ✅
  Edge:          empty CSV                  ✅
  Missing:       CSV with BOM encoding      ⚠
  Missing:       concurrent uploads          ⚠
```

**HIGH if:** Less than two edge cases per acceptance criterion.

---

## Severity Model

| Severity | Meaning | Must Fix Before Merge? |
|---|---|---|
| **BLOCK** | Test gap or independence violation — coverage claim is false | Yes |
| **HIGH** | Missing edge cases, data leakage, or incorrect CI command | Yes |
| **MEDIUM** | Traceability unclear, coverage below target | Acknowledge in PR |
| **LOW** | Test naming, assertion style, minor coverage gap | Optional |

---

## Output Format

```
## QA Review — {{feature}}

### Verdict
PASS / PASS WITH FIXES / BLOCKED

### Traceability
| AC | Requirement | Test | Status |
|---|---|---|---|
| AC-01 | CSV upload | uploadCsv.test.ts | ✅ |
| AC-02 | Duplicate detection | uploadCsv_duplicates.test.ts | ✅ |
| AC-03 | Tenant isolation | uploadCsv_crossTenant.test.ts | ✅ |
| AC-04 | Invalid file handling | — | ⚠ MISSING |

### Test Independence: ✅ PASS
### Data Isolation: ⚠ ISSUES FOUND (see above)
### CI Commands: ✅ COMPLETE
### Edge Cases: ⚠ 1 gap (BOM encoding not tested)

### Recommendations
1. [BLOCK] Add test for AC-04 (invalid file handling)
2. [HIGH] Fix data leakage between uploadCsv and uploadCsv_duplicates
3. [MEDIUM] Add BOM encoding edge case test

### Coverage Estimate
Auth areas: 82% (target 80%) ✅
General:    74% (target 70%) ✅
```

---

## Rules

- **QA evidence categories** — every review must validate coverage across: schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, security. Mark N/A with reason where not applicable.
- **No test = no coverage claim.** If a test file doesn't exist for a requirement, it's a BLOCK.
- **Independence is non-negotiable.** If a test needs another test to run first, it's a bug.
- **Data isolation is non-negotiable.** Shared DB state between tests is a BLOCK.
- **CI commands must be verifiable.** If you can't run the test in CI, it doesn't exist.

---

## Related Commands

- `/gen-tests` — generates the tests this reviews
- `/qa` — live-site browser verification
- `/qa-plan` — plans the test strategy
- `/qa-auth` — auth-specific test review
- `qa-reviewer` agent — performs the review
