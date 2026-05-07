# Command: /review

Runs a full code review on the current feature branch or specified files. Invokes backend-reviewer, frontend-reviewer, and security-reviewer in parallel, then consolidates findings.

## Usage

```
/review                         # Review all changes on current branch vs dev
/review src/services/users.ts   # Review a specific file
/review --security-only         # Security review only
/review --frontend-only         # Frontend review only
/review --backend-only          # Backend review only
```

## Process

1. **Gather context** — read diff, identify touched files, classify changes (backend / frontend / infra / config)
2. **Run relevant reviewers in parallel**:
   - Backend changes → invoke `backend-reviewer` agent
   - Frontend changes → invoke `frontend-reviewer` agent
   - Auth/data/API changes → invoke `security-reviewer` agent
3. **Consolidate findings** — merge into a single report, deduplicate, sort by severity
4. **Produce summary** — overall verdict with required actions

## Output

```
## Code Review — [Branch / Feature Name]
Date: [date]
Files reviewed: [count]

---

### BLOCK — Must Fix Before Merge
[Numbered list of blocking findings with file:line and fix description]

### WARN — Should Fix Before Merge
[Numbered list of warnings]

### NIT — Optional Improvements
[Numbered list of minor items]

---

### Security Findings
[From security-reviewer — separate section for visibility]

---

### Overall Verdict
🔴 BLOCKED — [N] blocking issues must be resolved
🟡 APPROVED WITH WARNINGS — address [N] warnings before merge
🟢 APPROVED — no significant issues found
```

## Notes

- Findings tagged BLOCK prevent merge — they are not suggestions.
- Security findings are always surfaced regardless of `--backend-only` or `--frontend-only`.
- If the diff is >500 lines, split the review by file group and run iteratively.
