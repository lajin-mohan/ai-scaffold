# 77 — Placeholder gaps in generated projects (D1, D2, D4 slice)

## Status

**Implemented 2026-10-13 (plan v2); PR open.** Size XS. Ships in
**0.16.1**. D3 (eight hardcoded `N/A` tech-stack rows) is a product decision
and is **not** in this slice.

## Why (backlog item 77, audited 2026-08-27)

- **D1:** `.claude/memory/project-context.md:9-10` ships with live
  `{{CURRENT_EPIC}}` and `{{SPRINT_NUMBER}}`. `what-next.md:61` treats exactly
  those as a Stage 0 bootstrap signal, so `/what-next` in a fresh project says
  "🔴 BLOCKED — run /bootstrap" while `.ai-scaffold.json` says
  `bootstrapped: true`.
- **D2:** `content-templates.js:28` maps
  `{{Active Development / MVP / Production}}` to the literal
  `'Active Development'`. `create --lifecycle-stage production` therefore
  produces a `CLAUDE.md` Status that contradicts `.ai-scaffold/context.md` and
  `settings-overrides.json`.
- **D4:** `{{RUNTIME}}` (`content-templates.js:36`) is in the map but used by no
  template (verified: 0 references).

## Plan

1. **D1:** add `'{{CURRENT_EPIC}}'` → the same value as `{{EPIC_NAME}}`
   (`values.purpose`, line 32), and `'{{SPRINT_NUMBER}}'` → `'1'`, to the map.
   No template changes.
2. **D2:** export `lifecycleStageToStatus` from `manifest.js:135` and use it
   for the status token, so all three files agree.
3. **D4:** remove the `{{RUNTIME}}` entry.
4. **Tests:**
   - `resolvePlaceholders` with `lifecycleStage: 'production'` gives
     `Production`;
   - no `{{CURRENT_EPIC}}` or `{{SPRINT_NUMBER}}` after resolution;
   - a packed-tarball smoke assertion: a generated `project-context.md` has
     neither token.

## Verification

- Packed tarball, `create --lifecycle-stage production`: `CLAUDE.md` Status is
  `Production`; `project-context.md` shows the epic and sprint 1; the
  `what-next` Stage 0 signal no longer matches.
- **Item 25 interaction:** rendered output changes, so 0.16.1 projects differ
  from 0.16.0 ones. That is expected, and item 25's update handles it.
  `project-context.md` is user-data and is never updated.

## Plan v2 — after architect review (2026-10-13): REVISE → applied

**B1, verified on a 0.16.0 project:** `resolvePlaceholders` runs on every
copied file, so `what-next.md`'s Stage 0 table already ships corrupted ("`p-node`
placeholder still present"). That makes `/what-next` misdetect Stage 0 in
**every** generated project. A scan found 15 shipped `.claude` files containing
map tokens. Most are intended substitutions (skills reading
`{{BACKEND_STACK}}`); the broken ones are meta mentions (`what-next.md`,
`bootstrap.md`).

Revised steps:
1. **D1:** no new map keys, which would corrupt `bootstrap.md:128-136`. Change
   `project-context.md` (5 profiles) to the already-mapped `{{EPIC_NAME}}` and
   a literal sprint `1`.
2. **Stage 0 rewrite in `what-next.md` (5 profiles):**
   - first, if `.ai-scaffold.json` has `bootstrapped: true`, Stage 0 is
     complete; this also removes W2's apps/packages and `--no-git` false
     triggers;
   - otherwise, signals are written generically ("any unresolved `{{…}}`
     project placeholder in the Project Identity / Tech Stack tables"), with no
     literal map tokens.
3. **D2:** `lifecycleStageToStatus` moves into `content-templates.js`, which is
   pure, and `manifest.js` imports it (N4).
4. **D4:** remove `RUNTIME` from the map and from
   `scripts/check-generated-links.js:37-44` (W3).
5. **Guard test:** the shipped `what-next.md` contains no token from the
   `resolvePlaceholders` map.

**Recorded as follow-up, not this slice:** `bootstrap.md` and other meta
mentions of project tokens.
