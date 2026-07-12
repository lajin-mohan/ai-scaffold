---
description: Git workflow enforcement: branch safety check, unrelated-changes detection, verification evidence requirement. Optional --dev / --main…
---

# /commit-changes

Git workflow enforcement. Use before every commit and every merge promotion. Enforces branch safety, detects unrelated changes, requires verification evidence, and handles merge promotion with safeguards.

---

## Usage

```
/commit-changes                        # interactive walkthrough
/commit-changes --dev                 # promote current branch to dev with safety checks
/commit-changes --main                # promote dev to main with full verification
/commit-changes --dry-run             # show what would happen without doing it
```

---

## Rules

1. **Branch safety:** Never commit directly to `main` or `dev`. Feature branches only.
2. **Unrelated changes:** Changes not related to the approved task must not be committed together. Surface them and require separate commits or separate PRs.
3. **Verification evidence:** Each changed file must have a corresponding verification (test pass, lint pass, manual check).
4. **No Co-Authored-By ever.** All commits use the human owner's identity only. Any Co-Authored-By line in a commit message must be removed.
5. **Merge promotion requires all checks pass.** dev → main is a release gate, not a convenience.

---

## Step 1 — Branch Check

```
Current branch: feature/PROJ-142-csv-import
Base:          dev
Status:        clean / N files changed

✅ Branch is a feature branch — safe to commit
```

If on `main` or `dev` directly:
```
BLOCK: Cannot commit directly to main/dev. Create a feature branch first.
```

---

## Step 2 — Unrelated Changes Check

List all changed files. For each, confirm it relates to the current task.

If unrelated changes found:
```
⚠ Unrelated files detected:
  - apps/web/src/styles/legacy.css     — not part of this ticket
  - packages/shared/src/utils/old.ts    — not part of this ticket

Options:
  1. Commit only related files (git add path/to/related)
  2. Separate PR for unrelated changes
  3. Ask a human to decide

Do not proceed until unrelated files are excluded.
```

---

## Step 3 — Verification Evidence

For each file type, require evidence:

| File type | Evidence required |
|---|---|
| Source code | Tests pass + lint passes |
| Tests | Tests pass (self-verifying) |
| Config | Manual review or diff check |
| Docs | Readable, no broken links |
| Migrations | Reviewed, reversible |

If evidence missing:
```
BLOCK: No verification for:
  - apps/api/src/services/import.service.ts

Run tests and lint before committing.
```

---

## Step 4 — Commit

```
Commit message (Conventional Commits):
type(scope): short description in present tense

body (optional — explain WHY, not WHAT)

Closes #ticket-id
```

- Subject ≤ 72 characters
- Present tense: "add" not "added"
- Reference ticket ID in footer
- **No Co-Authored-By** — remove it if present

---

## Step 5 — Merge Promotion

### dev promotion (`--dev`)

```
Promote to dev: feature/PROJ-142 → dev
Requirements:
  - Branch is up to date with dev (rebase or merge)
  - CI pipeline is green
  - All verification evidence collected

✅ Ready to PR → dev
```

### main promotion (`--main`)

```
Promote to main: dev → main
Requirements:
  - PR approved with human sign-off
  - CI pipeline green (lint + tests + build)
  - QA sign-off obtained (qa-reviewer)
  - Staging deployed and verified
  - Release notes ready
  - Tag created: v{N}.{N}.{N}

⚠ This is a release gate. Proceed only if all checks pass.
```

If any check fails:
```
BLOCK: main promotion blocked.
  - CI: failing on test/load-balancer.test.ts
  - Fix before promoting.
```

---

## Cross-Branch Merge Prevention

**Rule:** Never merge a branch into a protected branch where the source is a descendant of the target. This is the core bypass that happened — `main` (higher tier) merged directly into `dev` (lower tier) from CLI.

### The correct path

```
feature/* → dev  ← feature branch promoted to integration
dev → main       ← integration promoted to stable (release gate)

Never:
  main → dev      ← WRONG: skips integration, bypasses CI, bypasses review
  dev → main (direct push/merge) ← WRONG: must use PR for main promotion
```

### Cross-branch merge pattern

If the target is `dev` and the source is `main` or a descendant of `main`:
```
BLOCK: Cross-branch promotion blocked.
  Source: main
  Target: dev
  Pattern: merging "higher" tier into "lower" tier.

Correct path: Create a PR main → dev via GitHub UI.
This requires admin bypass of branch protection — intentional and auditable.
```


---

## Related Commands

- `/start-task` — generates the work that this command commits
- `/review` — runs verification before commit
- `/health` — checks code quality before commit