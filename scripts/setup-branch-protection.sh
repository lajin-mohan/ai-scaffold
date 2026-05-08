#!/usr/bin/env bash
# scripts/setup-branch-protection.sh
#
# Apply the branch-protection rules from .claude/rules/branching-rules.md
# to `main` and `dev` via the GitHub REST API. Idempotent: safe to re-run.
#
# Usage:
#   bash scripts/setup-branch-protection.sh                  # uses gh's default repo
#   bash scripts/setup-branch-protection.sh owner/repo       # explicit repo
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
echo

# ------------------------------------------------------------
# main: production-stable
# ------------------------------------------------------------

echo "==> Protecting main (2 approvals, ci-passed required, no force push)..."

gh api -X PUT "repos/$REPO/branches/main/protection" \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-passed"]
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

echo "==> Protecting dev (1 approval, ci-passed required, no force push)..."

gh api -X PUT "repos/$REPO/branches/dev/protection" \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-passed"]
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
    -f default_branch=dev >/dev/null
  echo "    OK"
else
  echo "==> Default branch already set to dev. Skipping."
fi

echo
echo "Done. Verify in the GitHub UI:"
echo "  https://github.com/$REPO/settings/branches"
echo
echo "Note: ci-passed must have run at least once on the repo before"
echo "      it appears as a valid status check. If you see 'context not"
echo "      found' errors above, push a commit to trigger CI then re-run."
