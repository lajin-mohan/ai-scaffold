---
description: Root-cause-first bug fixing: plan → reproduce → analyze → implement → verify → report. 5-status model. Required verification by bug type.
---

# /ais-debug

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

- **Frontend/full-stack:** browser verification is required with the project's E2E harness or a documented approved exception; with no harness, report `not verified: no E2E harness`.
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

---

## Root-cause investigation

Use this when the cause is not obvious.

### Iron Law (Non-Negotiable)

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Every fix that doesn't address root cause makes the next bug harder to find.
Symptoms recur. Systems accumulate workarounds. Debt compounds.

When a bug report arrives, investigate before coding. Form a hypothesis.
Test it. Only when root cause is confirmed does implementation begin.

---

### When to Run

- User reports an error, 500, stack trace, or unexpected behavior
- "It was working yesterday" or "this broke suddenly"
- Task to understand an unknown subsystem or unfamiliar code
- Bug fix where the cause isn't immediately obvious

**When NOT to run:**
- Typo or obvious one-line fix — just fix it
- Request to "improve X" with no bug signal
- Feature implementation (use `/ais-plan` instead)

---

### Phase 1 — Root Cause Investigation

**Collect evidence first.**

1. **Error messages and stack traces** — read exactly what failed, where, and when
2. **Reproduction steps** — can you trigger it deterministically? If not, gather more evidence first
3. **Trace the code path** — read the code around the symptom. Follow the data flow from entry to failure point
4. **Check recent changes** — `git log --oneline -20 -- <affected-files>` — did something change recently that could cause this?
5. **Check prior context** — `git blame <file>` for the line that failed. Has it always been this way or did a recent change introduce it?

**Output:** State the root cause hypothesis clearly:
```
Root cause hypothesis: [specific, testable claim]
Evidence: [what led to this conclusion]
```

Do not move to Phase 2 until the hypothesis is stated. Guessing wastes time.

---

### Scope Lock

After stating the root cause hypothesis, lock edits to the affected module.

Write the restricted directory to `.claude/memory/investigate-scope.txt`:
```bash
echo "<affected-directory>" > .claude/memory/investigate-scope.txt
```

Tell the user: "Edits restricted to `<dir>/` for this investigation session."

**Why:** Focus. Bugs attract scope creep. Locking prevents "while we're here" fixes that introduce new bugs.

**To unlock:** Write an empty file: `echo "" > .claude/memory/investigate-scope.txt`

---

### Phase 2 — Pattern Analysis

**Known bug patterns — check if this matches one.**

| Pattern | Signs |
|---|---|
| Race condition | Intermittent failure, order-dependent, concurrent access |
| Nil/null propagation | `Cannot read X of undefined`, chain of nullable calls |
| State corruption | Works on fresh start, fails after session progresses |
| Integration failure | Third-party timeout, 500 from external service, config mismatch |
| Configuration drift | Works locally, fails in another environment |
| Stale cache | Fails after cache TTL, works after hard refresh |

Also check:
- `TODOS.md` for known issues in the affected area
- `tasks/lessons.md` for similar past bugs
- `git log --grep="<keyword>"` for prior fixes in the same area

---

### Phase 3 — Hypothesis Testing

**Test the hypothesis before implementing.**

1. Add targeted debug output to confirm what is actually happening vs. what you expect
2. Run reproduction steps — confirm the hypothesis explains the failure
3. If hypothesis is wrong: gather more evidence, form new hypothesis, repeat

**3-strike rule:** After 3 failed hypotheses, STOP. Ask the user:
- **A) Continue** — describe the new hypothesis before proceeding
- **B) Escalate** — this requires human code review or domain knowledge
- **C) Monitor** — add logging and wait for next occurrence with more data

Do not keep guessing past 3 strikes. The problem may be in an unexpected layer.

### Capture Learnings

After completing, log the finding to `tasks/lessons.md`:
```markdown
## YYYY-MM-DD - [Bug category or system]

- **Symptom:** [one-line description]
- **Root cause:** [what was wrong]
- **Fix:** [file:line or pattern]
- **Why it happened:** [systematic reason — not just "bug"]
- **Rule:** [what to do differently next time]
```

This prevents the same root cause from repeating across the project.
