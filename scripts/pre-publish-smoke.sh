#!/bin/bash
# pre-publish-smoke.sh
# Runs all publish-gate checks and reports pass/fail per gate.
# Non-blocking: reports results, exits 0 even on failures.
# Usage: bash scripts/pre-publish-smoke.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0
TOTAL=0
SMOKE_DIR=""
INIT_DIR=""
DOT_DIR=""
PY_DIR=""
GO_DIR=""
JSON_CREATE_DIR=""
JSON_INIT_DIR=""
PROJECT_VERSION=$(node -p "require('./package.json').version")

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
  rm -rf "$SMOKE_DIR" "$INIT_DIR" "$DOT_DIR" "$PY_DIR" "$GO_DIR" "$JSON_CREATE_DIR" "$JSON_INIT_DIR" 2>/dev/null || true
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
PACK_OUTPUT=$(npm_config_cache=/tmp/ai-scaffold-npm-cache npm pack --dry-run --json 2>&1)
PACK_STATUS=$?

if [ "$PACK_STATUS" -eq 0 ] && [[ "$PACK_OUTPUT" =~ lajin.m-ai-scaffold-[0-9.]+\.tgz ]]; then
  PACK_FILE=$(grep -oE "lajin.m-ai-scaffold-[0-9.]+\.tgz" <<< "$PACK_OUTPUT" | tail -1)
  echo "  ${PACK_FILE} produced"
  pass "npm pack --dry-run"
else
  fail "npm pack --dry-run"
  echo "  $PACK_OUTPUT" | head -3
fi

FORBIDDEN_PACK_PATHS='templates/.*/_ai/|templates/.*/apps/|templates/.*/docs/|templates/.*/infra/|templates/.*/packages/|templates/.*/scripts/|templates/.*/tasks/|templates/.*/\.vscode/|templates/.*/\.claude/settings.local.json|src/__tests__|tests/'
if grep -Eq "$FORBIDDEN_PACK_PATHS" <<< "$PACK_OUTPUT"; then
  fail "npm package excludes heavy/template-local paths"
else
  pass "npm package excludes heavy/template-local paths"
fi

# Hook wiring must ship: .claude/settings.json is what turns the hooks on in a
# generated project. A nested template .gitignore rule once dropped it from the
# package, leaving hooks inert — assert it ships for every profile.
SETTINGS_IN_PACK=$(grep -oE 'templates/[^/"]+/\.claude/settings\.json' <<< "$PACK_OUTPUT" | sort -u | wc -l | tr -d ' ')
if [ "$SETTINGS_IN_PACK" -ge 3 ]; then
  pass "npm package ships template .claude/settings.json for all profiles"
else
  fail "npm package ships only ${SETTINGS_IN_PACK}/3 template .claude/settings.json (hooks would be inert)"
fi

# .gitignore ships as `gitignore` (no dot): npm pack HARD-EXCLUDES any file named
# `.gitignore` from the tarball. Assert the renamed source ships and the dotted
# name does NOT (a dotted match means the rename regressed → generated projects
# would git-init with nothing ignored). Same class as the settings.json bug.
GITIGNORE_IN_PACK=$(grep -oE 'templates/[^/"]+/gitignore"' <<< "$PACK_OUTPUT" | sort -u | wc -l | tr -d ' ')
DOT_GITIGNORE_IN_PACK=$(grep -cE 'templates/[^/"]+/\.gitignore"' <<< "$PACK_OUTPUT" | tr -d ' ')
if [ "$GITIGNORE_IN_PACK" -ge 5 ] && [ "$DOT_GITIGNORE_IN_PACK" -eq 0 ]; then
  pass "npm package ships template gitignore (renamed) for all profiles"
else
  fail "npm package ships ${GITIGNORE_IN_PACK}/5 gitignore + ${DOT_GITIGNORE_IN_PACK} dotted (generated projects would lack .gitignore)"
fi

# Profile build files must ship or that profile's create fails — new root files
# have to be added to the package.json "files" allowlist (same class as the
# settings.json packaging bug).
if grep -q 'templates/python/pyproject.toml' <<< "$PACK_OUTPUT" && grep -q 'templates/golang/go.mod' <<< "$PACK_OUTPUT"; then
  pass "npm package ships python/golang build files"
