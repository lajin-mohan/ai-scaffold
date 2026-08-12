#!/bin/bash
# token-budget-guard.sh
# PreToolUse hook. Enforces the token budget documented in
# .claude/rules/token-usage-rules.md and .claude/rules/governance.md, which
# until now was advisory-only ("no hard enforcement — token management is
# advisory"). This hook makes the already-documented thresholds real:
#   - 300K tokens: WARN (unchanged — stays advisory, suggests /compact)
#   - 500K tokens: BLOCK by default (this is new — governance.md already
#     calls 500K the "hard flag" threshold; this hook is what makes it hard)
#
# Behaviour:
#   - Reads the hook JSON from stdin ({tool_name, tool_input, transcript_path})
#   - Estimates session tokens from the transcript file size (chars/4, the
#     same heuristic and divisor as scripts/token-report.js's CHARS_PER_TOKEN)
#   - Below the warn threshold: exit 0 silently
#   - At/above warn, below block: WARN to stderr, exit 0 (never blocks)
#   - At/above block: BLOCK to stderr, exit 2 — unless ECC_TOKEN_BUDGET_WARN_ONLY=1
#
# Fail-open: no transcript, no parser, or any read error exits 0. This hook
# never blocks a session it cannot actually measure.
#
# Configuration:
#   ECC_TOKEN_BUDGET_DISABLED=1    → exit 0 immediately
#   ECC_TOKEN_BUDGET_WARN_ONLY=1   → never block, warn only (escape hatch for
#                                     a legitimate long session — document why
#                                     in the session, same spirit as
#                                     `git commit --no-verify`)
#   ECC_TOKEN_BUDGET_WARN_TOKENS   → override the warn threshold (default 300000)
#   ECC_TOKEN_BUDGET_BLOCK_TOKENS  → override the block threshold (default 500000)
#
# Install: scripts/install-hooks.sh makes this executable; .claude/settings.json
# wires it into the same PreToolUse matcher as governance-file-guard.sh.

set -uo pipefail

# --- Configuration ---
if [ "${ECC_TOKEN_BUDGET_DISABLED:-0}" = "1" ]; then
  exit 0
fi

CHARS_PER_TOKEN=4
WARN_TOKENS="${ECC_TOKEN_BUDGET_WARN_TOKENS:-300000}"
BLOCK_TOKENS="${ECC_TOKEN_BUDGET_BLOCK_TOKENS:-500000}"

PAYLOAD=$(cat 2>/dev/null || echo "")

# Same extraction pattern as pre-write-fact-check.sh: the hooks runtime
# provides transcript_path in the JSON payload — that's the only source of
# truth we trust. Without a JSON parser we cannot read it, so we fail open.
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

if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

BYTES=$(wc -c < "$TRANSCRIPT" 2>/dev/null | tr -d ' ')
if [ -z "$BYTES" ] || ! [ "$BYTES" -eq "$BYTES" ] 2>/dev/null; then
  exit 0
fi

EST_TOKENS=$((BYTES / CHARS_PER_TOKEN))

if [ "$EST_TOKENS" -lt "$WARN_TOKENS" ]; then
  exit 0
fi

if [ "$EST_TOKENS" -lt "$BLOCK_TOKENS" ]; then
  echo "WARN: session is ~${EST_TOKENS} est-tokens (warn threshold: ${WARN_TOKENS})." >&2
  echo "      Consider running /compact soon — see token-usage-rules.md." >&2
  exit 0
fi

if [ "${ECC_TOKEN_BUDGET_WARN_ONLY:-0}" = "1" ]; then
  echo "WARN: session is ~${EST_TOKENS} est-tokens, past the block threshold (${BLOCK_TOKENS})" >&2
  echo "      but ECC_TOKEN_BUDGET_WARN_ONLY=1 is set, so this is a warning only." >&2
  exit 0
fi

echo "BLOCK: session is ~${EST_TOKENS} est-tokens — past the hard budget (${BLOCK_TOKENS})." >&2
echo "       Run /compact to continue, or set ECC_TOKEN_BUDGET_WARN_ONLY=1 to override" >&2
echo "       (document why in the session — same spirit as git commit --no-verify)." >&2
exit 2
