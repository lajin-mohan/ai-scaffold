#!/bin/bash

# PreToolUse hook: Secret Path Guard
# Blocks AI tool access to real secret-bearing files while allowing templates.
set -uo pipefail

PAYLOAD=$(cat 2>/dev/null || echo "")

json_value() {
  local expr="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$PAYLOAD" | jq -r "$expr // empty" 2>/dev/null || true
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$PAYLOAD" | python3 -c '
import json, sys

payload = sys.stdin.read()
expr = sys.argv[1]
try:
    data = json.loads(payload)
except Exception:
    sys.exit(0)

value = data
for part in expr.strip(".").split("."):
    if not part:
        continue
    if isinstance(value, dict):
        value = value.get(part, "")
    else:
        value = ""
        break
if isinstance(value, str):
    print(value)
' "$expr" 2>/dev/null || true
  else
    printf '%s' "$PAYLOAD" \
      | grep -o "\"${expr##*.}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
      | head -1 \
      | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/' || true
  fi
}

TOOL_NAME=$(json_value '.tool_name')

candidate_paths() {
  json_value '.tool_input.file_path'
  json_value '.tool_input.path'
  json_value '.tool_input.pattern'
  json_value '.tool_input.command'
}

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

  # Normalize a leading ./ so regexes work the same for relative paths.
  path="${path#./}"

  if is_allowed_template "$path"; then
    return 0
  fi

  # Bash commands may include safe env templates as arguments. Remove those
  # allowed tokens before matching the remaining command/path text.
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

case "$TOOL_NAME" in
  Read|Grep|Glob|Edit|Write|MultiEdit|Bash|"")
    while IFS= read -r candidate; do
      check_sensitive_path "$candidate"
    done < <(candidate_paths)
    ;;
esac

exit 0
