# 108 — Estimate records Engyne can compare with actuals

## Status

Proposed, P2, 2026-11-09. Part of item 106.

## Problem

The report treats estimation error (forecast versus actual) as central to
commercial predictability and pricing. `/ais-estimate` produces a three-point
estimate as prose and stops at sign-off. Engyne's hours-based comparison
needs Jira (Phase 2), but it can compare estimates with Git outcomes earlier,
if the estimate is recorded somewhere a machine can read.

## Scope

1. `/ais-estimate` also writes a small record alongside its document: work
   item ID, date, low / most-likely / high, unit, confidence, and assumptions
   by reference (no prose copied).
2. A revision appends a new record; it never overwrites the original, so the
   forecast history survives.
3. Optional actual field, filled at completion, with the main reason for any
   variance (scope change kept separate from estimating error).
4. Document the format in the item 106 contract.

## Done when

- The record format is documented and covered by tests, including a revision
  and a missing actual.
- Existing estimate documents keep working unchanged.
