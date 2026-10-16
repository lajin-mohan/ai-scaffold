# Effort Estimate — Safe `ais update` (backlog item 25)

**Date:** 2026-10-09 · **Re-cut:** 2026-10-12 for design v2 · **Revised:** 2026-10-15 for BRD v1.3 / HLD v2.2
**Estimated By:** Claude (Code session)
**Reviewed By:** — **pending maintainer sign-off.** No implementation begins
without it. The 2026-10-15 revision was authorised as documentation only; it
is a planning forecast, not a delivery commitment.
**Units:** ideal working days of focused engineering effort (one engineer,
AI-assisted), not calendar days. Review waits and release work are excluded.
**Confidence:** **MEDIUM–HIGH.** Detection exists and the spike proved the
render round-trip for `create` projects. The remaining uncertainty is the
applier's failure paths, the base-aware `settings.json` merge, and the `init`
round-trip, which the spike did not cover.
**Source spec:** `docs/brd/25-ais-update-brd.md` v1.3 · **Design:**
`docs/architecture/hld-25-ais-update.md` v2.2, ADR-007 revision 3

> **Why re-cut.** The round-1 review (REVISE) added B1–B5 and W1–W9, which
> its W9 priced at +2.5 to 3.5 d. Round 2 added #1 (disk-independent
> planning for `init`) at +0.25 to 0.5 d. This re-cut lands at **+3.25 d
> PERT (+16.1%)**, under the 20% re-estimate trigger. Totals are **computed by
> script**, not hand-summed.
>
> **2026-10-15 revision.** The round-3 reconciliation added verified recovery
> (FR-38), a single-writer lock and pre-write re-check (FR-40, FR-41),
> persisted per-rule exceptions (FR-39), hook-key ambiguity (FR-36) and
> AC-17 to AC-21: **26.79 d total PERT, +3.37 d (+14.4%) on the re-cut**,
> still under the 20% trigger. Spent and remaining effort are now separated.

## Scope

**Included:** every Must Have and Should Have in BRD v1.3 §5 (FR-01 to FR-41),
NFR-01 to NFR-06, AC-01 to AC-21, and finishing Stage 3 (the re-review
revisions and the round-3 reconciliation).

**Excluded:**
- three-way merge of edited Markdown, interactive resolution and `--restore`;
- the pack class (item 90);
- item 34's shared-base implementation;
- the Corrective phase's own changes (this item ships the mechanism they use).

## Estimate (days)

