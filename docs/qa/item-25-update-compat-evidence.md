# Item 25 slice 5: `ais update` against real installs — evidence

Criteria 5A–5D of `tasks/todo/25-ais-update.md`. The matrix is reproducible:

```bash
node scripts/update-compat-matrix.js --report compat-report.md
```

It installs 0.8.5, 0.14.0 and 0.16.1 from npm and packs the repository into a
candidate CLI. Only the installed copy's `package.json` version changes, to
`0.17.0-compat.0`, so 0.16.1 projects have an update to take.

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
| Windows 11 (local), Node 24.20.0 | 14/14 cases pass, no unexplained difference | [item-25-update-compat-run-windows.md](item-25-update-compat-run-windows.md) |
| Ubuntu and Windows (CI job `Update compatibility`) | see the slice 5 PR's checks | printed to the job log and step summary |

## What each case proves

- **5A — real 0.8.5, 0.14.0 and 0.16.1 installs:** node, laravel and python
  `create`, and node `init`. 0.8.5 has no python profile, so that case
  cannot exist. In every case:
  - preview and apply exit 2 for the one conflict;
  - every changed path is planned (FR-49);
  - user data and application files are byte-identical;
  - `AGENTS.md` keeps the adopter's edit and `AGENTS.md.ais-new` equals the
    fresh render;
  - every other managed file equals the fresh install (AC-01);
  - retired files are removed;
  - the manifest records schema 2, classes and `settingsBase`;
  - a second apply and a preview report `current` and change nothing (AC-09).

  Case-specific checks:
  - laravel `README.md` and `routes/web.php` are `skip-unowned` (AC-11);
  - `init` adds nothing from the create skeleton and removes none of
    `CLAUDE.md`, `AGENTS.md`, `constitution.md` (AC-14).
- **AC-07 — no hashes:** a real 0.8.5 install with `managedFiles` removed.
  - Nothing is replaced or removed.
  - 81 differing files are conflicts and 42 equal ones are unchanged.
  - The report says no hashes are recorded.
- **5B — `core.autocrlf=true` clones (AC-10):**
  - **`init`:** the clone has 154 CRLF managed files (checked, so the test
    is not vacuous), and none is a conflict.
  - **`create`:** the generated `.gitattributes` (`* text=auto eol=lf`) keeps
    every file LF, and none is a conflict.

## Findings

1. **Every published version records hashes, from 0.7.0.**
   - The BRD, HLD, ADR-007 and the ticket said hashes were recorded "since
     0.8.6" and treated 0.8.5 as hashless (AC-07).
   - Installing 0.7.0, 0.8.0, 0.8.2, 0.8.3 and 0.8.5 from npm shows every
     `create` and `init` records a hash for every managed file, and each hash
     matches the file on disk.
   - So a real 0.8.5 project is hash-classified: 82 pristine files are
     replaced and 9 retired ones removed, and the result equals a fresh
     install.
   - The no-hashes path (FR-03) is reachable only through a manifest without
     `managedFiles`, which is how AC-07 is now tested.
   - Corrected in the documents, for maintainer confirmation.
2. **0.7.x is hash-classified too.**
   - ADR-007 said ADR-002's v0.7.x re-baselining was met by the no-hashes
     path. It is not.
   - A real 0.7.0 install (Windows, backslash paths in its records) previews
     cleanly with today's code: 86 replace, 9 remove, 21 add, 30
     skip-unowned, no conflict, nothing rejected.
   - Recorded as an open maintainer question in ADR-007. 0.7.x is outside
     the approved matrix.
3. **Update keeps the project's recorded answers.**
   - 0.8.5 defaulted to multi-tenant; 0.8.5 and 0.14.0 recorded real
     lint/typecheck/build commands where later versions default to `none`.
   - The update renders from those recorded values (FR-04), so the fresh
     reference is given the same answers by flag.
4. **Explained differences from the fresh reference:**
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
5. **The user-visible notice for a manifest without `managedFiles`** said
   "before 0.8.6". It no longer names a version.
