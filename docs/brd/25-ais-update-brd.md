# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Safe `ais update`: managed-file lifecycle (backlog item 25)
**Version:** 1.3
**Date:** 2026-10-09
**Status:** **v1.3 (2026-10-15): consistency reconciliation with HLD v2.2 and ADR-007 revision 3, from the round-3 review; see the Change Log. Not yet re-approved: the maintainer authorised the documentation reconciliation only, not design sign-off or implementation.** v1.2: amendments B1 and B5 were approved by the maintainer on 2026-10-12.** The clarifications marked *(C)*, which implement review findings B2–B4 and W1–W6, are pending re-confirmation together with the revised HLD. Previously **Approved v1.1, 2026-10-09** (v1.0 approved the same day; the
v1.1 ADR-002 alignment was re-confirmed by the maintainer). The §9 defaults for
Q-01 to Q-03
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
| OC-03 | **managed** | `CLAUDE.md`, `AGENTS.md`, `constitution.md`, `.ai-scaffold/**` (except `context.md`, which is OC-01, and `backups/**` and `update.lock`, which are never classified), and everything else under `.claude/**` not listed above | Replaced if pristine; `.ais-new` if edited |
| OC-04 | **merged** | `.claude/settings.json` | Structured merge (FR-20 to FR-24) |

These classes **refine ADR-002** (Accepted 2026-07-08); they do not replace it:
- ADR-002's *scaffold-managed* category splits into **managed** and **merged**;
- its *generated project context* category becomes **user-data**;
- **seeded** covers starter files ADR-002 did not name;
- its *optional pack* and *protected application* categories are unchanged and
  out of scope here (packs are item 90).

The class is recorded per file in `.ai-scaffold.json`.

**Unowned paths (B1, approved 2026-10-12).** A path that matches no OC-01..OC-04 rule is **unowned**. `update` SHALL never write, replace or delete it, and SHALL report it as `skip-unowned`, even when the scaffold wrote it at install. Application files such as `README.md`, `.gitignore`, `package.json`, `composer.json`, `routes/**`, `database/migrations/**` and `public/**` are recorded in the manifest by `create`, but they belong to the project (ADR-002, category 4).

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
| FR-02 | `update` SHALL refuse downgrades with exit code 1. *(C, W6)* The `--force` option SHALL be removed, because it bypasses the version checks and contradicts BR-01. *(slice 3)* Passing `--force` SHALL fail with exit 1 and a message that it was removed in 0.17.0; it is never silently ignored | Must Have |
| FR-03 | Installs from **0.8.6 or later** (manifest has `managedFiles`) SHALL use hash classification. Older installs SHALL treat every managed file as edited (D-Q4) unless its content already equals the new render, in which case it is unchanged; nothing is replaced or removed, and the report says so | Must Have |
| FR-04 | Updating to the installed version SHALL report "already at X", change nothing, and exit 0 | Must Have |

### 5.2 Classification and plan

