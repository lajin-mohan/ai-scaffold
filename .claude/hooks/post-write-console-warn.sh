#!/bin/bash
# post-write-console-warn.sh
# PostToolUse hook for Edit/Write/MultiEdit. Warns when the file just edited
# has new console.* / print() / println!() statements that weren't in the
# previous version.
#
# Enforces a deterministic subset of the "no debug logs in production code"
# preference from .claude/rules/coding-standards.md.
#
# Behaviour:
#   - Reads the hook JSON from stdin ({tool_name, tool_input: {file_path}})
#   - Runs `git diff` against HEAD to find newly added lines
#   - Greps those added lines for console.log / console.warn / console.error /
#     print( / println!(
#   - If found, emit a WARN message identifying the lines
#   - Exit 0 always (warn, never block)
#
# Scope: only .ts/.tsx/.js/.jsx/.mjs/.cjs/.py/.rs files. Other languages are
# out of scope.
#
# Fail-open: any unexpected error exits 0. This hook never blocks the agent.
#
# Configuration:
#   ECC_CONSOLE_WARN_DISABLED=1 → exit 0 immediately
#   ECC_CONSOLE_WARN_STRICT=1 → exit 2 (block) on findings
#
# Install: scripts/install-hooks.sh makes this executable; .claude/settings.json
# wires it into PostToolUse for Edit/Write/MultiEdit.

set -uo pipefail

# --- Configuration ---
if [ "${ECC_CONSOLE_WARN_DISABLED:-0}" = "1" ]; then
  exit 0
fi

# Read hook payload from stdin
PAYLOAD=$(cat 2>/dev/null || echo "")
FILE_PATH=$(printf '%s' "$PAYLOAD" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# No file_path — nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# File doesn't exist (deleted?) — nothing to check
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Scope filter: only check languages where console-style debug is common
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.py|*.rs) ;;
  *) exit 0 ;;
esac

# Get the diff of added lines for this file vs HEAD.
# `git diff HEAD -- <file>` shows working-tree vs HEAD; we want the *added*
# lines specifically. If HEAD doesn't have the file (new file), all
# non-context lines are additions.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

# `-U0` to suppress context lines; grep for console patterns in added lines.
# `+` prefix marks added lines in unified diff. We use --no-color to keep the
# output parseable.
ADDED_LINES=$(git diff --no-color --unified=0 -- "$FILE_PATH" 2>/dev/null \
  | grep -E '^\+[^+]' \
  | grep -vE '^\+\+\+' \
  || true)

# No diff (file unchanged or untracked) — but untracked files need the
# whole-file scan below, so we only short-circuit if the file isn't untracked.
if [ -z "$ADDED_LINES" ]; then
  if ! git status --porcelain -- "$FILE_PATH" 2>/dev/null | grep -q '^??'; then
    exit 0
  fi
fi

# Language-specific patterns
PATTERNS=()
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    PATTERNS=('console\.log\(' 'console\.warn\(' 'console\.error\(' 'console\.debug\(')
    ;;
  *.py)
    PATTERNS=('print\(')
    ;;
  *.rs)
    PATTERNS=('println!\(' 'print!\(' 'eprintln!\(' 'eprint!\(')
    ;;
esac

# Find matches in added lines
MATCHES=""
for pattern in "${PATTERNS[@]}"; do
  HITS=$(printf '%s\n' "$ADDED_LINES" | grep -nE "$pattern" || true)
  if [ -n "$HITS" ]; then
    MATCHES="${MATCHES}${MATCHES:+$'\n'}${HITS}"
  fi
done

# Also handle brand-new files: if the file is untracked, fall back to scanning
# the whole file (not just the diff). This catches console.log in freshly
# created JS/TS files.
if [ -z "$MATCHES" ] && git status --porcelain -- "$FILE_PATH" 2>/dev/null | grep -q '^??'; then
  for pattern in "${PATTERNS[@]}"; do
    HITS=$(grep -nE -- "$pattern" -- "$FILE_PATH" 2>/dev/null || true)
    if [ -n "$HITS" ]; then
      MATCHES="${MATCHES}${MATCHES:+$'\n'}[new file] ${HITS}"
    fi
  done
fi

if [ -n "$MATCHES" ]; then
  if [ "${ECC_CONSOLE_WARN_STRICT:-0}" = "1" ]; then
    echo "BLOCK: New debug-log statements detected in $FILE_PATH:" >&2
    printf '%s\n' "$MATCHES" | sed 's/^/       /' >&2
    echo "       Remove or replace with the project's structured logger." >&2
    exit 2
  fi
  echo "WARN: New debug-log statements detected in $FILE_PATH:" >&2
  printf '%s\n' "$MATCHES" | sed 's/^/       /' >&2
  echo "      coding-standards.md prefers no console.* / print( in committed code." >&2
  echo "      If intentional (e.g., a one-off script), this warning is safe to ignore." >&2
fi

exit 0
