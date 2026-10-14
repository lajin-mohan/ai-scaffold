# 25 — Safe `ais update`

## Status

**Stage 3: design v2 written, awaiting the architect re-review (2026-10-12).**
- The independent review returned **REVISE** (5 BLOCK, 9 WARN, 7 NIT):
  `docs/architecture/review-25-ais-update.md`. It was recovered after a squash
  merge lost it (see the `tasks/lessons.md` entry of 2026-10-12).
- The maintainer **approved B1 and B5 on 2026-10-12**.
- BRD v1.2, HLD v2, ADR-007 revision 2 and the re-cut estimate address every
  finding. The *(C)* clarifications in BRD v1.2 and one HLD §5 choice (FR-20
  restores missing `deny`/`ask` rules) are flagged for maintainer
  re-confirmation.

**Release plan:** 0.16.0 shipped item 94 (security), item 60 and item 66 first,
by maintainer decision (a) on 2026-10-12. Item 25 now targets **0.17.0**.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/25-ais-update-analysis.md` | **Decided:** D-Q1…D-Q5 |
| 1 — Spike | `docs/brd/25-render-roundtrip-spike.md` | **Passed** for `create` (994 files, 0 mismatches after F1); `init` not covered (B2) |
| 1 — BRD | `docs/brd/25-ais-update-brd.md` | **v1.2:** B1/B5 approved; *(C)* clarifications pending re-confirmation. FR-01–FR-38, AC-01–AC-16 |
| 2 — Estimate | `docs/estimates/25-ais-update-estimate.md` | **Re-cut:** 23.42 d PERT (O 13 / R 22.5 / P 37.5), P85 ≈ 24.7 d; +16.1% on v1; awaiting sign-off |
| 3 — HLD | `docs/architecture/hld-25-ais-update.md` | **Draft v2.1:** round-2 re-review APPROVE WITH CHANGES, all applied |
| 3 — ADR | `docs/architecture/adr/007-update-classification-and-apply-semantics.md` | **Proposed, revision 2** |
| 3 — Review | `docs/architecture/review-25-ais-update.md` | Round 1 **REVISE**; round 2 **APPROVE WITH CHANGES** (applied) |

## Key facts carried forward

- Install-time sha256 hashes exist (`manifest.js:111`, `copy.js:98`) from
  **0.8.6** onward, and `doctor` detects drift, so update is a classifier
  and an applier.
- `create` records **every** file it writes, including application files
  (`README.md`, `routes/**`, migrations). Update owns only the managed set
  (B1).
- `init` plans with `existingTarget: true` (`init.js:126`), a different file
  set; the install mode must be recorded and honoured (B2).
- `git` must be spawned through `exec-path.js` (item 94); `doctor` already
  does so.
- The Corrective phase (79–89) ships through this item's deletion path and its
  base-aware merge.
