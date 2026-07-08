# Branching Rules

Git workflow for all projects at Techversant Infotech.

---

## Branch Model

```
main          ← production-stable. Protected. Tag every release.
dev           ← integration branch. CI must always pass. No direct pushes except documented emergency admin bypass.
feature/*     ← new features. Branch from dev. Merge to dev.
fix/*         ← non-production bug fixes. Branch from dev. Merge to dev.
chore/*       ← non-functional changes (deps, config, docs, scripts).
docs/*        ← documentation-only changes. Branch from dev. Merge to dev.
release/*     ← release candidates. Branch from dev. Merge to main + tag.
hotfix/*      ← urgent production fixes. Branch from main. Merge to main, then dev.
```

## Branch Naming

```
feature/{{ticket-id}}-short-description
fix/{{ticket-id}}-short-description
chore/short-description
chore/{{ticket-id}}-short-description
docs/short-description
release/v1.2.0
hotfix/{{ticket-id}}-fix-session-expiry-crash
```

Examples:
```
feature/HIRE-142-candidate-bulk-import
fix/HIRE-198-application-stage-transition-error
chore/update-dependencies
chore/HIRE-222-upgrade-pg-to-8-12
docs/update-api-standards
release/v0.3.0
hotfix/HIRE-201-fix-session-expiry-crash
```

- Ticket ID is required for `feature/*`, `fix/*`, and `hotfix/*`
- Ticket ID is recommended for `chore/*`, `docs/*`, and dependency-only work

---

## Commit Format (Conventional Commits)

```
type(scope): short description in present tense

Optional longer body explaining WHY (not WHAT).
The code shows the what; the commit explains the decision.

Refs TICKET-ID
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
- Use `Refs HIRE-142` for Jira/external tickets
- Use `Closes #123` only for GitHub issues
- **AI identity prohibition:** All commits must use the human git owner's identity only. Never add `Co-Authored-By`, AI attribution, or any third-party identity to commit messages. The git global commit template (`~/.gitmessage`) enforces this — it contains no Co-Authored-By block. If a commit ever includes AI attribution, remove it immediately.

### Examples
```
feat(candidates): add bulk import via CSV with duplicate detection

Refs HIRE-142

fix(auth): prevent session fixation on re-authentication

Sessions were not invalidated on password change, allowing an attacker
with a stolen old session to remain authenticated after the user changed
their credentials.

Refs HIRE-198

chore(deps): upgrade TypeScript to 5.4 and pg to 8.12
```

---

## Merge Flow

```
feature/* → dev       ← PR required, AI review + 1 human approval
fix/* → dev           ← PR required, AI review + 1 human approval
chore/* → dev         ← PR required, 1 human approval + required checks
docs/* → dev          ← PR required, 1 human approval + required checks
release/* created     ← from latest stable dev after feature freeze
release/* → main      ← QA sign-off + team lead approval + smoke test pass
release/* → dev       ← required if release fixes were committed after branching
hotfix/* → main       ← team lead approval + smoke test pass
hotfix/* → dev        ← required after production fix is merged to main
main → dev            ← PR via GitHub UI, admin bypass required (recovery only)
```

### Allowed Merge Paths

Only these merge paths are allowed:

- `feature/*` → `dev`
- `fix/*` → `dev`
- `chore/*` → `dev`
- `docs/*` → `dev`
- `release/*` → `main`
- `release/*` → `dev` only when release fixes were added after branching
- `hotfix/*` → `main`
- `hotfix/*` → `dev` after the production fix is merged to `main`

Blocked paths:

- `dev` → `main` directly
- `main` → `dev` except documented recovery PR
- `feature/*` → `main`
- `fix/*` → `main`
- `chore/*` → `main`
- `docs/*` → `main`
- `release/*` → `feature/*`
- `hotfix/*` → `feature/*`

**Recovery from broken state:** If `dev` falls behind `main`, restore via GitHub PR `main → dev` with admin bypass — not a CLI merge. Document the recovery in the PR description.

Release branches are created from `dev` after feature freeze. This is branch creation, not a merge path. Only the Tech Lead or release owner may create `release/*` branches.

### Release Sync-Back

If fixes are committed on `release/*` after it branches from `dev`, merge `release/*` back to `dev` after the production release. `main` must not contain release fixes that are missing from `dev`.

For `release/*` → `dev` sync-back, preserve release-fix traceability. Use a normal PR merge or cherry-pick when needed instead of squash merge.

### Merge Strategy

