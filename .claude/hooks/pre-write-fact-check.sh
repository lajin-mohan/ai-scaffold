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
# Extract file_path. Prefer jq (robust against escaped quotes); fall back to
# python3 (similarly robust); otherwise a simple regex on the unescaped form
# (the payload field comes from Claude Code, which doesn't emit escaped quotes
# in file_path, so this last resort is safe in practice).
if command -v jq > /dev/null 2>&1; then
  FILE_PATH=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
elif command -v python3 > /dev/null 2>&1; then
  FILE_PATH=$(printf '%s' "$PAYLOAD" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", "") or "")
except Exception:
    print("")
' 2>/dev/null || echo "")
else
  FILE_PATH=$(printf '%s' "$PAYLOAD" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi

# No file_path (e.g., MultiEdit without primary path) — nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Template / scaffold state — file doesn't exist yet
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Locate the conversation transcript for this session. The Claude Code hooks
# runtime provides `transcript_path` in the JSON payload — that's the only
# source of truth we trust. The previous env-var reconstruction
# (CLAUDE_SESSION_ID + CLAUDE_PROJECT_DIR with hand-rolled directory
# encoding) was the source of an earlier no-op bug, so it has been removed
# entirely per the post-/review follow-up. Without a JSON parser (jq or
# python3) we cannot read the payload, so we fail open.
TRANSCRIPT=""
if command -v jq > /dev/null 2>&1; then
  TRANSCRIPT=$(printf '%s' "$PAYLOAD" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")
elif command -v python3 > /dev/null 2>&1; then
  TRANSCRIPT=$(printf '%s' "$PAYLOAD" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("transcript_path", "") or "")
except Exception:
    print("")
' 2>/dev/null || echo "")
fi

# No transcript found — can't verify, fail open
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# 1. Was this file *cited* in the conversation? We use fixed-string matching
# (`grep -F`) for the path itself to avoid regex-metacharacter injection if a
# `file_path` ever contains characters like `[`, `]`, `.`, `*`. The `:N` line
# suffix is matched separately with a small ERE pattern (no metachar input).
FILE_BASENAME=$(basename "$FILE_PATH")
CITED=0
if grep -qF -- "${FILE_BASENAME}:" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
elif grep -qF -- "$FILE_PATH" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
fi

# 2. Was this file *read* in this session? Pull Read tool_uses from the
# transcript with jq (robust against nested JSON shape), fall back to
# python3 (same), and finally to a fixed-string scan over the transcript.
READ=0
if command -v jq > /dev/null 2>&1; then
  if jq -e --arg b "$FILE_BASENAME" --arg p "$FILE_PATH" \
    '.. | objects | select(.type=="tool_use" and .name=="Read") | select((.input.file_path // "") | endswith($b) or . == $p or contains("/" + $b))' \
    "$TRANSCRIPT" >/dev/null 2>&1; then
    READ=1
  fi
elif command -v python3 > /dev/null 2>&1; then
  if python3 -c '
import json, sys
target_b = sys.argv[1]
target_p = sys.argv[2]
found = False
with open(sys.argv[3], "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        # Walk nested structure looking for tool_use blocks with name=Read
        def walk(o):
            global found
            if isinstance(o, dict):
                if o.get("type") == "tool_use" and o.get("name") == "Read":
                    fp = o.get("input", {}).get("file_path", "") or ""
                    if fp.endswith(target_b) or fp == target_p or ("/" + target_b) in fp:
                        found = True
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(obj)
        if found:
            break
sys.exit(0 if found else 1)
' "$FILE_BASENAME" "$FILE_PATH" "$TRANSCRIPT" >/dev/null 2>&1; then
    READ=1
  fi
elif grep -qF -- "\"name\": \"Read\"" "$TRANSCRIPT" 2>/dev/null \
  && grep -qF -- "$FILE_BASENAME" "$TRANSCRIPT" 2>/dev/null; then
  # Loose fallback: Read happened AND basename is mentioned in the transcript.
  # Not as tight as the jq/python3 paths, but avoids the regex-metachar issue.
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
