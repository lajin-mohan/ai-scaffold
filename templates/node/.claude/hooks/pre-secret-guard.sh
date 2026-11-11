#!/bin/bash

# PreToolUse hook: Secret Path Guard
# Blocks AI tool access to real secret-bearing files while allowing templates.
set -uo pipefail

# read, not $(cat): no extra process. It returns 1 at end of input.
IFS= read -r -d "" PAYLOAD || true
GUARD_NAME='secret-path guard'

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

ALLOW_PATTERNS=(
  '(^|/)\.env\.example$'
  '(^|/)\.env\.sample$'
  '(^|/)\.env\.template$'
)

SENSITIVE_PATTERNS=(
  '(^|[[:space:]/])\.env($|[[:space:]./])'
  '(^|[[:space:]/])\.npmrc($|[[:space:]/])'
  '(^|[[:space:]/])\.pypirc($|[[:space:]/])'
  '(^|/)auth\.json$'
  '(^|/)id_rsa($|_)'
  '(^|/)id_ecdsa($|_)'
  '(^|/)id_ed25519($|_)'
  '(^|/)authorized_keys$'
  '(^|/)known_hosts$'
  '(^|/)\.aws($|/)'
  '(^|/)\.azure($|/)'
  '(^|/)\.gcloud($|/)'
  '(^|/)\.gnupg($|/)'
  '(^|/)\.ssh($|/)'
  '(^|/)secrets($|/)'
  '(^|/)credentials($|/)'
  '(^|/).*service-account.*\.json$'
  '(^|/).*client-secret.*\.json$'
  '(^|/).*credentials?.*\.json$'
  '(^|/).*secrets?.*\.json$'
  '(^|/).*secret.*\.json$'
  '(^|/).*private.*\.(key|pem)$'
  '(^|/).*\.(key|pem|p12|p8|pk8|p7b|p7r|jks|pfx|keystore|truststore|token|secret|creds|credential)$'
  '(^|/).*\.(tfstate|tfstate\..*|tfvars|tfvars\.json)$'
  '(^|/)(build|deploy|ci)\.secrets$'
)

is_allowed_template() {
  local path="$1"
  for pattern in "${ALLOW_PATTERNS[@]}"; do
    if [[ "$path" =~ $pattern ]]; then
      return 0
    fi
  done
  return 1
}

check_sensitive_path() {
  local path="$1"
  [ -z "$path" ] && return 0

  # Normalize a leading ./ so regexes work the same for relative paths, and
  # Windows separators, since Claude Code on Windows sends D:\proj\.env.
  path="${path//\\//}"
  path="${path#./}"

  if is_allowed_template "$path"; then
    return 0
  fi

  # A glob or search path may name a safe env template alongside other text.
  # Remove those allowed tokens before matching what remains.
  local scan_path="$path"
  scan_path="${scan_path//.env.example/}"
  scan_path="${scan_path//.env.sample/}"
  scan_path="${scan_path//.env.template/}"

  for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$scan_path" =~ $pattern ]]; then
      echo "BLOCK: secret-path guard blocked access to: $path" >&2
      echo "       Matched pattern: $pattern" >&2
      echo "       Use .env.example, .env.sample, or .env.template with placeholder values." >&2
      exit 2
    fi
  done
}

# Claude's file tools only. Shell commands are not checked: matching paths in
# command text is easy to get around, so the scaffold does not claim it. Use a
# sandbox to keep shell commands away from secrets (item 97, decision D6).
case "$TOOL_NAME" in
  Read|Grep|Glob|Edit|Write|MultiEdit)
    for candidate in "${CANDIDATES[@]+"${CANDIDATES[@]}"}"; do
      check_sensitive_path "$candidate"
    done
    ;;
esac

exit 0
