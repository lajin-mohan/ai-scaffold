# 111 — Maintenance and migration lane; acceptable-use pointer

## Status

Proposed, P2, 2026-11-09. From the research report gap review. Part 2 is
blocked on Techversant publishing its AI acceptable-use standard (owned by
leadership, Legal and the COE, not the scaffold).

## Problem

1. **Process weight.** Since 0.19 (#175) the full delivery workflow is
   opt-in, through the `project-delivery-workflow` skill. But `/ais-what-next`
   still evaluates the 10-stage path unless the work matches one of its fast
   lanes (bug fix, hotfix, UI micro-change, spike, internal tooling), and
   none of those fits maintenance or migration work. The report's loop has
   eight lighter steps, with human gates at scope, architecture, review/QA
   and release. Maintenance and migration work, much of Techversant's
   delivery, gets no lane of its own.
2. **Acceptable use.** The scaffold blocks secret files but says nothing
   about client-data rules, approved tools, or contract AI clauses. Engyne
   detects breaches of a policy, but the policy has to exist first.

## Scope

1. A maintenance and migration lane in `/ais-what-next`, alongside the
   existing fast lanes: scoped work packet, automated checks, human review
   and QA, release approval. Selected by the item 106 `workType`, or
   explicitly.
2. When the acceptable-use standard exists: one short, path-independent rule
   that points to it and states the three non-negotiables (no client data in
   unapproved tools, no secrets in prompts, a named human owns every shipped
   change). Point to it; do not restate it.

## Done when

- The lane is documented, selectable, and covered by `/ais-what-next` tests.
- The pointer rule ships once the standard is published, and the startup
  budget still passes.
