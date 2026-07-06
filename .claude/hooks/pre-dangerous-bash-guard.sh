#!/bin/bash

# Pre-ToolUse hook: Dangerous Bash Command Guard
# Blocks AI from executing destructive shell and Git history commands
set -uo pipefail

# Read the command from stdin (Claude Code passes the command as stdin)
COMMAND=$(cat)

# Extract the actual command being run
CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# Destructive patterns to block
DESTRUCTIVE_PATTERNS=(
  # rm -rf on sensitive directories
  "rm -rf /"
  "rm -rf /*"
  "rm -rf ~"
  "rm -rf \$HOME"
  "rm -rf /etc"
  "rm -rf /usr"
  "rm -rf /var"
  "rm -rf /tmp"
  "rm -rf /boot"
  "rm -rf /sys"
  "rm -rf /proc"

  # Git destructive operations
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git reset --hard HEAD"
  "git clean -xfd"
  "git clean -fd"
  "git clean -fdx"
  "git branch -D"
  "git branch -d \\*"
  "git tag -d"
  "git stash drop"
  "git stash clear"
  "git checkout -- ."
  "git checkout --force"

  # chmod dangerous permissions
  "chmod -R 777"
  "chmod -R 000"
  "chmod 777 /"
  "chmod 777 /*"

  # mkfs / disk formatting
  "mkfs"
  "mkfs.ext4"
  "mkfs.xfs"
  "mkfs.ntfs"
  "fdisk"
  "parted"
  "dd if="
  "dd of="
  "dd conv=notrunc"

  # System shutdown/reboot
  "shutdown -"
  "reboot"
  "poweroff"
  "systemctl poweroff"
  "systemctl reboot"
  "init 0"
  "init 6"

  # Package manager force
  "npm uninstall --save"
  "npm uninstall -S"
  "npm remove -g"
  "npm prune --production"
  "npm cache clean --force"

  # Database destructive
  "drop database"
  "dropdb"
  "psql -c \"drop"
  "mysql -e \"drop"
  "mongo --eval \"db.dropDatabase"

  # Network / firewall
  "iptables -F"
  "iptables -X"
  "ufw disable"
  "ufw --force"
  "firewall-cmd --permanent"

  # Process killing
  "kill -9 1"
  "killall -9"
  "pkill -9"
  "kill -TERM 1"

  # Cron / scheduled tasks
  "crontab -r"
  "rm /etc/cron"

  # File system
  "> /etc/passwd"
  "> /etc/shadow"
  "cat /dev/zero"
  "yes > /dev"
)

# Check if command matches any destructive pattern
for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if [[ "$CMD_LOWER" == *"$pattern"* ]]; then
    echo "BLOCKED: Dangerous command detected: $pattern" >&2
    echo "Command: $COMMAND" >&2
    echo "" >&2
    echo "This command is blocked for safety reasons. If you believe this is a false positive," >&2
    echo "please escalate to a human reviewer." >&2
    exit 1
  fi
done

# Special checks for compound commands
# Check for pipes to destructive commands
if echo "$CMD_LOWER" | grep -qE '(rm|git reset|git clean|git push --force).*\|'; then
  echo "BLOCKED: Dangerous piped command detected" >&2
  echo "Command: $COMMAND" >&2
  exit 1
fi

# Check for semicolon-separated destructive commands
if echo "$CMD_LOWER" | grep -qE ';.*(rm -rf|git reset --hard|git clean -xfd|git push --force)'; then
  echo "BLOCKED: Dangerous compound command detected" >&2
  echo "Command: $COMMAND" >&2
  exit 1
fi

# Check for sudo with destructive commands
if echo "$CMD_LOWER" | grep -qE 'sudo.*(rm -rf|dd |mkfs|fdisk|parted)'; then
  echo "BLOCKED: Dangerous command with sudo detected" >&2
  echo "Command: $COMMAND" >&2
  exit 1
fi

# Check for subshells with destructive commands
if echo "$CMD_LOWER" | grep -qE '(\$\(|`).*(rm -rf|git reset --hard|git clean -xfd)'; then
  echo "BLOCKED: Dangerous subshell command detected" >&2
  echo "Command: $COMMAND" >&2
  exit 1
fi

exit 0