# Developer Role Tutorial

**Role:** `dev` | **Default command:** `/start-task` | **Purpose:** Feature implementation, bug fixing, and production code quality

---

## When to Use This Role

You are the **dev** when you need to:
- Implement a new feature from a spec
- Fix a bug or defect
- Write tests for existing code
- Commit and prepare code for review
- Debug an issue and apply a fix

**Not the dev role:** architecture decisions, UX design, project planning, QA verification.

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "dev"
}
```

### 2. Pick up a task

```bash
/start-task
```

This reads the ticket spec, proposes a numbered plan, waits for your "go", then executes and verifies.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/start-task` | Begin any implementation task | Numbered plan, approval gate, execution |
| `/gen-tests` | Write tests for a feature | Runnable test files with assertions |
| `/review` | Run AI review before human review | BLOCK/WARN/QUESTION findings |
| `/debug-fix` | Investigate and fix a bug | Root cause + minimal fix + regression test |
| `/investigate` | Root cause analysis when error is reported | Evidence → hypothesis → test → fix |
| `/commit-changes` | Stage, commit, and optionally push changes | Git commit with correct identity |
| `/health` | Check code quality (lint, typecheck, tests) | Composite score dashboard |
| `/lessons` | Record a mistake pattern after correction | Saved to `tasks/lessons.md` |
| `/reflect` | Review session outcome, log decisions | Saved to memory |

---

## Step-by-Step Workflow

### Feature Implementation

```
1. Set role → "dev" in settings.local.json
2. Run /start-task
   → Claude reads the ticket spec
   → Proposes a numbered plan (route → service → repo → tests)
   → Waits for "go"
3. Execute plan
   → Write code per the spec
   → Write tests (happy path + 2 edge cases)
   → Run lint + typecheck + tests
4. Run /review
   → Address all BLOCK findings
   → Acknowledge WARN findings in PR
5. Run /commit-changes
   → Stage and commit with correct identity
   → Push to remote (if authorized)
```

### Bug Fix

```
1. Run /debug-fix
   → Claude investigates the error
   → Gathers evidence, forms hypothesis
   → Identifies root cause (not symptom)
2. Fix is applied with regression test
3. Verify fix works: tests pass, original repro no longer triggers
4. Run /commit-changes
```

### Test Writing

```
1. Run /gen-tests
   → Specify the feature or file to cover
   → Claude generates unit + integration tests
   → Tests cover happy path + edge cases + auth/tenant isolation
2. Run the tests: ensure all pass
3. Review test quality (independent, deterministic, no shared state)
```

---

## Required Evidence Gates

Before claiming "done", all of these must pass:

- [ ] `lint_pass` — lint has zero errors
- [ ] `typecheck_pass` — TypeScript/PHPStan/Pyright has zero errors
- [ ] `tests_pass` — all tests pass (new + existing)
- [ ] `build_pass` — project builds without errors
- [ ] `review_blocks_resolved` — all `/review` BLOCK findings fixed

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

## Calling Specialist Agents

When work gets complex, invoke a specialist:

```
@backend-reviewer   — deep review of server-side logic, security, performance
@frontend-reviewer  — UI correctness, design-system compliance, accessibility
@critic             — challenge your implementation choices before review
@devops-engineer    — infrastructure, CI/CD, deployment questions
```

---

## Common Scenarios

### Scenario 1: New endpoint

```
User: "Add a DELETE /api/v1/projects/:id endpoint"

1. Claude checks: is there a spec/BRD? → If not, asks for it
2. Runs /start-task with the spec
3. Plan includes: route handler → service → repository → migration → tests
4. Executes, runs lint/tests, fixes BLOCK findings
5. Runs /review, resolves BLOCKs
6. Runs /commit-changes
```

### Scenario 2: Fix a failing test

```
User: "TestCandidateRepository::testFindById is failing"

1. Claude runs /debug-fix
2. Reads the test, runs it, identifies root cause
3. Fixes the minimal cause (not the symptom)
4. Re-runs test → passes
5. Runs full test suite → all pass
6. Commits with message explaining why the fix was needed
```

### Scenario 3: Refactor a service

```
User: "Refactor UserService to use dependency injection"

1. Claude runs /start-task with the refactor spec
2. Plan: identify constructor deps → inject via constructor → update callers → tests still pass
3. No new features — pure refactor
4. Runs /review (same evidence gates apply)
5. Commits with "refactor(scope): description" format
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `/start-task` says no spec found | Create ticket file in `tasks/todo/<TICKET-ID>.md` or link to Jira ticket |
| Tests fail after implementation | Re-read spec — implementation may have drifted from spec |
| `/review` has many BLOCKs | Address them one by one, don't skip — each BLOCK is a real issue |
| "No tests exist" | Run `/gen-tests` to generate them before implementing |
| Stale memory conflicts with code | Code wins. Update memory. Don't act on stale memory. |
| "I don't know" response | This is correct. Ask the user or run a search to find out. |

---

## Related Files

- Role config: [dev.yaml](dev.yaml)
- AI coding rules: [.claude/rules/ai-coding-rules.md](../rules/ai-coding-rules.md)
- Testing rules: [.claude/rules/testing-rules.md](../rules/testing-rules.md)
- DoD rules: [.claude/rules/dod-rules.md](../rules/dod-rules.md)