| ID | Requirement | Priority |
|---|---|---|
| FR-05 | Values for rendering SHALL come **only** from `.ai-scaffold.json`. No prompts. *(C, W3)* A render input that a newer version introduced SHALL be filled by a migration with the same default `--yes` would use, and recorded in `defaultedValues`. Only a missing input that has no default is an error | Must Have |
| FR-06 | For each managed path in the new version's plan, the action SHALL be: **add** (absent locally and absent from the manifest), **replace** (local file pristine per FR-09 and the new render differs), **unchanged** (new render equals local), **conflict** (local file edited, that is not pristine per FR-09), **user-deleted** (in the manifest, absent locally). *(C, W1)* **unchanged** SHALL take precedence over every other action. A class is resolved before the action: **seeded** wins over **user-deleted** | Must Have |
| FR-07 | For each **managed-class** path in the manifest's `managedFiles` that is absent from the new plan, the action SHALL be **remove** if pristine and **orphan-kept** if edited. Unowned paths are never removed (B1) | Must Have |
| FR-08 | A path present locally but absent from the manifest that the new version wants to add SHALL be a **conflict**, never an overwrite | Must Have |
| FR-09 | *(C, W2; contract corrected in v1.3)* Hashes are sha256 over **raw bytes**. Normalisation replaces each CRLF pair with LF in one non-overlapping pass and changes nothing else (lone CR, BOM and final newline are untouched; `\r\r\n` becomes `\r\n`). A record holds `hash` (raw) and, **only when the recorded content contains CRLF**, also `hashLf` (normalised). A file is pristine when sha256(raw C) = `hash`, or: **with `hashLf`**, sha256(normalised C) = `hashLf`; **without `hashLf`**, sha256(normalised C) = `hash` **and normalised C contains no CRLF**. Normalised content is never compared against the raw `hash` of a record that has `hashLf`, and a record without `hashLf` matches only CRLF-free normalised content, because only CRLF-free content is recorded without it. Otherwise `a\r\r\n` (normalised `a\r\n`) would falsely match a raw `a\r\n` record (round-4 finding). This covers LF-recorded content checked out as CRLF and CRLF-recorded content checked out as LF. A legacy record without `hashLf` whose recorded content was CRLF cannot be proven pristine in the LF direction and SHALL be treated as edited (never overwritten). A file whose only change is a line-ending conversion is pristine by design, and is replaced with the new render | Must Have |
| FR-10 | User-data paths (OC-01) SHALL appear in the plan as **skipped (user-data)** and SHALL NOT be read for content | Must Have |
| FR-11 | Seeded paths (OC-02) SHALL be **add** when absent, otherwise **skipped (seeded)** | Must Have |

### 5.3 Preview and output

| ID | Requirement | Priority |
|---|---|---|
| FR-12 | Without `--apply`, `update` SHALL print the plan and change nothing. Dry-run is the default, and `--dry-run` is accepted as an explicit synonym. *(v1.3)* This holds in every state, including an interrupted apply: preview never writes a marker, lock, backup, manifest or project file | Must Have |
| FR-13 | The plan SHALL group files by action, with counts, and SHALL end with a single next-step line | Must Have |
| FR-14 | `--json` SHALL emit the plan as JSON (schema documented in the HLD), mirroring `create --dry-run --json` conventions | Must Have |
| FR-15 | Exit codes: 0 = no conflicts (or applied cleanly); 1 = error or failed apply; 2 = applied, or would apply, with conflicts present | Should Have |

### 5.4 Apply, backup and rollback

| ID | Requirement | Priority |
|---|---|---|
| FR-16 | `--apply` SHALL back up every file it will write or delete **before** the first write (backup location: Q-01) | Must Have |
| FR-17 | Each write SHALL go to a temp file in the same directory, then be renamed over the target | Must Have |
| FR-18 | On any write failure, `update` SHALL restore every file from the backup, remove files it added, report the failure, and exit 1 | Must Have |
| FR-38 | *(C, B4; v1.3)* The apply journal SHALL be written to the backup directory before the first write, with a completion marker written last. The journal SHALL record the expected final state: the hash of the new manifest and, for every path the apply writes or deletes, its expected hash or absence. A run that finds a backup without the marker SHALL report the interrupted apply and its backup path and SHALL NOT plan over it, with one exception: under `--apply`, if the manifest and **every** journaled path match the journal's expected final state, the apply is complete, and the run SHALL write the marker, report that it did, and continue. Any mismatch, or a preview run, reports and exits 1 without writing | Must Have |
| FR-40 | *(v1.3)* `--apply` SHALL hold a per-project single-writer lock, created exclusively at `.ai-scaffold/update.lock` before the backup and removed when the run ends. If the lock exists, `--apply` SHALL exit 1 naming it, and SHALL NOT break it automatically; preview SHALL report it and continue read-only | Must Have |
| FR-41 | *(v1.3)* Immediately before each write or delete, `--apply` SHALL re-check that the target still has the content (hash or absence) the plan classified. On any difference it SHALL stop, roll back, name the path and exit 1 | Must Have |
| FR-19 | For each **conflict**, `update` SHALL leave the adopter's file untouched and write the new render to `<file>.ais-new` (D-Q5) | Must Have |