- Use squash merge for `feature/*`, `fix/*`, and `chore/*` into `dev`
- Use squash merge for `docs/*` into `dev`
- Use squash merge for `release/*` into `main`
- The release squash commit message must be `release: vX.Y.Z`
- Tag the resulting commit on `main`
- `main` must maintain a clean, auditable release history
- Do not use local CLI merges into protected branches

### Branch Freshness

- Keep `feature/*`, `fix/*`, `chore/*`, and `docs/*` branches up to date with `dev` before opening or merging PRs
- Rebase from `dev` unless the team explicitly allows merge commits

### Branch Cleanup

- Delete merged `feature/*`, `fix/*`, `chore/*`, `docs/*`, `release/*`, and `hotfix/*` branches after merge
- Review unmerged branches older than 30 days and either update or delete them

### Hotfix Flow

1. Create `hotfix/{{ticket-id}}-short-description` from `main`
2. Implement the smallest safe production fix
3. Open PR `hotfix/*` → `main`
4. Require team lead approval, CI pass, and smoke test
5. Merge to `main`
6. Tag patch release if production deployment occurs
7. Open PR `hotfix/*` → `dev`, resolve conflicts, require 1 approval + required checks, then merge

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

- `main`: no direct push, no force push, requires 2 approvals + required checks
- `dev`: no direct push except documented emergency admin bypass, requires 1 approval + required checks
- Tags on `main` are immutable once pushed

Any admin bypass must be documented in the PR, ticket, or release notes.

### Required branch protection settings

These rules are **enforceable** via GitHub-side branch protection. The list
below is the single source of truth — if it changes, propagate to:

- `docs/setup/branch-protection.md` (UI walkthrough)
- `scripts/setup-branch-protection.sh` (gh-CLI alternative)

#### `main`

| Setting | Value |
|---|---|
| Required PR before merge | Yes |
| Required approvals | 2 |
| Dismiss stale reviews on new push | Yes |
| Require last-push approval | Yes |
| Require status checks before merge | Yes |
| Required status checks | `CI passed`; add `ai-review-passed` after AI review automation exists |
| Require branch up to date with target | Yes (forces rebase before merge) |
| Require conversation resolution | Yes |
| Require linear history | Yes |
| Enforce for admins | Yes |
| Restrict who can push | Tech Lead / release-bot only |
| Allow force pushes | No |
| Allow deletions | No |

#### `dev`

| Setting | Value |
|---|---|
| Required PR before merge | Yes |
| Required approvals | 1 |
| Dismiss stale reviews on new push | Yes |
| Require status checks before merge | Yes |
| Required status checks | `CI passed`; add `ai-review-passed` after AI review automation exists |
| Require branch up to date with target | Yes |
| Require conversation resolution | Yes |
| Require linear history | Discretionary (team preference) |
| Enforce for admins | No (admins may bypass for emergencies) |
| Allow force pushes | No |
| Allow deletions | No |

#### Default branch

`dev` is the default branch. PRs target `dev`; releases promote `dev -> main`.

#### Optional: GitHub merge queue on `dev`

GitHub merge queue can reduce the "PR went stale during review" failure mode.
Enable it only with Tech Lead approval because it may require enabling rebase
merge, which is a repo-specific exception to the default squash-only standard.
If approved, update this file and `scripts/setup-branch-protection.sh` for that
repository before enabling. Requires GitHub Team plan or higher.

#### Apply / re-apply

- **Day 1:** apply both rules immediately after repo creation.
- **After CI changes:** if you add or rename a status check, update the
  required-status-checks list above and re-run the script (or edit in UI).
- **Verify quarterly:** drift happens; re-confirm settings still match.

## Release Tagging

```
v{major}.{minor}.{patch}

v1.0.0   ← first production release
v1.1.0   ← new features
v1.1.1   ← bug fixes
v2.0.0   ← breaking changes
```

Tag from `main` after merge: `git tag -a v1.1.0 -m "Release v1.1.0"`

Push the tag: `git push origin v1.1.0`

- Release tags must be annotated
- Signed tags are recommended for production releases
- Only the Tech Lead or release owner decides the release version
- Version bumps follow semantic versioning

## Rollback

- Production rollback must use a new hotfix or revert commit on `main`
- Do not delete or move existing release tags
- Do not force-push `main` to roll back production

## AI Enforcement

AI tools must not:

- Push directly to `main` or `dev`
- Create commits with AI attribution
- Bypass PR flow
- Merge blocked branch paths
- Force-push protected branches
- Create release tags without explicit human instruction