else
  fail "npm package missing python pyproject.toml or golang go.mod"
fi

# ── Gate 4: create smoke test ──────────────────────────────────────────
echo ""
echo ">> Gate 4: Create Smoke Test"
JSON_CREATE_DIR=$(mktemp -d)/json-create
CREATE_JSON=$(node bin/ai-scaffold.js create "$JSON_CREATE_DIR" --profile node --yes --dry-run --json 2>&1) || true
if PLAN_JSON="$CREATE_JSON" node -e 'const p=JSON.parse(process.env.PLAN_JSON); if (p.command !== "create" || !p.dryRun || p.profile !== "node" || !p.files.generate.some((f) => f.path === "README.md")) process.exit(1);' >/dev/null 2>&1; then
  pass "create --dry-run --json emits parseable file plan"
else
  fail "create --dry-run --json emits parseable file plan"
  echo "  Output: $(echo "$CREATE_JSON" | head -3)"
fi
if [ -e "$JSON_CREATE_DIR" ]; then
  fail "create --dry-run --json wrote target files"
else
  pass "create --dry-run --json writes nothing"
fi

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

for f in .claude/hooks/pre-secret-guard.sh .claude/hooks/pre-dangerous-bash-guard.sh .claude/hooks/governance-file-guard.sh; do
  if [ -f "$SMOKE_DIR/smoke-project/$f" ]; then
    pass "$f generated"
  else
    fail "$f not generated"
  fi
done

if grep -q "pre-secret-guard.sh" "$SMOKE_DIR/smoke-project/.claude/settings.json" \
  && grep -q "pre-dangerous-bash-guard.sh" "$SMOKE_DIR/smoke-project/.claude/settings.json" \
  && grep -q "governance-file-guard.sh" "$SMOKE_DIR/smoke-project/.claude/settings.json"; then
  pass "generated settings wire starter safety hooks"
else
  fail "generated settings do not wire starter safety hooks"
fi

if grep -q "Project memory only" "$SMOKE_DIR/smoke-project/.claude/MEMORY.md" \
  && grep -q "production data" "$SMOKE_DIR/smoke-project/.claude/MEMORY.md" \
  && grep -q "client-confidential text" "$SMOKE_DIR/smoke-project/.claude/MEMORY.md"; then
  pass "generated memory includes safety policy"
else
  fail "generated memory missing safety policy"
fi

# Check scaffold-owned core files are present and noisy folders are absent.
for f in .ai-scaffold/README.md .ai-scaffold/context.md; do
  if [ -f "$SMOKE_DIR/smoke-project/$f" ]; then
    pass "$f generated"
  else
    fail "$f not generated"
  fi
done

for d in .ai-scaffold/docs .ai-scaffold/tasks .ai-scaffold/_ai; do
  if [ -d "$SMOKE_DIR/smoke-project/$d" ]; then
    fail "create generated default $d/"
  else
    pass "create did not generate default $d/"
  fi
done

for f in HOW-TO-USE.md CONTRIBUTING.md SECURITY.md LICENSE .env.example .editorconfig .gitleaks.toml .cursorrules; do
  if [ -e "$SMOKE_DIR/smoke-project/$f" ]; then
    fail "create left root $f"
  else
    pass "create did not leave root $f"
  fi
done

for d in docs _ai apps packages infra scripts; do
  if [ -d "$SMOKE_DIR/smoke-project/$d" ]; then
    fail "create created root $d/"
  else
    pass "create did not create root $d/"
  fi
done

# Governance skeleton is required on create so the shipped CLAUDE.md workflow
# references (tasks/lessons.md, CHANGELOG.md, tasks/todo, tasks/done) resolve.
for f in CHANGELOG.md tasks/lessons.md tasks/todo/.gitkeep tasks/done/.gitkeep; do
  if [ -e "$SMOKE_DIR/smoke-project/$f" ]; then
    pass "create generated skeleton $f"
  else
    fail "create did not generate skeleton $f"
  fi
done

# ais list surfaces the installed assets in a generated project
LIST_JSON=$(node bin/ai-scaffold.js list commands "$SMOKE_DIR/smoke-project" --json 2>/dev/null)
if echo "$LIST_JSON" | grep -q '"start-task"'; then
  pass "ais list surfaces installed commands"