| Work item | O | R | P | PERT |
|---|---|---|---|---|
| *Spent:* Stage 3: HLD v2 + ADR-007 rev 2 + re-review revisions | 0.5 | 1 | 2 | 1.08 |
| *Spent:* Stage 3: round-3 reconciliation (BRD v1.3, HLD v2.2, ADR-007 rev 3) | 0.25 | 0.5 | 1 | 0.54 |
| Ownership rule table + classifier incl. unowned/excluded, LF-or-raw pristine, `buildFilePlan` `ignoreDisk` + init protected paths (FR-06..11, FR-09, B1, r2#1) | 1.25 | 2.25 | 3.5 | 2.29 |
| Manifest fidelity (F1 read-side) + round-trip test, all profiles × create/init (FR-28, FR-29, B2) | 1 | 1.75 | 3 | 1.83 |
| Install mode: record on create/init, infer in migration, plan with it (FR-26, FR-37, B2) | 0.5 | 1 | 2 | 1.08 |
| Plan builder: §4 table incl. recorded-after column, report, `--json`, exit codes (FR-12..15, B3, W1) | 1.5 | 2.5 | 4 | 2.58 |
| Applier: pre-flight, backup, persisted journal with expected final state, temp-rename, rollback, `.ais-new`, interrupted detection and verified completion (FR-16..19, FR-38, B4, W7) | 2.25 | 3.5 | 5.5 | 3.63 |
| Single-writer lock + pre-write re-check (FR-40, FR-41) | 0.5 | 1 | 2 | 1.08 |
| `settings.json` merge with `settingsBase`, hook keying incl. ambiguity, grouped report, suggestions (FR-20..24, FR-34..36, B5) | 1.5 | 2.5 | 4.5 | 2.67 |
| Per-rule exceptions: flags, manifest field, validation, report (FR-39) | 0.5 | 1 | 1.5 | 1.00 |
| Migration framework + first migration: classes, install mode, defaults, base (FR-25..27, W3) | 1 | 1.75 | 3 | 1.83 |
| Version policy (`--force` removal), manifest refresh, doctor `.ais-new` + `hashing.js` (FR-01..04, FR-30, FR-31, W6) | 0.5 | 1 | 1.5 | 1.00 |
| Git safety + path containment (FR-32, FR-33, NFR-06, W4, W5) | 0.75 | 1.25 | 2 | 1.29 |
| Acceptance suite: 0.14.0 from npm, AC-01..21, `init` fixtures, Windows CI (real CRLF) | 2.25 | 3.75 | 6 | 3.88 |
| Docs: cli-reference, README, CHANGELOG, adopter upgrade notes | 0.5 | 1 | 1.5 | 1.00 |
| **Total** | **14.75** | **25.75** | **43** | **26.79** |

| | PERT | 85%, independent rows | 85%, fully correlated rows |
|---|---|---|---|
| Total | 26.79 | 28.2 | 31.7 |
| Spent (Stage 3, estimated; actual effort was not recorded) | 1.63 | — | — |
| **Remaining** | **25.17** | **26.5** | **29.7** |

- PERT per row = (O + 4R + P) / 6.
- Independent: SD = √Σ((P − O)/6)²; remaining SD 1.31 d. Fully correlated:
  SD = Σ(P − O)/6; remaining 4.33 d. 85% = PERT + 1.04 SD.
- **The independent figure is optimistic.** Rendering, migrations, the
  settings merge, Windows behaviour and the acceptance suite share risks, so
  overruns will correlate. Plan against the **range 26.5 to 29.7 d
  remaining**. The estimate is not calibrated against past delivery; the
  slice 2 checkpoint is the first calibration point.
- History: v1 20.17 PERT (about 21.4 at 85%); re-cut 23.42 (24.7).

## Phasing (each slice is a reviewable PR, in the planned loop: plan → architect review → build → test → PR)

1. **Stage 3 close-out:** the architect re-review of HLD v2, then maintainer
   approval. Gate.
2. **Foundations (no mutation of existing installations):** `ownership.js`,
   `hashing.js`, `manifest-values.js` (F1), `buildFilePlan` `ignoreDisk`,
   the `render.js` extraction, the round-trip test for create/init on all
   five profiles, and `install.mode` recording. New manifests gain
   `install.mode`; nothing writes to an existing project.
   **Checkpoint:** compare actual effort with the four foundation rows
   (ownership, manifest fidelity, install mode, part of version policy for
   `hashing.js`); re-estimate the rest if they overrun by more than 20%.
3. **Preview:** migrations (intents only), `update-plan.js`, the
   `settings-merge.js` preview, the report and `--json`. `ais update` becomes
   a useful read-only command and could ship on its own.
4. **Apply:** `update-apply.js` (lock, journal with expected final state,
   verified recovery, pre-write re-check, rollback, `.ais-new`),
   `git-state.js`, containment, exceptions.
5. **Acceptance and docs:** AC-01 to AC-21 against 0.14.0 from npm, on Ubuntu
   and Windows. Release as **0.17.0** (release approval is separate).

## Re-estimate triggers

- The re-review rejects the §4 table or the §5 merge (+2 to 4 d).
- The `init` round-trip (B2) shows mismatches the spike never saw (adds
  manifest fields).
- Windows file locking defeats graceful-fs retries.
- The slice 2 foundation rows overrun by more than 20% (checkpoint above).
- Realistic effort moves by more than 20% at the end of slice 3.
