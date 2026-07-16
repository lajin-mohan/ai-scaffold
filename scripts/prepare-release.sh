#!/bin/bash
# prepare-release.sh — stamp a release onto the current branch (dev).
#
# Bumps the version across the three metadata files and dates the CHANGELOG's
# `[Unreleased]` section, in place. It does NOT commit, push, tag, or promote —
# the release workflow (.github/workflows/release.yml) drives those steps so the
# bump lands on `dev` first and `main` fast-forwards to it (no post-release
# sync, no version/CHANGELOG drift; see docs/setup/release-flow.md).
#
# Usage: bash scripts/prepare-release.sh <version>   # e.g. 0.10.3
#
# Idempotent guardrails:
#   - refuses a version that isn't strictly greater than the current one
#   - refuses if the CHANGELOG already has a heading for <version>
#   - requires at least one entry under [Unreleased] (nothing to release)

set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be X.Y.Z (got '${VERSION}')" >&2
  exit 1
fi

CURRENT=$(node -p "require('./package.json').version")

# Strictly-increasing check (semver-naive but sufficient: compare as sortable).
greatest=$(printf '%s\n%s\n' "$CURRENT" "$VERSION" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
if [ "$VERSION" = "$CURRENT" ] || [ "$greatest" != "$VERSION" ]; then
  echo "Error: ${VERSION} is not greater than the current version ${CURRENT}" >&2
  exit 1
fi

if grep -q "^## \[${VERSION}\]" CHANGELOG.md; then
  echo "Error: CHANGELOG already has a [${VERSION}] heading" >&2
  exit 1
fi

# Require real content under [Unreleased] — otherwise there is nothing to ship.
UNRELEASED_ENTRIES=$(awk '
  /^## \[Unreleased\]/ { inblock=1; next }
  /^## \[/            { inblock=0 }
  inblock && /^- /    { count++ }
  END                 { print count+0 }
' CHANGELOG.md)
if [ "$UNRELEASED_ENTRIES" -eq 0 ]; then
  echo "Error: no entries under [Unreleased] — nothing to release" >&2
  exit 1
fi

echo ">> Bumping version ${CURRENT} -> ${VERSION}"
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('.ai-scaffold.json'));j.version='${VERSION}';fs.writeFileSync('.ai-scaffold.json',JSON.stringify(j,null,2)+'\n')"

echo ">> Dating CHANGELOG [Unreleased] -> [${VERSION}] - $(date +%Y-%m-%d)"
DATE=$(date +%Y-%m-%d)
# Insert a dated heading right after [Unreleased], leaving [Unreleased] empty
# for the next cycle. Only the first match is touched.
awk -v ver="$VERSION" -v date="$DATE" '
  !done && /^## \[Unreleased\]/ {
    print
    print ""
    print "## [" ver "] - " date
    done=1
    next
  }
  { print }
' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

echo ">> prepared v${VERSION}: package.json, package-lock.json, .ai-scaffold.json, CHANGELOG.md"
