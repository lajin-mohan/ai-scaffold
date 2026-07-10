# Business Rules

Invariants that must always hold. These are facts about the domain — not implementation details.

Claude and all AI tools must enforce these rules in every plan, spec, and code review.

---

## Core Domain Rules

> Replace with actual domain rules when filling in this template.

| ID | Rule | Enforcement Layer |
|---|---|---|
| BR-01 | {{Rule description}} | Database constraint + Service layer |
| BR-02 | | |
| BR-03 | | |

---

## Workflow Rules

Rules about state machines and valid transitions:

| Entity | Valid Transitions | Invalid Transitions |
|---|---|---|
| {{Entity}} | A → B, B → C | A → C directly |

---

## Permission Rules

| Action | Who Can | Who Cannot |
|---|---|---|
| | | |

---

## Data Rules

Rules about data integrity and consistency:

| Rule | Scope |
|---|---|
| `tenant_id` must be set on every record | All tables |
| Soft delete only — `deleted_at` timestamp | All business entities |
| All state changes logged to audit table | All entities with state |

---

## Integration Rules

Rules about how this system interacts with external systems:

| Integration | Rule |
|---|---|
| | |

---

## Exceptions and Overrides

Cases where a standard rule can be overridden, and who can do it:

| Rule | Can Be Overridden By | Process |
|---|---|---|
| | | |

---

*Add rules here as they are discovered or decided.*
*Every rule should reference the BRD section or ADR where it was decided.*
*Rules here override any general principle — they are specific to this domain.*