else
  fail "ais list did not surface installed commands"
fi

if [ -f "$SMOKE_DIR/smoke-project/.gitattributes" ] \
  && grep -q "CHANGELOG.md.*merge=union" "$SMOKE_DIR/smoke-project/.gitattributes" \
  && grep -q "tasks/lessons.md.*merge=union" "$SMOKE_DIR/smoke-project/.gitattributes"; then
  pass "create generated .gitattributes with union merge rules"
else
  fail "create did not generate expected .gitattributes"
fi

if git -C "$SMOKE_DIR/smoke-project" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  pass "create initialized git repository"
else
  fail "create did not initialize git repository"
fi

if git -C "$SMOKE_DIR/smoke-project" rev-parse --verify HEAD >/dev/null 2>&1; then
  pass "create made initial git commit"
else
  fail "create did not make initial git commit"
fi

# ── Gate 4b: profile smoke (python + golang) ───────────────────────────
# A fresh python/golang project must show real commands (not N/A) in its
# README and — for golang — build day-one. Regression guard for the profile
# packs added in v0.8.5.
echo ""
echo ">> Gate 4b: Profile Smoke (python + golang)"

PY_DIR=$(mktemp -d)/py-smoke
node bin/ai-scaffold.js create "$PY_DIR" --profile python --yes >/dev/null 2>&1 || true
if [ -f "$PY_DIR/README.md" ] \
  && grep -q "pytest" "$PY_DIR/README.md" \
  && grep -q "ruff check ." "$PY_DIR/README.md" \
  && grep -q "pip install" "$PY_DIR/README.md"; then
  pass "python README shows real commands (install, pytest, ruff)"
else
  fail "python README missing real commands (shows N/A or not generated)"
fi

if [ -f "$PY_DIR/README.md" ] && ! grep -qE "\.ai-scaffold/\.env\.example|HOW-TO-USE\.md|CONTRIBUTING\.md" "$PY_DIR/README.md"; then
  pass "python README has no links to un-shipped files"
else
  fail "python README links to files not installed in generated projects"
fi

# Generated project must have a real .gitignore (renamed from template gitignore),
# not a leftover non-dot file.
if [ -f "$PY_DIR/.gitignore" ] && [ ! -e "$PY_DIR/gitignore" ]; then
  pass "generated project has .gitignore (renamed on copy, no stray gitignore)"
else
  fail "generated project missing .gitignore or leaked a non-dot gitignore"
fi

GO_DIR=$(mktemp -d)/go-smoke
node bin/ai-scaffold.js create "$GO_DIR" --profile golang --yes >/dev/null 2>&1 || true
if [ -f "$GO_DIR/README.md" ] \
  && grep -q "go test ./..." "$GO_DIR/README.md" \
  && grep -q "go vet ./..." "$GO_DIR/README.md" \
  && grep -q "go mod download" "$GO_DIR/README.md"; then
  pass "golang README shows real commands (install, go test, go vet)"
else
  fail "golang README missing real commands (shows N/A or not generated)"
fi

# Fresh golang project must build day-one: starter main.go + main_test.go so
# `go vet` / `go test` pass on an empty scaffold. Only run when Go is installed.
if command -v go >/dev/null 2>&1; then
  ( cd "$GO_DIR" && go vet ./... >/dev/null 2>&1 ); GO_VET_STATUS=$?
  ( cd "$GO_DIR" && go test ./... >/dev/null 2>&1 ); GO_TEST_STATUS=$?
  if [ "$GO_VET_STATUS" -eq 0 ] && [ "$GO_TEST_STATUS" -eq 0 ]; then
    pass "fresh golang project passes go vet + go test"
  else
    fail "fresh golang project fails go vet ($GO_VET_STATUS) or go test ($GO_TEST_STATUS)"
  fi
else
  echo "  – skipped fresh golang verification (go not installed)"
fi

# ── Gate 4c: generated doc links ───────────────────────────────────────
echo ""
echo ">> Gate 4c: Generated Doc Links"
if node scripts/check-generated-links.js "$PY_DIR" >/dev/null 2>&1; then
  pass "python project has no broken doc links or unresolved identity tokens"
