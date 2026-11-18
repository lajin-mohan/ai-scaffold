#!/bin/bash
# pre-bash-quality-gate.sh
# PreToolUse hook for Bash. Before Claude Code runs `git commit`, checks that
# the project's git hooks are installed, so the commit is checked by git's own
# pre-commit and commit-msg hooks.
#
# It does not run the checks itself. Git runs .git/hooks/pre-commit (lint,
# typecheck, tests or scripts/verify, secrets scan) on every commit from every
# tool, with no time limit; running it here as well repeated that work inside
# Claude Code's hook timeout, and a hook that times out does not block
# (code.claude.com/docs/en/hooks, "Timeouts"). CI checks what is pushed.
#
# Behaviour:
#   - Reads the hook JSON from stdin ({tool_name, tool_input: {command}})
#   - Acts only on `git commit`; anything else exits 0
#   - Exits 0 outside a git repository, or when the project ships no
#     .claude/hooks/pre-commit (nothing to install)
#   - Exits 2 (blocks) when pre-commit or commit-msg is missing or not
#     executable in the hooks directory git uses (core.hooksPath if set)
#
# `--no-verify` exits 0: git skips its hooks for that commit, and AGENTS.md
# tells agents not to use it.
#
# Configuration:
#   ECC_PRE_COMMIT_GATE_DISABLED=1 → exit 0 immediately
#   ECC_PRE_COMMIT_GATE_BLOCK=0 → warn instead of block
#
# Install: .claude/settings.json wires it into PreToolUse for Bash.

set -uo pipefail

if [ "${ECC_PRE_COMMIT_GATE_DISABLED:-0}" = "1" ]; then
  exit 0
fi

PAYLOAD=$(cat 2>/dev/null || echo "")
COMMAND=$(printf '%s' "$PAYLOAD" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

case "$COMMAND" in
  *git\ commit*) ;;
  *) exit 0 ;;
esac

case "$COMMAND" in
  *--no-verify*) exit 0 ;;
esac

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$GIT_ROOT" ] || [ ! -f "$GIT_ROOT/.claude/hooks/pre-commit" ]; then
  exit 0
fi

HOOKS_DIR=$(git -C "$GIT_ROOT" config core.hooksPath 2>/dev/null || echo "")
if [ -z "$HOOKS_DIR" ]; then
  HOOKS_DIR=$(git -C "$GIT_ROOT" rev-parse --git-path hooks 2>/dev/null || echo ".git/hooks")
fi
case "$HOOKS_DIR" in
  /*|[A-Za-z]:*) ;;
  *) HOOKS_DIR="$GIT_ROOT/$HOOKS_DIR" ;;
esac

MISSING=""
for hook in pre-commit commit-msg; do
  if [ ! -f "$HOOKS_DIR/$hook" ] || [ ! -x "$HOOKS_DIR/$hook" ]; then
    MISSING="${MISSING}${MISSING:+, }$hook"
  fi
done

if [ -z "$MISSING" ]; then
  exit 0
fi

LEVEL="BLOCK"
[ "${ECC_PRE_COMMIT_GATE_BLOCK:-1}" = "0" ] && LEVEL="WARN"
echo "$LEVEL: git hook(s) not installed in $HOOKS_DIR: $MISSING." >&2
echo "       Without them this commit skips the project's pre-commit checks." >&2
echo "       Install them with: ais update --apply" >&2
echo "       or copy .claude/hooks/pre-commit and .claude/hooks/commit-msg into" >&2
echo "       $HOOKS_DIR and make them executable." >&2
[ "$LEVEL" = "WARN" ] && exit 0
exit 2
