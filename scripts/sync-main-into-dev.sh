#!/usr/bin/env bash
#
# Post-release main -> dev sync.
#
# After a release squash-merges to main, `main` is no longer an ancestor of
# `dev`, and `release:check` blocks the next release until it is resynced.
# This automates that sync with the one primitive that is always correct here:
#
#     git merge -s ours origin/main
#
# `dev` is always a content-superset of `main` right after a release (the
# release was cut FROM dev), so `-s ours` re-links main as an ancestor with
# ZERO content change and ZERO conflicts. It then opens a PR to `dev` and
# enables auto-merge with the MERGE-COMMIT method — a squash would mint a new
# SHA and lose the ancestry, which is the exact failure mode this fixes.
#
# Run after each release tag is published (or let the post-release workflow
# invoke it). Requires `gh` authenticated as a user/App that can push and open
# PRs — a real token (not GITHUB_TOKEN) is what lets CI run on the resulting PR
# so auto-merge can complete.
#
# Usage:
#   scripts/sync-main-into-dev.sh [--no-auto-merge]
#
set -euo pipefail

AUTO_MERGE=1
[ "${1:-}" = "--no-auto-merge" ] && AUTO_MERGE=0

# Fetch branches only — NOT --tags. A divergent historical tag (e.g. a stray
# v1.0) can make `--tags` fail with "would clobber existing tag", and this
# script only needs the branch refs; the release tag for the branch name comes
# from local tags via `git describe` below (falls back to "latest").
git fetch origin main dev --quiet

if git merge-base --is-ancestor origin/main origin/dev; then
  echo "OK: main is already an ancestor of dev — nothing to sync."
  exit 0
fi

TAG="$(git describe --tags --abbrev=0 origin/main 2>/dev/null || echo latest)"
BRANCH="chore/sync-main-into-dev-${TAG}"

echo ">> Creating ${BRANCH} off origin/dev and merging main (-s ours)..."
git checkout -B "$BRANCH" origin/dev
git merge -s ours origin/main -m "chore(release): sync main (${TAG}) ancestry into dev"

if ! git merge-base --is-ancestor origin/main HEAD; then
  echo "ERROR: merge did not re-link main ancestry — aborting." >&2
  exit 1
fi

echo ">> Pushing ${BRANCH}..."
git push origin "$BRANCH" --force-with-lease

PR_BODY="Automated post-release sync (\`scripts/sync-main-into-dev.sh\`).

Re-links \`main\` as an ancestor of \`dev\` via \`git merge -s ours\` — zero
content change, it only restores ancestry so the next release \`release:check\`
passes.

Merge as a MERGE COMMIT, not squash — auto-merge below uses the merge method for
exactly this reason; squashing re-breaks the ancestry."

if gh pr view "$BRANCH" --json number >/dev/null 2>&1; then
  echo ">> PR already exists for ${BRANCH}."
else
  gh pr create --base dev --head "$BRANCH" \
    --title "chore(release): sync main (${TAG}) into dev" \
    --body "$PR_BODY"
fi

if [ "$AUTO_MERGE" = "1" ]; then
  if gh pr merge "$BRANCH" --auto --merge; then
    echo "OK: auto-merge (merge commit) enabled — merges once CI passes + approved."
  else
    echo "WARN: could not enable auto-merge (enable 'Allow auto-merge' in repo settings)."
    echo "      Merge the PR manually with 'Create a merge commit' — do NOT squash."
  fi
fi

echo "OK: sync PR ready for ${TAG}."
