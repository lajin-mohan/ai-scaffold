#!/bin/bash
# pre-review.sh
# Pre-review quality gate. Runs lint + typecheck + tests + audit before /review.
#
# By default this script FAILS CLOSED: if no checks are configured, it exits 1
# and blocks /review. This forces real configuration before AI review can claim
# success on top of nothing.
#
# To bypass for template / scaffolding / pre-bootstrap work:
#   PRE_REVIEW_ALLOW_UNCONFIGURED=1 bash .claude/hooks/pre-review.sh
#
# In .claude/settings.json the template repo sets this env var by default so
# /review still works on a fresh clone. Downstream projects MUST remove that env
# var (and uncomment real checks below) once /bootstrap configures the stack.
#
# HOW TO CONFIGURE: Uncomment and adapt the commands below to your project's
# stack, then remove PRE_REVIEW_ALLOW_UNCONFIGURED from .claude/settings.json.
# Go is detection-active because the golang profile ships go.mod plus day-one
# build/test files; other stack examples stay commented until /bootstrap or the
# team configures exact project commands, so the hook does not bless placeholders.

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
if [ -f go.mod ]; then
  if command -v go >/dev/null 2>&1; then
    run_check "Go build" "go build ./..."
    run_check "Go vet" "go vet ./..."
    run_check "Go tests" "go test ./..."
  else
    echo "   FAIL: Go toolchain not found"
    FAIL=$((FAIL + 1))
  fi
fi

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
  if [ "${PRE_REVIEW_ALLOW_UNCONFIGURED:-0}" = "1" ]; then
    echo ""
    echo "WARN: pre-review.sh has no checks configured."
    echo "PRE_REVIEW_ALLOW_UNCONFIGURED=1 is set, so /review proceeds without"
    echo "lint, typecheck, or test evidence. This is acceptable ONLY for the"
    echo "template repo or pre-bootstrap scaffolding work."
    exit 0
  fi
  echo ""
  echo "FAIL: pre-review.sh has no checks configured."
  echo "/review cannot proceed without quality evidence. Either:"
  echo "  - Edit .claude/hooks/pre-review.sh and uncomment checks for your stack, OR"
  echo "  - Set PRE_REVIEW_ALLOW_UNCONFIGURED=1 to bypass (template/scaffold work only)."
  exit 1
fi

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "WARNING: Pre-review checks failed. Fix the above before code review."
  exit 1
fi

echo "OK: All $PASS checks passed. Ready for review."
exit 0
