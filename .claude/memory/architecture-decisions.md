# Architecture Decisions

Living record of significant architectural choices. Full ADRs live in `docs/architecture/adr/`.

---

## Active Decisions

| ID | Decision | Date | Status |
|---|---|---|---|
| | | | |

---

## Decision Log

### [ADR-001] {{Decision Title}}
- **Date:** YYYY-MM-DD
- **Status:** Accepted
- **Summary:** {{One sentence}}
- **Full ADR:** `docs/architecture/adr/001-{{slug}}.md`

---

## Deferred Decisions

Decisions that have been explicitly deferred and when to revisit:

| Decision | Deferred Until | Reason |
|---|---|---|
| | | |

---

## Standing Invariants

These are architectural truths for this project — not decisions to revisit:

- Domain logic lives in `packages/domain` and `packages/services` — never in routes
- `tenant_id` enforced at repository layer — all DB queries scoped
- Soft delete only — no hard deletes of business data
- Audit log for all state transitions — append-only, immutable
- No ORM in hot paths — direct SQL via repository pattern
- No business logic in the frontend

---

*Update this file when an ADR is accepted or superseded.*
*Link each decision to its full ADR in `docs/architecture/adr/`.*
