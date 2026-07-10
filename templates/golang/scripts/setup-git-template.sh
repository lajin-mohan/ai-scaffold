#!/usr/bin/env bash
# scripts/setup-git-template.sh
#
# Configure git to use a commit template that enforces human-only authorship.
# Run once per machine — no need to re-run for new projects.
#
# What this does:
#   1. Creates ~/.gitmessage with Conventional Commits format + no Co-Authored-By block
#   2. Sets it as the global commit template
#
# Run this on every new machine before using the scaffold.
#
# Usage:
#   bash scripts/setup-git-template.sh

set -euo pipefail

GIT_MESSAGE="$HOME/.gitmessage"

echo "==> Creating commit template at $GIT_MESSAGE"

cat > "$GIT_MESSAGE" << 'TEMPLATE'
# Subject: type(scope): short description (≤72 chars, present tense, no period)

# Body (optional - explain WHY, not WHAT):
#
#
# Footer: Closes #ticket-id or Refs #ticket-id

TEMPLATE

git config --global commit.template "$GIT_MESSAGE"

echo "==> Git commit template configured: $GIT_MESSAGE"
echo "==> All commits will now use only your human identity."
echo "==> Co-Authored-By lines will not be added automatically."
echo ""
echo "To view current template:"
echo "  git config --global --get commit.template"
echo ""
echo "To commit without the template (rare cases):"
echo "  git commit --no-template"