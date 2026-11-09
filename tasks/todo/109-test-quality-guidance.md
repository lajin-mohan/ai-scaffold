# 109 — Test quality beyond coverage

## Status

Proposed, P2, 2026-11-09. From the research report gap review. Not covered by
Engyne: its verification rate shows whether tests ran, not whether they catch
faults.

## Problem

`testing-rules.md` sets coverage targets (90% domain, 80% services, and so
on). The report, citing mutation-testing studies, says coverage alone does not
show that generated tests detect faults, and AI makes high-coverage, low-value
tests cheap to produce.

## Scope

1. Reword coverage as a minimum, not evidence of quality.
2. For critical logic (auth, money, tenant isolation, data loss), ask for a
   fault-detection check: mutation testing where the stack has a maintained
   tool, otherwise a named risk-based test for each failure mode.
3. Record per-stack tool suggestions in the stack overlays only (Stryker for
   Node, mutmut for Python, and so on), verified against current releases at
   implementation time.
4. Keep it out of always-loaded context. `testing-rules.md` is already
   path-scoped to test files (0.19, #175); put the guidance there, not in
   `AGENTS.md` or an unscoped rule.

## Done when

- The guidance ships in all five profiles, with stack specifics only in the
  stack overlays.
- `check-governance` passes and the startup budget is unchanged.
