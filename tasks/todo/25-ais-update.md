# 25 — Safe `ais update`

## Status

**Stage 3: design revision in progress (2026-10-12).** The independent
architecture review returned **REVISE** (5 BLOCK, 9 WARN, 7 NIT), see
`docs/architecture/review-25-ais-update.md`. The two findings that needed a
spec change were **approved by the maintainer on 2026-10-12**:
- **B1:** a path matching no ownership rule is never touched;
- **B5:** the `settings.json` merge is base-aware.

Next: BRD v1.2, then the HLD and ADR-007 revised for every finding, then a
re-estimate and an architect re-review. Implementation follows in the
estimate's slices.

**Release:** 0.16.0 ships once this item is complete and tested (maintainer,
2026-10-12). It will also carry items 60 and 66, which are already on `dev`.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/25-ais-update-analysis.md` | **Decided:** D-Q1…D-Q5 |
| 1 — Spike | `docs/brd/25-render-roundtrip-spike.md` | **Passed:** 994 files, 0 mismatches after fix F1 (`create` projects only; `init` not covered, see review B2) |
| 1 — BRD | `docs/brd/25-ais-update-brd.md` | **Approved v1.1**; v1.2 amendments for B1 and B5 approved, being written |
| 2 — Estimate | `docs/estimates/25-ais-update-estimate.md` | **Draft:** 20.2 d PERT, not signed off; re-estimate due (review W9: +2.5 to 3.5 d) |
| 3 — HLD | `docs/architecture/hld-25-ais-update.md` | **Draft:** revision required |
| 3 — ADR | `docs/architecture/adr/007-update-classification-and-apply-semantics.md` | **Proposed:** revision required |
| 3 — Review | `docs/architecture/review-25-ais-update.md` | **REVISE:** B1–B5, W1–W9, N1–N7 |

## Key facts carried forward

- Install-time sha256 hashes already exist (`manifest.js:111`, `copy.js:98`)
  and `doctor` already detects drift, so update is a classifier and an
  applier, not a new detection system.
- Hashes are recorded from **0.8.6** onward, verified against the published
  tarballs.
- The manifest records **every** file `create` writes, including application
  files (`README.md`, `routes/**`, `database/migrations/**`). That is why B1
  matters.
- `init` installs a different file set at different paths and does not record
  its mode (review B2).
- The Corrective phase (items 79–89) depends on this item supporting
  **deletion** of pristine managed files and a **base-aware `settings.json`
  merge**.
