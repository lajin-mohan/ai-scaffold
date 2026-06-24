#!/bin/bash
# pre-write-fact-check.sh
# PreToolUse hook for Edit/Write/MultiEdit. Warns when an edit modifies a file
# that was cited in the conversation (as file:line) but not verified by a Read
# in the same session.
#
# Enforces a deterministic subset of H1 (verify before claim) and H2 (cite
# file:line) from .claude/rules/ai-coding-rules.md.
#
# Behaviour:
#   - Reads the hook JSON from stdin ({tool_name, tool_input: {file_path}, session_id})
#   - Looks at recent conversation JSONL for Read tool calls referencing the target file
#   - If the file was cited (via file:line) but no Read happened in this session,
#     emit a WARN message to stderr and exit 0 (warn, never block)
#   - Otherwise exit 0 silently
#
# Fail-open: any unexpected error exits 0. This hook never blocks the agent.
# The H1-H8 rules are still the source of truth; this hook is the enforcement
# layer that fires deterministically rather than depending on the agent's
# voluntary compliance.
#
# Configuration:
#   ECC_FACT_CHECK_STRICT=1 → exit 2 (block) instead of warn
#   ECC_FACT_CHECK_DISABLED=1 → exit 0 immediately
#
# Install: scripts/install-hooks.sh makes this executable; .claude/settings.json
# wires it into PreToolUse for Edit/Write/MultiEdit.

set -uo pipefail

# --- Configuration ---
if [ "${ECC_FACT_CHECK_DISABLED:-0}" = "1" ]; then
  exit 0
fi

# Read hook payload from stdin
PAYLOAD=$(cat 2>/dev/null || echo "")
TOOL_NAME=$(printf '%s' "$PAYLOAD" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
FILE_PATH=$(printf '%s' "$PAYLOAD" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# No file_path (e.g., MultiEdit without primary path) — nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Template / scaffold state — file doesn't exist yet
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Locate the conversation transcript for this session.
# Claude Code stores it under:
#   $HOME/.claude/projects/<encoded-cwd>/<session-id>.jsonl
# where <encoded-cwd> replaces the leading "/" with "-" and every remaining
# "/" with "-". Dots are preserved as-is. Example:
#   /Users/lajinmohan/website/ai-scaffold
#   -> ~/.claude/projects/-Users-lajinmohan-website-ai-scaffold/<id>.jsonl
# Confirmed against the actual filesystem on this scaffold's CI host.
TRANSCRIPT=""
if [ -n "${CLAUDE_SESSION_ID:-}" ] && [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  ENCODED_CWD=$(printf '%s' "$CLAUDE_PROJECT_DIR" | sed 's|^/|-|; s|/|-|g')
  TRANSCRIPT="$HOME/.claude/projects/${ENCODED_CWD}/${CLAUDE_SESSION_ID}.jsonl"
fi

# No transcript found — can't verify, fail open
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# 1. Was this file *cited* in the conversation (file:line patterns)?
#    We look for relative or absolute paths of the target file appearing in
#    any assistant or user message.
FILE_BASENAME=$(basename "$FILE_PATH")
CITED=0
if grep -qE "${FILE_BASENAME}:[0-9]+|${FILE_PATH}" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
fi

# 2. Was this file *read* in this session? Transcript format nests file_path
# under content[].input.file_path, so we look for a Read tool_use whose
# file_path ends with our basename or contains our absolute path.
READ=0
if grep -qE '"name"[[:space:]]*:[[:space:]]*"Read"[[:space:]]*,[[:space:]]*"input"[[:space:]]*:[[:space:]]*\{[[:space:]]*"file_path"[[:space:]]*:[[:space:]]*"[^"]*'"${FILE_BASENAME}"'"' "$TRANSCRIPT" 2>/dev/null; then
  READ=1
fi

# Decision: cited but never read
if [ "$CITED" = "1" ] && [ "$READ" = "0" ]; then
  if [ "${ECC_FACT_CHECK_STRICT:-0}" = "1" ]; then
    echo "BLOCK: $FILE_PATH was cited (file:line) in this session but never read." >&2
    echo "       H1 (verify before claim) requires reading the file before editing." >&2
    echo "       Read $FILE_PATH first, then retry the edit." >&2
    exit 2
  fi
  echo "WARN: $FILE_PATH was cited (file:line) in this session but never read in this session." >&2
  echo "      H1 (verify before claim) and H2 (cite file:line) prefer Read-before-Edit." >&2
  echo "      If you've already read it earlier in the session, this warning is safe to ignore." >&2
fi

exit 0
