# Low-Level Design (LLD) Template

The LLD translates the approved HLD into implementation-ready module specifications. Produced during Stage 3 (Architecture) after the HLD and API contracts are approved. Store in `docs/architecture/lld-{{feature}}.md`.

The `architect` agent produces LLDs. The Tech Lead reviews and approves before execution begins.

---

## How to Use

1. HLD and API contract must be approved before starting an LLD
2. Use the `architect` agent to draft the LLD from the spec and HLD
3. Tech Lead reviews and approves
4. Development team references the LLD during execution — it is the implementation contract

---

```markdown
# Low-Level Design — {{FEATURE NAME}}

**Feature:** {{Feature name}}
**Version:** 1.0
**Author:** {{Architect / Tech Lead}}
**Date:** {{DATE}}
**Status:** DRAFT / IN REVIEW / APPROVED
**Related HLD:** `docs/architecture/hld-{{feature}}.md`
**Related API Contract:** `docs/api/{{feature}}-api-contract.md`

---

## 1. Overview

{{2–3 sentences. What does this feature do at the implementation level?
What is the scope of this LLD — which modules / services does it cover?}}

---

## 2. Module Breakdown

| Module | Responsibility | Layer | File Path (estimated) |
|---|---|---|---|
| | | Route / Service / Repository / Domain | |

---

## 3. Data Model

### New Tables / Collections
```sql
CREATE TABLE {{table_name}} (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  -- fields
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_{{table}}_tenant ON {{table_name}}(tenant_id);
```

### Modified Tables
| Table | Change | Reason |
|---|---|---|
| | | |

### Migrations Required
| Migration File | Type | Reversible? |
|---|---|---|
| `{{timestamp}}_{{description}}.sql` | ADD / MODIFY / DROP | YES / NO |

---

## 4. Module Specifications

### {{Module Name}} — {{Layer}}

**Responsibility:** {{One sentence.}}

**Key Functions / Methods:**

```typescript
// Function signature with types — no implementation detail needed here
function {{functionName}}(
  {{param}}: {{Type}},
): Promise<{{ReturnType}}>

// Example:
function createApplication(
  input: CreateApplicationInput,
  actorId: string,
  tenantId: string,
): Promise<Application>
```

**Business Rules Enforced:**
- 
- 

**Error Cases:**
| Condition | Error Code | HTTP Status |
|---|---|---|
| | | |

**Side Effects (emails, jobs, audit logs):**
- 

---

### {{Module Name}} — {{Layer}}

**Responsibility:**

**Key Functions / Methods:**

```typescript

```

**Business Rules Enforced:**
-

**Error Cases:**
| Condition | Error Code | HTTP Status |
|---|---|---|
| | | |

---

## 5. Sequence Diagrams

### {{Primary Flow Name}}

```
Client → Route Handler → Service → Repository → Database
  │           │               │          │
  │  POST /x  │               │          │
  │──────────>│               │          │
  │           │ validate()    │          │
  │           │───────────────│          │
  │           │               │ create() │
  │           │               │─────────>│
  │           │               │  row     │
  │           │               │<─────────│
  │           │  201 Created  │          │
  │<──────────│               │          │
```

### {{Error / Edge Case Flow Name}}

```
Client → Route Handler → Service
  │           │               │
  │           │               │ Rule violated
  │           │  422 Error    │
  │<──────────│               │
```

---

## 6. Key Queries

```sql
-- {{Query purpose}}
SELECT
  {{columns}}
FROM {{table}}
WHERE tenant_id = $1
  AND {{condition}} = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

---

## 7. Background Jobs

| Job | Trigger | Queue | Retry Policy | Failure Handling |
|---|---|---|---|---|
| | Cron / Event | | | |

---

## 8. External API Calls

| Service | Endpoint | Trigger | Failure Handling | Timeout |
|---|---|---|---|---|
| | | | | |

---

## 9. Caching Strategy

| Data | Cache Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| | | | |

---

## 10. Security Considerations

- [ ] All queries scope by `tenant_id`
- [ ] Authorization checked before any data access
- [ ] Input validated at route handler
- [ ] Audit log entries created for state changes
- [ ] No PII in logs or error messages

---

## 11. Performance Considerations

- [ ] No N+1 queries — batch or join where needed
- [ ] Indexes cover all filter and sort columns
- [ ] Pagination enforced on all list queries
- [ ] No unbounded queries

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | | | |

---

## 13. Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Architect | | APPROVED / CHANGES REQUESTED | |
| Tech Lead | | APPROVED / CHANGES REQUESTED | |
```
