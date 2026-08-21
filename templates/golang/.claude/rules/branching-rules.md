# Branching Rules

Git workflow for all projects at your organization.

---

## Branch Model

```
main          ← production. Protected. Changes only by PR from dev. Tag every release.
dev           ← integration. Protected. Changes only by PR from a work branch.
feature/*     ← new features.            Branch from dev. PR to dev.
fix/*         ← bug fixes.               Branch from dev. PR to dev.
chore/*       ← deps, config, tooling.   Branch from dev. PR to dev.
docs/*        ← documentation only.      Branch from dev. PR to dev.
hotfix/*      ← urgent production fix.   Branch from main. PR to main, then PR to dev.
```

There is one path for normal work and one documented exception:

```
feature|fix|chore|docs/*  ──PR──►  dev  ──PR──►  main        (normal)
hotfix/*  ──PR──►  main  ──PR──►  dev                        (exception)
```

`release/*` branches do not exist in this model. Promotion to production is a
PR from `dev` to `main`; there is no separate release-candidate branch to cut,
stabilise, or merge back.

**Never commit on `dev` or `main`.** Both are changed only by merging a pull
request. The `pre-commit` hook refuses a commit made while either branch is
checked out.

## Branch Naming

```
feature/{{ticket-id}}-short-description
fix/{{ticket-id}}-short-description
chore/update-dependencies
docs/update-api-standards
hotfix/{{ticket-id}}-fix-session-expiry-crash
```

Examples:
```
feature/PROJ-142-candidate-bulk-import
fix/PROJ-198-application-stage-transition-error
chore/upgrade-pg-to-8-12
docs/clarify-onboarding-steps
hotfix/PROJ-201-fix-session-expiry-crash
```

Allowed prefixes are exactly `feature`, `fix`, `chore`, `docs`, `hotfix`.
Anything else is rejected by the `pre-commit` hook.

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
- **AI identity prohibition:** All commits must use the human git owner's identity only. Never add `Co-Authored-By`, AI attribution, or any third-party identity to commit messages. The git global commit template (`~/.gitmessage`) enforces this — it contains no Co-Authored-By block. If a commit ever includes AI attribution, remove it immediately.

### Examples
```
feat(candidates): add bulk import via CSV with duplicate detection

Closes #PROJ-142

fix(auth): prevent session fixation on re-authentication

Sessions were not invalidated on password change, allowing an attacker
with a stolen old session to remain authenticated after the user changed
their credentials.

Closes #PROJ-198

chore(deps): upgrade TypeScript to 5.4 and pg to 8.12
```

---

## Merge Flow

```
feature|fix|chore|docs/* → dev   ← PR required, 1 human approval + CI pass
dev → main                       ← PR required, production promotion gate
hotfix/* → main                  ← PR required, urgent production fix only
hotfix/* → dev                   ← PR required, MANDATORY back-merge
```

Every other path is blocked, including:

- any direct commit or push to `dev` or `main`
- `feature|fix|chore|docs/*` → `main` (must go through `dev`)
- `main` → `dev` as a routine sync (only the hotfix back-merge above)
- `release/*` anything (release branches do not exist in this model)

### The hotfix exception

`hotfix/*` is the only branch that starts from `main`. Use it when a
production defect cannot wait for the current contents of `dev` to be
promoted.

1. Branch `hotfix/{{ticket-id}}-description` from `main`
2. Make the smallest safe fix
3. PR to `main`; approval + CI required
4. Tag the release on `main` if you deploy
5. **Open the back-merge PR to `dev` immediately** — before closing the
   incident, not "later"

**Step 5 is the one that gets skipped, and skipping it is what makes `main`
and `dev` diverge.** A fix that lives only on `main` is silently reverted the
next time `dev` is promoted. If you only remember one rule about hotfixes,
remember that the fix is not finished until it is on `dev` too.

### AI enforcement

Before any `git commit`, `git merge`, or `git push`, check the current branch
and the target. If the branch is `dev` or `main`, or the merge path is not in
the allowed list above, stop and surface the correct path instead of
proceeding.

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

- `main`: no direct push, no force push, no deletion. PR required — from
  `dev` (promotion) or `hotfix/*` (urgent fix) only. Approval + CI pass.
- `dev`: no direct push, no force push, no deletion. PR required from a
  `feature|fix|chore|docs/*` work branch, or the `hotfix/*` back-merge.
  Approval + CI pass.
- Tags on `main` are immutable once pushed.

Apply these server-side with `scripts/setup-branch-protection.sh`. Local hooks
catch mistakes early; only branch protection actually prevents them, because a
hook can be bypassed with `--no-verify` and does not run on the server.

### CI validation (opt-in)

A workflow that rejects illegal merge paths ships inert at
`.ai-scaffold/ci/branch-flow.yml`. Activate it:

```bash
mkdir -p .github/workflows
cp .ai-scaffold/ci/branch-flow.yml .github/workflows/branch-flow.yml
```

Then make **Branch flow** a required status check on `dev` and `main`. It is
shipped inert deliberately — the scaffold does not add workflows to a repo
uninvited, so it cannot collide with existing CI or surprise an `ais init`
into an established project.

### The three layers, and what each is worth

| Layer | Catches | Can be bypassed? |
|---|---|---|
| `pre-commit` hook | commits on `dev`/`main`, bad branch names | Yes — `--no-verify` |
| Branch-flow CI | illegal PR base/head pairings | No, once a required check |
| Branch protection | direct pushes, force-push, deletion, missing approval | Only by an admin, if enforcement is off |

The hook is a fast local warning, not a guarantee. Treat branch protection as
the real control and configure it first.

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
| Required status checks | `ci-passed` |
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
| Required status checks | `ci-passed` |
| Require branch up to date with target | Yes |
| Require conversation resolution | Yes |
| Require linear history | Discretionary (team preference) |
| Enforce for admins | No (admins may bypass for emergencies) |
| Allow force pushes | No |
| Allow deletions | No |

#### Default branch

`dev` is the default branch. PRs target `dev`; releases promote `dev -> main`.

#### Optional: GitHub merge queue on `dev`

Auto-rebases each PR onto target before merge — eliminates the
"PR went stale during review" failure mode. Requires GitHub Team plan or
higher. See `docs/setup/branch-protection.md` for setup steps.

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
