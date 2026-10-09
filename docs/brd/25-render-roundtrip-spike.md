# Spike: render round-trip for `ais update` (backlog item 25)

**Date:** 2026-10-09
**Question:** can every managed file be re-rendered **from `.ai-scaffold.json`
alone**, byte-for-byte? If yes, an unchanged hash proves a file is pristine and
safe to replace with the new version (analysis A2, risk R2).
**Answer: yes**, with one manifest gap, fixed below.

## Method

1. Installed the packed 0.15.0 tarball (built from `dev` at `5af044d`).
2. Generated 6 projects with `ais create --no-git`:
   - all 5 profiles with `--yes` defaults;
   - one `node` project with every value set to a non-default (display name,
     purpose, `api`, owner email, backend/frontend/database, `--multi-tenant`,
     `GDPR,SOC2`, `production`, `regulated`, `existing-docs` plus a path, and
     all four commands).
3. For each project, rebuilt the bootstrap values **only** from
   `.ai-scaffold.json`, ran the shipped `buildFilePlan` and `copyFiles` into an
   empty temp directory, and compared the sha256 of every file in
   `managedFiles` with the recorded hash.

Script: kept in the session scratchpad. It uses only exported functions
(`buildFilePlan`, `copyFiles`, `templatePath`), so the BRD can lift it into a
regression test unchanged.

## Results

| Project | Managed files | First run | After the fix |
|---|---|---|---|
| generic (defaults) | 157 | 1 mismatch | ✅ 0 |
| node (defaults) | 159 | 1 mismatch | ✅ 0 |
| python (defaults) | 159 | 1 mismatch | ✅ 0 |
| golang (defaults) | 160 | 1 mismatch | ✅ 0 |
| laravel (defaults) | 180 | 1 mismatch | ✅ 0 |
| node (all non-default) | 159 | ✅ 0 | ✅ 0 |

**994 files, 0 mismatches.** Every rule, command, hook, skill, agent,
`CLAUDE.md` and `AGENTS.md` re-renders exactly.

## Findings

- **F1 — Manifest normalisation is lossy for an empty requirements path.**
  `manifest.js:41` writes `paths: values.requirementsPath ? [path] : []`, so the
  default `''` becomes `[]` and re-renders as `undefined`.
  `settings-overrides.json` then omits `requirementsPath` and its hash changes.
  This only affected projects using the defaults. The file is **user-data**
  under D-Q2, so update never touches it, but the BRD must still require a
  **lossless manifest**: either store the raw value or normalise `''` to one
  canonical form at resolve time. A regression test asserts the round-trip for
  every value.
- **F2 — `.claude/MEMORY.md` embeds the install date.** It re-renders
  identically only on the same day. It is **user-data** (D-Q2), so this does
  not affect update. No **managed** file embeds a date.
- **F3 — Line endings.** Generated projects ship `* text=auto eol=lf`, so
  Windows clones of `create`d projects keep LF and stable hashes. Projects
  installed with `ais init` into an existing repository may lack that
  attribute. **Recommendation for the BRD:** compute pristine-hashes on content
  with CRLF normalised to LF. That is cheap, and it removes R5 regardless of the
  adopter's git settings.

## Not covered

- **A real version gap.** Both sides used 0.15.0 templates. The spike proves the
  pristine test; it does not exercise replacement across versions. The BRD's
  first acceptance test does that: install 0.14.0 from npm, then update with
  the new CLI.
- **`ais init` projects.** The spike used `create` only.

## Conclusion

The detection half of item 25 is proven. The update engine can classify a file
as pristine or edited from data every project since 0.8.6 already has,
provided F1 is fixed and F3's normalisation is adopted. **Proceed to the BRD.**