### 5.5 `settings.json` merge (OC-04, decided D-Q3)

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | *(v1.3)* Scaffold `permissions.deny` and `permissions.ask` rules missing locally SHALL be added, except a rule with a recorded exception (FR-39). The report SHALL list every such rule, in separate groups: **new** (not in the recorded base) and **restored** (in the base but absent locally, so removed locally). Without a base (FR-35) they are listed as **missing, no base**. Rules the adopter added SHALL be kept | Must Have |
| FR-21 | **(B5, approved 2026-10-12)** Scaffold `permissions.allow` rules SHALL be added only if they are **new since the recorded base** (FR-34). A base rule that is absent locally was removed by the adopter and SHALL NOT be re-added. No `allow` rule SHALL ever be removed | Must Have |
| FR-22 | **(B5, approved 2026-10-12)** A scaffold hook entry SHALL be replaced only when the local entry **equals the recorded base**. An adopter-modified scaffold hook SHALL be reported, not replaced. Adopter hooks SHALL be kept. Entries are matched as in FR-36 | Must Have |
| FR-23 | Each version MAY declare **retired** entries (hook commands, rules) in its migration. Retired entries SHALL be removed if present, and only those | Must Have |
| FR-34 | **(B5)** `create` and every successful apply SHALL record the scaffold-contributed subset of `settings.json` (rules and hook entries) as `settingsBase` in the manifest | Must Have |
| FR-35 | **(B5)** For a manifest with no `settingsBase`: if `settings.json` is hash-pristine, the local file IS the base; otherwise only `deny`/`ask` rules are added, and new `allow` rules are listed as suggestions in the report, not written. *(slice 3)* The base has three states: **recorded** (`settingsBase`), **derived** (no `settingsBase` and `settings.json` hash-pristine) and **unknown** (no `settingsBase`, file edited or unhashed). An unknown base is never treated as empty: missing `deny`/`ask` rules are listed as *missing, no base*, new `allow` rules only as suggestions, and the report states that deliberate removals cannot be determined | Must Have |
| FR-36 | **(B5; key corrected in v1.3)** Hook entries SHALL be matched per inner hook by **(event, script path)**, where the script path is parsed from the command (HLD §5). The matcher is part of the compared entry, not the key, so a scaffold matcher change replaces the hook rather than duplicating it. If more than one local, base or scaffold entry has the same key, the match is ambiguous: every local entry with that key SHALL be kept unchanged and the key reported as a conflict | Must Have |
| FR-43 | *(slice 3)* **Safe reads.** Before the first content read of any path, including `.ai-scaffold.json` itself, paths from `managedFiles`, the plan, `.claude/settings.json` and the backup/journal directory, `update` SHALL verify that the path is relative and inside the project lexically, and that the real path of the file and of every existing ancestor stays inside the real path of the project. Symbolic links and junctions SHALL be rejected. A rejected path is reported and never read. The ownership class SHALL be decided before any content read; user-data is checked for existence only. The apply slice reuses the same checks | Must Have |
| FR-44 | *(slice 3)* **Check order.** (1) containment of `.ai-scaffold.json`, then parse it; (2) removed flags (`--force`) and, while apply is unavailable, `--apply`; (3) version policy (FR-01, FR-02); (4) **lock** (FR-40): if present, status `locked`, exit 1, and no backup or journal is read; (5) interrupted transaction (FR-38), only when no lock exists; (6) installed version equals the CLI version: status `current`, exit 0, unless `--keep-removed` or `--restore-removed` was given, which exits 1 explaining that exceptions take effect only during an update; (7) plan. The first failing step decides the status | Must Have |
| FR-45 | *(slice 3)* **Preview JSON contract.** With `--json`, `update` SHALL write exactly one JSON document to stdout in every outcome, errors included, and nothing else to stdout; human-readable output goes to stderr. The document SHALL always contain `schema` (`ais-update-preview/1`), `status` (`planned`, `current`, `locked`, `interrupted` or `error`), `exitCode` and `error` (`{ code, message }` or `null`). Every other documented field (`from`, `to`, `profile`, `installMode`, `hashed`, `gitSafety`, `applyAvailable`, `entries`, `counts`, `settings`, `migrations`, `notices`) SHALL always be present and SHALL be `null` when it cannot be determined. Arrays are sorted (entries by path in code-unit order). Settings groups contain rule strings and hook keys only, never file contents. `gitSafety` is `not-assessed` until `git-state.js` exists. Exit 0 means no planning conflicts, not that applying is safe | Must Have |
| FR-46 | *(slice 3, transitional)* While apply is unavailable, `--apply` SHALL exit 1 with a message that applying is not available in this version, and no report text SHALL suggest running it | Must Have |
| FR-39 | *(v1.3)* The adopter MAY keep a scaffold `deny`/`ask` rule removed by recording a **per-rule exception**: `--keep-removed "<rule>"` (repeatable) records it, and `--restore-removed "<rule>"` deletes it. Exceptions SHALL be stored in the manifest as `settingsExceptions` and written only by a successful `--apply`; a preview shows their effect without saving. Each exception names one exact rule string and persists across updates until removed, retired by a migration (FR-23), or no longer shipped by the scaffold. A flag naming a rule the scaffold does not ship SHALL be an error. Every run SHALL list the exceptions it honoured. Documentation and report text SHALL NOT describe these rules as a sandbox or a complete security boundary | Must Have |
| FR-24 | The merge SHALL preserve every key it does not own, and SHALL write 2-space JSON. If the file is not valid JSON, it SHALL be a conflict (`.ais-new`), never rewritten | Must Have |

