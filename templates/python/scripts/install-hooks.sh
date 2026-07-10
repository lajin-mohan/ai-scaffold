#!/bin/bash
# install-hooks — sets up git hooks with one command.
#
# Run once after cloning:
#   ./scripts/install-hooks.sh
#
# What it does:
#   1. Configures git to use .claude/hooks as the hooks directory
#   2. Makes all hook scripts executable (git doesn't preserve +x in the index)
set -euo pipefail

HOOKS_DIR=".claude/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo ">> Installing git hooks"

# 1. Configure git to use .claude/hooks
git config core.hooksPath "$HOOKS_DIR"
echo "   OK: core.hooksPath set to $HOOKS_DIR"

# 2. Make all hook files executable (git doesn't preserve +x in the index)
for hook in "$HOOKS_DIR"/*; do
  if [ -f "$hook" ]; then
    chmod +x "$hook"
    echo "   OK: $(basename "$hook") is executable"
  fi
done

echo ""
echo "Git hooks installed. Run /bootstrap to configure stack-specific checks."
echo "To bypass hooks: git commit --no-verify"
