# Effort Estimate — {{Feature / Epic Name}}

**Date:** {{DATE}}
**Estimated By:** {{AUTHOR}}
**Reviewed By:** {{REVIEWER}}
**Confidence:** HIGH / MEDIUM / LOW
**Status:** Draft / Reviewed / Accepted

---

## Scope Summary

**What's included:**
{{2-3 sentences on what this estimate covers.}}

**What's excluded:**
- {{Item 1}}
- {{Item 2}}

---

## Assumptions

Every assumption that affects the estimate. If an assumption proves wrong, the estimate must be revised.

1. {{e.g., PostgreSQL schema already exists — no data model design required}}
2. {{e.g., Auth/session infrastructure already in place}}
3. {{e.g., No third-party API integration required}}
4. {{e.g., Design system components available — no new component design}}

---

## Task Breakdown

Estimates in **business days** (1 day = 7.5 productive hours).

| Task | Optimistic | Realistic | Pessimistic | Risk Notes |
|---|---|---|---|---|
| **Analysis & Requirements** | | | | |
| Requirements clarification | 0.25 | 0.5 | 1.0 | |
| API contract / spec writing | 0.5 | 1.0 | 2.0 | |
| UX spec (if applicable) | 0.5 | 1.0 | 2.0 | |
| **Backend Implementation** | | | | |
| Database migrations | | | | |
| Repository layer | | | | |
| Service / business logic | | | | |
| Route handlers | | | | |
| Input validation | | | | |
| **Frontend Implementation** | | | | |
| Page / view components | | | | |
| Form components | | | | |
| API integration | | | | |
| **Testing** | | | | |
| Unit tests | | | | |
| Integration tests | | | | |
| Manual QA on staging | | | | |
| **Review & QA** | | | | |
| AI review + fixes | 0.25 | 0.5 | 1.0 | |
| Human code review | 0.25 | 0.5 | 0.5 | |
| QA sign-off | 0.25 | 0.5 | 1.0 | |
| **Deployment** | | | | |
| Staging deploy + smoke test | 0.25 | 0.25 | 0.5 | |
| Production deploy + smoke test | 0.25 | 0.25 | 0.5 | |
| **Buffer (15%)** | | | | |
| **TOTAL** | **{{O}}** | **{{R}}** | **{{P}}** | |

---

## Risk Register

| Risk | Likelihood | Impact | Multiplier Applied | Mitigation |
|---|---|---|---|---|
| Unclear requirements | | | | |
| New technology | | | | |
| Third-party dependency | | | | |
| Complex migrations | | | | |
| Performance requirements | | | | |

---

## Phasing Recommendation

{{
Should this be split into phases? 
Phase 1: MVP (core CRUD + basic workflow) — X days
Phase 2: Advanced features (bulk actions, exports, integrations) — Y days
}}

---

## Summary

| Scenario | Total | Calendar Days (÷0.7 capacity) |
|---|---|---|
| Optimistic | {{O}} days | {{O/0.7}} days |
| Realistic | {{R}} days | {{R/0.7}} days |
| Pessimistic | {{P}} days | {{P/0.7}} days |

**Recommended commitment:** {{Realistic}} days
**Recommended sprint allocation:** {{Realistic/0.7}} calendar days

---

## Spike Required?

{{Yes / No — if yes, what question does it answer and how long?}}

---

## Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| Technical Lead | | | Pending |
| Product Owner | | | Pending |
