# Business Requirements Document
**Project:** {{PROJECT_NAME}}
**Feature:** {{FEATURE_NAME}}
**Version:** 1.0
**Date:** {{DATE}}
**Status:** Draft / In Review / Approved
**Author:** {{AUTHOR}}
**Approved By:** {{APPROVER}}

---

## 1. Executive Summary

{{2-3 sentences. What is being built, who it serves, and what business outcome it achieves.}}

---

## 2. Objectives

| ID | Objective | Success Metric |
|---|---|---|
| OBJ-01 | | |
| OBJ-02 | | |
| OBJ-03 | | |

---

## 3. Scope

### In Scope
| ID | Item |
|---|---|
| S-01 | |
| S-02 | |

### Out of Scope
| ID | Item | Reason |
|---|---|---|
| OS-01 | | |

---

## 4. User Roles & Permissions

| Role | Description | Permissions in this Feature |
|---|---|---|
| {{Role 1}} | | |
| {{Role 2}} | | |

---

## 5. Functional Requirements

### 5.1 {{Feature Area 1}}

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system SHALL | Must Have |
| FR-02 | The system SHALL | Should Have |
| FR-03 | The system MAY | Nice to Have |

> Requirement language: **SHALL** = mandatory · **SHOULD** = recommended · **MAY** = optional

### 5.2 {{Feature Area 2}}

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | | |

---

## 6. Business Rules

Rules that must always hold. These are invariants — not features that can be toggled.

| ID | Rule |
|---|---|
| BR-01 | |
| BR-02 | |
| BR-03 | |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | API response time < 500ms at p99 under normal load |
| NFR-02 | Security | All endpoints require authentication; tenant data isolated |
| NFR-03 | Availability | 99.9% uptime SLA |
| NFR-04 | Scalability | Must handle {{N}} concurrent users without degradation |
| NFR-05 | Accessibility | WCAG 2.1 AA for all UI components |

---

## 8. Acceptance Criteria

Acceptance criteria must be **testable** and **binary** (pass/fail — no "looks good" criteria).

| ID | Criterion | Test Scenario |
|---|---|---|
| AC-01 | Given [context], when [action], then [outcome] | |
| AC-02 | | |

---

## 9. Open Questions

Questions that must be resolved before development starts. Unresolved questions block spec approval.

| ID | Question | Owner | Due Date | Resolution |
|---|---|---|---|---|
| Q-01 | | | | |
| Q-02 | | | | |

---

## 10. Dependencies

| Dependency | Type | Status | Notes |
|---|---|---|---|
| | Internal / External / Third-party | | |

---

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | | High / Med / Low | High / Med / Low | |

---

## 12. Glossary

| Term | Definition |
|---|---|
| | |

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | {{DATE}} | {{AUTHOR}} | Initial draft |
