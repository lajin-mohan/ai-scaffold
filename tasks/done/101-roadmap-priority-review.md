# 101 — Research-based roadmap priority review

## Status

Documentation update completed locally, 2026-10-13. No implementation of
proposed P0/P1/P2 features, commit, push or release performed by this task.

## Request and result

The maintainer requested correct TODO ordering, missing work, required
validations and projected ratings. The roadmap now has one authoritative
16-row P0/P1/P2/P3 table, dependency-aware waves and closure evidence. Historical
scope/decision sections retain their ticket IDs but no longer govern scheduling.
Old release-branch/promotion-PR instructions were replaced with the actual
Release Action flow. Tickets 25, 79 and 85 have reconciled planning/status notes.
New proposed tickets: 97 adversarial controls, 98 cross-tool conformance,
99 representative evaluations and 100 roadmap consistency.

Forecasts are cumulative and conditional: current 6.5; P0 central 7.8;
P0+P1 central 8.5; value-validated P2 central 8.9; P3 has no automatic increase.
P0/P1 evidence, not integration count, governs v1.0 readiness.

## Verification

- Lint passed; typecheck passed with child-process execution permitted
  (37 JS files and four gitleaks configs).
- npm test attempted; runner could not start on local Node 21.2 because
  node:util.styleText is unavailable. Full suite not verified by this task.
- Roadmap structure: 16 sequential priority rows, valid table columns and all
  four new local ticket references; each ticket has status and acceptance checks.
- git diff --check passed. Read the resulting priority/dependency/release text.
- Shared checkout advanced to e49847a/v0.16.1 during work; npm version and
  integrity confirmed. No per-feature tarball/provenance claim made.

Existing known-issues changes, worktrees and workshop files were preserved.

## A + E follow-up — maintainer evidence, 2026-10-13

- Item 25 is the top remaining P0 and targets 0.17.0; four decisions in PR #149
  remain pending. This documentation task does not choose them.
- Item 94 installed-package decoy verification and green Ubuntu/Windows CI are
  maintainer-provided evidence, distinct from this review's local test limitation.
- Twenty-one completed roadmap entries and the shipped summary were preserved
  in docs/process/roadmap-completed-history-2026-10-13.md. Completed tickets
  85 and 94 moved to tasks/done; item 86 retains only domain-control work.
- Acceptance extensions link 67 to 98, 81/87 to 97 and 74B to 99.
- Reference standards stay cited docs/ADRs, outside always-loaded rules.
- Optional B/0.16.2 is a proposal only; C/D are planned rules changes. Existing
  projects require item 25 or explicit manual remediation for hook removals.
