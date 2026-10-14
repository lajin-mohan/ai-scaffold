# ADR-007: Update classification and apply semantics

**Date:** 2026-10-09 · **Revised:** 2026-10-12
**Status:** **Proposed (revision 2).** Revised for the independent review
(`docs/architecture/review-25-ais-update.md`, REVISE). Pending the architect
re-review and maintainer acceptance.
**Deciders:** Lajin M J (Technical Lead)
**Consulted:** ADR-002, `docs/brd/25-ais-update-brd.md`,
`docs/brd/25-render-roundtrip-spike.md`, `docs/architecture/hld-25-ais-update.md`
**Refines:** ADR-002 (does not supersede it)

---

## Context

ADR-002 defines who owns a file. It does not define how `ais update` decides,
for one file, whether to replace it, keep it, delete it or flag it. Its own
consequence says `update` "must not mutate versions until file migration and
re-baselining exist". Item 25 now has to define that decision so the
Corrective phase (items 79–89) can ship fixes, including **deletions**, to
adopted projects.

Facts the decision rests on:
- Every install since **0.8.6** records a raw sha256 per written file,
  verified against the published npm tarballs.
- Every managed file re-renders byte-for-byte from `.ai-scaffold.json` alone
  (spike: 994 files, 0 mismatches after fix F1).
- Adopters edit governance files, especially `settings.json`, and some clone on
  Windows with CRLF line endings.

## Decision

1. **Ownership refines ADR-002 into update classes.**
   - ADR-002's *scaffold-managed* splits into **managed** and **merged**
     (`settings.json` only).
   - *Generated project context* becomes **user-data**: never read or written
     by update.
   - **seeded** starter files are written only when absent.
   - *Optional pack* is unchanged and out of scope (item 90).

   **Criterion (W8):** user-data is content the project is expected to evolve
   (memory, lessons, context, overrides). Generated files that encode scaffold
   behaviour, such as `constitution.md`, are managed, and `.ais-new` keeps
   them safe. `.ai-scaffold.json` is the manifest itself and is never
   classified.
2. **Update owns only the managed set (B1).** `.claude/**`, `.ai-scaffold/**`,
   `CLAUDE.md`, `AGENTS.md` and `constitution.md`, minus user-data. Every
   other path, including application files `create` recorded in
   `managedFiles`, is **unowned**: never written, replaced or deleted. This is
   what keeps ADR-002 category 4 (protected application files) intact.
3. **Render in the original install mode (B2).** `install.mode` (`create` |
   `init`) is recorded, or inferred for older manifests, and planning uses it.
   An `init` install is never re-planned as a `create`.
4. **A file is pristine if, and only if, its current content matches the
   recorded hash, raw or LF-normalised.** Hashes are written raw. A file whose
   content already equals the new render is `unchanged` before any other test.
5. **An edited file is never overwritten.** The new version is written to
   `<file>.ais-new`, and there is no override flag (`--force` is removed).
   **The hash recorded after apply is always the new render's (B3)**, never the
   edited file's, so an edit cannot become "pristine" by surviving one update.
6. **Removal is explicit and pristine-only**, for managed files only.
7. **`settings.json` is merged against a recorded base (B5).**
   - The scaffold subset at the last install or apply is recorded as
     `settingsBase`.
   - New scaffold entries are added. Missing `deny`/`ask` rules are restored
     (FR-20); an `allow` rule or hook the adopter removed is not re-added.
   - A scaffold hook is replaced only if the local entry equals the base.
   - Only migration-declared retired entries are removed.
   - Hooks are matched per inner hook by (event, matcher, script path).
8. **Apply is transactional and crash-aware (B4).**
   - Backup, then a journal persisted before the first write.
   - Temp-and-rename for every write.
   - Rollback on failure.
   - Manifest last, then a completion marker.

   A run that finds an unmarked backup reports the interrupted apply instead of
   planning over it.
9. **Preview is the default.** Writing requires `--apply`.

## Alternatives considered

| Option | Why not |
|---|---|
| Three-way merge with stored base content | Needs a per-file base store, roughly doubling the manifest footprint, plus merge machinery and conflict markers inside governance Markdown. The hash-plus-`.ais-new` approach gives the same safety with no store. Can be added later behind the same classifier |
| Apply upstream diffs as git patches | Requires the template history of every installed version on the adopter's machine (network or bundled history), and fails on any local edit near a hunk |
| Replace everything after a backup | Fast, but it destroys edits by default and makes the backup the adopter's merge tool. Violates OBJ-02 |
| Treat `settings.json` as user-data and print a delta | Leaves the Corrective phase's security fix and hook removals to manual pasting by every adopter. Item 79a's adoption gap would recur on every release |
| Add every scaffold entry missing locally to `settings.json` (no base) | Re-adds rules and hooks the adopter deliberately removed, on every update, so a removed `allow` silently widens permissions again (review B5). The recorded base costs one small JSON object |
| Treat every path in `managedFiles` as managed | `create` records application files too (README, routes, migrations); update would replace or delete them (review B1) |
| Hash LF-normalised content only | No template is CRLF today (verified 2026-10-09), so this would work now. But the shipped `.gitattributes` declares `*.ps1`/`*.bat`/`*.cmd` as CRLF, so the first such template would break pristine detection silently. Accepting either form costs one extra hash |

## Consequences

- **Positive:** fixes reach adopters with one command, and no adopter edit or
  user-data file can be lost by design. Corrective-phase deletions and hook
  removals have a defined, testable path.
- **Negative:** edited files accumulate `.ais-new` copies the adopter has to
  merge by hand. This is mitigated by the report and the `doctor` warning,
  and is the price of never overwriting.
- **Negative:** each release that retires `settings.json` entries must ship a
  migration file listing them. The maintainer has to remember this, so a
  release check should flag a removed hook script with no matching retirement.
- **Negative:** the manifest grows by `install.mode` and `settingsBase`, and a
  migration must infer both for existing installs. That is the price of not
  guessing.
- **Follow-up:** ADR-002's v0.7.x re-baselining requirement is met by the
  pre-0.8.6 all-conflict path: no hashes means nothing is replaced or removed.
- **Follow-up:** ADR-002's consequence "`ais update` must not mutate versions
  until file migration and re-baselining exist" is satisfied by this decision
  together with FR-25/FR-26 (migrations and manifest re-classification).
