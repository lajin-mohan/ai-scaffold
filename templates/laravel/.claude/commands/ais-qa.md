---
description: Live-site QA in a headless browser - walk the feature, report every issue with severity, priority, root cause and a fix plan, then fix only what the human approves, re-test and hand back for review.
---

# /ais-qa

Browser-based QA: open a real browser, walk the feature flow, and report
**everything** you find, ranked, with a root cause and a fix plan for each.
**Nothing is changed until the human chooses what to fix.** After fixing, test
again and hand back for the human to review and commit, like a normal
development change.

Requires gstack's browse daemon (`$B`), which the scaffold does not install. **Check first:** run `command -v gstack-browse` (or the `$B` helper). If it is not available, stop before Phase 1 and report `not verified: no E2E harness`; do not walk the flow by guesswork. See [Prerequisites](#prerequisites) for installing it, or use the project's own Playwright tests if it has them.

---

## Usage

```
/ais-qa                         # interactive - prompted for feature scope
/ais-qa "login flow"            # pre-described scope
```

After the report, reply with one of:

```
fix all                         # fix every finding
fix QA-1, QA-3                  # fix only the findings you choose
none                            # keep the report, change nothing
```

---

## When to Run

`/ais-review` does static analysis. It cannot see:
- Whether a page renders at all
- Whether a button click actually works
- Whether a form submission completes
- Whether a modal opens, closes, and returns focus correctly
- Console errors that don't throw exceptions

**Run `/ais-qa`** when:
- `/ais-review` flagged a UI feature (Component, Frontend, or UX finding)
- A feature has a human-verifiable flow (login, form submit, multi-step wizard)
- QA sign-off is needed and a real browser is the fastest way
- You want to catch rendering or interaction bugs before a human tester does
- You are handing off to a QA engineer: the report is the handoff

---

## Prerequisites

### gstack (headless browser)

`/ais-qa` requires gstack's browse daemon. Install it once per machine:

```bash
# From the gstack repo
git clone https://github.com/garrytan/gstack.git ~/code/gstack
cd ~/code/gstack && bun install

# Or use the binary directly
./bin/gstack-browse --version
```

Once installed, use the `$B` helper in commands that need browser access:

```bash
$B go to https://example.com
$B click "#login-btn"
$B wait for ".dashboard"
```

### Testing behind a login

Sign in with a test account in the browser session first. If your browser
tool can import cookies from your own browser, follow its documentation. Never
put real credentials in the report.

---

## How It Works

```
Phase 1 - Navigate                                      (read-only)
  $B opens the target URL
  Walk the feature flow step by step (e.g. /login -> /dashboard -> /account)

Phase 2 - Detect                                        (read-only)
  For each step, capture:
    - Rendering: are all elements visible and correctly sized?
    - Interaction: do buttons, forms, modals respond correctly?
    - Console: any errors or warnings?
    - Network: any failed requests?
  Record steps to reproduce, expected vs actual, and the evidence.

Phase 3 - Diagnose                                      (read-only)
  Trace each finding from the symptom into the code.
    - Confirmed root cause: traced to file:line AND reproduced
    - Suspected root cause: a stated hypothesis, not yet proven
  If the cause cannot be traced, say so and recommend /ais-debug for it.

Phase 4 - Report, plan, and STOP                        (read-only)
  Report all findings at once, ranked (see Output Format).
  3 or more findings: also save the report to
    docs/qa/qa-report-<feature>-<YYYY-MM-DD>.md (no need to ask).
  1-2 findings: the report stays in the conversation.
  Ask: "Reply `fix all`, `fix QA-1, QA-3`, or `none`."
  Stop here. Do not edit code until the human replies.

Phase 5 - Fix the approved findings only
  One fix per finding, following its plan.
  Add a regression test for each fix where the project has a test setup.
  A finding outside the approved IDs is not touched, even if it looks easy.

Phase 6 - Re-test and hand back
  Run the browser flow again, including the approved findings' steps.
  Report each fixed finding's status, the files changed and what remains.
  Update the saved report file, if there is one.
  Do not commit. The human reviews the diff, approves, and commits
  with /ais-commit.
```

---

## Severity and priority

Severity is the impact. Priority is the suggested fix order. A Critical issue on
a page nobody uses yet can be P2; a Medium issue on the checkout page can be P1.

| Severity | Meaning |
|---|---|
| Critical | Feature broken, data loss or security risk |
| High | Major flow broken; a workaround exists |
| Medium | Degraded experience or accessibility problem |
| Low | Minor friction or cosmetic |

