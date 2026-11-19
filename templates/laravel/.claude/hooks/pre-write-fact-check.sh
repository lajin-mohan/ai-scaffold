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
# Fail-open: any unexpected error exits 0, and so does a machine with none of
# jq, python3 or python. Only strict mode (below) blocks.
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

# Native Windows (Git Bash, MSYS2, Cygwin): Claude Code reports paths as
# D:\dir\file, while bash and $PWD use /d/dir/file. Every path is brought to
# the /d/ form before comparing, and comparisons ignore case as the file
# system does. Other platforms are unchanged.
IS_WINDOWS=0
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) IS_WINDOWS=1 ;;
esac

to_posix() {
  local p="$1"
  [ "$IS_WINDOWS" = "1" ] || { printf '%s' "$p"; return 0; }
  p=$(printf '%s' "$p" | tr '\\' '/')
  case "$p" in
    [A-Za-z]:/*)
      local drive
      drive=$(printf '%s' "${p:0:1}" | tr 'A-Z' 'a-z')
      p="/${drive}${p:2}"
      ;;
  esac
  printf '%s' "$p"
}

# JSON parser: jq, else the first Python that actually runs. On Windows
# `python3` is often the Microsoft Store placeholder, which is on PATH but
# fails, so `python` is tried too.
PARSER=""
PY=""
if command -v jq > /dev/null 2>&1 && printf '{}' | jq -e . > /dev/null 2>&1; then
  PARSER="jq"
else
  for candidate in python3 python; do
    if command -v "$candidate" > /dev/null 2>&1 && "$candidate" -c 'import json' > /dev/null 2>&1; then
      PARSER="python"
      PY="$candidate"
      break
    fi
  done
fi

# Without a parser we cannot read the payload or transcript: fail open.
if [ -z "$PARSER" ]; then
  exit 0
fi

PAYLOAD=$(cat 2>/dev/null || echo "")

# Prints one top-level or tool_input field of the payload, or nothing.
payload_field() {
  if [ "$PARSER" = "jq" ]; then
    printf '%s' "$PAYLOAD" | jq -r "$1 // empty" 2>/dev/null | tr -d '\r'
  else
    printf '%s' "$PAYLOAD" | "$PY" -c '
import json, sys
try:
    d = json.load(sys.stdin)
    for key in sys.argv[1].lstrip(".").split("."):
        d = d.get(key, "") if isinstance(d, dict) else ""
    print(d or "")
except Exception:
    print("")
' "$1" 2>/dev/null | tr -d '\r'
  fi
}

FILE_PATH=$(to_posix "$(payload_field '.tool_input.file_path')")

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

# The transcript path comes only from the payload's `transcript_path`, which
# the Claude Code hooks runtime provides. An earlier env-var reconstruction
# was the source of a no-op bug and was removed.
TRANSCRIPT=$(payload_field '.transcript_path')
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# 1. Was this file *cited* in the conversation? Fixed-string matching
# (`grep -F`) avoids regex-metacharacter injection. Accepted forms: the
# absolute path, and the path relative to the hook's working directory,
# each with or without `:line`. Never by basename (the duplicate-basename
# bypass). On Windows the drive-letter forms are accepted too, with
# backslashes doubled as JSON stores them, and matching ignores case.
# canon_path gives the same form as FILE_PATH_ABS (on Windows it also turns an
# 8.3 short name such as LAJIN~1 into the long one).
CWD_POSIX=$(canon_path "$(to_posix "${PWD:-}")")
if [ -n "$CWD_POSIX" ] && [ "${FILE_PATH_ABS#"$CWD_POSIX"/}" != "$FILE_PATH_ABS" ]; then
  FILE_PATH_REL="${FILE_PATH_ABS#"$CWD_POSIX"/}"
else
  FILE_PATH_REL=""
fi
# D:/dir/file -> D:\\dir\\file, the form a backslash path takes inside JSON.
json_backslashes() {
  printf '%s' "$1" | sed 's#/#\\\\#g'
}
CANDIDATES=("$FILE_PATH_ABS")
[ -n "$FILE_PATH_REL" ] && CANDIDATES+=("$FILE_PATH_REL")
if [ "$IS_WINDOWS" = "1" ]; then
  case "$FILE_PATH_ABS" in
    /[a-z]/*)
      WIN_FWD="${FILE_PATH_ABS:1:1}:${FILE_PATH_ABS:2}"
      CANDIDATES+=("$WIN_FWD" "$(json_backslashes "$WIN_FWD")")
      ;;
  esac
  [ -n "$FILE_PATH_REL" ] && CANDIDATES+=("$(json_backslashes "$FILE_PATH_REL")")
fi
# Git Bash's grep aborts on -i with -F, so on Windows both sides are
# lowercased with tr instead.
fold_case() {
  if [ "$IS_WINDOWS" = "1" ]; then tr 'A-Z' 'a-z'; else cat; fi
}
PATTERNS=()
for candidate in "${CANDIDATES[@]}"; do
  PATTERNS+=(-e "$(printf '%s' "$candidate" | fold_case)")
done
CITED=0
# Process substitution, not a pipe: grep -q exits at the first match and,
# under pipefail, the writer's SIGPIPE would turn a match into a failure.
if grep -qF "${PATTERNS[@]}" < <(fold_case < "$TRANSCRIPT") 2>/dev/null; then
  CITED=1
fi

# 2. Was this file *read* in this session? Each Read tool_use's
# `input.file_path` in the transcript is compared exactly with
# FILE_PATH_ABS, after the same Windows normalisation. Never by basename or
# substring: a Read of src/b/foo.ts is not a Read of src/a/foo.ts.
READ=0
if [ "$PARSER" = "jq" ]; then
  WIN_JSON=false
  [ "$IS_WINDOWS" = "1" ] && WIN_JSON=true
  if jq -e --arg p "$FILE_PATH_ABS" --argjson win "$WIN_JSON" '
      def norm: if $win then (gsub("\\\\"; "/")
        | if test("^[A-Za-z]:/") then "/" + (.[0:1] | ascii_downcase) + .[2:] else . end
        | ascii_downcase) else . end;
      .. | objects | select(.type == "tool_use" and .name == "Read")
      | select(((.input.file_path // "") | norm) == ($p | norm))' \
    "$TRANSCRIPT" > /dev/null 2>&1; then
    READ=1
  fi
else
  if "$PY" -c '
import json, re, sys
windows = sys.argv[3] == "1"

def norm(p):
    if not windows:
        return p
    p = p.replace("\\", "/")
    if re.match(r"^[A-Za-z]:/", p):
        p = "/" + p[0].lower() + p[2:]
    return p.lower()

target = norm(sys.argv[1])
found = False

def walk(o):
    global found
    if isinstance(o, dict):
        if o.get("type") == "tool_use" and o.get("name") == "Read":
            if norm(o.get("input", {}).get("file_path", "") or "") == target:
                found = True
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)

with open(sys.argv[2], "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        try:
            walk(json.loads(line))
        except Exception:
            continue
        if found:
            break
sys.exit(0 if found else 1)
' "$FILE_PATH_ABS" "$TRANSCRIPT" "$IS_WINDOWS" > /dev/null 2>&1; then
    READ=1
  fi
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
