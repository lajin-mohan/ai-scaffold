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
3. **Run relevant reviewers in parallel**:
   - **`backend-reviewer`** — if any change to `apps/api/`, `packages/services/`, `packages/repositories/`, `packages/domain/`, migrations
   - **`frontend-reviewer`** — if any change to `apps/web/`, `packages/ui/`, components, styles
   - **`security-reviewer`** — if any change to auth, sessions, permissions, data access, input handling, secrets, headers, or any new endpoint
   - **`qa-reviewer`** — if a spec/BRD/AC is linked, OR for any feature work (verifies AC compliance, test coverage, regression risk)
   - **`architect`** — if change touches `>1` architectural layer, introduces a new module, modifies a shared package, or changes any rule in `.claude/rules/`
4. **Consolidate findings** — merge into a single report, deduplicate, sort by severity, attribute findings to source reviewer.
5. **Produce summary** — overall verdict with required actions.

## Reviewer Selection Matrix

| Change type | backend | frontend | security | qa | architect |
|---|:-:|:-:|:-:|:-:|:-:|
| New API endpoint | ✓ | | ✓ | ✓ | ✓ |
| Frontend component | | ✓ | | ✓ | |
| Database migration | ✓ | | ✓ | ✓ | ✓ |
| Auth / session change | ✓ | | ✓ | ✓ | ✓ |
| Refactor (no behaviour change) | ✓ | ✓ | | | ✓ |
| Bug fix in existing code | ✓ or ✓ | | (if security-touched) | ✓ | |
| Copy / styling change | | ✓ | | | |
| Infra / IaC change | | | ✓ | | ✓ |
| Rule file change in `.claude/rules/` | | | | | ✓ |

## Output

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

- Findings tagged BLOCK prevent merge — they are not suggestions.
- Security findings are always surfaced regardless of `--backend-only` or `--frontend-only` flags — security never opts out.
- QA findings appear whenever a spec is linked, even with `--backend-only` — AC compliance is independent of which layer changed.
- If the diff is >500 lines, split the review by file group and run iteratively. Architect reviewer reads the full diff to spot cross-cutting drift.
- For trivial PRs (single-file typo, copy change), use `--skip-architect` and `--qa-only` flags as appropriate to avoid review overhead disproportionate to the change.