| Priority | Meaning |
|---|---|
| P1 | Fix before this change merges |
| P2 | Fix soon (this sprint) |
| P3 | Fix later or accept |

---

## Output Format

### Phase 4 report (before any fix)

```
QA REPORT - [feature]
------------------------------------------------------------
URL:      https://...
Tester:   gstack / browser
Date:     YYYY-MM-DD
Saved to: docs/qa/qa-report-login-flow-YYYY-MM-DD.md   (3+ findings only)

Summary: 3 findings - 1 Critical, 1 Medium, 1 Low

| ID   | Severity | Priority | Finding                          | Root cause            |
|------|----------|----------|----------------------------------|-----------------------|
| QA-1 | Critical | P1       | Login button does nothing        | Confirmed - auth.ts:24 |
| QA-2 | Medium   | P2       | Escape does not close the modal  | Suspected - modal.tsx |
| QA-3 | Low      | P3       | Footer link underline missing    | Confirmed - footer.css:8 |

QA-1  Login button does nothing                        Critical / P1
  Steps:      open /login, enter valid details, click "Sign in"
  Expected:   navigates to /dashboard
  Actual:     nothing happens; no network request, no console error
  Root cause: Confirmed - submit handler at auth.ts:24 never calls the API
              because the form's default submit reloads the page first
  Fix plan:   call event.preventDefault() in the handler; add a regression
              test that submitting calls the login API; re-check in browser
  Risk:       low - one handler

(QA-2 and QA-3 in the same format)

Reply `fix all`, `fix QA-1, QA-3`, or `none`.
```

### Phase 6 hand-back (after approved fixes)

```
QA RE-TEST - [feature]
------------------------------------------------------------
Approved: QA-1, QA-3

| ID   | Status          | Change                         | Re-test  |
|------|-----------------|--------------------------------|----------|
| QA-1 | CONFIRMED FIXED | auth.ts:24 + auth.test.ts      | passes   |
| QA-3 | CONFIRMED FIXED | footer.css:8                   | passes   |

Not fixed (not approved): QA-2
Regressions found in re-test: none

Files changed (uncommitted):
  src/auth.ts
  src/auth.test.ts
  src/footer.css

Next: review the diff, then commit with /ais-commit.
```

Status is one of `CONFIRMED FIXED`, `LIKELY FIXED`, `PARTIALLY FIXED` or
`NOT FIXED`. Use `CONFIRMED FIXED` only when the re-test passed in the browser.

---

## Rules

- **Report first, fix only on approval.** Phases 1-4 change no files except the
  saved report. A finding the human did not approve is never fixed.
- **Never commit.** Leave changes uncommitted for the human to review and commit
  with `/ais-commit`.
- **Reproduce before fixing.** If you cannot trigger the bug in the browser, you
  cannot confirm the fix; say so in the report.
- **Re-test after fixing.** Always re-run the affected steps with `$B` before
  reporting a status.
- **Label root causes honestly.** Confirmed means traced and reproduced;
  anything else is Suspected.
- **Scope lock applies.** `/ais-qa` runs within the same scope-locking mechanism
  as `/ais-debug`: if an investigation is in progress, edits are restricted to
  the affected module only.
- **Report what you cannot fix.** If a finding needs a business decision, surface
  it in the report and do not invent a solution.

---

## Related Commands

- `/ais-review` - static analysis (code correctness, security, performance). Run `/ais-review` first, `/ais-qa` after for UI features.
- `/ais-debug` - root cause debugging. Use it for a finding whose cause `/ais-qa` could not trace.
- `/ais-gen-tests` - generates automated test suites. `/ais-qa` is for live-site verification; `/ais-gen-tests` creates tests that run in CI.
- `/ais-commit` - commit the approved, re-tested fixes after your review.

**Flow:** `/ais-review` -> `/ais-qa` (report) -> you choose -> fixes + re-test -> you review -> `/ais-commit`.

---

## Limitations

- `/ais-qa` requires a headless browser. If gstack is not installed, the command is unavailable.
- Currently supports Chromium-based browsers only.
- Testing across browsers (Firefox, Safari) requires manual testing or a CI service like BrowserStack.
- File downloads and uploads have limited automation support.
- The stop before fixing is an instruction to the AI, not a mechanical gate. Claude Code's own permission prompts still apply to every edit.
