#!/bin/bash

# Pre-ToolUse hook: Secret Path Guard
# Blocks AI from reading or writing sensitive files
set -uo pipefail

# Define sensitive file patterns
SENSITIVE_PATTERNS=(
  # Environment variables
  ".*\.env(\..+)?$"
  ".*\.npmrc$"
  ".*composer\.json$"
  ".*\.npmrc$"
  ".*composer\.json$"

  # Secrets and credentials
  ".*\.key$"
  ".*\.pem$"
  ".*\.p12$"
  ".*\.jks$"
  ".*\.pfx$"
  ".*\.p7b$"
  ".*\.p7r$"
  ".*\.crt$"
  ".*\.cer$"
  ".*\.csr$"
  ".*\.p8$"
  ".*\.pk8$"
  ".*\.der$"
  ".*\.keystore$"
  ".*\.truststore$"
  ".*\.token$"
  ".*\.secret$"
  ".*\.creds$"
  ".*\.credential$"
  ".*auth\.json$"
  "id_rsa$"
  "id_ecdsa$"
  "id_ed25519$"
  "authorized_keys$"
  "known_hosts$"

  # Private configurations
  ".*\.gpg$"
  ".*\.pgp$"
  ".*\.gpg.*$"
  ".*pgp.*$"
  "config\.json$"
  "settings\.json$"
  ".*service-account\.json$"
  ".*account\.json$"
  ".*client-secret\.json$"
  ".*private.*\.key$"
  ".*private.*\.pem$"

  # Database and API keys
  ".*\.db$"
  ".*\.sqlite$"
  ".*\.mysql$"
  ".*\.mongodb$"
  ".*\.postgresql$"
  ".*api.*\.key$"
  ".*api.*\.token$"
  ".*\.env\.production$"
  ".*\.env\.staging$"

  # Build/deployment keys
  "build\.secrets$"
  "deploy\.secrets$"
  "ci\.secrets$"
  "terraform\.tfvars$"
  "terraform\.tfvars\.json$"
  ".*\.tfstate$"
  ".*\.tfstate\..*\.json$"

  # Cloud credentials
  ".*\.gcloud$"
  ".*\.aws$"
  ".*\.aws/.*$"
  ".*\.azure$"
  "gcp.*\.json$"
  "aws.*\.json$"
  "azure.*\.json$"

  # Vault/secrets manager
  "vault.*\.json$"
  "secrets.*\.json$"
  ".*\.enc$"
  ".*\.dec$"

  # Package manager auth
  "~/.npm/_auth$"
  "~/.npm/registry$"
  "~/.composer/auth\.json$"

  # Other sensitive files
  ".*\.bak$"
  ".*\.backup$"
  ".*\.dump$"
  ".*\.log$"
  ".*\.tmp$"
  ".*\.temp$"
)

# Check if any sensitive patterns match the tool path
check_sensitive_file() {
  local file_path="$1"

  # Skip if file_path is empty or not provided
  if [[ -z "$file_path" ]]; then
    exit 0
  fi

  # Extract filename from path
  local filename=$(basename "$file_path")
  local dirname=$(dirname "$file_path")

  # Check against all sensitive patterns
  for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    # Check filename
    if [[ "$filename" =~ $pattern ]]; then
      echo "ERROR: Blocked access to sensitive file: $file_path" >&2
      echo "File matches pattern: $pattern" >&2
      exit 1
    fi

    # Check directory path
    if [[ "$dirname" =~ $pattern ]]; then
      echo "ERROR: Blocked access to sensitive directory: $file_path" >&2
      echo "Directory matches pattern: $pattern" >&2
      exit 1
    fi
  done

  # Special check for root directory files
  if [[ "$dirname" == "." && "$filename" =~ ^\.(env|npmrc|composer\.json|config\.json|settings\.json)$ ]]; then
    echo "ERROR: Blocked access to sensitive root file: $file_path" >&2
    exit 1
  fi
}

# Check based on tool type
case "${TOOL_NAME:-}" in
  "Read")
    check_sensitive_file "$1"
    ;;
  "Grep")
    check_sensitive_file "$1"
    ;;
  "Glob")
    check_sensitive_file "$1"
    ;;
  "Edit")
    check_sensitive_file "$1"
    ;;
  "Write")
    check_sensitive_file "$1"
    ;;
  "MultiEdit")
    # MultiEdit can handle multiple files
    for file in "$@"; do
      check_sensitive_file "$file"
    done
    ;;
esac

exit 0