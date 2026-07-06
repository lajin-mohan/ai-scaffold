#!/bin/bash

# Pre-ToolUse hook: AI Protected Governance File Guard
# Warns when AI attempts to modify scaffold governance files
# These files control AI behavior and should only be modified by the project owner
set -uo pipefail

# Read the file path from stdin or arguments
if [ -t 0 ]; then
  FILE_PATH="$1"
else
  FILE_PATH=$(cat)
fi

# Normalize the path (remove leading ./)
FILE_PATH="${FILE_PATH#./}"

# Protected governance files and directories
PROTECTED_PATTERNS=(
  # Root governance files
  "^CLAUDE\.md$"
  "^AGENTS\.md$"
  "^SECURITY\.md$"
  "^CONTRIBUTING\.md$"

  # .claude directory
  "^\.claude/settings\.json$"
  "^\.claude/settings\.local\.json$"
  "^\.claude/settings-overrides\.json$"
  "^\.claude/hooks/"
  "^\.claude/agents/"
  "^\.claude/commands/"
  "^\.claude/rules/"
  "^\.claude/skills/"
  "^\.claude/memory/"
  "^\.claude/roles/"
  "^\.claude/templates/"
  "^\.claude/lib/"

  # GitHub workflows
  "^\.github/workflows/"

  # Scripts directory
  "^scripts/"
  "^scripts/install-hooks\.sh$"
  "^scripts/pre-publish-smoke\.sh$"
  "^scripts/setup-branch-protection\.sh$"
  "^scripts/setup-git-template\.sh$"

  # Hook scripts specifically
  "^\.claude/hooks/pre-commit$"
  "^\.claude/hooks/pre-commit-secrets"
  "^\.claude/hooks/pre-review\.sh$"
  "^\.claude/hooks/pre-write-fact-check\.sh$"
  "^\.claude/hooks/post-write-console-warn\.sh$"
  "^\.claude/hooks/pre-bash-quality-gate\.sh$"
  "^\.claude/hooks/pre-secret-guard\.sh$"
  "^\.claude/hooks/pre-dangerous-bash-guard\.sh$"
  "^\.claude/hooks/governance-file-guard\.sh$"

  # Docs/process and docs/setup
  "^docs/process/"
  "^docs/setup/"
  "^docs/architecture/ai-coding-scaffold-review\.md$"
)

# Check if the file matches any protected pattern
for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" =~ $pattern ]]; then
    echo "WARNING: Attempting to modify AI governance file: $FILE_PATH" >&2
    echo "" >&2
    echo "This file controls AI behavior and should only be modified by the project owner." >&2
    echo "If this change is intentional, please:" >&2
    echo "  1. Review the change carefully" >&2
    echo "  2. Commit with a clear message explaining why this governance file was changed" >&2
    echo "  3. Run 'ais doctor' after the change to verify hooks are still correct" >&2
    echo "" >&2
    echo "Pattern matched: $pattern" >&2
    # Exit 0 with warning (not blocking, just alerting)
    # Use exit 1 to make it blocking instead
    exit 0
  fi
done

exit 0