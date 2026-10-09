# 25 — Safe `ais update`

## Status

**Stage 1 (analysis) drafted 2026-10-09.** It is blocked on maintainer
decisions Q1–Q5 in the analysis; then the render round-trip spike runs, then
the BRD is written.

## Artifacts

| Stage | Artifact | State |
|---|---|---|
| 1 — Analysis | `docs/brd/25-ais-update-analysis.md` | **Draft:** Q1–Q5 open |
| 1 — Spike | render round-trip (0.5 d) | Not started; runs after Q1–Q5 |
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
