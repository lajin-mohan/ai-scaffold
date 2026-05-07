#!/bin/bash
# pre-review.sh
# TEMPLATE FILE — All checks below are commented out.
# Until you configure this file, /review runs WITHOUT lint, typecheck, or test results.
# Claude will still review the code but will not know whether checks are currently passing.
#
# HOW TO CONFIGURE: Uncomment and adapt the commands below to your project's stack,
# then remove this warning block.

set -e

PASS=0
FAIL=0

run_check() {
  local name="$1"
  local cmd="$2"
  echo ">> Running: $name"
  if eval "$cmd" > /tmp/check_output 2>&1; then
    echo "   OK: $name passed"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: $name FAILED"
    cat /tmp/check_output
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " Pre-Review Checks"
echo "========================================"

# --- Adapt these commands to your stack ---

# Linting
# run_check "ESLint"        "npm run lint"
# run_check "PHP CS Fixer"  "vendor/bin/php-cs-fixer fix --dry-run"
# run_check "Ruff"          "ruff check ."

# Type checking
# run_check "TypeScript"    "npm run typecheck"
# run_check "Pyright"       "pyright"

# Tests
# run_check "Unit Tests"    "npm run test:unit"
# run_check "Unit Tests"    "pytest tests/unit"

# Security audit
# run_check "npm audit"     "npm audit --audit-level=high"

# --- End of stack-specific commands ---

echo ""
echo "========================================"
echo " Results: $PASS passed / $FAIL failed"
echo "========================================"

if [ $PASS -eq 0 ] && [ $FAIL -eq 0 ]; then
  echo ""
  echo "NOT CONFIGURED: No checks are enabled in pre-review.sh."
  echo "Claude will review code without lint, typecheck, or test results."
  echo "Edit .claude/hooks/pre-review.sh and uncomment the checks for your stack."
  exit 0
fi

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "WARNING: Pre-review checks failed. Fix the above before code review."
  exit 1
fi

echo "OK: All $PASS checks passed. Ready for review."
exit 0
