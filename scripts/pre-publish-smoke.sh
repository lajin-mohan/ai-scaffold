#!/bin/bash
# pre-publish-smoke.sh
# Runs all publish-gate checks and reports pass/fail per gate.
# Non-blocking: reports results, exits 0 even on failures.
# Intended to be run manually before npm publish.

set -euo pipefail

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

echo ""
echo "========================================"
echo " Pre-Publish Smoke Checks"
echo "========================================"

# ── Gate 1: Unit tests ─────────────────────────────────────────────────
echo ""
echo ">> Gate 1: Unit Tests"
if npm test --silent 2>&1 | tail -5 | grep -q "passed"; then
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
TMPDIR=$(mktemp -d)
PACK_OUTPUT=$(npm_config_cache="$TMPDIR/npm-cache" npm pack --dry-run 2>&1) || true

if echo "$PACK_OUTPUT" | grep -qE "\.tar\.gz$"; then
  PACK_FILE=$(echo "$PACK_OUTPUT" | grep -oE '[a-z0-9._-]+\.tar\.gz' | tail -1)
  PACK_COUNT=$(echo "$PACK_OUTPUT" | grep -cE '^\s+\./' || true)
  echo "  Packed ${PACK_COUNT} files → ${PACK_FILE}"
  pass "npm pack --dry-run (${PACK_COUNT} files)"
else
  fail "npm pack --dry-run (no tarball produced)"
  echo "$PACK_OUTPUT"
fi
rm -rf "$TMPDIR"

# ── Gate 4: create smoke test ──────────────────────────────────────────
echo ""
echo ">> Gate 4: Create Smoke Test"
SMOKE_DIR=$(mktemp -d)
if node bin/ai-scaffold.js create "$SMOKE_DIR/smoke-project" --yes 2>&1 | tail -3 | grep -q "Done"; then
  pass "create <project> --yes"
else
  fail "create <project> --yes"
fi

# Check for unresolved placeholders in generated README
if [ -f "$SMOKE_DIR/smoke-project/README.md" ]; then
  TOKEN_COUNT=$(grep -c '{{' "$SMOKE_DIR/smoke-project/README.md" 2>/dev/null || echo 0)
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
rm -rf "$SMOKE_DIR"

# ── Gate 5: init --yes smoke test ──────────────────────────────────────
echo ""
echo ">> Gate 5: Init --yes Smoke Test"
INIT_DIR=$(mktemp -d)
echo "# Keep My README" > "$INIT_DIR/README.md"
echo '{"name":"keep-me"}' > "$INIT_DIR/package.json"
if node bin/ai-scaffold.js init "$INIT_DIR" --yes 2>&1 | tail -3 | grep -q "Done"; then
  pass "init --yes"
else
  fail "init --yes"
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
rm -rf "$INIT_DIR"

# ── Gate 6: bare . routes to init ──────────────────────────────────────
echo ""
echo ">> Gate 6: Bare '.' Routes to Init"
DOT_DIR=$(mktemp -d)
echo "# Keep My README" > "$DOT_DIR/README.md"
if node bin/ai-scaffold.js "$DOT_DIR" --yes 2>&1 | grep -q "ai-scaffold init"; then
  pass "bare '.' routes to init"
else
  fail "bare '.' does not route to init"
fi
rm -rf "$DOT_DIR"

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
