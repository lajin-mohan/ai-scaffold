# /investigate

Systematic debugging with root cause investigation. Four phases: investigate, analyze, hypothesize, implement. No fix without root cause — fixing symptoms creates whack-a-mole debugging.

Iron Law: **no fixes without root cause investigation first.**

---

## Usage

```
/investigate                       # interactive — prompted for symptom
/investigate "users get white screen on /dashboard"  # pre-described
```

---

## Iron Law (Non-Negotiable)

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Every fix that doesn't address root cause makes the next bug harder to find.
Symptoms recur. Systems accumulate workarounds. Debt compounds.

When a bug report arrives, investigate before coding. Form a hypothesis.
Test it. Only when root cause is confirmed does implementation begin.

---

## When to Run

- User reports an error, 500, stack trace, or unexpected behavior
- "It was working yesterday" or "this broke suddenly"
- Task to understand an unknown subsystem or unfamiliar code
- Bug fix where the cause isn't immediately obvious

**When NOT to run:**
- Typo or obvious one-line fix — just fix it
- Request to "improve X" with no bug signal
- Feature implementation (use `/start-task` instead)

---

## Phase 1 — Root Cause Investigation

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

## Scope Lock

After stating the root cause hypothesis, lock edits to the affected module.

Write the restricted directory to `.claude/memory/investigate-scope.txt`:
```bash
echo "<affected-directory>" > .claude/memory/investigate-scope.txt
```

Tell the user: "Edits restricted to `<dir>/` for this investigation session."

**Why:** Focus. Bugs attract scope creep. Locking prevents "while we're here" fixes that introduce new bugs.

**To unlock:** Write an empty file: `echo "" > .claude/memory/investigate-scope.txt`

---

## Phase 2 — Pattern Analysis

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

## Phase 3 — Hypothesis Testing

**Test the hypothesis before implementing.**

1. Add targeted debug output to confirm what is actually happening vs. what you expect
2. Run reproduction steps — confirm the hypothesis explains the failure
3. If hypothesis is wrong: gather more evidence, form new hypothesis, repeat

**3-strike rule:** After 3 failed hypotheses, STOP. Ask the user:
- **A) Continue** — describe the new hypothesis before proceeding
- **B) Escalate** — this requires human code review or domain knowledge
- **C) Monitor** — add logging and wait for next occurrence with more data

Do not keep guessing past 3 strikes. The problem may be in an unexpected layer.

---

## Phase 4 — Implementation

**Only after root cause is confirmed.**

1. Fix the root cause, not the symptom
2. Minimal diff — fewest files touched, targeted change
3. Write a regression test:
   - Must **fail** without the fix (confirms it reproduces the bug)
   - Must **pass** with the fix (confirms the fix works)
   - Place in the same directory as the bug, alongside existing tests
4. Run the full test suite — confirm no regressions
5. If the fix touches **>5 files**: flag the blast radius before proceeding

**Rules:**
- Never apply a fix you cannot verify
- Never say "this should fix it" — verify and prove
- If you cannot reproduce the bug, you cannot confirm the fix

---

## Phase 5 — Verification & Report

**Prove the fix. Document the finding.**

After implementing, reproduce the original scenario and confirm it no longer fails.

```
DEBUG REPORT
─────────────────────────────────────────
Symptom:       [what was observed]
Root cause:    [what was wrong — specific, not vague]
Fix:           [file:line] — [one-line description]
Evidence:      [test output showing fix works]
Regression test: [file:line] — [what it tests]
Status:        DONE | DONE_WITH_CONCERNS | BLOCKED
─────────────────────────────────────────
```

**Completion statuses:**
- `DONE` — root cause found, fix verified, regression test written
- `DONE_WITH_CONCERNS` — fix applied but architecture concern remains
- `BLOCKED` — cannot reproduce, cannot verify, or requires more context

---

## Capture Learnings

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

---

## Rules

- **No fix without investigation.** Phase 1 is mandatory before Phase 4.
- **Reproduce before fixing.** If you can't trigger the bug, you can't confirm the fix.
- **3 failed hypotheses = STOP.** Ask, don't guess.
- **Scope lock.** Focus on the affected module. "While we're here" fixes are banned.
- **Regression test required.** Every bug fix ships with a test that fails without the fix.
- **Minimal diff.** Fix the root cause. Don't refactor adjacent code.
- **>5 files touched = flag blast radius.** Ask before proceeding.
- **Log the lesson.** Every completed investigation improves the project's immune system.

---

## Interaction with /start-task

- `/investigate` = root cause analysis for bugs and understanding unknown code
- `/start-task` = plan-and-confirm for building new features

They serve different gates. Run `/investigate` when something is broken or unknown. Run `/start-task` when starting new work.

## Interaction with /qa

- `/investigate` = root cause debugging when the cause is unknown. Used for backend bugs, logic errors, unexpected behaviour.
- `/qa` = live-site verification when the symptom is visible in the browser. Used for rendering issues, interaction failures, console errors.

Run `/investigate` when you need to find *why* something broke. Run `/qa` when you need to confirm *that* something breaks in the browser — and verify the fix works. They complement each other: `/investigate` narrows the cause, `/qa` confirms the effect.