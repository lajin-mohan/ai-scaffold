# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Safe `ais update`: managed-file lifecycle (backlog item 25)
**Version:** 1.1 (v1.0 approved; the v1.1 ADR-002 alignment is pending re-confirmation)
**Date:** 2026-10-09
**Status:** **Approved v1.0, 2026-10-09.** The §9 defaults for Q-01 to Q-03
are accepted as written.
**Size:** L (backlog). Stage 3 (HLD + ADR + independent architecture review) is
required before implementation, and it is shared with item 34's ownership
contract.
**Author:** Claude (Code session)
**Approved By:** Lajin M J (maintainer/owner), 2026-10-09

> **Scope note.** This feature runs in **generated projects**. Nothing here is a
> requirement on the `ai-scaffold` repository's own governance.
>
> Companion documents:
> - analysis: `docs/brd/25-ais-update-analysis.md` (decisions D-Q1 to D-Q5);
> - spike: `docs/brd/25-render-roundtrip-spike.md` (994 files, 0 mismatches
>   after F1).
>
> Backlog: `docs/process/pre-npm-publish-todo.md` → Phase 1 → item 25, Wave 2,
> rank 1, P0. The Corrective phase (items 79–89) ships through this feature.

---

## 1. Executive Summary

An adopted project currently cannot receive a scaffold fix without deleting
and re-running `ais create`. `ais update` will apply a newer scaffold version
in place:
- files the adopter has not touched are replaced with the new version, rendered
  with the project's own answers;
- edited files are never overwritten; the new version is written beside them
  as `.ais-new`;
- user data is never touched;
- `settings.json` is merged rather than replaced;
- files removed upstream are deleted only if pristine.

Every run previews first, backs up before writing, and rolls back on failure.

The detection half already exists: install-time sha256 hashes have been
recorded since 0.8.6, and the spike proved that every managed file re-renders
byte-for-byte from `.ai-scaffold.json`.

---

## 2. Objectives

| ID | Objective | Success Metric |
|---|---|---|
| OBJ-01 | Fixes reach adopted projects | A project created with 0.14.0 from npm updates to the new version, and every pristine managed file matches a fresh `create` of that version |
| OBJ-02 | An update never destroys adopter work | In the acceptance fixtures, 0 user-data files and 0 edited managed files are modified |
| OBJ-03 | The Corrective phase can ship | Pristine files removed upstream are deleted, and retired hook wiring is removed from `settings.json` |
| OBJ-04 | Every write is reversible | A failure injected mid-apply leaves the project byte-identical to its pre-update state |
| OBJ-05 | The adopter knows exactly what will happen | The dry-run report lists every file with one action, and `--json` emits the same plan |

---

## 3. Ownership classes (ID class `OC-xx`, decided D-Q2)

| ID | Class | Paths (default rule table) | Update behaviour |
|---|---|---|---|
| OC-01 | **user-data** | `.claude/memory/**`, `.claude/MEMORY.md`, `.claude/settings-overrides.json`, `.claude/settings.local.json`, `.ai-scaffold/context.md`, `tasks/lessons.md` | Never read for update, never written |
| OC-02 | **seeded** | `CHANGELOG.md`, `tasks/todo/.gitkeep`, `tasks/done/.gitkeep` | Written only when absent |
| OC-03 | **managed** | `CLAUDE.md`, `AGENTS.md`, `constitution.md`, `.ai-scaffold/**` (except `context.md`, which is OC-01, and `backups/**`, which is never classified), and everything else under `.claude/**` not listed above | Replaced if pristine; `.ais-new` if edited |
| OC-04 | **merged** | `.claude/settings.json` | Structured merge (FR-20 to FR-24) |

These classes **refine ADR-002** (Accepted 2026-07-08); they do not replace it:
- ADR-002's *scaffold-managed* category splits into **managed** and **merged**;
- its *generated project context* category becomes **user-data**;
- **seeded** covers starter files ADR-002 did not name;
- its *optional pack* and *protected application* categories are unchanged and
  out of scope here (packs are item 90).

The class is recorded per file in `.ai-scaffold.json`. A path that matches no
rule defaults to **managed** if it was written by the scaffold, and is otherwise
ignored.

---

## 4. User Roles & Permissions

| Role | Description | Permissions in this Feature |
|---|---|---|
| Developer | Runs `ais update` in a generated project | Previews (default) and applies (`--apply`). Writes only inside the project directory and the backup location |
| CI | Runs `ais update --dry-run --json` | Read-only. Consumes the plan and the exit code |

---

## 5. Functional Requirements

> Requirement language: **SHALL** = mandatory · **SHOULD** = recommended ·
> **MAY** = optional

### 5.1 Version policy

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | `update` SHALL target the version of the running CLI (D-Q1). `--target-version` SHALL error unless it equals that version, and the error SHALL name the `npx @lajin.m/ai-scaffold@X update` form | Must Have |
| FR-02 | `update` SHALL refuse downgrades. The existing refusal at `update.js:88` is kept | Must Have |
| FR-03 | Installs from **0.8.6 or later** (manifest has `managedFiles`) SHALL use hash classification. Older installs SHALL treat every managed file as edited (D-Q4) and say so in the report | Must Have |
| FR-04 | Updating to the installed version SHALL report "already at X", change nothing, and exit 0 | Must Have |

