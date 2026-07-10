#!/bin/bash

# Pre-ToolUse hook: Dangerous Bash Command Guard
# Blocks destructive shell and Git history commands before execution.
set -uo pipefail

PAYLOAD=$(cat 2>/dev/null || echo "")

extract_command() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty' 2>/dev/null || true
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$PAYLOAD" | python3 -c '
import json, sys
try:
    data = json.loads(sys.stdin.read())
    print(data.get("tool_input", {}).get("command", "") or "")
except Exception:
    pass
' 2>/dev/null || true
  else
    printf '%s' "$PAYLOAD" \
      | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' \
      | head -1 \
      | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true
  fi
}

COMMAND=$(extract_command)

# If the payload was not JSON in a unit/smoke simulation, treat stdin as the
# command itself.
if [ -z "$COMMAND" ]; then
  COMMAND="$PAYLOAD"
fi

CMD_LOWER=$(printf '%s' "$COMMAND" | tr '[:upper:]' '[:lower:]')

DESTRUCTIVE_PATTERNS=(
  "rm -rf /"
  "rm -rf /*"
  "rm -rf ."
  "rm -rf ./*"
  "rm -rf ~"
  "rm -rf \$home"
  "git push --force "
  "git push --force'"
  "git push --force\""
  "git push --force$"
  "git push -f "
  "git push -f'"
  "git push -f\""
  "git push -f$"
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

block() {
  local reason="$1"
  echo "BLOCK: dangerous bash guard blocked command." >&2
  echo "       Reason: $reason" >&2
  echo "       Command: $COMMAND" >&2
  exit 2
}

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if [[ "$CMD_LOWER" == *"$pattern"* ]]; then
    block "matched '$pattern'"
  fi
done

if printf '%s' "$CMD_LOWER" | grep -qE '(^|[;&|])[^;&|]*(rm -rf|git reset --hard|git clean -xfd|git push --force[[:space:]'"'"'"]|git push --force$|mkfs|dd if=|dd of=)'; then
  block "compound command contains a destructive operation"
fi

if printf '%s' "$CMD_LOWER" | grep -qE 'sudo[[:space:]].*(rm -rf|dd |mkfs|fdisk|parted)'; then
  block "sudo with destructive operation"
fi

if printf '%s' "$CMD_LOWER" | grep -qE '(\$\(|`).*(rm -rf|git reset --hard|git clean -xfd)'; then
  block "subshell contains a destructive operation"
fi

exit 0
