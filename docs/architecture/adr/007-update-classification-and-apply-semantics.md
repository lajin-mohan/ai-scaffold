# ADR-007: Update classification and apply semantics

**Date:** 2026-10-09
**Status:** **Proposed.** Pending independent architecture review and
maintainer acceptance.
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
   - *Generated project context* becomes **user-data**: never read or written by
     update.
   - **seeded** starter files are written only when absent.
   - *Optional pack* and *protected application* are unchanged; packs are
     item 90.
2. **A file is pristine if, and only if, its current content matches the
   recorded hash, raw or LF-normalised.** That stays compatible with every
   existing manifest and is immune to CRLF checkouts.
3. **An edited file is never overwritten.** The new version is written to
   `<file>.ais-new`. There is no override flag.
4. **Removal is explicit and pristine-only.** A file absent from the new
   version's plan is deleted only if pristine; otherwise it is kept and
   reported.
5. **`settings.json` is merged by ownership, not replaced.**
   - Scaffold `deny`/`ask`/`allow` entries are added.
   - Adopter entries are kept.
   - Scaffold hook entries are matched by script path.
   - Only entries a **version-keyed migration** declares retired are removed.
6. **Apply is transactional.** Back up, temp-and-rename, roll back everything
   on the first failure, and write the manifest last.
7. **Preview is the default.** Writing requires `--apply`.

## Alternatives considered

| Option | Why not |
|---|---|
| Three-way merge with stored base content | Needs a per-file base store, roughly doubling the manifest footprint, plus merge machinery and conflict markers inside governance Markdown. The hash-plus-`.ais-new` approach gives the same safety with no store. Can be added later behind the same classifier |
| Apply upstream diffs as git patches | Requires the template history of every installed version on the adopter's machine (network or bundled history), and fails on any local edit near a hunk |
| Replace everything after a backup | Fast, but it destroys edits by default and makes the backup the adopter's merge tool. Violates OBJ-02 |
| Treat `settings.json` as user-data and print a delta | Leaves the Corrective phase's security fix and hook removals to manual pasting by every adopter. Item 79a's adoption gap would recur on every release |
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
- **Follow-up:** ADR-002's consequence "`ais update` must not mutate versions
  until file migration and re-baselining exist" is satisfied by this decision
  together with FR-25/FR-26 (migrations and manifest re-classification).
