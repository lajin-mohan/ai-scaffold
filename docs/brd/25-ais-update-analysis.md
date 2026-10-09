# Solution Analysis: Safe `ais update` (backlog item 25)

**Analyst:** Claude (Code session)
**Date:** 2026-10-09
**Status:** DRAFT. Five blocking decisions (Q1–Q5) are open, and no BRD is
written until they are answered.
**Confidence:** MEDIUM–HIGH. The detection mechanism already exists in the
codebase. The open unknowns are policy decisions, not technical feasibility.
**Scope:** the first lifecycle slice: ownership classes, dry-run/conflict
report, apply with backup and rollback, and one real version migration. It is
also the delivery vehicle for the Corrective phase (items 79–89), so it must
support **deleting** managed files.

## Problem Statement

`ais update` is a placeholder. `src/cli/commands/update.js:76` prints
`File update engine: not implemented yet`, and every non-dry-run path exits 1
(`update.js:100`). An adopted project can only receive a scaffold fix by
deleting and re-running `ais create`, with item 56's `export-context` as the
safety net. This blocks two things at once:

1. **Lifecycle:** "Update / lifecycle" is the lowest-rated category in the
   backlog (4 of 10).
2. **The Corrective phase:** its removals (defective hooks, native-shadowing
   commands) and its additions (the permission rules shipped by item 79a) cannot
   reach existing projects.

## What already exists (verified 2026-10-09)

| Capability | Where | State |
|---|---|---|
| Install-time content hashes | `manifest.js:111` `buildManagedFileRecords`, called at `copy.js:98` | ✅ sha256 for every written file (159 in a tarball-generated node project) |
| Drift detection | `doctor.js:364-378` | ✅ compares current hash against the recorded one |
| Render inputs | `.ai-scaffold.json` `project`, `stack`, `risk`, `requirements`, `commands` | ⚠️ probably complete, not proven (R2) |
| Path classes | `file-plan.js:18` `MANAGED_PATHS`, `:104` `PROTECTED_PATHS`, `:132` `APP_SOURCE_PATHS` | ⚠️ install-time only, and they overlap (A3) |
| Dry-run | `dry-run-plan.js`, `ais create/init --dry-run` | ✅ for install; nothing for update |
| Version gate | `update.js:53-92` (semver validity, downgrade refusal) | ✅ reusable |

The core of item 25 is therefore a **classifier and an applier**, not a new
detection system. If a file's current hash equals the install hash, the adopter
has not touched it, and it is safe to replace with the new version rendered
with the project's own answers.

## Stakeholders

| Role | Interest |
|---|---|
| Maintainer (Lajin M J) | Ships fixes to adopters without asking them to reinstall |
| Pilot project teams (2) | Receive fixes without losing memory, lessons or customised rules |
| Adopting developers | One command, a clear preview, nothing lost silently |
| Corrective phase (items 79–89) | Needs delete and settings-merge support to ship |

## Assumptions (Must Be Confirmed)

- **A1.** The update target is **the running CLI's own version**
  (`npx @lajin.m/ai-scaffold@X update`), not a version fetched at runtime.
  `--target-version` other than the CLI's own would need network fetch and a
  second template tree. Recommend removing or restricting the flag. → Q1
- **A2.** A file is **pristine** when its current hash equals the hash recorded
  at install or last update. No base-content store is needed for this first
  slice; conflicts are reported, not merged.
- **A3.** `CLAUDE.md` and `AGENTS.md` appear in **both** `MANAGED_PATHS` and
  `PROTECTED_PATHS`. For update, they are managed-but-customisable: updated if
  pristine, a conflict if edited. → Q2
- **A4.** User data inside `.claude/**` is never overwritten: `memory/**`,
  `MEMORY.md`, `settings-overrides.json`, `settings.local.json`, and also
  `tasks/lessons.md`. Today these are recorded as managed files with hashes,
  which would wrongly make them update candidates. → Q2
- **A5.** Supported starting versions are those that wrote `managedFiles`
  hashes: **0.8.6 and later**. That was verified 2026-10-09 by unpacking the
  published npm tarballs: 0.8.5 lacks `buildManagedFileRecords`, and 0.8.6–0.9.0
  have it. Git tags can't answer this, because squashed releases make
  `git tag --contains` report v0.11.0. Older installs fall back to "treat every
  file as edited". → Q4

## Ambiguities (Must Be Resolved Before BRD)

- **Ownership classes.** Proposed four classes:
  - **managed:** replaced if pristine, conflict if edited;
  - **user-data:** never touched;
  - **seeded:** written once when absent (`tasks/lessons.md`, `CHANGELOG.md`);
  - **merged:** structured merge (`settings.json`).

  Where each path lands is a product decision. → Q2
