#!/bin/bash
# check-tokens.sh — deterministic enforcement of ux-rules.md GH-10 and GH-11.
#
# GH-10 (BLOCK): all colors must use defined CSS/design tokens.
# GH-11 (BLOCK): artifacts must not reference undefined tokens.
#
# Both gates are mechanical, so they belong in a script rather than in an
# agent's judgement. Prose said "no hardcoded hex" and hoped; this checks.
#
# Usage:  check-tokens.sh <file-or-dir> [more...]
# Exit:   0 = clean, 1 = violations found, 2 = usage/config error
#
# Scope note: only the *declaration* sites of colors are checked (CSS-like
# and markup files). The token catalogue itself is exempt — it is where the
# hex values are legitimately defined.

set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: check-tokens.sh <file-or-dir> [more...]" >&2
  exit 2
fi

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOKENS_FILE="$SKILL_DIR/../ux-system/DESIGN_TOKENS.md"

if [ ! -f "$TOKENS_FILE" ]; then
  echo "error: token catalogue not found at $TOKENS_FILE" >&2
  exit 2
fi

# The set of legitimately-defined tokens, read fresh from the catalogue so
# this never drifts from the source of truth.
DEFINED=$(grep -o '\--color-[a-z0-9-]*' "$TOKENS_FILE" | sed 's/-$//' | sort -u)

violations=0

scan_file() {
  local f="$1"
  case "$f" in
    */ux-system/DESIGN_TOKENS.md|*/ux-system/DESIGN_SYSTEM.md) return 0 ;;
  esac

  # GH-10: hardcoded hex outside the catalogue.
  local hex
  hex=$(grep -nEo '#[0-9a-fA-F]{3,8}\b' "$f" 2>/dev/null | head -20)
  if [ -n "$hex" ]; then
    while IFS= read -r hit; do
      echo "GH-10 hardcoded hex: $f:${hit}"
      violations=$((violations + 1))
    done <<< "$hex"
  fi

  # GH-11: referenced token not present in the catalogue.
  local used
  used=$(grep -o '\--color-[a-z0-9-]*' "$f" 2>/dev/null | sed 's/-$//' | sort -u)
  [ -z "$used" ] && return 0
  while IFS= read -r tok; do
    [ -z "$tok" ] && continue
    if ! printf '%s\n' "$DEFINED" | grep -qx -- "$tok"; then
      echo "GH-11 undefined token: $f -> $tok"
      violations=$((violations + 1))
    fi
  done <<< "$used"
}

for target in "$@"; do
  if [ -d "$target" ]; then
    while IFS= read -r f; do scan_file "$f"; done < <(
      find "$target" -type f \
        \( -name '*.css' -o -name '*.scss' -o -name '*.tsx' -o -name '*.jsx' \
           -o -name '*.ts' -o -name '*.js' -o -name '*.vue' -o -name '*.md' \) \
        -not -path '*/node_modules/*' 2>/dev/null
    )
  elif [ -f "$target" ]; then
    scan_file "$target"
  else
    echo "error: no such file or directory: $target" >&2
    exit 2
  fi
done

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "BLOCK: $violations token violation(s). See ux-rules.md GH-10 / GH-11."
  exit 1
fi

echo "OK: no token violations."
exit 0
