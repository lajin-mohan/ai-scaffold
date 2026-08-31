#!/usr/bin/env bash
# Spike probe for item 26 — GitHub API shape for enforcement checks.
#
# THROWAWAY. Not shipped: package.json "files" ships only scripts/token-report.js.
# Nothing here merges into src/. See docs/architecture/spike-26-github-api-shape.md
#
# Usage:
#   scripts/spike-26-probe.sh [owner/repo] [branch]
#
# OUTPUT IS INTENDED FOR A COMMITTED DOCUMENT. Review before pasting: it names
# the repository and the token's scopes.
#
# Run it TWICE — once with your admin:repo token, once with a read-only token —
# and diff the two outputs. The delta is the answer to "do reads need admin:repo".

set -uo pipefail   # deliberately NOT -e: a failing probe is a result, not an abort

REPO="${1:-}"
BRANCH="${2:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh is not installed. See https://cli.github.com" >&2
  exit 2
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run: gh auth login" >&2
  exit 2
fi

if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
  if [ -z "$REPO" ]; then
    echo "ERROR: no repo given and 'gh repo view' could not detect one." >&2
    exit 2
  fi
fi

echo "# Spike probe — item 26"
echo "repo:   $REPO"
echo "branch: $BRANCH"
echo "date:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
# Only the scopes line. `gh auth status` also prints every configured host and
# account -- including GitHub Enterprise hostnames -- and this output is meant to
# be transcribed into a committed document. Do not widen this filter.
echo "## Token scopes seen by gh"
gh auth status 2>&1 | grep -oE "Token scopes:.*" | sed 's/^/  /' || echo "  (none reported)"
echo

probe() {
  local label="$1" endpoint="$2"
  local body status
  body=$(gh api "$endpoint" --include 2>&1)
  status=$(printf '%s\n' "$body" | grep -m1 -oE 'HTTP/[0-9.]+ [0-9]{3}' | awk '{print $2}')
  [ -z "$status" ] && status="ERR"
  printf '### %s\n' "$label"
  printf '    endpoint: %s\n' "$endpoint"
  printf '    status:   %s\n' "$status"
  case "$status" in
    200) printf '    result:   READABLE\n' ;;
    403) printf '    result:   FORBIDDEN — scope or permission insufficient\n' ;;
    404) printf '    result:   NOT FOUND — absent, or hidden by insufficient permission\n' ;;
    *)   printf '    result:   unexpected status\n'
         # Status line only. Raw --include output carries response headers,
         # which on an authenticated run include x-oauth-scopes.
         printf '%s\n' "$body" | grep -m1 -E '^HTTP/' | sed 's/^/      /' ;;
  esac
  echo
}

echo "## Coarse tier — expected readable with plain repo read access"
probe "C-01 coarse: branch object (protected boolean)" "repos/$REPO/branches/$BRANCH"
probe "C-01 coarse: rules in effect for branch"        "repos/$REPO/rules/branches/$BRANCH"

echo "## Detailed tier — expected to need admin"
probe "C-01/C-02/C-03 detail: legacy branch protection" "repos/$REPO/branches/$BRANCH/protection"
probe "C-03 detail: ruleset definitions (bypass actors)" "repos/$REPO/rulesets"

echo "## C-02 support — is required-check HISTORY retrievable?"
probe "recent closed PRs"        "repos/$REPO/pulls?state=closed&per_page=5"
probe "check runs for branch head" "repos/$REPO/commits/$BRANCH/check-runs"

echo "## Field extraction — only meaningful where status was 200 above"
echo "### enforce_admins (C-03)"
gh api "repos/$REPO/branches/$BRANCH/protection" -q '.enforce_admins.enabled' 2>&1 | sed 's/^/    /'
echo "### required_status_checks.contexts (C-02)"
gh api "repos/$REPO/branches/$BRANCH/protection" -q '.required_status_checks.contexts' 2>&1 | sed 's/^/    /'
echo "### protected boolean (C-01 coarse)"
gh api "repos/$REPO/branches/$BRANCH" -q '.protected' 2>&1 | sed 's/^/    /'
echo "### ruleset names + enforcement (C-01/C-03)"
gh api "repos/$REPO/rulesets" -q '.[] | "\(.name)\t\(.enforcement)"' 2>&1 | sed 's/^/    /'
echo
echo "## Next"
echo "  Run again with a reduced-scope token, diff the two outputs, then fill in the"
echo "  Results section of docs/architecture/spike-26-github-api-shape.md"
