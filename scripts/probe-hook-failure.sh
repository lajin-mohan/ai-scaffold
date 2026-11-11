#!/usr/bin/env bash
# Item 97 L2/L3 probes (docs/architecture/hld-97-control-matrix.md §5).
#
# Proves what only Claude Code can show: with `onFailure: "block"`, a hook that
# times out, crashes or is missing blocks the tool call; without it, the call
# goes through. Observation is by sentinel file, never by the model's words.
#
# MAINTAINER ONLY. Run from your own signed-in terminal, not from an agent
# session. It spends real money: each probe is capped with --max-budget-usd.
#
# Usage:
#   bash scripts/probe-hook-failure.sh                       # L2, installed claude
#   bash scripts/probe-hook-failure.sh --tarball x.tgz       # L2 plus the real secret guard from a packed tarball
#   bash scripts/probe-hook-failure.sh --claude "npx -y @anthropic-ai/claude-code@2.1.294" --only timeout   # L3
#
# Options:
#   --claude <command>   how to run Claude Code (default: claude; on Windows use claude.exe, not the npm .cmd shim)
#   --tarball <file>     packed @lajin.m/ai-scaffold tarball; adds the real-guard probe
#   --only <probe>       run one probe pair: timeout | crash | missing
#   --budget <usd>       cap per run (default 0.20)
#   --model <model>      model per run (default haiku)
#   --with-user-settings also load ~/.claude/settings.json (see below)
#
# By default the runs use --setting-sources project, so your user settings and
# hooks do not interfere. A login defined in the env block of
# ~/.claude/settings.json is then not read: export those variables in this
# shell first, or pass --with-user-settings (your own hooks then run too).
# A run that is not logged in stops the script with ERROR; it never passes.
set -uo pipefail

CLAUDE_CMD="claude"
TARBALL=""
ONLY=""
BUDGET="0.20"
MODEL="haiku"
SOURCES="project"
while [ $# -gt 0 ]; do
  case "$1" in
    --with-user-settings) SOURCES="user,project"; shift ;;
    --claude) CLAUDE_CMD="$2"; shift 2 ;;
    --tarball) TARBALL="$2"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    --budget) BUDGET="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 64 ;;
  esac
done
read -ra CLAUDE <<< "$CLAUDE_CMD"

WORK=$(mktemp -d "${TMPDIR:-/tmp}/ais-l2-XXXXXX")
RESULTS=()
FAILURES=0
echo "Claude Code: $("${CLAUDE[@]}" --version 2>&1 | head -1)"
echo "Work directory (kept for inspection): $WORK"
echo "Setting sources: $SOURCES"
echo

# $1 dir, $2 hook command, $3 timeout seconds, $4 "block" or "" (control)
write_settings() {
  local on_failure=''
  [ -n "$4" ] && on_failure=", \"onFailure\": \"$4\""
  mkdir -p "$1/.claude"
  cat > "$1/.claude/settings.json" <<JSON
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Read", "hooks": [ { "type": "command", "command": "$2", "timeout": $3$on_failure } ] }
    ]
  }
}
JSON
}

# $1 dir, $2 file to read. Prints "read" when the sentinel reached out.txt.
run_agent() {
  local dir="$1" target="$2" sentinel
  sentinel=$(cat "$dir/$target")
  ( cd "$dir" && "${CLAUDE[@]}" -p "Use the Read tool to read $target, then use the Write tool to write its exact contents to out.txt. Do not use any other tool. If the read fails, write nothing." \
      --allowedTools Read Write --disallowedTools Bash \
      --permission-mode acceptEdits --setting-sources "$SOURCES" \
      --max-budget-usd "$BUDGET" --model "$MODEL" --no-session-persistence \
      > "$dir/agent.log" 2>&1 )
  if grep -qi 'not logged in' "$dir/agent.log"; then echo "error: not logged in"
  elif [ -f "$dir/out.txt" ] && grep -qF "$sentinel" "$dir/out.txt"; then echo read
  else echo "not read"; fi
}

# $1 label, $2 expected ("read" | "not read"), $3 dir, $4 file
probe() {
  local got
  got=$(run_agent "$3" "$4")
  if [[ "$got" == error:* ]]; then
    echo "ERROR $1: $got (see $3/agent.log). Nothing was tested; stopping." >&2
    echo "      Export the login variables from the env block of ~/.claude/settings.json, or rerun with --with-user-settings." >&2
    exit 2
  fi
  if [ "$got" = "$2" ]; then RESULTS+=("PASS  $1: $got"); else RESULTS+=("FAIL  $1: expected $2, got $got (see $3/agent.log)"); FAILURES=$((FAILURES + 1)); fi
  echo "${RESULTS[${#RESULTS[@]}-1]}"
}

new_case() {
  local dir="$WORK/$1"
  mkdir -p "$dir"
  echo "SENTINEL-$1-$RANDOM$RANDOM" > "$dir/sentinel.txt"
  echo "$dir"
}

fixture_pair() {
  local name="$1" body="$2" command="$3" dir mode on_failure expected label
  for mode in block control; do
    dir=$(new_case "$name-$mode")
    if [ -n "$body" ]; then printf '#!/bin/bash\n%s\n' "$body" > "$dir/fixture-hook.sh"; fi
    # The control is the same probe without onFailure: the read must then
    # happen, or the blocked result above would prove nothing.
    if [ "$mode" = block ]; then
      on_failure=block; expected="not read"; label="onFailure block"
    else
      on_failure=''; expected="read"; label="no onFailure (control)"
    fi
    write_settings "$dir" "$command" 2 "$on_failure"
    probe "$name, $label" "$expected" "$dir" sentinel.txt
  done
}

run_pair() {
  case "$1" in
    timeout) fixture_pair timeout 'sleep 10' 'bash \"${CLAUDE_PROJECT_DIR}/fixture-hook.sh\"' ;;
    crash) fixture_pair crash 'exit 1' 'bash \"${CLAUDE_PROJECT_DIR}/fixture-hook.sh\"' ;;
    missing) fixture_pair missing '' 'bash \"${CLAUDE_PROJECT_DIR}/no-such-hook.sh\"' ;;
  esac
}

for pair in timeout crash missing; do
  [ -z "$ONLY" ] || [ "$ONLY" = "$pair" ] || continue
  run_pair "$pair"
done

if [ -n "$TARBALL" ]; then
  dir=$(new_case real-secret-guard)
  tar --force-local -xzf "$TARBALL" -C "$dir" package/templates/node/.claude/hooks/pre-secret-guard.sh
  cp "$dir/package/templates/node/.claude/hooks/pre-secret-guard.sh" "$dir/guard.sh"
  mv "$dir/sentinel.txt" "$dir/.env"
  write_settings "$dir" 'bash \"${CLAUDE_PROJECT_DIR}/guard.sh\"' 15 block
  probe "real secret guard from the tarball, Read .env" "not read" "$dir" .env
fi

echo
echo "Summary ($(date -u +%Y-%m-%dT%H:%MZ), $("${CLAUDE[@]}" --version 2>&1 | head -1)):"
printf '  %s\n' "${RESULTS[@]}"
[ "$FAILURES" -eq 0 ] || exit 1
