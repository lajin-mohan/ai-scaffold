# /qa

Browser-based QA: open a real browser, walk the feature flow, find what breaks, fix it, re-verify.

Requires gstack's browse daemon (`$B`). If gstack is not installed, this command is unavailable — see [Prerequisites](#prerequisites) below.

---

## Usage

```
/qa                         # interactive — prompted for feature scope
/qa "login flow"            # pre-described scope
/qa-only                    # same methodology, report only — no code changes
```

---

## When to Run

**/`review` does static analysis.** It cannot see:
- Whether a page renders at all
- Whether a button click actually works
- Whether a form submission completes
- Whether a modal opens, closes, and returns focus correctly
- Console errors that don't throw exceptions

**Run `/qa`** when:
- `/review` flagged a UI feature (Component, Frontend, or UX finding)
- A feature has a human-verifyable flow (login, form submit, multi-step wizard)
- QA sign-off is needed and a real browser is the fastest way
- You want to catch rendering or interaction bugs before a human tester does

**Run `/qa-only`** when:
- You just need a report, not a fix
- You are handing off to a human QA engineer
- The feature touches third-party integrations that should be tested live

---

## Prerequisites

### gstack (headless browser)

`/qa` requires gstack's browse daemon. Install it once per machine:

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

### Browser cookies (optional, for authenticated testing)

If testing behind a login wall, import cookies from your real browser:

```
/setup-browser-cookies
```

This opens a browser window to authenticate, then captures the session so subsequent `/qa` runs are logged in automatically.

---

## How It Works

### `/qa` — find and fix

```
Phase 1 — Navigate
  $B opens the target URL
  Walk the feature flow step by step (e.g. /login → /dashboard → /settings)

Phase 2 — Detect
  For each step, capture:
    - Rendering: are all elements visible and correctly sized?
    - Interaction: do buttons, forms, modals respond correctly?
    - Console: any errors or warnings?
    - Network: any failed requests?

Phase 3 — Report
  Present findings grouped by severity:
    - CRITICAL: feature is broken or data loss risk
    - HIGH: major flow broken, fallback available
    - MEDIUM: cosmetic or degraded experience
    - LOW: minor friction

Phase 4 — Fix
  Fix the highest-severity issues one at a time
  After each fix: re-verify with $B to confirm the fix works
  Commit fix atomically (one fix per commit, descriptive message)

Phase 5 — Final verify
  Run the full flow again: confirm all issues resolved, no regressions
  Present summary: what broke, what was fixed, what remains
```

### `/qa-only` — report only

Same as Phase 1–3 above, but stops after reporting. No fixes applied.

---

## Output Format

```
QA REPORT — [feature]
────────────────────────────────────────
URL:           https://...
Tester:        gstack / browser
Date:          YYYY-MM-DD

Findings (4 total)
────────────────────────────────────────
[CRITICAL] Login button unresponsive
  URL: /login
  Element: #login-btn
  Expected: clicking navigates to /dashboard
  Actual: nothing happens (no network request, no JS error)
  Severity: CRITICAL — blocks all users

[MEDIUM] Modal missing close on Escape key
  URL: /dashboard
  Element: .modal-overlay
  Expected: Escape key dismisses modal
  Actual: no response
  Severity: MEDIUM — accessibility violation

────────────────────────────────────────
FIXED during session:
  [CRITICAL] Login button unresponsive — fixed in auth.ts:24 (missing event.preventDefault)

REMAINING:
  [MEDIUM] Modal Escape key — fix in modal.tsx:12

Status: FIXED — 1/4 issues resolved, 3 remaining
```

---

## Rules

- **Atomic commits.** One fix per commit. Never bundle multiple bug fixes into one commit.
- **Reproduce before fixing.** If you cannot trigger the bug in the browser, you cannot confirm the fix.
- **Re-verify after fix.** Always re-run the affected step with `$B` before claiming the fix works.
- **Scope lock applies.** `/qa` runs within the same scope-locking mechanism as `/investigate` — if an investigation is in progress, edits are restricted to the affected module only.
- **Report what you cannot fix.** If a finding requires business logic decisions, surface it in the report and stop — do not invent a solution.

---

## Related Commands

- `/review` — static analysis (code correctness, security, performance). Run `/review` first, `/qa` after for UI features.
- `/investigate` — root cause debugging for bugs. Run `/investigate` when the bug's cause is unknown; `/qa` when the symptom is visible in the browser.
- `/gen-tests` — generates automated test suites. `/qa` is for live-site verification; `/gen-tests` creates tests that run in CI.

**Flow:** `/review` → if UI findings, run `/qa` → fix → `/gen-tests` to codify the fix as an automated test.

---

## Limitations

- `/qa` requires a headless browser. If gstack is not installed, the command is unavailable.
- Currently supports Chromium-based browsers only.
- Testing across browsers (Firefox, Safari) requires manual testing or a CI service like BrowserStack.
- File downloads and uploads have limited automation support.