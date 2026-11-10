# 69 — Command surface: one `ais-` namespace, redundant commands folded in

## Status

**Done in 0.19.0 (2026-11-10).** Shipped in Wave B, PR 5 (lajin-mohan/ai-scaffold#176),
with item 105. This record was added on 2026-11-10 by the post-release backlog
sync; the item previously existed only in the roadmap
(`docs/process/pre-npm-publish-todo.md`, "Hygiene track", item 69) and in the
CHANGELOG.

## What shipped

- 21 commands renamed `ais-*` so they cannot collide with native, plugin or
  adopter commands (for example `/start-task` → `/ais-plan`, `/review` →
  `/ais-review`). HOW-TO-USE "Command names before 0.19" maps every old name.
- 12 commands folded into the commands that replace them, with their modes kept
  (`/investigate` → `/ais-debug`, `/reflect` → `/ais-lessons --write`,
  `/qa-auth` → `/ais-qa-plan --auth`, the UX aliases → `/ais-ux-analysis` /
  `/ais-ux-design-prompt`, `/settings` → `.claude/settings-overrides.json`).
- Ponytail ladder, `/ponytail-audit`, `/ponytail-debt` and `--intensity`
  removed.
- `ais update` removes unedited old command files and keeps edited ones as
  `orphan-kept (retired-but-edited)`.

## Verification (from the PR and the release)

- Packed-tarball upgrade from published 0.18.0, with two command files edited:
  applied, edited files kept as orphans, second apply reports `current`.
- Update-compat matrix: 22 cases pass against the packed candidate.
- `check-governance` rejects retired command names in shipped files.
- 0.19.0 confirmed on the registry with `npm view`.

## Not done here (moved on)

- Default command set of about 8, process/UX/compliance as opt-in packs, and
  `/ais-review` choosing reviewers from the diff: item 90 (Wave D).
