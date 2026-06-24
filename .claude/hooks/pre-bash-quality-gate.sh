#!/bin/bash
# pre-bash-quality-gate.sh
# PreToolUse hook for Bash. Runs the existing pre-commit quality gate inline
# when the command contains 'git commit' or 'git push', so that quality
# failures are caught at tool-call time rather than after the commit.
#
# Enforces a deterministic subset of the "lint + typecheck pass before any
# review" hard gate from .claude/rules/coding-standards.md.
#
# Behaviour:
#   - Reads the hook JSON from stdin ({tool_name, tool_input: {command}})
#   - Inspects the command: triggers on `git commit` and `git push`
#   - Runs .claude/hooks/pre-commit inline (which detects stack and runs
#     stack-specific checks)
#   - If pre-commit fails, exit 2 (blocks the commit/push)
#   - Otherwise exit 0
#
# Fail-open in template state: if .claude/hooks/pre-commit doesn't exist or
# isn't executable, exit 0. This keeps the scaffold itself working before
# /bootstrap configures the stack.
#
# Configuration:
#   ECC_PRE_COMMIT_GATE_DISABLED=1 → exit 0 immediately
#   ECC_PRE_COMMIT_GATE_BLOCK=0 → warn instead of block on failure
#
# Install: scripts/install-hooks.sh makes this executable; .claude/settings.json
# wires it into PreToolUse for Bash.

set -uo pipefail

# --- Configuration ---
if [ "${ECC_PRE_COMMIT_GATE_DISABLED:-0}" = "1" ]; then
  exit 0
fi

# Read hook payload from stdin
PAYLOAD=$(cat 2>/dev/null || echo "")
COMMAND=$(printf '%s' "$PAYLOAD" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# No command — nothing to check
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Only trigger on git commit / git push (and their variants)
TRIGGER=0
case "$COMMAND" in
  *git\ commit*|*git\ push*) TRIGGER=1 ;;
  "git commit"*|"git push"*) TRIGGER=1 ;;
esac

# Allow --no-verify bypass to also bypass this hook (don't double-penalize
# emergency commits the user has already approved)
case "$COMMAND" in
  *--no-verify*) exit 0 ;;
esac

if [ "$TRIGGER" = "0" ]; then
  exit 0
fi

# Locate the existing pre-commit hook
PRE_COMMIT=""
for candidate in \
  ".claude/hooks/pre-commit" \
  "$(git rev-parse --show-toplevel 2>/dev/null)/.claude/hooks/pre-commit"; do
  if [ -x "$candidate" ]; then
    PRE_COMMIT="$candidate"
    break
  fi
done

# Template / pre-bootstrap state: pre-commit exists but template state means
# it exits 0 with "(no project stack detected — template state, skipping checks)".
# That's correct behaviour; we run it and respect its verdict.
if [ -z "$PRE_COMMIT" ]; then
  # pre-commit hook isn't installed yet — fail open
  exit 0
fi

# Run pre-commit and respect its exit code
if "$PRE_COMMIT"; then
  exit 0
fi

# pre-commit failed
if [ "${ECC_PRE_COMMIT_GATE_BLOCK:-1}" = "0" ]; then
  echo "WARN: pre-commit checks failed. The commit proceeded despite the failures." >&2
  echo "      Set ECC_PRE_COMMIT_GATE_BLOCK=0 to suppress this message." >&2
  exit 0
fi

echo "BLOCK: pre-commit checks failed. Fix the failures above before committing." >&2
echo "       To bypass (emergency only): git commit --no-verify" >&2
echo "       To disable this hook: ECC_PRE_COMMIT_GATE_DISABLED=1" >&2
echo "       To warn instead of block: ECC_PRE_COMMIT_GATE_BLOCK=0" >&2
exit 2
