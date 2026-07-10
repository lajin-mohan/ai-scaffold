#!/usr/bin/env bash
set -euo pipefail

MAIN_REF="${MAIN_REF:-origin/main}"
CANDIDATE_REF="${CANDIDATE_REF:-HEAD}"
HEAD_BRANCH="${HEAD_BRANCH:-}"

usage() {
  cat <<'USAGE'
Usage: scripts/check-release-readiness.sh [--main REF] [--candidate REF] [--head-branch NAME]

Checks that a release or main-promotion branch is safe to promote:

  1. The main ref must be an ancestor of the candidate ref.
  2. release/v* branches may only change release metadata after dev.

Environment overrides:

  MAIN_REF       Default: origin/main
  CANDIDATE_REF  Default: HEAD
  HEAD_BRANCH    Optional branch name, used to detect release/v* branches in CI
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --main)
      MAIN_REF="${2:-}"
      shift 2
      ;;
    --candidate)
      CANDIDATE_REF="${2:-}"
      shift 2
      ;;
    --head-branch)
      HEAD_BRANCH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

require_ref() {
  local ref="$1"
  if ! git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
    echo "Missing required git ref: $ref" >&2
    echo "Run: git fetch origin main dev" >&2
    exit 1
  fi
}

require_ref "$MAIN_REF"
require_ref "$CANDIDATE_REF"

if ! git merge-base --is-ancestor "$MAIN_REF" "$CANDIDATE_REF"; then
  cat >&2 <<EOF
Release readiness failed.

$MAIN_REF is not an ancestor of $CANDIDATE_REF.

Do not resolve this in the release PR. Sync main into dev first, verify, then
create a fresh promotion branch/PR.
EOF
  exit 1
fi

if [ -z "$HEAD_BRANCH" ]; then
  HEAD_BRANCH="$(git branch --show-current 2>/dev/null || true)"
fi

if [[ "$HEAD_BRANCH" == release/v* ]]; then
  DEV_REF="${DEV_REF:-origin/dev}"
  require_ref "$DEV_REF"

  disallowed_files="$(git diff --name-only "$DEV_REF...$CANDIDATE_REF" | grep -Ev '^(\.ai-scaffold\.json|CHANGELOG\.md|package-lock\.json|package\.json)$' || true)"
  if [ -n "$disallowed_files" ]; then
    cat >&2 <<EOF
Release readiness failed.

release/v* branches may only change release metadata after dev.
Unexpected files:
$disallowed_files

Move source/docs/template changes through feature PRs into dev first, then cut
a fresh release branch.
EOF
    exit 1
  fi
fi

echo "Release readiness OK: $MAIN_REF is an ancestor of $CANDIDATE_REF."