### 5.2 Classification and plan

| ID | Requirement | Priority |
|---|---|---|
| FR-05 | Values for rendering SHALL come **only** from `.ai-scaffold.json`. No prompts | Must Have |
| FR-06 | For each managed path in the new version's plan, the action SHALL be: **add** (absent locally and absent from the manifest), **replace** (local hash equals manifest hash and the new render differs), **unchanged** (new render equals local), **conflict** (local hash differs from the manifest), **user-deleted** (in the manifest, absent locally) | Must Have |
| FR-07 | For each path in the manifest's `managedFiles` that is absent from the new plan, the action SHALL be **remove** if pristine and **orphan-kept** if edited | Must Have |
| FR-08 | A path present locally but absent from the manifest that the new version wants to add SHALL be a **conflict**, never an overwrite | Must Have |
| FR-09 | Pristine comparison SHALL hash content with CRLF normalised to LF (spike F3). Hashes written by update SHALL use the same normalisation | Must Have |
| FR-10 | User-data paths (OC-01) SHALL appear in the plan as **skipped (user-data)** and SHALL NOT be read for content | Must Have |
| FR-11 | Seeded paths (OC-02) SHALL be **add** when absent, otherwise **skipped (seeded)** | Must Have |

### 5.3 Preview and output

| ID | Requirement | Priority |
|---|---|---|
| FR-12 | Without `--apply`, `update` SHALL print the plan and change nothing. Dry-run is the default, and `--dry-run` is accepted as an explicit synonym | Must Have |
| FR-13 | The plan SHALL group files by action, with counts, and SHALL end with a single next-step line | Must Have |
| FR-14 | `--json` SHALL emit the plan as JSON (schema documented in the HLD), mirroring `create --dry-run --json` conventions | Must Have |
| FR-15 | Exit codes: 0 = no conflicts (or applied cleanly); 1 = error or failed apply; 2 = applied, or would apply, with conflicts present | Should Have |

### 5.4 Apply, backup and rollback

| ID | Requirement | Priority |
|---|---|---|
| FR-16 | `--apply` SHALL back up every file it will write or delete **before** the first write (backup location: Q-01) | Must Have |
| FR-17 | Each write SHALL go to a temp file in the same directory, then be renamed over the target | Must Have |
| FR-18 | On any write failure, `update` SHALL restore every file from the backup, remove files it added, report the failure, and exit 1 | Must Have |
| FR-19 | For each **conflict**, `update` SHALL leave the adopter's file untouched and write the new render to `<file>.ais-new` (D-Q5) | Must Have |

### 5.5 `settings.json` merge (OC-04, decided D-Q3)

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | Scaffold `permissions.deny` and `permissions.ask` rules missing locally SHALL be added; rules the adopter added SHALL be kept | Must Have |
| FR-21 | Scaffold `permissions.allow` rules missing locally SHALL be added; no `allow` rule SHALL ever be removed | Must Have |
| FR-22 | Scaffold hook entries SHALL be matched by the script path in their command. Changed entries SHALL be replaced; adopter hooks SHALL be kept | Must Have |
| FR-23 | Each version MAY declare **retired** entries (hook commands, rules) in its migration. Retired entries SHALL be removed if present, and only those | Must Have |
| FR-24 | The merge SHALL preserve every key it does not own, and SHALL write 2-space JSON. If the file is not valid JSON, it SHALL be a conflict (`.ais-new`), never rewritten | Must Have |

### 5.6 Migrations

| ID | Requirement | Priority |
|---|---|---|
| FR-25 | A migration SHALL be code keyed by the version that introduces it, run once when an update crosses that version, in ascending order | Must Have |
| FR-26 | The first migration SHALL classify existing manifests (pre-ownership) by the OC rule table and write the class per file | Must Have |
| FR-27 | Migrations SHALL be idempotent: running the same update twice produces no second change | Must Have |

### 5.7 Manifest fidelity and completion

| ID | Requirement | Priority |
|---|---|---|
| FR-28 | The manifest SHALL store every render input losslessly. Spike F1: an empty `requirementsPath` is stored as `[]` and re-renders differently | Must Have |
| FR-29 | A regression test SHALL assert the render round-trip (create, then re-render from the manifest alone, 0 mismatches) for every profile and for a fully non-default value set | Must Have |
| FR-30 | After a successful apply, `update` SHALL refresh `version`, `updatedAt`, the hash and class of every managed file, and the record of applied migrations | Must Have |
| FR-31 | `ais doctor` SHALL warn while any `*.ais-new` file exists under managed paths | Should Have |

### 5.8 Repository safety

| ID | Requirement | Priority |
|---|---|---|
| FR-32 | `--apply` SHALL refuse if any path it would write has uncommitted git changes, and name those paths, unless `--allow-dirty` is passed (Q-02) | Must Have |
| FR-33 | `update` SHALL NOT create commits, branches or tags | Must Have |

