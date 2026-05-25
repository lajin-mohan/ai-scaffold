# /health

Code quality dashboard. Runs available project tools (type checker, linter, test runner, dead code detector, shell linter), computes a weighted composite 0-10 score, and presents a tabular dashboard with trend history and recommendations.

**HARD GATE: Show only. Never fix anything.** This command diagnoses, not treats.

---

## Usage

```
/health                          # run all detected tools
/health --tool lint             # run specific category only
/health --trend                 # show trend history without running
```

---

## Step 1 — Detect Health Stack

Auto-detect available tools from project files. Run this check once per project; subsequent runs use the saved stack.

### Detection Rules

| File found | Tool | Command |
|---|---|---|
| `tsconfig.json` | TypeScript type checker | `tsc --noEmit` |
| `biome.json` / `biome.jsonc` | Biome linter | `biome check . --error-on=warnings` |
| `eslint.config.*` / `.eslintrc*` | ESLint | `eslint . --max-warnings=0` |
| `ruff.toml` / `pyproject.toml` (with ruff) | Ruff | `ruff check .` |
| `pylintrc` / `pyproject.toml` (with pylint) | Pylint | `pylint $(find app -name "*.py" | head -50)` |
| `package.json` (test script) | Node test runner | `npm test` or configured test script |
| `pytest.ini` / `pyproject.toml` (with pytest) | Pytest | `pytest` |
| `Cargo.toml` | Rust test runner | `cargo test` |
| `go.mod` | Go test runner | `go test ./...` |
| `knip` in package.json / `knip.jsonc` | Dead code | `npx knip` |
| `shellcheck` available + `.sh` files found | Shell linter | `shellcheck $(find . -name "*.sh" -not -path "./node_modules/*")` |

### Output

```
Health Stack detected:
  Type check:  tsc --noEmit
  Lint:        biome check .
  Tests:       npm test
  Dead code:   npx knip
  Shell lint:   shellcheck (4 .sh files found)

Run with these tools? (y/n)
```

- `y` → proceed to Step 2
- `n` → prompt for manual tool specification

### Persistence

Save detected stack to `.claude/memory/health-stack.json` (gitignored). On subsequent runs, read from this file unless `--rescan` is passed.

---

## Step 2 — Run Tools

Run each detected tool sequentially. Capture for each:

- Exit code (`0` = pass, else = fail)
- Duration (wall clock time)
- Last 50 lines of output (for issue listing)
- Whether the tool was installed at all (`SKIPPED`)

If a tool is not installed or the project doesn't have the relevant files:
```
Type check:  SKIPPED — no tsconfig.json found
Linting:      SKIPPED — biome.json absent
```

**SKIPPED is not a failure.** It means that category doesn't apply to this project. Redistribute its weight to present a fair composite score.

---

## Step 3 — Score Each Category

### Scoring Rubric

| Category | Weight | 10 (Clean) | 7 | 4 | 0 (Critical) |
|---|---|---|---|---|---|
| Type check | 22% | exit 0 | <10 errors | <50 errors | >=50 errors or exit !=0 |
| Lint | 18% | 0 issues | <5 warnings | <20 warnings | >=20 warnings |
| Tests | 28% | 100% pass | >95% pass | >80% pass | <=80% pass |
| Dead code | 13% | 0 unused | <5 unused | <20 unused | >=20 unused |
| Shell lint | 9% | 0 issues | <5 issues | >=5 issues | N/A |
| Hallucination Guard | 10% | 0 violations | <3 violations | <6 violations | >=6 violations |

**Hallucination Guard sub-score (session-self-assessment):**
Scans current session text for unverified claims — any statement about code without a `file:line` citation, any invented API, any guessed flag. Score is a proxy measure based on the current session context.

- Installed + ≤0 violations = 10
- Installed + <3 violations = 7
- Installed + <6 violations = 4
- Installed + ≥6 violations = 0

**Note:** This is a self-assessment proxy, not a perfect measurement. It captures the AI's own check of H1-H8 adherence during this session. Past sessions are not retroactively scored.

**GBrain sub-score removed.** GBrain is Engyne-specific and not in scope for this scaffold.

### Composite Score

