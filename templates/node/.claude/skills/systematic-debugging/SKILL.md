---
name: systematic-debugging
description: Use for your organization project bug fixes, failed tests, runtime errors, API issues, UI defects, Docker/local environment failures, database inconsistencies, auth/redirect/CORS issues, and production incidents where the fix must be reproduced, root-caused, corrected, tested, and verified with evidence.
---

# Systematic Debugging Skill

Use this skill whenever investigating or fixing a your organization project defect.

Primary objective: confirm the fix with evidence before declaring completion.

## Non-Negotiable Rule

A bug is not fixed until the original failure has been reproduced or clearly simulated, the root cause has been identified, the smallest safe correction has been applied, and verification evidence proves the original failure no longer occurs.

## Workflow

1. **Start From A Fix Branch**
   - Create or use `fix/{{short-description}}` from `dev`.
   - Do not commit directly to `dev` or `main`.
   - If the worktree is dirty, identify whether changes are user-owned before touching them.

2. **Expected vs Actual**
   - State expected behavior.
   - State actual behavior.
   - Identify affected user workflow, role, module, environment, and business impact.

3. **Reproduce First**
   Establish one clear failing case:
   - browser flow and console/network evidence
   - failing API request and response
   - failing test
   - Laravel log or stack trace
   - Docker service/log failure
   - database state mismatch

   If exact reproduction is not possible, state that clearly and create the closest simulation.

4. **Root Cause Before Fix**
   Identify the specific wrong assumption or failing path:
   - Laravel route/controller/middleware/config
   - auth, session, OAuth, CORS, tenant, or permission flow
   - React component/context/router/service
   - API client base URL or token handling
   - migration/schema/index/seed data
   - Docker env, service networking, or volume issue

5. **Minimal Safe Fix**
   Apply only what resolves the root cause.
   Avoid broad refactors, unrelated formatting, contract changes, or cleanup unless required and documented.

6. **Verify Against The Original Failure**
   Match verification to the bug:
   - UI/browser: run targeted Playwright or `npm run test:e2e`.
   - React code: run `npm run typecheck` and relevant tests.
   - Laravel API: run targeted PHP syntax, route/config checks, API request checks, and relevant backend tests.
   - Database: verify migration/schema/data state.
   - Docker: verify services start and logs no longer show the original failure.

7. **Regression Check**
   Check nearby flows:
   - login/logout/session refresh
   - protected routes
   - tenant/organization isolation
   - permission failures
   - dashboard shell
   - API error handling
   - Docker dev startup

## Status Model

Use only these statuses:
- `CONFIRMED FIXED`: reproduced, fixed, and verified.
- `LIKELY FIXED`: root cause fixed, but full verification could not run.
- `PARTIALLY FIXED`: some scenarios pass, others remain.
- `NOT FIXED`: issue is still reproducible.
- `BLOCKED`: missing access, data, dependency, environment, or approval.

## Final Report

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

## Forbidden

- "It should work now" without evidence.
- "Fixed" without proof.
- Silent assumptions.
- Large unrelated cleanup.
- Unverified code changes.
- Marking frontend/full-stack bugs done without browser verification or an explicitly approved exception.
