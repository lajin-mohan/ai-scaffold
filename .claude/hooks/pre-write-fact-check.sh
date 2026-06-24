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

# --- Path canonicalization helper ---
# Resolve a possibly-relative path to an absolute path against the hook's
# current working directory, without requiring the file (or any of its
# parents) to exist on disk. Returns "" on failure so callers can fail open.
#
# Chain (in priority order, matching the parser-precedence pattern used
# elsewhere in this script):
#   1. GNU realpath -m   (Linux fast path, handles missing files)
#   2. python3 os.path.abspath  (always-correct oracle, sub-10ms)
#   3. pure-bash walk-up  (no external dependency; collapses . and ..)
#
# Why: the agent's payload `file_path` may be relative (the agent may have
# `cd`'d to a subdirectory), and the transcript's Read blocks are always
# absolute. Without canonicalization, exact-string comparison would miss
# legitimate matches. We must NOT rely on basename matching — that's the
# duplicate-basename bypass the previous version had.
canon_path() {
  local p="$1"
  if [ -z "$p" ]; then
    echo ""
    return 0
  fi
  # If already absolute, return as-is (skip the work). This also avoids
  # the corner case where $PWD is unset.
  case "$p" in
    /*) printf '%s' "$p" ;;
    *)
      # 1. GNU realpath fast path. -m = "missing is OK" (so we can
      # canonicalize paths to files that don't exist yet — exactly what
      # the hook needs). BSD realpath on macOS does NOT support -m, so
      # we probe the help output before using it.
      if command -v realpath > /dev/null 2>&1 \
         && realpath --help 2>&1 | grep -q -- '-m' 2>/dev/null; then
        realpath -m "$p" 2>/dev/null && return 0
      fi
      # 2. python3 os.path.abspath. The always-correct oracle.
      # NOTE: do NOT pass `-- "$p"` to python3 — python3 -c does not
      # strip a leading `--`, so it would end up as sys.argv[1] and
      # `os.path.abspath("--")` returns `$(pwd)/--`. Pass the path
      # directly as a positional arg.
      if command -v python3 > /dev/null 2>&1; then
        python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' \
          "$p" 2>/dev/null && return 0
      fi
      # 3. Pure-bash walk-up: climb to the first existing ancestor, then
      # `pwd -P` from there, then append the accumulated suffix. Does NOT
      # resolve symlinks (textual only) and does NOT collapse `..` in the
      # suffix, but for agent tool paths in a real repo this is good enough
      # as a last resort. Returns "" on total failure so the caller fails open.
      local target="$p" suffix=""
      while [ ! -d "$target" ]; do
        local base
        base=$(basename -- "$target" 2>/dev/null)
        if [ -z "$base" ] || [ "$target" = "$base" ]; then
          target=""
          break
        fi
        suffix="/$base$suffix"
        target=$(dirname -- "$target" 2>/dev/null)
        [ -z "$target" ] && break
      done
      if [ -n "$target" ]; then
        (cd "$target" 2>/dev/null && printf '%s%s' "$(pwd -P)" "$suffix") \
          && return 0
      fi
      echo ""
      ;;
  esac
}

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

# Canonicalize the agent's payload file_path to an absolute path resolved
# against the hook's current working directory. This is the single
# comparison target for both Cited and Read detection — using a non-
# canonical path (relative, ./, ../) would either miss legitimate
# matches or accept false matches.
FILE_PATH_ABS=$(canon_path "$FILE_PATH")
if [ -z "$FILE_PATH_ABS" ]; then
  # canonicalization failed completely — fail open
  exit 0
fi

# Template / scaffold state — file doesn't exist yet. Use the canonicalized
# path so a relative payload doesn't get misclassified as missing.
if [ ! -f "$FILE_PATH_ABS" ]; then
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
# (`grep -F`) to avoid regex-metacharacter injection. We accept two citation
# forms:
#   - Absolute: `/Users/lajinmohan/website/ai-scaffold/.claude/settings.json:42`
#   - Relative to hook cwd: `.claude/settings.json:42`
# We do NOT match by basename — that was the duplicate-basename bypass
# (Read of `src/b/foo.ts` was treated as evidence that `src/a/foo.ts` was
# known, even though they are different files). The relative form is needed
# because agents commonly cite paths relative to the project root in
# natural-language text (empirically observed across multiple transcripts).
# `FILE_PATH_REL` is the absolute path with the hook's $PWD prefix stripped
# (when applicable), preserving a leading dot.
if [ -n "$PWD" ] && [ "${FILE_PATH_ABS#"$PWD"/}" != "$FILE_PATH_ABS" ]; then
  FILE_PATH_REL="${FILE_PATH_ABS#"$PWD"/}"
else
  FILE_PATH_REL=""
fi
CITED=0
if grep -qF -- "${FILE_PATH_ABS}:" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
elif grep -qF -- "$FILE_PATH_ABS" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
elif [ -n "$FILE_PATH_REL" ] && grep -qF -- "${FILE_PATH_REL}:" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
elif [ -n "$FILE_PATH_REL" ] && grep -qF -- "$FILE_PATH_REL" "$TRANSCRIPT" 2>/dev/null; then
  CITED=1
fi

# 2. Was this file *read* in this session? Pull Read tool_uses from the
# transcript and compare each `input.file_path` exactly against
# `FILE_PATH_ABS` — the canonicalized absolute path of the file the agent
# is about to edit. We do NOT match by basename or by substring; that was
# the duplicate-basename bypass. If a Read was for `src/b/foo.ts`, it does
# NOT count as a Read of `src/a/foo.ts`, even though they share a basename.
# The transcript's Read paths are always absolute (empirically verified
# across 6 Read blocks in 3 transcripts); the agent's payload `file_path`
# may be relative, which is why we canonicalized it above.
READ=0
if command -v jq > /dev/null 2>&1; then
  if jq -e --arg p "$FILE_PATH_ABS" \
    '.. | objects | select(.type=="tool_use" and .name=="Read") | select((.input.file_path // "") == $p)' \
    "$TRANSCRIPT" >/dev/null 2>&1; then
    READ=1
  fi
elif command -v python3 > /dev/null 2>&1; then
  if python3 -c '
import json, sys
target_p = sys.argv[1]
found = False
with open(sys.argv[2], "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        # Walk nested structure looking for tool_use blocks with name=Read
        # and an input.file_path that exactly equals our canonicalized target.
        def walk(o):
            global found
            if isinstance(o, dict):
                if o.get("type") == "tool_use" and o.get("name") == "Read":
                    fp = o.get("input", {}).get("file_path", "") or ""
                    if fp == target_p:
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
' "$FILE_PATH_ABS" "$TRANSCRIPT" >/dev/null 2>&1; then
    READ=1
  fi
  # If neither jq nor python3 is available, fail open for Read detection
  # (no enforcement). This is intentional: the previous regex fallback
  # matched by basename and was the same class of bypass.
fi

# Decision: cited but never read. Surface the canonicalized path so the
# user sees the same path the transcript and Read blocks use, regardless
# of whether the agent's payload was relative or absolute.
if [ "$CITED" = "1" ] && [ "$READ" = "0" ]; then
  if [ "${ECC_FACT_CHECK_STRICT:-0}" = "1" ]; then
    echo "BLOCK: $FILE_PATH_ABS was cited (file:line) in this session but never read." >&2
    echo "       H1 (verify before claim) requires reading the file before editing." >&2
    echo "       Read $FILE_PATH_ABS first, then retry the edit." >&2
    exit 2
  fi
  echo "WARN: $FILE_PATH_ABS was cited (file:line) in this session but never read in this session." >&2
  echo "      H1 (verify before claim) and H2 (cite file:line) prefer Read-before-Edit." >&2
  echo "      If you've already read it earlier in the session, this warning is safe to ignore." >&2
fi

exit 0