### 5.6 Migrations

| ID | Requirement | Priority |
|---|---|---|
| FR-25 | A migration SHALL be code keyed by the version that introduces it, run once when an update crosses that version, in ascending order | Must Have |
| FR-26 | The first migration SHALL classify existing manifests (pre-ownership) by the OC rule table and write the class per file. *(C, B2)* It SHALL also infer and record `install.mode`: with `managedFiles`, `create` when it holds any profile root file or a root `.gitattributes`, otherwise `init`; *(v1.3)* without `managedFiles` (pre-0.8.6), `unknown`, which plans as `init` with disk-independent planning (HLD §3) | Must Have |
| FR-42 | *(v1.3, slice 2)* **Context-aware ownership.** Ownership SHALL be decided from the path, the install mode and whether the manifest records the path, never from what is on disk. In `init` and `unknown` modes, a path in `PROTECTED_PATHS` (`file-plan.js`) whose OC class is managed (today `CLAUDE.md`, `AGENTS.md`, `constitution.md`; the set SHALL be computed from that constant, not restated) and that has **no** manifest record is **unowned**: `init` found the adopter's own file and update never touches it. Consequence: an `unknown`-mode project (pre-0.8.6, no records) never updates those three files; the preview SHALL say so. With a record it is classified by the OC table. In `create` mode the OC table alone applies; an unrecorded file at a planned path is a conflict (FR-08) | Must Have |
| FR-37 | *(C, B2)* `create` and `init` SHALL record `install.mode`, and `update` SHALL plan with that mode (`unknown` plans as `init`, FR-26). Re-planning an `init` or `unknown` install as a `create` install is prohibited | Must Have |
| FR-27 | Migrations SHALL be idempotent: running the same update twice produces no second change | Must Have |

### 5.7 Manifest fidelity and completion

