# Effort Estimate — Safe `ais update` (backlog item 25)

**Date:** 2026-10-09
**Estimated By:** Claude (Code session)
**Reviewed By:** — **pending maintainer sign-off.** No implementation begins
without it.
**Confidence:** **MEDIUM–HIGH.** The detection mechanism exists and the spike
proved the render round-trip (994 files, 0 mismatches). The uncertainty is in
the applier's failure paths and the `settings.json` merge, not in feasibility.
**Source spec:** `docs/brd/25-ais-update-brd.md` (Approved v1.0, 2026-10-09)

> **Template adaptation.** Like item 26's and item 65's estimates, the web-feature
> rows (migrations, repository layer, deploy) are replaced with the real work
> items. Totals are **computed by script**, not hand-summed.

## Scope

**Included:** every Must Have and Should Have in BRD §5 (FR-01 to FR-33),
acceptance criteria AC-01 to AC-10, and Stage 3 (HLD + ADR + revisions after
the independent architecture review).

**Excluded:**
- three-way merge of edited Markdown, interactive per-file choice, and
  `--restore` (BRD §9 Q-03 follow-up);
- item 34's shared-base implementation: only the shared ownership contract is
  designed here;
- the Corrective phase's own changes: this item provides the mechanism they
  ship through.

## Estimate (days)

| Work item | O | R | P | PERT |
|---|---|---|---|---|
| Stage 3: HLD + ADR + architecture-review revisions | 1 | 2 | 3.5 | 2.08 |
| Ownership rule table + classifier, LF-normalised hashing (FR-06..11, FR-09) | 1 | 2 | 3 | 2.00 |
| Manifest fidelity fix F1 + render round-trip regression test, all profiles (FR-28, FR-29) | 0.5 | 1 | 2 | 1.08 |
| Plan builder: 7 actions, human report, `--json`, exit codes (FR-12..15) | 1.5 | 2.5 | 4 | 2.58 |
| Applier: backup, temp-and-rename, rollback, `.ais-new`, failure injection (FR-16..19) | 1.5 | 2.5 | 4.5 | 2.67 |
| `settings.json` structured merge + retired entries (FR-20..24) | 1 | 2 | 3.5 | 2.08 |
| Migration framework + first migration: classify existing manifests (FR-25..27) | 1 | 1.5 | 3 | 1.67 |
| Version policy, manifest refresh, doctor `.ais-new` warning (FR-01..04, FR-30, FR-31) | 0.5 | 1 | 1.5 | 1.00 |
| Git safety: dirty-tree refusal, never commit (FR-32, FR-33) | 0.5 | 0.75 | 1.5 | 0.83 |
| Acceptance suite: real 0.14.0 from npm, AC-01..10, packed-tarball gate, CRLF case | 2 | 3 | 5 | 3.17 |
| Docs: cli-reference, README, CHANGELOG, adopter upgrade notes | 0.5 | 1 | 1.5 | 1.00 |
| **Total** | **11** | **19.25** | **33** | **20.17** |

- PERT per row = (O + 4R + P) / 6.
- The standard deviation is the square root of the summed variances, ((P − O)/6)² per row: **1.18 days**.
- **85% confidence: about 21.4 days.**

## Phasing (each slice is a reviewable PR)

1. **Stage 3:** HLD + ADR, then the independent architecture review. Gate.
2. **Foundations:** the F1 fix and round-trip test, plus the ownership classifier.
   It ships nothing user-visible; it is safe to merge early.
3. **Preview:** the plan builder, report and `--json`. `ais update` becomes a
   useful read-only command.
4. **Apply:** backup, rollback, `.ais-new`, git safety, and the `settings.json`
   merge.
5. **Migrations + acceptance:** the first migration, the AC suite against
   0.14.0, and docs. Release.

Slices 2 and 3 can be released on their own (read-only value) before the
applier lands.

## Risks to the estimate (re-estimate triggers)

- The architecture review rejects the hash-pristine model or the
  `settings.json` merge design (+2 to 4 days).
- The 0.14.0 acceptance run exposes template differences that the classifier
  mislabels (adds classifier rules).
- Windows file locking (an editor holding a file open) breaks temp-and-rename,
  needing a retry strategy.
- Realistic effort moves by more than 20% at the end of slice 3.
