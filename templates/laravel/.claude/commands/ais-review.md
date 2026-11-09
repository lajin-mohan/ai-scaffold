---
description: Parallel code review: backend + frontend + security + qa + architect reviewers. After UI/Component/UX findings, run /ais-qa for live-site…
---

# Command: /ais-review

Runs a full code review on the current feature branch or specified files. Invokes **five reviewers in parallel** by default — backend, frontend, security, qa, architect — then consolidates findings. For **XS/S, low-risk changes**, `--lite` runs one consolidated pass instead of the five-subagent fan-out (see [Lite Review](#lite-review---lite)) — the token-efficient default for small work.

## Usage

```
/ais-review                         # Full parallel review of changes on current branch vs dev
/ais-review src/services/users.ts   # Review a specific file
/ais-review --security-only         # Security review only
/ais-review --frontend-only         # Frontend review only
/ais-review --backend-only          # Backend review only
/ais-review --qa-only               # AC compliance + test coverage review only
/ais-review --architect-only        # Architectural drift + invariant review only
/ais-review --skip-architect        # Run all except architect (e.g. for a typo-fix PR)
/ais-review --lite                  # One consolidated reviewer, no fan-out — XS/S low-risk changes only
```

## Process

1. **Gather context** — read diff, identify touched files, classify changes (backend / frontend / infra / config / spec).
2. **Read the spec** — find the linked BRD section, API contract, and LLD for the feature (qa-reviewer and architect both need this).
3. **Run SAST scan** — Semgrep, gosec, ESLint security plugin, or the project's configured scanner runs against the diff:
   - Identifies hardcoded secrets, SQL injection patterns, insecure crypto
   - Tag findings as `[security]` BLOCK/WARN
4. **Run browser and UX verification for UI/full-stack work**:
   - For changes touching `apps/web/`, routes that drive UI flows, or frontend-visible API behavior, run the project's configured browser/e2e command.
   - Run `/ais-ux-review` against changed UI screens/components or their `docs/ux/` artifacts. `/ais-ux-handoff` (`docs/ux/<module>/tasks/<task-id>/06-dev-handoff.md`) must exist before claiming frontend/full-stack work is done — it is the hard gate for Stage 5.
   - Verify changed UI in desktop light, desktop dark, mobile light, and mobile dark states.
   - Mobile verification must include an approximately 390px-wide viewport and confirm the primary workflow remains usable.
   - Require Playwright failure artifacts (screenshots/traces/videos) to be preserved when tests fail.
   - If the project has no browser E2E harness, report `not verified: no E2E harness` for these checks instead of a BLOCK (the DoD's rule). If it has one and it cannot run, that is a BLOCK unless an explicit exception is approved.
5. **Run stack verification for changed backend/runtime files**:
   - For Go changes touching `cmd/`, `internal/`, `pkg/`, `go.mod`, or Go config, require `go vet ./...`, `go build ./...`, and `go test ./...`.
   - For Go integration-test changes, also run the configured integration command, commonly `go test -tags=integration ./...`.
   - For other stacks, run the lint/typecheck/test/build commands configured in `AGENTS.md` or `.claude/settings-overrides.json`.
6. **Run the reviewers.** Default: the relevant subagents in parallel (below). Under `--lite`: skip the fan-out and run **one consolidated pass in this context** applying the essential lenses inline — correctness vs. spec, security (SAST + the security checklist), and test adequacy — but only after the escalation check in [Lite Review](#lite-review---lite) passes. The relevant subagents (reads `.claude/settings-overrides.json` for feature flags):
   - **`backend-reviewer`** — if any change to `apps/api/`, `cmd/`, `internal/`, `pkg/`, `packages/services/`, `packages/repositories/`, `packages/domain/`, migrations, or backend build config
   - **`frontend-reviewer`** — if any change to `apps/web/`, `packages/ui/`, components, styles
   - **`security-reviewer`** — if any change to auth, sessions, permissions, data access, input handling, secrets, headers, or any new endpoint
   - **`qa-reviewer`** — if a spec/BRD/AC is linked, OR for any feature work. Compliance checks (GDPR, ISO27001, accessibility) only run if the corresponding feature flag is `true` in `settings-overrides.json`
   - **`architect`** — if change touches `>1` architectural layer, introduces a new module, modifies a shared package, or changes any rule in `.claude/rules/`
7. **Consolidate findings** — merge into a single report, deduplicate, sort by severity, attribute findings to source reviewer.
8. **Produce summary** — overall verdict with required actions.

## Reviewer Selection Matrix

| Change type | SAST | backend | frontend | security | qa | architect |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| New API endpoint | ✓ | ✓ | | ✓ | ✓ | ✓ |
| Frontend component | ✓ | | ✓ | | ✓ (if accessibility=true) | |
| Frontend/full-stack user flow | ✓ | | ✓ | | ✓ | |
| Database migration | ✓ | ✓ | | ✓ | ✓ | ✓ |
| Auth / session change | ✓ | ✓ | | ✓ | ✓ | ✓ |
| Refactor (no behaviour change) | ✓ | ✓ | ✓ | | | ✓ |
| Bug fix in existing code | ✓ | ✓ | | (if security-touched) | ✓ | |
| Copy / styling change | | | ✓ | | | |
| Infra / IaC change | ✓ | | | ✓ | | ✓ |
| Rule file change in `.claude/rules/` | | | | | | ✓ |
| Secrets / credentials committed | **BLOCK** | | | ✓ | | |

> **qa-reviewer compliance checks** only run when the corresponding feature flag is `true` in `.claude/settings-overrides.json`. For example, GDPR AC compliance checks only run if `gdpr: true`.

## Lite Review (`--lite`)

For **XS/S changes** (small diff, no critical path — per `task-size-policy.md`), `--lite` runs **one consolidated review pass in the main context** instead of the five-subagent fan-out. It applies the essential lenses inline — correctness vs. spec, security (SAST + the security checklist), and test adequacy — and produces the **same** BLOCK/WARN/NIT report and verdict. This is the token-efficient default for small, low-risk work: it removes the ~5× subagent fan-out on changes that don't warrant it.

**Hard escalation — non-negotiable.** `--lite` **must escalate to the full fan-out** (and say so at the top of the report: `Escalated from --lite: <reason>`) when the change touches **any** of:

- auth, sessions, permissions, or tenant isolation
- payments / billing or any money path
- data access, a database migration, or a new endpoint
- secrets or credentials
- more than ~S size (roughly > 2 files or > ~50 changed lines of logic), or more than one architectural layer
- anything the `Reviewer Selection Matrix` marks **BLOCK**

Lite trims the **fan-out** on trivial work; it never trims the **guardrails** on risky work. Security findings are still always surfaced. When in doubt, run the full review.

## Output Format

```
## Code Review — [Branch / Feature Name]
Date: [date]
Files reviewed: [count]
Reviewers run: backend, frontend, security, qa, architect

---

### BLOCK — Must Fix Before Merge
[Numbered list of blocking findings — each tagged with source reviewer, file:line, and fix description]
1. [security] `apps/api/src/routes/users.ts:42` — SQL string interpolation; use parameterized query.
2. [qa]       AC-03 (tenant isolation) has no test — must add before merge.
3. [architect] `apps/api/src/routes/users.ts:88` — DB query in route handler; move to repository layer per coding-standards.md §Backend.

### WARN — Should Fix Before Merge
[Numbered list of warnings]

### NIT — Optional Improvements
[Numbered list of minor items]

---

### Security Findings
[From security-reviewer — separate section for visibility, even if no BLOCK/WARN]

### UX Review
| Check | Status | Notes |
|---|---|---|
| `/ais-ux-review` | ✅ / ⚠ / ❌ | Required for changed frontend screens/components |
| Design-system compliance | ✅ / ⚠ / ❌ | Enterprise UX, density, hierarchy, accessibility |
| Mobile workflow | ✅ / ⚠ / ❌ | Primary actions, filters, status, and forms usable at 390px |
| Theme switching | ✅ / ⚠ / ❌ | Light/dark states use tokens and preserve page state |
| Branding override compatibility | ✅ / ⚠ / ❌ | Organization branding can override colors without code changes |

### Browser Verification
| Check | Status | Notes |
|---|---|---|
| Configured browser/e2e command | ✅ / ⚠ / ❌ | Required for frontend/full-stack tasks when the project has a harness; otherwise `not verified: no E2E harness` |
| Desktop light theme | ✅ / ⚠ / ❌ | Required for changed UI screens |
| Desktop dark theme | ✅ / ⚠ / ❌ | Required for changed UI screens |
| Mobile light theme (390px) | ✅ / ⚠ / ❌ | Required for changed UI screens |
| Mobile dark theme (390px) | ✅ / ⚠ / ❌ | Required for changed UI screens |
| Failure artifacts | ✅ / ⚠ / ❌ | Screenshots/traces/videos captured when applicable |

### AC Compliance Status (from qa-reviewer)
| AC | Status | Notes |
|---|---|---|
| AC-01 | ✅ Implemented + tested | |
| AC-02 | ⚠ Implemented, no test | Add unit test before merge |
| AC-03 | ❌ Not implemented | BLOCK |

### Architectural Drift (from architect)
- {{Findings about layer violations, invariant breaches, or pattern drift — or "None" if clean}}

---

### Overall Verdict
🔴 BLOCKED — [N] blocking issues must be resolved
🟡 APPROVED WITH WARNINGS — address [N] warnings before merge
🟢 APPROVED — no significant issues found
```

## Notes

- Feature flags are read from `.claude/settings-overrides.json` — compliance checks (GDPR, ISO27001, accessibility) only run when the corresponding feature is `true`.
- Findings tagged BLOCK prevent merge — they are not suggestions.
- Security findings are always surfaced regardless of `--backend-only` or `--frontend-only` flags — security never opts out.
- QA findings appear whenever a spec is linked, even with `--backend-only` — AC compliance is independent of which layer changed.
- SAST findings (Semgrep) are tagged `[SAST]` and always included — they are security-adjacent and may overlap with `security-reviewer`.
- UX review is required before frontend/full-stack tasks can be marked `DONE`; missing `/ais-ux-review` evidence is a BLOCK unless explicitly waived.
- Browser verification is required before frontend/full-stack tasks can be marked `DONE` when the project has a browser E2E harness; missing evidence from that harness is a BLOCK unless explicitly waived. Without a harness, the report states `not verified: no E2E harness`.
- Frontend/full-stack tasks cannot be marked `DONE` unless desktop light, desktop dark, mobile light, and mobile dark checks are passed, explicitly waived, or disclosed as `not verified: no E2E harness`.
- Missing mobile workflow support at 390px is a BLOCK.
- Missing light/dark theme support is a BLOCK for new pages and at least WARN for legacy pages touched by the change.
- Hardcoded brand colors outside centralized token/default-branding definitions are a BLOCK when they prevent organization branding overrides.
- If the diff is >500 lines, split the review by file group and run iteratively. Architect reviewer reads the full diff to spot cross-cutting drift.
- For trivial PRs (single-file typo, copy change), use `--lite` — one consolidated pass, no subagent fan-out — to keep review cost proportionate to the change. It auto-escalates to the full review if the diff turns out to touch a critical path (see [Lite Review](#lite-review---lite)).
- View current feature flags: `.claude/settings-overrides.json`

## Next Steps After /ais-review

After all BLOCK findings are resolved, route based on what was found:

| Finding type | Next step |
|---|---|
| Frontend / Component / UX findings | Run `/ais-qa` for live-site browser verification before Stage 7 human review |
| Backend logic or security findings | Proceed directly to Stage 7 human review |
| No findings | Proceed directly to Stage 7 human review |

**`/ais-review` does static analysis. `/ais-qa` does live-site verification. Use both for frontend features.**

---

## Test-suite quality review

When the change adds or edits tests, the `qa-reviewer` also checks the suite itself.

### Review Dimensions

#### QA Evidence Framework

Every QA review must verify or explicitly mark N/A for these 7 evidence categories: schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, and security.

#### 1. Traceability

Every test maps to a requirement or acceptance criterion.

```
Requirement → Test trace:
  AC-01 (CSV upload) → uploadCsv.test.ts ✅
  AC-02 (Duplicate detection) → uploadCsv_duplicates.test.ts ✅
  AC-03 (Tenant isolation) → uploadCsv_crossTenant.test.ts ✅
  AC-04 (Invalid file) → uploadCsv_invalidFile.test.ts ⚠ MISSING
```

**BLOCK if:** A requirement has no test. Every AC must be covered.

#### 2. Test Independence

Each test can run standalone, in any order.

```
Independence check:
  uploadCsv.test.ts — ✅ no shared state, isolated DB transaction
  uploadCsv_duplicates.test.ts — ⚠ depends on uploadCsv.test.ts running first

BLOCK: Tests that depend on execution order are not tests — they're scripts.
```

**BLOCK if:** A test fails when run alone or in reverse order.

#### 3. Data Isolation

Tests don't share data. They create and clean up their own fixtures.

```
Data isolation check:
  Tests use factory/fixture functions — ✅
  Tests truncate tables between runs — ✅
  Tests don't depend on data from other tests — ✅
```

**BLOCK if:** Test data leaks between tests.

#### 4. CI Command Correctness

Each test has a correct CI command that runs it in isolation.

```
CI command check:
  Unit:      npm run test:unit -- --run          ✅
  Integ:     npm run test:integration             ✅
  E2E:       the project's E2E command, or none  ✅ (none: say so)
  All:       npm test                             ✅ (runs unit + integration)
```

**WARN if:** No CI command documented for a test suite.

#### 5. Edge Case Coverage

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

### Severity Model

| Severity | Meaning | Must Fix Before Merge? |
|---|---|---|
| **BLOCK** | Test gap or independence violation — coverage claim is false | Yes |
| **HIGH** | Missing edge cases, data leakage, or incorrect CI command | Yes |
| **MEDIUM** | Traceability unclear, coverage below target | Acknowledge in PR |
| **LOW** | Test naming, assertion style, minor coverage gap | Optional |
