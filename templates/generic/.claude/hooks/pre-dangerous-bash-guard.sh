#!/bin/bash

# Pre-ToolUse hook: Dangerous Bash Command Guard
# Blocks destructive shell and Git history commands before execution.
set -uo pipefail

# read, not $(cat): no extra process. It returns 1 at end of input.
IFS= read -r -d "" PAYLOAD || true
GUARD_NAME='dangerous bash guard'

# --- Hook input, parsed once (item 97: D2 speed, D3 fail closed) -------------
# Identical in pre-secret-guard.sh and pre-dangerous-bash-guard.sh; a test
# checks. Starting a process is slow on Windows, so the input is parsed in one
# process: jq if installed, else a working Python (the Microsoft Store python3
# stub fails and is skipped), else bash alone. Output is key=value lines:
# tool_name first, then the tool_input fields below, with newlines inside a
# value turned into " ; ". Fails when the input is empty, is not JSON, or names
# no tool. Written for bash 3.2, the macOS /bin/bash.
GUARD_FIELDS='file_path path pattern command'
GUARD_UNREADABLE=3

guard_parse_python() {
  # UTF-8 so a non-ASCII path cannot crash Windows Python into a false block.
  printf '%s' "$PAYLOAD" | PYTHONIOENCODING=utf-8 "$1" -c '
import json, sys
text = (str, type(u""))
try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(3)
name = data.get("tool_name") if isinstance(data, dict) else None
if not isinstance(name, text) or not name:
    sys.exit(3)
print("tool_name=" + name)
tool_input = data.get("tool_input")
if isinstance(tool_input, dict):
    for field in sys.argv[1].split():
        value = tool_input.get(field)
        if isinstance(value, text):
            print(field + "=" + value.replace("\r\n", " ; ").replace("\n", " ; "))
' "$GUARD_FIELDS" 2>/dev/null
}

# Sets GUARD_VALUE to one JSON string value, read with bash alone (no process
# started); unescapes \\ \" \n and \t.
guard_bash_value() {
  local pattern="\"$1\"[[:space:]]*:[[:space:]]*\"(([^\"\\\\]|\\\\.)*)\"" value
  GUARD_VALUE=''
  [[ "$PAYLOAD" =~ $pattern ]] || return 0
  value="${BASH_REMATCH[1]}"
  value="${value//\\\\/$'\001'}"
  value="${value//\\n/ ; }"
  value="${value//\\t/ }"
  value="${value//\\\"/\"}"
  GUARD_VALUE="${value//$'\001'/\\}"
}

guard_parse_bash() {
  local field
  local object='^[[:space:]]*[{].*[}][[:space:]]*$'
  [[ "$PAYLOAD" =~ $object ]] || return 1
  guard_bash_value tool_name
  [ -n "$GUARD_VALUE" ] || return 1
  echo "tool_name=$GUARD_VALUE"
  for field in $GUARD_FIELDS; do
    guard_bash_value "$field"
    if [ -n "$GUARD_VALUE" ]; then echo "$field=$GUARD_VALUE"; fi
  done
}

guard_parse() {
  local pythons python status
  [ -n "${PAYLOAD//[[:space:]]/}" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$PAYLOAD" | jq -er --arg fields "$GUARD_FIELDS" '
      if type == "object" and (.tool_name | type) == "string" and .tool_name != "" then
        "tool_name=" + .tool_name,
        ((.tool_input // {}) as $i | ($fields | split(" "))[] as $f
          | select(($i | type) == "object" and ($i[$f] | type) == "string")
          | $f + "=" + ($i[$f] | gsub("\r?\n"; " ; ")))
      else error("unreadable") end' 2>/dev/null && return 0
    # jq failed: unreadable input, or a broken jq. Python or bash decides.
  fi
  # On Windows try python first: python3 there is often the Store stub.
  case "${OSTYPE:-}" in msys*|cygwin*) pythons='python python3' ;; *) pythons='python3 python' ;; esac
  for python in $pythons; do
    command -v "$python" >/dev/null 2>&1 || continue
    guard_parse_python "$python"
    status=$?
    [ "$status" = 0 ] && return 0
    [ "$status" = "$GUARD_UNREADABLE" ] && return 1
  done
  guard_parse_bash
}

TOOL_NAME=''
COMMAND=''
CANDIDATES=()
PARSED=$(guard_parse) || PARSED=''
while IFS= read -r line; do
  line="${line%$'\r'}"  # Windows Python ends lines with CRLF
  case "$line" in
    tool_name=*) TOOL_NAME="${line#tool_name=}" ;;
    command=*) COMMAND="${line#command=}"; CANDIDATES+=("$COMMAND") ;;
    *=*) CANDIDATES+=("${line#*=}") ;;
  esac
done <<< "$PARSED"
if [ -z "$TOOL_NAME" ]; then
  echo "BLOCK: $GUARD_NAME could not read the tool call, so it was blocked." >&2
  echo "       The hook input was empty, not JSON, or named no tool." >&2
  exit 2
