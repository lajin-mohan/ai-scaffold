#!/usr/bin/env bash
# scripts/setup-branch-protection.sh
#
# Apply the branch-protection rules from .claude/rules/branching-rules.md
# to `main` and `dev` via the GitHub REST API. Idempotent: safe to re-run.
#
# Usage:
#   bash scripts/setup-branch-protection.sh                  # uses gh's default repo
#   bash scripts/setup-branch-protection.sh owner/repo       # explicit repo
#   REQUIRE_AI_REVIEW_CHECK=1 bash scripts/setup-branch-protection.sh
#
# Requires:
#   - gh CLI installed (https://cli.github.com)
#   - Authenticated with `admin:repo` scope (gh auth login --scopes admin:repo)
#   - Admin access to the target repo
#
# Manual alternative: docs/setup/branch-protection.md

set -euo pipefail

# ------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------

if ! command -v gh >/dev/null 2>&1; then
  cat >&2 <<'EOF'
ERROR: gh CLI is not installed.

Install:
  Windows:  winget install --id GitHub.cli
  macOS:    brew install gh
  Linux:    https://github.com/cli/cli/blob/trunk/docs/install_linux.md

Then authenticate:
  gh auth login --scopes admin:repo

Or apply the rules manually via docs/setup/branch-protection.md
EOF
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run: gh auth login --scopes admin:repo" >&2
  exit 1
fi

# Verify admin:repo scope is present.
if ! gh auth status 2>&1 | grep -q "admin:repo"; then
  cat >&2 <<'EOF'
WARNING: Your gh token may not have the `admin:repo` scope required to set
branch protection. If the next API calls fail with 403, run:

  gh auth refresh --scopes admin:repo

EOF
fi

REPO="${1:-}"
if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
  if [ -z "$REPO" ]; then
    echo "ERROR: no repo specified and 'gh repo view' could not detect one." >&2
    echo "Usage: bash scripts/setup-branch-protection.sh owner/repo" >&2
    exit 1
  fi
fi

echo "Applying branch protection to: $REPO"
echo "This script will update branch protection for main and dev."
echo

STATUS_CONTEXTS='["ci-passed"]'
STATUS_LABEL="ci-passed"
if [ "${REQUIRE_AI_REVIEW_CHECK:-0}" = "1" ]; then
  echo "WARNING: ai-review-passed will be required."
  echo "Ensure this check exists and has completed at least once."
  echo
  STATUS_CONTEXTS='["ci-passed","ai-review-passed"]'
  STATUS_LABEL="ci-passed + ai-review-passed"
fi

# ------------------------------------------------------------
# Required branches
# ------------------------------------------------------------

for BRANCH in main dev; do
  if ! gh api "repos/$REPO/branches/$BRANCH" \
    --header "Accept: application/vnd.github+json" \
    --header "X-GitHub-Api-Version: 2022-11-28" >/dev/null 2>&1; then
    echo "ERROR: branch '$BRANCH' does not exist in $REPO." >&2
    echo "Create it first, then re-run this script." >&2
    if [ "$BRANCH" = "dev" ]; then
      cat >&2 <<'EOF'
Example:
  git checkout main
  git checkout -b dev
  git push -u origin dev
EOF
    fi
    exit 1
  fi
done

# ------------------------------------------------------------
# Repository merge settings
# ------------------------------------------------------------

echo "==> Configuring repository merge settings..."

gh api -X PATCH "repos/$REPO" \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true >/dev/null

echo "    OK"
echo

# ------------------------------------------------------------
# main: production-stable
# ------------------------------------------------------------

echo "==> Protecting main (2 approvals, $STATUS_LABEL required, no force push)..."

gh api -X PUT "repos/$REPO/branches/main/protection" \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": $STATUS_CONTEXTS
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 2,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF

echo "    OK"
echo

# ------------------------------------------------------------
# dev: integration
# ------------------------------------------------------------

echo "==> Protecting dev (1 approval, $STATUS_LABEL required, no force push)..."

gh api -X PUT "repos/$REPO/branches/dev/protection" \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": $STATUS_CONTEXTS
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF

echo "    OK"
echo

# ------------------------------------------------------------
# Default branch -> dev
# ------------------------------------------------------------

CURRENT_DEFAULT=$(gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name)
if [ "$CURRENT_DEFAULT" != "dev" ]; then
  echo "==> Setting default branch to dev (was: $CURRENT_DEFAULT)..."
  gh api -X PATCH "repos/$REPO" \
    --header "Accept: application/vnd.github+json" \
    --header "X-GitHub-Api-Version: 2022-11-28" \
    -f default_branch=dev >/dev/null
  echo "    OK"
else
  echo "==> Default branch already set to dev. Skipping."
fi

echo
echo "Done. Verify in the GitHub UI:"
echo "  https://github.com/$REPO/settings/branches"
echo
echo "Note: required status checks must have completed successfully"
echo "      in this repository within the past 7 days before GitHub"
echo "      allows them to be selected/enforced. Set REQUIRE_AI_REVIEW_CHECK=1"
echo "      only after ai-review-passed automation exists and has run recently."
echo
echo "Note: main push restrictions are not configured by this generic script."
echo "      Configure Tech Lead / release-bot push restrictions manually in"
echo "      GitHub UI or rulesets if required."
echo
echo "Note: tag immutability is not configured by this script."
echo "      Configure tag protection/rulesets manually if your GitHub plan supports it."
