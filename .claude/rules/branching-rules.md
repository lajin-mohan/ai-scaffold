# Branching Rules

Git workflow for all projects at Techversant Infotech.

---

## Branch Model

```
main          ← production-stable. Protected. Tag every release.
dev           ← integration branch. CI must always pass. No direct pushes.
feature/*     ← new features. Branch from dev. Merge to dev.
fix/*         ← bug fixes. Branch from dev (or main for hotfixes).
chore/*       ← non-functional changes (deps, config, docs, scripts).
release/*     ← release candidates. Branch from dev. Merge to main + tag.
hotfix/*      ← production fixes. Branch from main. Merge to main + dev.
```

## Branch Naming

```
feature/{{ticket-id}}-short-description
fix/{{ticket-id}}-short-description
chore/update-dependencies
release/v1.2.0
hotfix/fix-session-expiry-crash
```

Examples:
```
feature/HIRE-142-candidate-bulk-import
fix/HIRE-198-application-stage-transition-error
chore/upgrade-pg-to-8-12
release/v0.3.0
```

---

## Commit Format (Conventional Commits)

```
type(scope): short description in present tense

Optional longer body explaining WHY (not WHAT).
The code shows the what; the commit explains the decision.

Closes #ticket-id
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `chore` | Maintenance, tooling, deps (no production code change) |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

### Rules
- Subject line ≤ 72 characters
- Present tense: "add" not "added" or "adds"
- No period at the end of the subject line
- Reference ticket IDs in footer: `Closes #123` or `Refs #123`

### Examples
```
feat(candidates): add bulk import via CSV with duplicate detection

Closes #HIRE-142

fix(auth): prevent session fixation on re-authentication

Sessions were not invalidated on password change, allowing an attacker
with a stolen old session to remain authenticated after the user changed
their credentials.

Closes #HIRE-198

chore(deps): upgrade TypeScript to 5.4 and pg to 8.12
```

---

## Merge Flow

```
feature/* → dev       ← PR required, AI review + 1 human approval
dev → release/*       ← QA sign-off required
release/* → main      ← team lead approval + smoke test pass
hotfix/* → main       ← team lead approval, then cherry-pick or merge to dev
```

## PR Rules

- PR title follows commit format: `feat(scope): description`
- PR description includes:
  - What changed and why
  - Link to ticket/issue
  - Screenshots for UI changes
  - Test plan or reference to test file
  - Any WARN findings from AI review and resolution
- Minimum PR size: 1 commit. No "WIP" PRs in review state.
- Maximum PR size target: 400 lines changed. Larger PRs must be split.

## Protected Branch Rules

- `main`: no direct push, no force push, requires 2 approvals + CI pass
- `dev`: no direct push, requires 1 approval + CI pass
- Tags on `main` are immutable once pushed

## Release Tagging

```
v{major}.{minor}.{patch}

v1.0.0   ← first production release
v1.1.0   ← new features
v1.1.1   ← bug fixes
v2.0.0   ← breaking changes
```

Tag from `main` after merge: `git tag -a v1.1.0 -m "Release v1.1.0"`