fi
# --- end of shared parsing ----------------------------------------------------

[ "$TOOL_NAME" = "Bash" ] || exit 0
[ -n "$COMMAND" ] || exit 0

# Every match below ignores case, without starting a process to lowercase.
shopt -s nocasematch

DESTRUCTIVE_PATTERNS=(
  "git reset --hard"
  "git clean -xfd"
  "git clean -fd"
  "git clean -fdx"
  "git checkout -- ."
  "git checkout --force"
  "git filter-branch"
  "chmod -r 777"
  "chmod 777 /"
  "mkfs"
  "fdisk"
  "parted"
  "dd if="
  "dd of="
  "shutdown -"
  "reboot"
  "poweroff"
  "drop database"
  "dropdb"
  "crontab -r"
  "find . -delete"
)

# Build output that a package manager or build regenerates. `rm -rf` of these,
# named directly, is routine; any other recursive forced delete is blocked.
REGENERABLE_DIRS=" node_modules dist build out .next .nuxt .turbo .cache coverage target vendor __pycache__ .pytest_cache .mypy_cache .ruff_cache "

block() {
  local reason="$1"
  echo "BLOCK: $GUARD_NAME blocked command." >&2
  echo "       Reason: $reason" >&2
  echo "       Command: $COMMAND" >&2
  exit 2
}

is_regenerable_target() {
  local target="${1#./}"
  target="${target%/}"
  case "$target" in
    ''|*/*|*..*|*'*'*|*'?'*|*'$'*|*'~'*|*'{'*) return 1 ;;
  esac
  [[ "$REGENERABLE_DIRS" == *" $target "* ]]
}

# words: the tokens after `rm` in one command segment.
check_rm() {
  local recursive=0 force=0 flags_done=0 word
  local targets=()
  for word in "$@"; do
    if [ "$flags_done" = 0 ] && [ "$word" = "--" ]; then flags_done=1; continue; fi
    if [ "$flags_done" = 0 ] && [[ "$word" == -* ]]; then
      case "$word" in
        --recursive) recursive=1 ;;
        --force) force=1 ;;
        --*) ;;
        *) [[ "$word" == *r* ]] && recursive=1; [[ "$word" == *f* ]] && force=1 ;;
      esac
      continue
    fi
    targets+=("$word")
  done
  [ "$recursive" = 1 ] && [ "$force" = 1 ] || return 0
  for word in "${targets[@]+"${targets[@]}"}"; do
    is_regenerable_target "$word" || block "recursive forced delete of '$word' (only regenerated build folders may be removed)"
  done
}

# words: the tokens after `push` in one `git ... push` segment.
check_push() {
  local word
  for word in "$@"; do
    case "$word" in
      --force|--force=*) block "force push" ;;
      --force-with-lease*|--force-if-includes) ;;
      --*) ;;
      -*f*) block "force push" ;;
      +*) block "force push by '+' refspec" ;;
    esac
  done
}

check_segment() {
  local words=() i=0 seen_git=0 word
  read -ra words <<< "$1"
  for word in "${words[@]+"${words[@]}"}"; do
    i=$((i + 1))
    case "$word" in
      rm|*/rm) check_rm "${words[@]:$i}"; return ;;
      git|*/git) seen_git=1 ;;
      push) [ "$seen_git" = 1 ] && { check_push "${words[@]:$i}"; return; } ;;
    esac
  done
}

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if [[ "$COMMAND" == *"$pattern"* ]]; then
    block "matched '$pattern'"
  fi
done

# A download piped or substituted straight into a shell runs unreviewed code.
PIPED_INTO_SHELL='(curl|wget)[^|;&]*\|[[:space:]]*(sudo[[:space:]]+)?(sh|bash|zsh|dash|ksh)([[:space:]]|$)'
SUBSTITUTED_INTO_SHELL='(sh|bash|zsh|dash|ksh)[[:space:]]+(-c[[:space:]]+)?["'"'"']?(<\(|\$\()[[:space:]]*(curl|wget)'
SUDO_DESTRUCTIVE='sudo[[:space:]].*(dd |mkfs|fdisk|parted)'
[[ "$COMMAND" =~ $PIPED_INTO_SHELL ]] && block "download piped into a shell"
[[ "$COMMAND" =~ $SUBSTITUTED_INTO_SHELL ]] && block "download substituted into a shell"
[[ "$COMMAND" =~ $SUDO_DESTRUCTIVE ]] && block "sudo with destructive operation"

# Split into command segments on ; & | ( ) and backticks, drop quote marks, and
# check each segment's rm and git push arguments.
SEGMENTS="${COMMAND//\"/}"
SEGMENTS="${SEGMENTS//\'/}"
for separator in ';' '&' '|' '(' ')' '`'; do
  SEGMENTS="${SEGMENTS//"$separator"/$'\n'}"
done
while IFS= read -r segment; do
  check_segment "$segment"
done <<< "$SEGMENTS"

exit 0
