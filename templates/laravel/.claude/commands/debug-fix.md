# /debug-fix

Systematically reproduce, root-cause, fix, test, and verify a bug.

Before changing code, produce a short debugging plan and wait for one explicit approval. After approval, continue through reproduction, root cause, fix, and verification without asking again unless a stop condition occurs.

Use this command for:
- login, OAuth, redirect, CORS, auth, and protected-route bugs
- API errors
- React UI defects
- Playwright/e2e failures
- Docker development environment issues
- PostgreSQL schema, migration, seed, or tenant data problems
- failed CI, lint, typecheck, or test runs

---

## Input

Provide as much as available:
- bug description
- expected behavior
- actual behavior
- affected environment
- URL, route, API endpoint, or screen
- logs, browser console errors, network errors, stack traces
- related files or recent commits

---

## Process

1. Read `.claude/skills/systematic-debugging/SKILL.md`.
2. Check current branch and working tree.
3. Create/use a `fix/*` branch from `dev`; do not work directly on `dev` or `main`.
4. Define expected vs actual behavior.
5. Produce a short plan:

```
## Debug Plan — {{bug summary}}

### Expected vs actual
- Expected: {{expected}}
- Actual: {{actual}}

### Reproduction approach
- {{browser/API/test/log scenario}}

### Likely investigation areas
- {{files/modules/config/routes}}

### Verification
- {{targeted commands/checks}}

### Stop conditions
- Original issue cannot be reproduced or simulated.
- Root cause points outside approved scope.
- Fix requires schema/API/UX contract change.
- Verification cannot run due missing environment/dependency.
- Destructive action, secret access, or direct `main`/`dev` commit is needed.

Reply `go` once. After approval, I will continue through reproduce → root cause → fix → verify and report evidence.
```

6. Wait for one explicit approval.
7. Reproduce the issue or define a reproducible simulation.
8. Analyze logs, stack traces, code path, data flow, environment, and configuration.
9. Identify root cause before editing.
10. Apply the smallest safe fix.
11. Run targeted verification.
12. Run regression checks around the affected workflow.
13. Report final status using the approved status model.

---

## Required Verification By Bug Type

- **Frontend/full-stack:** browser verification is required with Playwright or a documented approved exception.
- **API:** verify request/response status, body, auth, tenant/organization scope, and error handling.
- **API config/routing:** verify syntax/config/routes and relevant API behavior.
- **Database:** verify migration/schema/data state and tenant isolation.
- **Docker/local environment:** verify relevant services are healthy and logs no longer show the original failure.

---

## Rules

- Do not say fixed until verified.
- Do not guess.
- Do not make unrelated changes.
- Do not hide uncertainty.
- If tests cannot run, say so clearly.
- If reproduction is not possible, say so clearly.
- Always provide evidence.
- After the user approves the debug plan once, do not ask again for routine implementation choices inside that approved scope.
- Stop only when a listed stop condition occurs.

---

## Output Format

```
Status:
Issue Summary:
Expected Behavior:
Actual Behavior:
Root Cause:
Fix Applied:
Files Changed:
Verification Performed:
Evidence:
Regression Checks:
Regression Risk:
Remaining Concerns:
Recommended Next Step:
```

Status must be one of:
- `CONFIRMED FIXED`
- `LIKELY FIXED`
- `PARTIALLY FIXED`
- `NOT FIXED`
- `BLOCKED`
