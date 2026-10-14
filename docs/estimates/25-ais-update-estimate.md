# Effort Estimate — Safe `ais update` (backlog item 25)

**Date:** 2026-10-09 · **Re-cut:** 2026-10-12 for design v2
**Estimated By:** Claude (Code session)
**Reviewed By:** — **pending maintainer sign-off.** No implementation begins
without it.
**Confidence:** **MEDIUM–HIGH.** Detection exists and the spike proved the
render round-trip for `create` projects. The remaining uncertainty is the
applier's failure paths, the base-aware `settings.json` merge, and the `init`
round-trip, which the spike did not cover.
**Source spec:** `docs/brd/25-ais-update-brd.md` v1.2 · **Design:**
`docs/architecture/hld-25-ais-update.md` v2, ADR-007 revision 2

> **Why re-cut.** The round-1 review (REVISE) added B1–B5 and W1–W9, which
> its W9 priced at +2.5 to 3.5 d. Round 2 added #1 (disk-independent
> planning for `init`) at +0.25 to 0.5 d. This re-cut lands at **+3.25 d
> PERT (+16.1%)**, under the 20% re-estimate trigger. Totals are **computed by
> script**, not hand-summed.

## Scope

**Included:** every Must Have and Should Have in BRD v1.2 §5 (FR-01 to FR-38),
NFR-01 to NFR-06, AC-01 to AC-16, and finishing Stage 3 (the re-review
revisions).

**Excluded:**
- three-way merge of edited Markdown, interactive resolution and `--restore`;
- the pack class (item 90);
- item 34's shared-base implementation;
- the Corrective phase's own changes (this item ships the mechanism they use).

## Estimate (days)

| Work item | O | R | P | PERT |
|---|---|---|---|---|
| Stage 3: HLD v2 + ADR-007 rev 2 + re-review revisions | 0.5 | 1 | 2 | 1.08 |
| Ownership rule table + classifier incl. unowned/excluded, LF-or-raw pristine, `buildFilePlan` `ignoreDisk` + init protected paths (FR-06..11, FR-09, B1, r2#1) | 1.25 | 2.25 | 3.5 | 2.29 |
| Manifest fidelity (F1 read-side) + round-trip test, all profiles × create/init (FR-28, FR-29, B2) | 1 | 1.75 | 3 | 1.83 |
| Install mode: record on create/init, infer in migration, plan with it (FR-26, FR-37, B2) | 0.5 | 1 | 2 | 1.08 |
| Plan builder: §4 table incl. recorded-after column, report, `--json`, exit codes (FR-12..15, B3, W1) | 1.5 | 2.5 | 4 | 2.58 |
| Applier: pre-flight, backup, persisted journal, temp-rename, rollback, `.ais-new`, interrupted detection (FR-16..19, FR-38, B4, W7) | 2 | 3 | 5 | 3.17 |
| `settings.json` merge with `settingsBase`, hook keying, suggestions (FR-20..24, FR-34..36, B5) | 1.5 | 2.5 | 4.5 | 2.67 |
| Migration framework + first migration: classes, install mode, defaults, base (FR-25..27, W3) | 1 | 1.75 | 3 | 1.83 |
| Version policy (`--force` removal), manifest refresh, doctor `.ais-new` + `hashing.js` (FR-01..04, FR-30, FR-31, W6) | 0.5 | 1 | 1.5 | 1.00 |
| Git safety + path containment (FR-32, FR-33, NFR-06, W4, W5) | 0.75 | 1.25 | 2 | 1.29 |
| Acceptance suite: 0.14.0 from npm, AC-01..16, `init` fixtures, Windows CI (real CRLF) | 2 | 3.5 | 5.5 | 3.58 |
| Docs: cli-reference, README, CHANGELOG, adopter upgrade notes | 0.5 | 1 | 1.5 | 1.00 |
| **Total** | **13** | **22.5** | **37.5** | **23.42** |

- PERT per row = (O + 4R + P) / 6.
- SD = √Σ((P − O)/6)² = **1.27 d**.
- **85% confidence: about 24.7 days.**
- v1 for comparison: 20.17 PERT, about 21.4 at 85%.

## Phasing (each slice is a reviewable PR, in the planned loop: plan → architect review → build → test → PR)

1. **Stage 3 close-out:** the architect re-review of HLD v2, then maintainer
   approval. Gate.
2. **Foundations (read-only, safe to merge early):** `ownership.js`,
   `hashing.js`, `manifest-values.js` (F1), the round-trip test for
   create/init, and `install.mode` recording.
3. **Preview:** migrations (intents only), `update-plan.js`, the
   `settings-merge.js` preview, the report and `--json`. `ais update` becomes
   a useful read-only command and could ship on its own.
4. **Apply:** `update-apply.js` (journal, rollback, `.ais-new`), `git-state.js`,
   containment.
5. **Acceptance and docs:** AC-01 to AC-16 against 0.14.0 from npm, on Ubuntu
   and Windows. Release as **0.17.0**.

## Re-estimate triggers

- The re-review rejects the §4 table or the §5 merge (+2 to 4 d).
- The `init` round-trip (B2) shows mismatches the spike never saw (adds
  manifest fields).
- Windows file locking defeats graceful-fs retries.
- Realistic effort moves by more than 20% at the end of slice 3.
