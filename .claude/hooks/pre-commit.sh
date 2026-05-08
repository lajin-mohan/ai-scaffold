#!/bin/bash
# pre-commit.sh — runs lint + typecheck + secrets scan before every commit.
#
# Install (one-time after clone):
#   git config core.hooksPath .claude/hooks
#
# To bypass (emergency commits only): git commit --no-verify
# There is no silent bypass — --no-verify must be explicit.
#
# HOW TO CONFIGURE: Uncomment the relevant commands below to match your stack.
# The script skips checks when package.json doesn't exist (template state).
#
# Stack commands (uncomment as needed):
#   Node/TypeScript: ESLint, TypeScript, Unit Tests
#   PHP: PHP CS Fixer, PHPStan, PHPUnit
#   Python: Ruff, Pyright, pytest

set -euo pipefail

PASS=0
FAIL=0

run_check() {
  local name="$1"
  local cmd="$2"
  echo ">> pre-commit: $name"
  if eval "$cmd" > /tmp/check_output 2>&1; then
    echo "   OK: $name"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: $name"
    cat /tmp/check_output
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " Pre-commit checks"
echo "========================================"

# Skip all checks on template / pre-bootstrap state (no package.json means no stack)
if [ ! -f package.json ]; then
  echo "(package.json not found — skipping checks)"
  echo "Run /bootstrap to configure the stack and enable pre-commit enforcement."
  exit 0
fi

# --- Branch name validation ---
# Enforces feature/*, fix/*, chore/*, hotfix/*, release/* pattern per branching-rules.md
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -n "$BRANCH_NAME" ] && [ "$BRANCH_NAME" != "HEAD" ]; then
  if ! echo "$BRANCH_NAME" | grep -qE '^(feature|fix|chore|hotfix|release)/[a-zA-Z0-9._-]+$'; then
    echo "   FAIL: Branch name '$BRANCH_NAME' does not match required pattern:"
    echo "         feature/*, fix/*, chore/*, hotfix/*, release/*"
    echo "         See .claude/rules/branching-rules.md"
    FAIL=$((FAIL + 1))
  else
    echo "   OK: Branch name '$BRANCH_NAME'"
  fi
fi

# --- Linting ---
# Uncomment for Node/TypeScript:
run_check "ESLint" "npm run lint -- --max-warnings 0"

# Uncomment for PHP:
# run_check "PHP CS Fixer" "vendor/bin/php-cs-fixer fix --dry-run --diff"

# Uncomment for Python:
# run_check "Ruff" "ruff check ."

# --- Type checking ---
# Uncomment for Node/TypeScript:
run_check "TypeScript" "npm run typecheck"

# Uncomment for PHP:
# run_check "PHPStan" "vendor/bin/phpstan analyse"

# Uncomment for Python:
# run_check "Pyright" "pyright"

# --- Tests ---
# Uncomment for Node/TypeScript:
run_check "Unit Tests" "npm run test:unit -- --run"

# Uncomment for PHP:
# run_check "PHPUnit" "vendor/bin/phpunit --testsuite=unit"

# Uncomment for Python:
# run_check "pytest" "pytest tests/unit/ -v"

# --- Secrets scanning ---
# Runs if gitleaks is installed; skips gracefully if not.
# Install: brew install gitleaks (macOS) or go install github.com/gitleaks/gitleaks@latest (Linux)
if command -v gitleaks &>/dev/null; then
  run_check "Gitleaks" "gitleaks detect --staged --exit-code"
else
  echo "(gitleaks not installed — skipping secrets scan)"
  echo "  Install: brew install gitleaks"
fi

echo ""
echo "========================================"
echo " Results: $PASS OK / $FAIL FAIL"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Pre-commit checks failed. Fix the failures above before committing."
  echo "For emergency commits, use: git commit --no-verify"
  echo "Document the bypass in your PR description."
  exit 1
fi

echo "OK: Ready to commit."
exit 0