---

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | An edited file is never overwritten, whatever flags are passed. There is no `--force` overwrite in this slice |
| BR-02 | User-data is never written, renamed or deleted |
| BR-03 | Dry-run is the default; writing requires `--apply` |
| BR-04 | No network access: the templates come from the running CLI package |
| BR-05 | A file the adopter deleted is not recreated (see Q-03) |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Works on Windows (Git Bash and PowerShell), macOS and Linux. The acceptance suite runs on item 60's Windows runner once that exists |
| NFR-02 | The plan for a 200-file project completes in under 5 seconds on a developer laptop |
| NFR-03 | No new runtime dependency unless the HLD justifies it against the few lines it replaces |
| NFR-04 | Verified against the **packed tarball**, never the working tree (CLAUDE.md rule 1) |
| NFR-05 | Output never prints file contents, so user-data cannot leak into logs |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | A project created by **0.14.0 from npm**, untouched | `ais update --apply` with the new CLI | Every managed file equals a fresh `create` of the new version; the manifest shows the new version; exit 0 |
| AC-02 | The same project with `CLAUDE.md` edited and `tasks/lessons.md` filled in | `--apply` | `CLAUDE.md` is untouched, `CLAUDE.md.ais-new` exists, lessons are byte-identical, the report lists 1 conflict, exit 2 |
| AC-03 | A managed hook removed upstream (pristine locally) and retired in the migration | `--apply` | The hook file is deleted, its `settings.json` entry is removed, and adopter hooks are kept |
| AC-04 | `settings.json` with an adopter `allow` rule and an adopter hook | `--apply` | The new deny/ask rules are present, the adopter rule and hook are kept, and no `allow` rule is removed |
| AC-05 | A write failure injected after half the files | `--apply` | The project is byte-identical to before; exit 1; the backup location is reported |
| AC-06 | Any project | `ais update` (no flags) | Nothing changes on disk; the plan is printed |
| AC-07 | A 0.8.5 project (no hashes) | `ais update` | Every managed file is reported as conflict; nothing is overwritten on `--apply` |
| AC-08 | Uncommitted edits to a managed file | `--apply` | Refused and the path is named; nothing is written |
| AC-09 | The same update run twice | second `--apply` | "Already at X", no changes |
| AC-10 | A project created on Windows and cloned with `core.autocrlf=true` | `ais update` | Pristine files are classified as pristine (CRLF-normalised hashing) |

---

## 9. Open Questions

**All resolved 2026-10-09:** the BRD was approved as written, which accepts
these defaults.

| ID | Question | Recommended default |
|---|---|---|
| Q-01 | Backup location | `.ai-scaffold/backups/<ISO-timestamp>/` inside the project, gitignored, so it stays with the project; `export-context` keeps its out-of-project role |
| Q-02 | Dirty working tree | Refuse unless `--allow-dirty` (FR-32) |
| Q-03 | A managed file the adopter deleted | Do not recreate; report it as `user-deleted` with a hint. A `--restore <path>` option can follow |

---

## 10. Dependencies

| Dependency | Why |
|---|---|
| Spike F1 fix (FR-28) | Without it, default-value projects classify `settings-overrides.json` wrongly. It is user-data so harmless for update, but the round-trip test must be green |
| Item 34 (shared base plus overlays) | Shares the ownership contract; Stage 3 designs it once |
| Item 60 (Windows CI) | NFR-01 evidence |
| Corrective phase (79–89) | Consumer: its retired hooks and commands are the first FR-23 migration |

---

## 11. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | An edited file is classified as pristine | Impossible by construction (hash equality). AC-02 guards it |
| R-02 | A render input is missing from the manifest | FR-28/FR-29 round-trip regression test on every profile |
| R-03 | The `settings.json` merge corrupts adopter config | FR-24 (invalid JSON becomes a conflict); AC-04; backup |
| R-04 | Partial apply | FR-17 temp-and-rename; FR-18 rollback; AC-05 |
| R-05 | Many `.ais-new` files nobody resolves | FR-31 doctor warning; the report's next-step line |

---

## 12. Glossary

| Term | Meaning |
|---|---|
| Pristine | Current (LF-normalised) hash equals the hash recorded at install or last update |
| Render | The scaffold's template with placeholders resolved from the manifest values |
| Migration | Version-keyed code run once when an update crosses that version |
| `.ais-new` | The new version of a file the adopter edited, written beside it for manual merge |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-09 | Initial draft from the analysis (D-Q1 to D-Q5) and the spike. Approved the same day by the maintainer; Q-01 to Q-03 defaults accepted |
| 1.1 | 2026-10-09 | **Alignment with ADR-002, found during Stage 3 and pending re-confirmation.** `.ai-scaffold/context.md` moves from managed to **user-data**: ADR-002 classes it as generated project context, owned by the project after generation. The ownership table now states that it refines ADR-002. This change touches fewer files than v1.0 |
