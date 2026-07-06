#!/bin/bash

# PreToolUse hook: AI Protected Governance File Guard
# Warns when AI reads or edits files that control the scaffold's behavior.
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

candidate_paths() {
  json_value '.tool_input.file_path'
  json_value '.tool_input.path'
}

PROTECTED_PATTERNS=(
  '^CLAUDE\.md$'
  '^AGENTS\.md$'
  '^SECURITY\.md$'
  '^CONTRIBUTING\.md$'
  '^\.claude/settings\.json$'
  '^\.claude/settings\.local\.json$'
  '^\.claude/settings-overrides\.json$'
  '^\.claude/hooks/'
  '^\.claude/agents/'
  '^\.claude/commands/'
  '^\.claude/rules/'
  '^\.claude/skills/'
  '^\.claude/roles/'
  '^\.claude/templates/'
  '^\.claude/lib/'
  '^\.github/workflows/'
  '^scripts/'
  '^docs/process/'
  '^docs/setup/'
  '^docs/architecture/ai-coding-scaffold-review\.md$'
)

warn_if_governance_path() {
  local file_path="$1"
  [ -z "$file_path" ] && return 0
  file_path="${file_path#./}"

  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if [[ "$file_path" =~ $pattern ]]; then
      echo "WARN: governance-file guard noticed access to: $file_path" >&2
      echo "      This file controls AI behavior or repository safety." >&2
      echo "      Review the change carefully and explain it in the commit/PR." >&2
      echo "      Pattern matched: $pattern" >&2
      return 0
    fi
  done
}

while IFS= read -r candidate; do
  warn_if_governance_path "$candidate"
done < <(candidate_paths)

exit 0
