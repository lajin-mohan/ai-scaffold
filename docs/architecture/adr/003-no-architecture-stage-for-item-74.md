# ADR-003: No architecture stage for the item 74 effectiveness baseline

**Date:** 2026-08-27
**Status:** Accepted
**Deciders:** Lajin M J (Technical Lead)
**Consulted:** `docs/process/task-size-policy.md`, `docs/brd/74-scaffold-effectiveness-baseline-brd.md` (Approved v2.0), `docs/estimates/74-scaffold-effectiveness-baseline-estimate.md` (signed off)

---

## Context

`docs/process/task-size-policy.md` requires an HLD and an ADR for every **M**-sized task. Item 74 is
sized M — 13.0 realistic days across two phases — so the gate applies by the letter of the policy.

The deliverable is:

1. `docs/process/effectiveness-metrics.md` — a definitions document
2. A dated snapshot document, produced by hand in Phase A
3. `src/cli/core/effectiveness-report.js` + `scripts/effectiveness-report.js` in Phase B, which copy
   the structure of the existing, unit-tested `token-report` pair
4. A markdown self-report template

There is no new runtime, no data model, no API surface, no integration, no migration, no persistence
and no dependency. Phase B's module sits beside an existing module of the same shape and is invoked
the same way. NFR-04 forbids adding a runtime dependency.

The gate exists to force a design conversation before code locks in a structure that is expensive to
change. Here the structure is already chosen — by precedent, before this item started.

The competing pressure is real and documented in this repo: item 66 records that prose-level rules
are not enforcement, and the 2026-08-12 release incident records what happens when practice and
documentation diverge. Skipping a gate quietly is the failure mode; skipping it with a recorded
reason is a decision.

---

## Decision

**Item 74 does not produce an HLD. This ADR is the Stage 3 artifact.** The architecture stage is
recorded as satisfied-by-exception, on the grounds that the implementation structure is fixed by an
existing precedent (`token-report`) and there is no design space to explore.

The exception is scoped to item 74 only and does not amend `task-size-policy.md`.

---

## Rationale

An HLD for this item would state that a script reads git history and writes a markdown file plus a
JSON emit, in the same shape as the script next to it. That document would carry no decision —
every choice it might record has already been made by the precedent it copies.

Writing it anyway has a specific cost beyond the hours: it establishes that the M-gate can be
satisfied by content-free documents. Item 69 already measures this repository's governance surface
at 35 commands and 17 agents and flags it as unlearnable. A gate that is satisfiable with filler
trains the team to produce filler, which is worse for the scaffold's credibility than an explicit,
argued exception.

---

## Alternatives Considered

### Option A: Produce a full HLD
**Description:** Write `docs/architecture/hld-effectiveness-report.md` covering module boundaries,
data flow and extension points for a two-file script package.
**Why rejected:** Every section would restate the `token-report` structure. The document would
record no decision, and would set the precedent that the M-gate is satisfiable with restatement.

### Option B: Re-size item 74 to S to dodge the gate
**Description:** Declare the item S, which per the size matrix requires no architecture.
**Why rejected:** Dishonest. The item is 13 realistic days; S is not a defensible size. Sizing work
to fit the gate you want is a bypass — and notably one that **M-04 cannot count**: `FR-26` lists "a
lifecycle stage skipped" under explicitly-not-measured, because an absent artifact is ambiguous
between a fast lane and a skip. That it would go unmeasured is an argument against doing it, not
for. Re-sizing to avoid a control is worse than an argued exception to it.

### Option C: Record the exception in an ADR (chosen)
**Description:** Skip the HLD, and make the skip itself the Stage 3 artifact — with the reasoning,
the scope of the exception, and a review trigger.
**Why chosen:** The gate's purpose is that architectural choices are deliberate and visible. A
recorded, argued exception satisfies that purpose; a filler HLD does not. It also leaves a
searchable record for the next M-sized item that has no architecture.

---

## Consequences

### What Becomes Easier
- Item 74 proceeds to Stage 5 without producing a document that carries no decision.
- Future M-sized items with no design space have a precedent for how to handle the gate honestly.

### What Becomes Harder
- Every future invocation of this exception now has to argue against this ADR's reasoning, not just
  assert "no architecture needed."

### New Problems Introduced
- **This is a governance exception granted by the same person who requested it.** PM, Tech Lead and
  Product Owner are one person on this project. No independent challenge was available.
- The exception could be over-applied. The mitigation is the narrow scope above and the review
  trigger below — not good intentions.

### Trade-offs Accepted
- A small, real risk that a design issue surfaces during Phase B which an HLD would have caught.
  Judged low: Phase B copies a tested module of the same shape, and its determinism requirement
  (NFR-01, AC-01) is verified by test rather than by design review.

---

## Implementation Notes

- Phase B's module must follow the `src/cli/core/token-report.js` + `scripts/token-report.js` split.
  Deviating from that structure invalidates this ADR's rationale and reopens the gate.
- The JSON emit must have sorted keys and no wall-clock timestamp, or NFR-01's determinism
  requirement fails.

---

## Review Date

**Revisit if any of the following becomes true:**
- A third M-sized item claims this exception — at which point the pattern belongs in
  `task-size-policy.md` as a stated rule, not in per-item ADRs.
- Phase B deviates from the `token-report` structure.
- An independent reviewer joins the project, making self-granted exceptions avoidable.

---

## Related ADRs

- ADR-002: Managed File Ownership Contract
