# Setup: Branch protection

GitHub-side enforcement of the rules documented in [`.claude/rules/branching-rules.md`](../../.claude/rules/branching-rules.md). Without these protections, the rules are advisory; with them, the rules are gates.

This document is the **manual / web-UI** path. If you have the `gh` CLI installed and authenticated with `admin:repo` scope, run [`scripts/setup-branch-protection.sh`](../../scripts/setup-branch-protection.sh) instead — it applies most rules in one command.

The script is intentionally generic: main push actor restrictions and release tag immutability may still require manual GitHub UI/ruleset configuration.

GitHub may show classic branch protection rules or repository rulesets depending on the repository plan/UI. Use classic branch protection unless your organization has standardized on rulesets.

The single source of truth for what gets enforced lives in [`.claude/rules/branching-rules.md` § Required branch protection settings](../../.claude/rules/branching-rules.md#required-branch-protection-settings). If those rules change, update them there first; this doc and the script reference back.

---

## When to apply

- **Day 1** — apply both `main` and `dev` protections immediately after creating the repo.
- **After bootstrap** — re-check; `/bootstrap` may have added or renamed required status checks that need to be wired into the protection.
- **On any change to branching-rules.md** — bring the GitHub-side config into agreement.

---

## Prerequisites

- You have **Admin** access to the repository.
- You know which status checks you want to require — for Day 1 this is `CI passed`; add `ai-review-passed` after AI review automation exists.
- You have decided who can push to `main` and `dev` (typically: Tech Lead + bots only for `main`; team + bots for `dev`).
- If enabling Code Owners review, create and commit a valid `.github/CODEOWNERS` file first.
- Confirm the release-bot or deployment actor has the minimum required permission and is included in the allowed push list if it must create release commits or tags.

---

## Set the default branch to `dev`

Per `branching-rules.md`, PRs land on `dev` first; `main` is production-stable.

1. Repo home page → **Settings** → **General** (left sidebar) → scroll to **Default branch**.
2. Click the swap icon next to the current default.
3. Select `dev`. Confirm. Done.

If `dev` doesn't exist yet, create it first:

```bash
git checkout main
git checkout -b dev
git push -u origin dev
```

Create and protect `dev` immediately after switching the default branch. Do not leave `dev` unprotected after making it the default branch.

---

## Protect `main` (production-stable)

Repo → **Settings** → **Branches** (left sidebar) → **Add classic branch protection rule**.

| Setting                                             | Value                                                       | Why                                                          |
| --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Branch name pattern                                 | `main`                                                      | Apply to the production branch                               |
| Require a pull request before merging               | **ON**                                                      | No direct pushes to production                               |
| Required approvals                                  | **1**                                                       | Single approval is the default for solo/early-stage repos; raise to 2 when the contributor base grows |
| Dismiss stale approvals when new commits are pushed | **ON**                                                      | Re-review required after changes                             |
| Require review from Code Owners                     | ON if `CODEOWNERS` exists                                   | Otherwise leave OFF                                          |
| Require approval of the most recent reviewable push | **ON**                                                      | Reviewers see the final state                                |
| Require status checks to pass before merging        | **ON**                                                      | CI must be green                                             |
| Require branches to be up to date before merging    | **ON**                                                      | Forces rebase on target                                      |
| Status checks required                              | `CI passed`; add `ai-review-passed` after automation exists | CI and AI review gates from branching-rules.md               |
| Require conversation resolution before merging      | **ON**                                                      | No unresolved PR comments                                    |
| Require signed commits                              | OFF (or ON if your team uses GPG)                           | Optional                                                     |
| Require linear history                              | **ON**                                                      | No merge bubbles in main; use squash or rebase merge         |
| Require deployments to succeed before merging       | OFF                                                         | Only enable if you have deploy environments wired            |
| Lock branch                                         | OFF                                                         | Read-only is overkill                                        |
| Do not allow bypassing the above settings           | **ON**                                                      | Including admins. Forces everyone through the gate.          |
| Restrict who can push to matching branches          | **ON**                                                      | Limit to: Tech Lead role / specific users / release-bot only |
| Allow force pushes                                  | **OFF**                                                     | Rewriting main history is forbidden                          |
| Allow deletions                                     | **OFF**                                                     | Don't lose `main`                                            |

Click **Create**.

---

## Protect `dev` (integration)

Same dialog, new rule.

| Setting                                             | Value                                                               | Why                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Branch name pattern                                 | `dev`                                                               | Apply to the integration branch                                |
| Require a pull request before merging               | **ON**                                                              | All work flows through PRs                                     |
| Required approvals                                  | **1**                                                               | Single approval per branching-rules.md                         |
| Dismiss stale approvals when new commits are pushed | **ON**                                                              | Re-review required after changes                               |
| Require review from Code Owners                     | ON if `CODEOWNERS` exists                                           | Otherwise OFF                                                  |
| Require status checks to pass before merging        | **ON**                                                              | CI must be green                                               |
| Require branches to be up to date before merging    | **ON**                                                              | Forces rebase on target                                        |
| Status checks required                              | `CI passed`; add `ai-review-passed` after automation exists         | CI and AI review gates from branching-rules.md                 |
| Require conversation resolution before merging      | **ON**                                                              | No unresolved PR comments                                      |
| Require linear history                              | ON if you prefer linear; OFF if your team uses merge commits        | Discretionary                                                  |
| Do not allow bypassing the above settings           | **OFF**                                                             | Allows documented emergency admin bypass on `dev`              |
| Restrict who can push                               | OFF, or restrict to admins/bots if emergency bypass must be limited | Direct pushes remain blocked by PR rules unless bypass is used |
| Allow force pushes                                  | **OFF**                                                             | Rewriting `dev` history breaks downstream branches             |
| Allow deletions                                     | **OFF**                                                             | Don't lose `dev`                                               |

Click **Create**.

---

## (Optional) Enable GitHub merge queue on `dev`

GitHub's merge queue auto-rebases each PR onto target before merging. It catches the failure mode where a PR was up-to-date when reviewed but stale by the time you click merge — exactly the scenario that produces the conflicts we hit during the audit.

Requires GitHub Team plan or higher.

1. Repo → **Settings** → **Branches** → edit the `dev` rule.
2. Find **Require merge queue**.
3. Enable only with Tech Lead approval. Merge queue may require enabling **Rebase and merge**, which is a repo-specific exception to the default squash-only standard.
4. If approved, update `branching-rules.md` and `scripts/setup-branch-protection.sh` for that repository before enabling.
5. Save.

---

## Verification

After applying both rules:

1. Open a draft PR from any feature branch into `dev`. The "Merge" button should be greyed out until:
   - 1 approval is recorded
   - required status checks are green
   - PR comments are resolved
   - Branch is up to date with `dev`
2. Try `git push origin main` from your local machine without a PR. It should be rejected with "protected branch" error.
3. Try `git push origin dev` from your local machine without a PR. It should be rejected unless you are intentionally using documented admin bypass.
4. Repo → **Insights** → **Network** should show no force-pushes to `main` or `dev` going forward.

---

## What if required checks don't show up in the status-checks dropdown?

GitHub only lists status checks that have completed successfully in the repository recently. If `CI passed` or `ai-review-passed` is missing:

1. Push any commit to a feature branch, or trigger the relevant workflow manually via **Actions**.
2. Wait for the workflow to complete.
3. Return to the branch protection rule editor — the check will now appear in the dropdown.

Do not require `ai-review-passed` until the AI review automation exists and has completed successfully in this repository within the past 7 days.

Required status check names must exactly match the workflow job/check names reported by GitHub. If the workflow job is named `build`, GitHub will not treat it as `CI passed` unless the workflow exposes a check with that exact name.

---

## Cross-references

- Rules: [`.claude/rules/branching-rules.md`](../../.claude/rules/branching-rules.md)
- Automated alternative: [`scripts/setup-branch-protection.sh`](../../scripts/setup-branch-protection.sh)
- CI workflow that produces `CI passed`: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- AI review automation should produce `ai-review-passed` before that check is enforced