else
  fail "python project has broken doc links or unresolved identity tokens"
  node scripts/check-generated-links.js "$PY_DIR" 2>&1 | head -8
fi
if node scripts/check-generated-links.js "$GO_DIR" >/dev/null 2>&1; then
  pass "golang project has no broken doc links or unresolved identity tokens"
else
  fail "golang project has broken doc links or unresolved identity tokens"
  node scripts/check-generated-links.js "$GO_DIR" 2>&1 | head -8
fi

# ── Gate 5: init --yes smoke test ──────────────────────────────────────
echo ""
echo ">> Gate 5: Init --yes Smoke Test"
JSON_INIT_DIR=$(mktemp -d)
echo "# Keep My README" > "$JSON_INIT_DIR/README.md"
INIT_JSON=$(node bin/ai-scaffold.js init "$JSON_INIT_DIR" --profile python --yes --dry-run --json 2>&1) || true
if PLAN_JSON="$INIT_JSON" node -e 'const p=JSON.parse(process.env.PLAN_JSON); if (p.command !== "init" || !p.dryRun || p.profile !== "python" || !p.existingTarget || !p.files.generate.some((f) => f.path === ".ai-scaffold/README.md")) process.exit(1);' >/dev/null 2>&1; then
  pass "init --dry-run --json emits parseable file plan"
else
  fail "init --dry-run --json emits parseable file plan"
  echo "  Output: $(echo "$INIT_JSON" | head -3)"
fi
if [ ! -d "$JSON_INIT_DIR/.claude" ] && [ ! -f "$JSON_INIT_DIR/.ai-scaffold.json" ] && grep -q "Keep My README" "$JSON_INIT_DIR/README.md"; then
  pass "init --dry-run --json writes nothing"
else
  fail "init --dry-run --json wrote files or changed README"
fi

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

for f in .ai-scaffold/README.md .ai-scaffold/context.md; do
  if [ -f "$INIT_DIR/$f" ]; then
    pass "init generated $f"
  else
    fail "init did not generate $f"
  fi
done

for d in .ai-scaffold/docs .ai-scaffold/tasks .ai-scaffold/_ai; do
  if [ -d "$INIT_DIR/$d" ]; then
    fail "init generated default $d/"
  else
    pass "init did not generate default $d/"
  fi
done

for f in .claude/hooks/pre-secret-guard.sh .claude/hooks/pre-dangerous-bash-guard.sh .claude/hooks/governance-file-guard.sh; do
  if [ -f "$INIT_DIR/$f" ]; then
    pass "init generated $f"
  else
    fail "init did not generate $f"
  fi
done

if grep -q "Project memory only" "$INIT_DIR/.claude/MEMORY.md" \
  && grep -q "production data" "$INIT_DIR/.claude/MEMORY.md" \
  && grep -q "client-confidential text" "$INIT_DIR/.claude/MEMORY.md"; then
  pass "init memory includes safety policy"
else
  fail "init memory missing safety policy"
fi

for f in HOW-TO-USE.md CONTRIBUTING.md CHANGELOG.md SECURITY.md LICENSE .env.example .editorconfig .gitattributes .gitleaks.toml .cursorrules; do
  if [ -e "$INIT_DIR/$f" ]; then
    fail "init left root $f"
  else
    pass "init did not leave root $f"
  fi
done

# status command should recognize the install
STATUS_OUT=$(node bin/ai-scaffold.js status "$INIT_DIR" 2>&1) || true
if echo "$STATUS_OUT" | grep -q "$PROJECT_VERSION"; then
  pass "status recognizes init install"
else
  fail "status does not recognize init install"
  echo "  Got: $STATUS_OUT"
fi

DOCTOR_OUT=$(node bin/ai-scaffold.js doctor "$INIT_DIR" --json 2>&1) || true
if echo "$DOCTOR_OUT" | grep -q '"criticalFailed": 0' && echo "$DOCTOR_OUT" | grep -q '"highFailed": 0'; then
  pass "doctor recognizes namespaced init install"
else
  fail "doctor reports critical/high failures after init"
  echo "  Got: $DOCTOR_OUT"
fi

if grep -q '"managedFiles": \\[\\]' "$INIT_DIR/.ai-scaffold.json"; then
  fail "manifest records managed files"