| ID | Requirement | Priority |
|---|---|---|
| FR-28 | The manifest SHALL store every render input losslessly. Spike F1: an empty `requirementsPath` is stored as `[]` and re-renders differently | Must Have |
| FR-29 | A regression test SHALL assert the render round-trip (create, then re-render from the manifest alone, 0 mismatches) for every profile and for a fully non-default value set | Must Have |
| FR-30 | After a successful apply, `update` SHALL refresh `version`, `updatedAt`, the class of every file and the record of applied migrations. *(C, B3)* The hash recorded is the hash of the **new render** for add, replace, unchanged, conflict and user-deleted (so a conflict stays a conflict, and a deleted file is not re-added). Removed files lose their record. User-data and seeded records are carried forward **without reading the file** | Must Have |
| FR-31 | `ais doctor` SHALL warn while any `*.ais-new` file exists under managed paths | Should Have |

### 5.8 Repository safety

| ID | Requirement | Priority |
|---|---|---|
| FR-32 | `--apply` SHALL refuse if any path it would write **or delete** has uncommitted git changes, and name those paths, unless `--allow-dirty` is passed (Q-02). *(C, W4)* Untracked `.ais-new` files from a previous run are exempt. Paths are resolved relative to the project even when it is a subdirectory of a repository | Must Have |
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
| NFR-08 | *(slice 3)* **Preview makes no write attempts.** Tests SHALL record every filesystem write, create, delete, rename, directory operation and write-mode open during preview and assert there are none, in normal, error, locked and interrupted fixtures, in addition to comparing the project and backup directories before and after. CLI behaviour (JSON parsing, exit codes, removed and unsupported flags, exception flags at the installed version, invalid manifests, malformed journals) SHALL be tested against the **packed tarball** in CI on Ubuntu and Windows |
| NFR-07 | *(v1.3, slice 2)* **Deterministic rendering and comparison.** A render is a function of the template, the manifest values and one injected clock `now` only. Every stamp derives from `now` in **UTC** (`{{YEAR}}` via `getUTCFullYear`; dates via `toISOString`). Tests use a fixed clock. File lists are sorted by POSIX path in code-unit order. Files are compared byte-exact, except `.ai-scaffold.json`, which is compared as parsed JSON with only the listed JSON paths allowed to differ; any other difference fails. Each comparison is preceded by a control showing the generator reproduces itself byte-for-byte |
| NFR-06 | *(C, W5)* Every path from every source (templates, `managedFiles`, migrations) SHALL resolve inside the project. Absolute paths, `..`, anything under `.git/`, and symlinked ancestors are rejected |

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
| AC-07 | A 0.8.5 project (no hashes) | `ais update`, then `--apply` | *(v1.3)* Each existing managed file whose content differs from the new render is a conflict; one already equal to it is unchanged; nothing is replaced or removed |
| AC-08 | Uncommitted edits to a managed file | `--apply` | Refused and the path is named; nothing is written |
| AC-09 | The same update run twice | second `--apply` | "Already at X", no changes |
| AC-10 | A project created on Windows and cloned with `core.autocrlf=true` | `ais update` | Pristine files are classified as pristine (CRLF-normalised hashing) |
| AC-11 | (B1) A `create`d laravel project, untouched, where the new version changes `README.template.md` and drops a route file | `--apply` | `README.md` and `routes/web.php` are byte-identical and reported `skip-unowned`; nothing outside the managed set is written or deleted |
| AC-12 | (B5) An adopter removed a scaffold `allow` rule and prefixed a scaffold hook with `ECC_FACT_CHECK_STRICT=1` | `--apply` | The removed rule stays removed; the modified hook is reported, not replaced; new `deny`/`ask` rules are added |
| AC-13 | (B5) A pre-`settingsBase` project with an edited `settings.json` | `ais update` | Only `deny`/`ask` additions are planned; new `allow` rules appear as suggestions |
| AC-14 | (B2) A project installed with `ais init` into an existing repository | `--apply` | Nothing from the `create` skeleton is added; `.ai-scaffold/README.md` renders from its `init` source; pristine `CLAUDE.md`, `AGENTS.md` and `constitution.md` are **not removed** (round-2 review #1); a protected file `init` skipped is `skip-unowned` |
| AC-15 | (B3) An adopter edit left as a conflict by update N | update N+1 | The edit is still untouched and still reported as a conflict |
| AC-16 | (B4) The process is killed mid-apply | the next `ais update`, with and without `--apply` | It reports the interrupted apply and the backup path, does not plan over it, exits 1, and no file in the project or the backup changes |
| AC-17 | (v1.3) The process is killed after the manifest rename but before the marker | `ais update` (preview), then `--apply` | Preview reports the interrupted apply and writes nothing; `--apply` verifies the journal's final state, writes the marker, reports it, and plans normally. If any journaled path changed in between, `--apply` exits 1 instead |
| AC-18 | (v1.3) A second `ais update --apply` starts while the first holds the lock | the second run | It exits 1 naming the lock, and writes nothing |
| AC-19 | (v1.3) A managed file is edited after planning and before its write | `--apply` | The apply stops, rolls back, names the file, and exits 1 |
| AC-20 | (v1.3) A local scaffold hook whose matcher the new version changes; separately, two local hooks with the same event and script | `ais update` | The first is replaced (one entry, new matcher); the second is reported as an ambiguous conflict and both entries are unchanged |
| AC-21 | (v1.3) The adopter removed a scaffold `deny` rule | `--apply`; then `--apply --keep-removed "<rule>"`; then a later update; then `--apply --restore-removed "<rule>"` | Restored and listed as restored; then kept absent and the exception saved; then still absent and listed as an honoured exception; then restored |

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
| 1.2 | 2026-10-12 | Architecture review (REVISE) amendments. **B1** (unowned paths never touched) and **B5** (base-aware `settings.json` merge: FR-21, FR-22 and new FR-34 to FR-36) were **approved by the maintainer on 2026-10-12**. Clarifications *(C)* for B2 (FR-26, FR-37), B3 (FR-30), B4 (FR-38), W1 (FR-06), W2 (FR-09), W3 (FR-05), W4 (FR-32), W5 (NFR-06) and W6 (FR-02) are pending re-confirmation. New AC-11 to AC-16 |
| 1.3 | 2026-10-16 | *Slice 3 contracts (maintainer approval of 2026-10-16):* FR-02 `--force` explicit error; FR-35 tri-state settings base; new FR-43 safe reads, FR-44 check order (lock before journal), FR-45 preview JSON contract, FR-46 `--apply` unavailable, NFR-08 no write attempts and packed-tarball CLI tests |
| 1.3 | 2026-10-15 | *Slice 2 corrections (maintainer conditions of 2026-10-15):* FR-09 hashing contract made bidirectional with a conditional `hashLf`; new FR-42 context-aware `init` ownership; new NFR-07 deterministic rendering and comparison. Round-3 review reconciliation, documentation only (maintainer authorisation 2026-10-15; not design sign-off). Hook key (FR-36) aligned with HLD §5 as (event, script), with an ambiguity rule. Preview is read-only in every state (FR-12); recovery completes only under `--apply` after verifying the journal's expected final state (FR-38). Pre-0.8.6 handling aligned with the HLD (FR-03, FR-26, FR-37, AC-07). FR-20 restorations are visible and grouped; new FR-39 persisted per-rule exceptions. New FR-40 single-writer lock and FR-41 pre-write re-check. AC-16 tightened; new AC-17 to AC-21 |
| 1.1 | 2026-10-09 | **Alignment with ADR-002, found during Stage 3; re-confirmed by the maintainer the same day.** The maintainer's governing principle: a generated project's memory and this repository's memory are separate, and neither may interfere with the other. `.ai-scaffold/context.md` moves from managed to **user-data**: ADR-002 classes it as generated project context, owned by the project after generation. The ownership table now states that it refines ADR-002. This change touches fewer files than v1.0 |
