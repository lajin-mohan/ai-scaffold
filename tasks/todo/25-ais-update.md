# 25 — Safe `ais update`

## Status

**Stage 1 complete except the BRD (2026-10-09).** Decisions Q1–Q5 are taken,
and the render round-trip spike passed. Next: the BRD.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/25-ais-update-analysis.md` | **Decided:** D-Q1…D-Q5 |
| 1 — Spike | `docs/brd/25-render-roundtrip-spike.md` | **Passed:** 994 files, 0 mismatches after fix F1 |
| 1 — BRD | `docs/brd/25-ais-update-brd.md` | Not started |
| 2 — Estimate | `docs/estimates/25-ais-update-estimate.md` | Not started |

## Key facts carried forward

- Install-time sha256 hashes already exist (`manifest.js:111`, `copy.js:98`)
  and `doctor` already detects drift (`doctor.js:364-378`), so update is a
  classifier and an applier, not a new detection system.
- Hashes are recorded from **0.8.6** onward, verified against the published
  tarballs.
- User data (`.claude/memory/**`, `MEMORY.md`, `settings-overrides.json`,
  `tasks/lessons.md`) is currently recorded as managed. Ownership classes must
  land before any applier.
- The Corrective phase (items 79–89) depends on this item supporting
  **deletion** of pristine managed files and a **structured `settings.json`
  merge**.
