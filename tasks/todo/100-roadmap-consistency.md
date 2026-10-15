# 100 — Roadmap and artifact consistency validation

## Status

Proposed, P1, 2026-10-13. Reuses item 73's minimal metadata before item 72's
state engine. No prose parser or separate project-management subsystem.

## Problem

The roadmap summary, item 25 and item 94 disagreed on release order; item 85's
opening status lagged its implementation. Historic forecasts and closed work
were mixed into the active plan. The 2026-10-13 review fixes immediate routing;
this item prevents recurrence with deterministic, limited checks.

## Scope and acceptance

- [ ] Define stable ID, tier, status, dependencies, planned release and closure
  evidence fields through item 73; optional fields may be explicitly unknown.
- [ ] One authoritative active index; details reference it rather than restating
  order/status. Keep shipped record in CHANGELOG and completed tickets in done.
- [ ] Check duplicate IDs, nonexistent active-ticket links, invalid statuses,
  dangling/cyclic dependencies and incompatible release assignments.
- [ ] Distinguish implemented, merged, packaged, published and verified; no
  registry access/failure must not be inferred as publication or non-publication.
- [ ] Closure requires evidence identifying version/commit and relevant checks;
  local success cannot silently stand in for distribution verification.
- [ ] Same structured inputs produce the same results; failures name artifact,
  field and remedy. Use bad/valid fixtures, not AI-generated health judgements.
- [ ] Historical sections are explicitly non-authoritative. No requirement to
  parse or mechanically validate every sentence of old decision history.
- [ ] CI/read-only report validates metadata/links locally; optional registry
  verification is explicit and reports unavailable separately.

## Exit

Minimal consistency check runs in normal documentation/release validation and
finds the recorded drift classes without false blocking of unknown/proposed work.
