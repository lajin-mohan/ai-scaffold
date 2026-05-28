# Command: /review

Runs a full code review on the current feature branch or specified files. Invokes **five reviewers in parallel** by default — backend, frontend, security, qa, architect — then consolidates findings.

## Usage

```
/review                         # Full parallel review of changes on current branch vs dev
/review src/services/users.ts   # Review a specific file
/review --security-only         # Security review only
/review --frontend-only         # Frontend review only
/review --backend-only          # Backend review only
/review --qa-only               # AC compliance + test coverage review only
/review --architect-only        # Architectural drift + invariant review only
/review --skip-architect        # Run all except architect (e.g. for a typo-fix PR)
```

## Process

1. **Gather context** — read diff, identify touched files, classify changes (backend / frontend / infra / config / spec).
2. **Read the spec** — find the linked BRD section, API contract, and LLD for the feature (qa-reviewer and architect both need this).
3. **Run SAST scan** — Semgrep or ESLint security plugin runs against the diff:
   - Identifies hardcoded secrets, SQL injection patterns, insecure crypto
   - Tag findings as `[security]` BLOCK/WARN
4. **Run browser and UX verification for UI/full-stack work**:
   - For changes touching `apps/web/`, routes that drive UI flows, or frontend-visible API behavior, run `npm run test:e2e`.
   - Run `/ux-review` against changed UI screens/components or their `docs/ux/` artifacts. `/ux-handoff` (`08-dev-handoff.md`) must exist before claiming frontend/full-stack work is done — it is the hard gate for Stage 5.
   - Verify changed UI in desktop light, desktop dark, mobile light, and mobile dark states.
   - Mobile verification must include an approximately 390px-wide viewport and confirm the primary workflow remains usable.
   - Require Playwright failure artifacts (screenshots/traces/videos) to be preserved when tests fail.
   - If browser verification is unavailable, report it as a BLOCK for frontend/full-stack tasks unless an explicit exception is approved.
5. **Run relevant reviewers in parallel** (reads `.claude/settings-overrides.json` for feature flags):
   - **`backend-reviewer`** — if any change to `apps/api/`, `packages/services/`, `packages/repositories/`, `packages/domain/`, migrations
   - **`frontend-reviewer`** — if any change to `apps/web/`, `packages/ui/`, components, styles
   - **`security-reviewer`** — if any change to auth, sessions, permissions, data access, input handling, secrets, headers, or any new endpoint
   - **`qa-reviewer`** — if a spec/BRD/AC is linked, OR for any feature work. Compliance checks (GDPR, ISO27001, accessibility) only run if the corresponding feature flag is `true` in `settings-overrides.json`
   - **`architect`** — if change touches `>1` architectural layer, introduces a new module, modifies a shared package, or changes any rule in `.claude/rules/`
6. **Consolidate findings** — merge into a single report, deduplicate, sort by severity, attribute findings to source reviewer.
7. **Produce summary** — overall verdict with required actions.

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
| `/ux-review` | ✅ / ⚠ / ❌ | Required for changed frontend screens/components |
| Design-system compliance | ✅ / ⚠ / ❌ | Enterprise UX, density, hierarchy, accessibility |
| Mobile workflow | ✅ / ⚠ / ❌ | Primary actions, filters, status, and forms usable at 390px |
| Theme switching | ✅ / ⚠ / ❌ | Light/dark states use tokens and preserve page state |
| Branding override compatibility | ✅ / ⚠ / ❌ | Organization branding can override colors without code changes |

### Browser Verification
| Check | Status | Notes |
|---|---|---|
| `npm run test:e2e` | ✅ / ⚠ / ❌ | Required for frontend/full-stack tasks |
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
- UX review is required before frontend/full-stack tasks can be marked `DONE`; missing `/ux-review` evidence is a BLOCK unless explicitly waived.
- Browser verification is required before frontend/full-stack tasks can be marked `DONE`; missing `npm run test:e2e` evidence is a BLOCK unless explicitly waived.
- Frontend/full-stack tasks cannot be marked `DONE` unless desktop light, desktop dark, mobile light, and mobile dark checks are passed or explicitly waived.
- Missing mobile workflow support at 390px is a BLOCK.
- Missing light/dark theme support is a BLOCK for new pages and at least WARN for legacy pages touched by the change.
- Hardcoded brand colors outside centralized token/default-branding definitions are a BLOCK when they prevent organization branding overrides.
- If the diff is >500 lines, split the review by file group and run iteratively. Architect reviewer reads the full diff to spot cross-cutting drift.
- For trivial PRs (single-file typo, copy change), use `--skip-architect` and `--qa-only` flags as appropriate to avoid review overhead disproportionate to the change.
- View current feature flags: `/settings --list`

## Next Steps After /review

After all BLOCK findings are resolved, route based on what was found:

| Finding type | Next step |
|---|---|
| Frontend / Component / UX findings | Run `/qa` for live-site browser verification before Stage 7 human review |
| Backend logic or security findings | Proceed directly to Stage 7 human review |
| No findings | Proceed directly to Stage 7 human review |

**`/review` does static analysis. `/qa` does live-site verification. Use both for frontend features.**