```
composite = Σ (weight_i × score_i / 10)
```

Presented as `X.X / 10`.

If a category is SKIPPED, redistribute its weight proportionally:
```
remaining_weight = 1 - Σ(skipped_weights)
adjusted_weights = weight / remaining_weight × 1
```

---

## Step 4 — Present Dashboard

```
CODE QUALITY DASHBOARD — branch: dev
────────────────────────────────────────────────────────────
Category      Tool              Score   Status    Duration  Details
────────────────────────────────────────────────────────────
Type check    tsc --noEmit      10/10   CLEAN     3s        0 errors
Lint           biome check .       8/10   WARNING   2s        3 warnings: apps/api/src/routes/auth.ts:12, apps/api/src/middleware/cors.ts:8, packages/shared/src/utils/format.ts:3
Tests         npm test          10/10   CLEAN    12s        47/47 passed
Dead code     npx knip           7/10   WARNING   5s        4 unused exports: apps/web/src/hooks/useLegacyAuth.ts:1, ...
Shell lint    shellcheck        10/10   CLEAN     1s        0 issues
Halluc. Guard self-critique      10/10   CLEAN     —         session violations: 0

────────────────────────────────────────────────────────────
COMPOSITE SCORE: 9.1 / 10                           23s total
Status: 🟢 WARNING
────────────────────────────────────────────────────────────
```

### Status Labels

| Score range | Label | Color |
|---|---|---|
| 10 | CLEAN | Green |
| 7–9 | WARNING | Yellow |
| 4–6 | NEEDS WORK | Orange |
| 0–3 | CRITICAL | Red |

If any category is `< 7`, show the top 3 issues with file:line and rule/message.

---

## Step 5 — Persist History

Append to `.claude/memory/health-history.jsonl` (gitignored):

```json
{"ts":"2026-05-16T10:30:00.000Z","branch":"dev","score":9.1,"typecheck":10,"lint":8,"test":10,"deadcode":7,"shell":10,"hallucination":10,"duration_s":23}
```

One JSON object per line. No flushing needed — append is atomic on POSIX.

---

## Step 6 — Trend Analysis

Read last 10 entries from history. If prior entries exist:

```
Trend (last N runs):
  Run 1:   2026-05-12  9.1  (+0.0 from baseline)
  Run 2:   2026-05-13  8.7  (-0.4 lint warnings introduced)
  Run 3:   2026-05-16  9.1  (+0.4 lint cleaned up)
```

Show which categories changed and by how much. If score dropped, flag it.

### Recommendations

Ranked by `weight × (10 - score)` descending (highest impact first):

```
Top recommendations:
1. [Lint] — 3 warnings in apps/api/src/ — clean these up to reach 10/10 (weight 18%)
2. [Dead code] — 4 unused exports — review for removal or export (weight 13%)
3. [Halluc. Guard] — N violations — self-critique check: verify every claim has file:line citation before output (weight 10%)
```

Only recommend, never act. HARD GATE: `/health` diagnoses, it does not treat.

---

## First Run

On first run (no history), skip trend analysis and say:

```
No prior history. This is the baseline run.
Run /health again later to see the trend.
```

---

## Rules

- **Show only. Never fix.** This is a diagnostic command. You report the dashboard; the team decides what to address.
- **Wrap, don't replace.** Use the project's own tools. Don't invent parallel checkers.
- **SKIPPED ≠ failed.** A missing tool means that category doesn't apply, not that the project has a problem.
- **Honest scores.** Don't soften a 4/10 into a 7/10. The score is the score.
- **Reproducible.** Running `/health` twice in a row with no code changes must give the same score.

---

## Verification

```
# No tools configured
/health → "No health tools detected. Configure a type checker, linter, or test runner."

# Clean codebase
/health → composite 10/10, all CLEAN, "No prior history" message

# Second run
/health → trend table shows vs first run
```

---

## Related Commands

- `/review` — runs parallel AI review (correctness, security, performance)
- `/investigate` — root cause debugging for bugs
- `/gen-tests` — generates test suites for features
- `/lessons` — queries past root causes and debugging lessons

`/health` tracks health metrics; `/review` and `/investigate` address specific findings.