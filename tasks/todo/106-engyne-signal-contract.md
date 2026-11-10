# 106 — Engyne signal contract: what every generated project emits

## Status

Proposed, P1, 2026-11-09. From the gap review of the Techversant research
report "AI and the Software Development Lifecycle" (9 November 2026) against
the scaffold and Engyne 1.0 (`D:\Apps\engyne1.0\docs\brd`). Parent of items
107 and 108.

## Problem

The report's main recommendation is to measure delivery outcomes before
claiming AI gains. Measuring belongs to Engyne, not the scaffold: Engyne joins
its collector, GitHub and the organizational CSV. But Engyne can only slice by
what each repository records consistently, and three signals it needs are not
recorded anywhere today:

- **Governance version.** Engyne cannot compare repositories with and without
  the scaffold, or between scaffold versions, so nobody can test whether the
  governance improves outcomes.
- **Type of work.** Engyne slices by engagement and contract type, not
  greenfield, maintenance or migration. The report's pilot design needs that
  split, because AI helps very differently by type of work.
- **Gate ran.** Engyne's verification rate infers whether tests or builds ran
  before a commit. The scaffold's pre-commit already runs them, but leaves no
  trace.

## Scope

1. Write `docs/integrations/engyne-signals.md`: each signal, where it lives in
   a generated project, its format, and the fact that Engyne treats it as a
   hint, never as the source of truth (Engyne's CSV import stays
   authoritative, CR-001 D-7).
2. The manifest already records the scaffold version (`version`) and
   `profile` (`src/cli/core/manifest.js`); document those fields as stable
   for Engyne to read.
3. Add an optional `workType` answer (`greenfield` / `maintenance` /
   `migration` / `other`) at `ais create` / `ais init`, stored in the
   manifest. Unanswered means absent, never a default.
4. Decide whether the pre-commit gate records that it ran, and how (no file
   contents, no paths; a commit trailer or a local count). Settle with
   Engyne's FR for verification rate before building.
5. Raise matching Engyne items: governance version and work type as
   dimensions; lead time, PR cycle time, review latency and PR size as
   Phase 1 outputs; a deployment and incident source as a named gap.

## Out of scope

- Any measurement, dashboard or aggregation in the scaffold.
- Sending anything off the machine. The scaffold only writes files in the
  repository; Engyne's collector and GitHub integration read them.

## Done when

- The contract document ships in the repository (not in generated projects).
- `workType` round-trips through create, init and update, with tests,
  including the absent case.
- Engyne's backlog has the matching items, with links.
