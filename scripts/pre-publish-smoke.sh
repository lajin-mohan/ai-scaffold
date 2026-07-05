#!/bin/bash
# pre-publish-smoke.sh
# Runs all publish-gate checks and reports pass/fail per gate.
# Non-blocking: reports results, exits 0 even on failures.
# Usage: bash scripts/pre-publish-smoke.sh

set -uo pipefail

PASS=0
FAIL=0
TOTAL=0

pass() {
  echo "  ✓ $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
}

fail() {
  echo "  ✗ $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
}

cleanup() {
  rm -rf "$SMOKE_DIR" "$INIT_DIR" "$DOT_DIR" 2>/dev/null || true
}

trap cleanup EXIT

echo ""
echo "========================================"
echo " Pre-Publish Smoke Checks"
echo "========================================"

# ── Gate 1: Unit tests ─────────────────────────────────────────────────
echo ""
echo ">> Gate 1: Unit Tests"
if npm test --silent 2>&1; then
  pass "npm test"
else
  fail "npm test"
fi

# ── Gate 2: Typecheck ─────────────────────────────────────────────────
echo ""
echo ">> Gate 2: Typecheck"
if npm run typecheck 2>&1 | tail -3 | grep -qi "error"; then
  fail "npm run typecheck"
else
  pass "npm run typecheck"
fi

# ── Gate 3: npm pack contents ──────────────────────────────────────────
echo ""
echo ">> Gate 3: npm pack --dry-run"
# npm pack is non-zero exit only on real errors (not --dry-run).
# Count files from the "Tarball Contents" lines that start with "./"
PACK_OUTPUT=$(npm_config_cache=/tmp/ai-scaffold-npm-cache npm pack --dry-run 2>&1) || true

if echo "$PACK_OUTPUT" | grep -qE "ai-scaffold-[0-9.]+\.tgz"; then
  PACK_FILE=$(echo "$PACK_OUTPUT" | grep -oE "ai-scaffold-[0-9.]+\.tgz" | tail -1)
  echo "  ${PACK_FILE} produced"
  pass "npm pack --dry-run"
else
  fail "npm pack --dry-run"
  echo "  $PACK_OUTPUT" | head -3
fi

# ── Gate 4: create smoke test ──────────────────────────────────────────
echo ""
echo ">> Gate 4: Create Smoke Test"
SMOKE_DIR=$(mktemp -d)
CREATE_OUTPUT=$(node bin/ai-scaffold.js create "$SMOKE_DIR/smoke-project" --yes 2>&1) || true
if echo "$CREATE_OUTPUT" | grep -q "Done!"; then
  pass "create <project> --yes"
else
  fail "create <project> --yes"
  echo "  Output: $(echo "$CREATE_OUTPUT" | tail -3)"
fi

# Check for unresolved placeholders in generated README
if [ -f "$SMOKE_DIR/smoke-project/README.md" ]; then
  TOKEN_COUNT=$(grep -c '{{' "$SMOKE_DIR/smoke-project/README.md" 2>/dev/null) || TOKEN_COUNT=0
  if [ "$TOKEN_COUNT" -eq 0 ]; then
    pass "README.md has zero unresolved {{...}} tokens"
  else
    fail "README.md has ${TOKEN_COUNT} unresolved {{...}} tokens"
  fi
else
  fail "README.md not generated"
fi

# Check generated files exist
for f in .ai-scaffold.json .claude/MEMORY.md .claude/settings-overrides.json; do
  if [ -f "$SMOKE_DIR/smoke-project/$f" ]; then
    pass "$f generated"
  else
    fail "$f not generated"
  fi
done

# ── Gate 5: init --yes smoke test ──────────────────────────────────────
echo ""
echo ">> Gate 5: Init --yes Smoke Test"
INIT_DIR=$(mktemp -d)
echo "# Keep My README" > "$INIT_DIR/README.md"
echo '{"name":"keep-me"}' > "$INIT_DIR/package.json"
INIT_OUT=$(node bin/ai-scaffold.js init "$INIT_DIR" --yes 2>&1) || true
if echo "$INIT_OUT" | grep -q "Done!"; then
  pass "init --yes"
else
  fail "init --yes"
  echo "  Output: $(echo "$INIT_OUT" | tail -3)"
fi

# Root manifest must exist (discovery entry point)
if [ -f "$INIT_DIR/.ai-scaffold.json" ]; then
  pass ".ai-scaffold.json at project root (correct)"
else
  fail ".ai-scaffold.json missing at project root"
fi

# README.md must be preserved
if grep -q "Keep My README" "$INIT_DIR/README.md"; then
  pass "init preserves existing README.md"
else
  fail "init overwrote existing README.md"
fi

# package.json must be preserved
if grep -q "keep-me" "$INIT_DIR/package.json"; then
  pass "init preserves existing package.json"
else
  fail "init overwrote existing package.json"
fi

# No root docs/apps/packages dirs created
for d in docs apps packages infra scripts tasks; do
  if [ -d "$INIT_DIR/$d" ]; then
    fail "init created root $d/"
  else
    pass "init did not create root $d/"
  fi
done

# status command should recognize the install
STATUS_OUT=$(node bin/ai-scaffold.js status "$INIT_DIR" 2>&1) || true
if echo "$STATUS_OUT" | grep -q "0.7.0"; then
  pass "status recognizes init install"
else
  fail "status does not recognize init install"
  echo "  Got: $STATUS_OUT"
fi

# ── Gate 6: bare . routes to init ──────────────────────────────────────
echo ""
echo ">> Gate 6: Bare '.' Routes to Init"
# Create a fresh target dir and cd into it, then invoke with "."
DOT_DIR=$(mktemp -d)
echo "# Keep My README" > "$DOT_DIR/README.md"
# Use a subshell to cd so we don't alter the outer shell's cwd
OUTPUT=$(cd "$DOT_DIR" && node /Users/lajinmohan/website/ai-scaffold/bin/ai-scaffold.js . --yes 2>&1 | head -5) || true
if echo "$OUTPUT" | grep -q "ai-scaffold init"; then
  pass "bare '.' routes to init"
else
  fail "bare '.' does not route to init"
  echo "  Got: $OUTPUT"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Results: $PASS OK / $FAIL FAIL ($TOTAL total)"
echo "========================================"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "✓ All publish gates passed."
  exit 0
else
  echo "✗ $FAIL gate(s) failed. Fix before publishing."
  exit 1
fi
