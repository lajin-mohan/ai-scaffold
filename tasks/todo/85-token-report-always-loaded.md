# 85 — Token report counts unscoped rules as always-loaded

## Status

**Plan v1 — 2026-10-13. Awaiting architect review.** Size XS. Ships in
**0.16.1**, pulled forward from Corrective slice C3 because item 95 needs an
honest measuring stick. It is a maintainer tool (`npm run token-report`), not
a CLI command, so there is no adopter contract.

## Why

`src/cli/core/token-report.js:89` labels `.claude/rules` "on reference". But
Claude Code loads every rule **without `paths:` frontmatter** at launch, with
the same priority as `CLAUDE.md` (memory docs). Only the 8 `stacks/` overlays
are scoped. The report therefore shows "Always-loaded: 2,426" while about
37k tokens load every session.

## Plan

1. Split the `rules` category into two:
   - **`rules-always`**: files whose front matter has no `paths:`, counted in
     always-loaded;
   - **`rules-scoped`**: files with `paths:`, labelled "when matching files
     are read".
2. Always-loaded = `CLAUDE.md` + `rules-always`. On-demand = the rest.
3. Detection is pure: read the leading `---` front-matter block and look for a
   `paths:` key; no YAML dependency.
4. Update `src/__tests__/core.test.js` (`buildTokenReport` keys) and add a
   fixture test: one unscoped and one scoped rule are classified correctly.

## Verification

- `npm run token-report` shows always-loaded about 10k for this repo's root
  corpus (2.4k for CLAUDE.md plus the unscoped root rules, not the
  generated-project figure).
- Unit tests in CI.

## Plan v2 — after architect review (2026-10-13): APPROVE WITH CHANGES → applied

- Expected always-loaded for the root corpus is about **34–35k** (unscoped
  rules about 32k plus CLAUDE.md about 2.4k), not about 10k.
- Always-loaded is summed over categories flagged `alwaysLoaded`; no
  `categories[0]` index assumption (`:108,117`).
- Front-matter detection handles CRLF and ignores `paths:` outside the leading
  block, with a fixture for each.
- The label notes that `CLAUDE.local.md` is not counted.