else
  pass "manifest records managed files"
fi

# ── Gate 6: bare . routes to init ──────────────────────────────────────
echo ""
echo ">> Gate 6: Bare '.' Routes to Init"
# Create a fresh target dir and cd into it, then invoke with "."
DOT_DIR=$(mktemp -d)
echo "# Keep My README" > "$DOT_DIR/README.md"
# Use a subshell to cd so we don't alter the outer shell's cwd
OUTPUT=$(cd "$DOT_DIR" && node "$REPO_ROOT/bin/ai-scaffold.js" . --yes 2>&1 | head -5) || true
if echo "$OUTPUT" | grep -q "AI Scaffold init"; then
  pass "bare '.' routes to init"
else
  fail "bare '.' does not route to init"
  echo "  Got: $OUTPUT"
fi

# ── Gate 7: hook simulations ───────────────────────────────────────────
echo ""
echo ">> Gate 7: Hook Simulations"

SECRET_ENV_OUT=$(printf '%s' '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | bash .claude/hooks/pre-secret-guard.sh 2>&1)
SECRET_ENV_STATUS=$?
if [ "$SECRET_ENV_STATUS" -eq 2 ] && echo "$SECRET_ENV_OUT" | grep -q "BLOCK:"; then
  pass "secret guard blocks .env"
else
  fail "secret guard blocks .env"
  echo "  Exit: $SECRET_ENV_STATUS Output: $SECRET_ENV_OUT"
fi

SECRET_TEMPLATE_OUT=$(printf '%s' '{"tool_name":"Read","tool_input":{"file_path":".env.example"}}' | bash .claude/hooks/pre-secret-guard.sh 2>&1)
SECRET_TEMPLATE_STATUS=$?
if [ "$SECRET_TEMPLATE_STATUS" -eq 0 ]; then
  pass "secret guard allows .env.example"
else
  fail "secret guard allows .env.example"
  echo "  Exit: $SECRET_TEMPLATE_STATUS Output: $SECRET_TEMPLATE_OUT"
fi

SECRET_BASH_OUT=$(printf '%s' '{"tool_name":"Bash","tool_input":{"command":"cat .env"}}' | bash .claude/hooks/pre-secret-guard.sh 2>&1)
SECRET_BASH_STATUS=$?
if [ "$SECRET_BASH_STATUS" -eq 2 ] && echo "$SECRET_BASH_OUT" | grep -q "BLOCK:"; then
  pass "secret guard blocks Bash access to .env"
else
  fail "secret guard blocks Bash access to .env"
  echo "  Exit: $SECRET_BASH_STATUS Output: $SECRET_BASH_OUT"
fi

DANGER_OUT=$(printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git reset --hard"}}' | bash .claude/hooks/pre-dangerous-bash-guard.sh 2>&1)
DANGER_STATUS=$?
if [ "$DANGER_STATUS" -eq 2 ] && echo "$DANGER_OUT" | grep -q "BLOCK:"; then
  pass "dangerous bash guard blocks git reset --hard"
else
  fail "dangerous bash guard blocks git reset --hard"
  echo "  Exit: $DANGER_STATUS Output: $DANGER_OUT"
fi

SAFE_BASH_OUT=$(printf '%s' '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' | bash .claude/hooks/pre-dangerous-bash-guard.sh 2>&1)
SAFE_BASH_STATUS=$?
if [ "$SAFE_BASH_STATUS" -eq 0 ]; then
  pass "dangerous bash guard allows safe command"
else
  fail "dangerous bash guard allows safe command"
  echo "  Exit: $SAFE_BASH_STATUS Output: $SAFE_BASH_OUT"
fi

GOV_OUT=$(printf '%s' '{"tool_name":"Edit","tool_input":{"file_path":"CLAUDE.md"}}' | bash .claude/hooks/governance-file-guard.sh 2>&1)
GOV_STATUS=$?
if [ "$GOV_STATUS" -eq 0 ] && echo "$GOV_OUT" | grep -q "WARN:"; then
  pass "governance guard warns on CLAUDE.md"
else
  fail "governance guard warns on CLAUDE.md"
  echo "  Exit: $GOV_STATUS Output: $GOV_OUT"
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