- **`settings.json`.** It is edited by almost every team (allow rules, hooks),
  so hash-pristine will rarely hold. Options: (a) conflict and print the diff;
  (b) structured merge — union scaffold-owned `permissions.deny`/`ask`, replace
  scaffold-owned `hooks` entries by script path, keep user `allow` entries;
  (c) treat it as user-data and print the paste-ready delta. The Corrective
  phase needs (b), or every adopter hits a conflict on the most important file.
  → Q3
- **Edited file with an upstream change.** Report-only (keep theirs and write
  `<file>.ais-new` next to it) versus interactive per-file choice. Recommend
  `.ais-new` plus a summary; interactive can come later. → Q5
- **Deleted upstream.** If pristine, delete; if edited, keep and warn. The
  Corrective phase relies on the pristine-delete path.
- **Rollback scope.** Backup location (reuse `export-context`'s
  `~/.ai-scaffold-backups/` or use an in-repo `.ai-scaffold/backup/<ts>/`), and
  whether rollback is automatic on any write failure or a separate
  `ais update --rollback`.

## Scope Clarity

**In scope (from the item definition):**
- dry-run change set: add / replace / delete / conflict / skip, per file;
- apply with backup, and automatic rollback on failure;
- ownership classes recorded in the manifest;
- version-pinned migrations (a migration is code that runs once when crossing a
  version, for example the `settings.json` merge);
- manifest hash refresh after apply.

**Out of scope (proposed):**
- three-way content merge of edited Markdown;
- downgrade (already refused at `update.js:88`);
- fetching template versions other than the CLI's own;
- `init`-into-existing-repo changes.

**Unconfirmed scope (needs decision):**
- Git integration: refuse on a dirty tree? Auto-commit or branch? Recommend
  refusing on a dirty tree for managed paths and never committing.
- `--json` output for CI parity with `doctor`.

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | An update overwrites an adopter's edit | Med | **High** — silent loss of governance customisation | Hash-pristine gate; never overwrite edited files; backup before any write; dry-run is the default output |
| R2 | Re-rendering differs from the original install because a placeholder input is not in the manifest | Med | High — every rendered file looks edited | **Round-trip test:** create, re-render from the manifest alone, all hashes equal. A spike before the BRD is signed |
| R3 | User data classed as managed (A4) gets replaced | High if unaddressed | **High** | Ownership classes land before the applier; test fixture with an edited `lessons.md` and memory files |
| R4 | `settings.json` conflicts block the Corrective phase rollout | High | Med | Structured merge migration (Q3b) |
| R5 | Windows path and line-ending differences change hashes | Med | Med | Hash normalised content? Decide; `.gitattributes` already ships. Test on the Windows runner (item 60) |
| R6 | A partial apply after a crash | Low | High | Write to temp, then rename; journal and rollback |
| R7 | Pre-hash installs (A5) | Low | Med | Every file treated as edited, reported clearly |

## Technical Unknowns / Spike Required

**Spike — 0.5 day: render round-trip.** Generate each profile from the packed
tarball, re-render every managed file using only `.ai-scaffold.json` values,
and compare hashes. Zero mismatches confirms A2 and R2. Any mismatch names the
missing manifest field. Run it before the BRD is signed, as item 26's spike was.

## Recommended Next Step

**Resolve Q1–Q5, then run the spike, then write the BRD.** The mechanism is
low-risk because the hashes and drift check exist. The risk is in policy:
which files are whose, and what happens to `settings.json`.

## Open Questions for Stakeholders

| # | Question | Recommendation | Blocking? |
|---|---|---|---|
| Q1 | Should the update target only the running CLI's version? | Yes. Remove or restrict `--target-version`; `npx …@X update` already selects a version | Yes |
| Q2 | Ownership class for each path family (`.claude/memory/**`, `MEMORY.md`, `settings-overrides.json`, `CLAUDE.md`, `AGENTS.md`, `tasks/lessons.md`, `CHANGELOG.md`) | user-data: memory, MEMORY, overrides, lessons · seeded: CHANGELOG · managed: CLAUDE, AGENTS, rules, commands, hooks, skills | Yes |
| Q3 | `settings.json` policy | Structured merge (scaffold-owned keys replaced, user allow entries kept) | Yes, for the Corrective phase |
| Q4 | Minimum supported starting version | 0.8.6, the first published version that records `managedFiles` hashes; older installs get the all-conflict fallback | Yes |
| Q5 | How should edited files that changed upstream be handled? | Keep the adopter's file, write `<file>.ais-new`, list it in the summary | Yes |
