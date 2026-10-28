# Item 25 slice 5: `ais update` against real installs — evidence

Criteria 5A–5D of `tasks/done/25-ais-update.md`, plus the ADR-002 0.7.x
re-baseline. The matrix is reproducible:

```bash
node scripts/update-compat-matrix.js --report compat-report.md
```

It installs 0.7.0, 0.8.5, 0.14.0 and 0.16.1 from npm and packs the
repository into a candidate CLI. Only the installed copy's `package.json`
version changes, to `0.17.0-compat.0`, so 0.16.1 projects have an update to
take.

Every install and update runs under a clock pinned to 2026-10-15T12:00:00Z,
and every project is named `compat-app`. Each case then:

1. Generates a project with the old CLI.
2. Plays an adopter: lessons, memory, local settings, an application file, an
   edit to `README.md`, and an edit to `AGENTS.md`.
3. Commits, then previews and applies with the candidate, and applies again.
4. Compares the result with a fresh candidate install of the same profile,
   given the old project's recorded answers.

## Runs

| Platform | Result | Report |
|---|---|---|
| Windows 11 (local), Node 24.20.0 | 15/15 cases pass, 1 not applicable, no unexplained difference | [item-25-update-compat-run-windows.md](item-25-update-compat-run-windows.md) |
| Ubuntu and Windows (CI job `Update compatibility`) | see the slice 5 PR's checks | printed to the job log and step summary |
| Published 0.17.1, Windows, 2026-10-28 | a clone of a real 0.8.1 project (engyne): preview, apply (95 replaced, 20 added, 7 removed, 30 conflicts kept with `.ais-new`), second apply `current` | 0.17.0 had refused it (`PATH_UNSAFE`, duplicate record); fixed in #165 |

## Coverage

| Release | create node | create laravel | create python | init node |
|---|---|---|---|---|
| 0.8.5 | yes | yes | **not applicable**: 0.8.5 ships only the generic, laravel and node profiles | yes |
| 0.14.0 | yes | yes | yes | yes |
| 0.16.1 | yes | yes | yes | yes |

Further cases:
- **0.7.0 create node:** the ADR-002 re-baseline.
- **Synthetic hashless manifest (AC-07):** labelled as such; not a published
  release.
- **`autocrlf=true` clones of 0.16.1** `init` and `create` (5B).

## What each case proves

- **5A — real 0.8.5, 0.14.0 and 0.16.1 installs.** In every case:
  - preview and apply exit 2 for the one conflict;
  - every changed path is planned (FR-49);
  - user data and application files are byte-identical;
  - `AGENTS.md` keeps the adopter's edit and `AGENTS.md.ais-new` equals the
    fresh render;
  - every other eligible managed file equals the fresh install (AC-01);
  - retired files are removed;
  - the manifest records schema 2, classes and `settingsBase`;
  - a second apply and a preview report `current` and change nothing (AC-09).

  Case-specific checks:
  - laravel `README.md` and `routes/web.php` are `skip-unowned` (AC-11);
  - `init` adds nothing from the create skeleton and removes none of
    `CLAUDE.md`, `AGENTS.md`, `constitution.md` (AC-14).

  **Real 0.8.5 installs record hashes**, so their 82 pristine scaffold files
  are replaced, 9 retired ones removed, and the result equals a fresh
  install. The edited file, user data and application files are kept.
- **AC-07 — SYNTHETIC hashless manifest.** A real 0.8.5 install with
  `managedFiles` removed by the test. No inspected release writes such a
  manifest.
  - Nothing is replaced or removed.
  - 81 differing files are conflicts and 42 equal ones are unchanged.
  - The report says no hashes are recorded.
- **5B — `core.autocrlf=true` clones (AC-10):**
  - **`init`:** the clone has 154 CRLF managed files (checked, so the test
    is not vacuous), and none is a conflict.
  - **`create`:** the generated `.gitattributes` (`* text=auto eol=lf`) keeps
    every file LF, and none is a conflict.
- **ADR-002 — 0.7.0 ownership re-baseline.** The 0.7.0 manifest lists 168
  files as managed, including docs, tasks, `_ai/`, `test/` and root
  application files, with Windows backslash paths. After one apply:
  - the 30 files outside current ownership, including a legacy doc the
    adopter edited, are byte-identical;
  - their records are `unowned` (the manifest stops claiming them), and no
    backslash path remains;
  - every current scaffold file has the class a fresh install gives it;
  - the edited `AGENTS.md` and user data survive;
  - `doctor` reports only the edited scaffold file, no legacy or user file;
  - a second apply changes nothing.

## Findings

1. **Every inspected release records hashes.**
   - Inspected: 0.7.0, 0.8.0, 0.8.2, 0.8.3, 0.8.5, 0.14.0 and 0.16.1. Their
     `create` and `init` record a hash for every managed file, matching the
     file on disk.
   - The BRD, HLD, ADR-007 and the ticket had said "since 0.8.6" and treated
     0.8.5 as hashless.
   - Releases not inspected are not claimed.
   - The no-hashes path (FR-03) is reachable through a manifest without
     `managedFiles`, which AC-07 now constructs.
2. **Defect found and fixed: `--apply` refused every 0.7.x install.** The
   lock required an `.ai-scaffold/` folder, which 0.7.x never created, so
   apply failed with a misleading `MANIFEST_MISSING`. Preview worked, so a
   preview alone had hidden it. The folder is now created only when a real
   `.ai-scaffold.json` is present.
3. **Defect found and fixed: `doctor` and `status` claimed the project's own
   files.** They verified every manifest record. Once records are classed,
   they verify only `managed` ones (ADR-002). This also stops `doctor`
   flagging an adopter's edits to `README.md` in a fresh project.
4. **Update keeps the project's recorded answers.**
   - 0.8.5 defaulted to multi-tenant; 0.8.5 and 0.14.0 recorded real
     lint/typecheck/build commands where later versions default to `none`.
   - The update renders from those recorded values (FR-04), so the fresh
     reference is given the same answers by flag.
5. **Explained differences from the fresh reference:**
   - **`.ai-scaffold/README.md` in `init` projects** renders the `dev`,
     `install` and `migration` commands, which no install flag can set:
     - 0.14.0 recorded dev `npm run dev`;
     - 0.8.5 predates the `install` command, so the schema-2 migration
       filled the generic default `none` and recorded it in
       `defaultedValues` (FR-05). A fresh node install records
       `npm install`. Observation: a profile-aware default would be more
       accurate.
   - **`constitution.md` in a 0.8.5 `init` project** is `skip-unowned`:
     0.8.5 never shipped it, and an unrecorded protected path in an `init`
     install is never added (FR-42).
6. **Platform difference.** 0.16.1 `init` shows `replace 1` on Windows and
   `unchanged` on Ubuntu. That file is `.ai-scaffold/README.md`, which
   0.16.1 wrote wrongly only on Windows (fixed in slice 2).
