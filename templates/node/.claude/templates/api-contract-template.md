# API Contract — {{Resource / Feature Name}}

**Date:** {{DATE}}
**Author:** {{AUTHOR}}
**Status:** Draft / Reviewed / Approved
**Version:** v1
**Base Path:** `/api/v1/{{resource}}`

---

## Endpoints Summary

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/{{resource}}` | Required | `{{resource}}:list` | List all (paginated) |
| `POST` | `/{{resource}}` | Required | `{{resource}}:create` | Create new |
| `GET` | `/{{resource}}/:id` | Required | `{{resource}}:read` | Get by ID |
| `PUT` | `/{{resource}}/:id` | Required | `{{resource}}:update` | Full update |
| `PATCH` | `/{{resource}}/:id` | Required | `{{resource}}:update` | Partial update |
| `DELETE` | `/{{resource}}/:id` | Required | `{{resource}}:delete` | Soft delete |

---

## GET /{{resource}}

List all resources (paginated).

### Query Parameters
| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | 1 | Page number |
| `per_page` | integer | No | 20 | Items per page (max 100) |
| `sort` | string | No | `created_at` | Sort field |
| `dir` | `asc\|desc` | No | `desc` | Sort direction |
| `status` | string | No | — | Filter by status |

### Response 200
```json
{
  "data": [
    {
      "id": "uuid",
      "{{field}}": "{{value}}",
      "created_at": "2024-01-15T09:30:00.000Z",
      "updated_at": "2024-01-15T09:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  },
  "error": null
}
```

### Errors
| Code | Status | Trigger |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Lacks `{{resource}}:list` permission |

---

## POST /{{resource}}

Create a new resource.

### Idempotency

This endpoint supports idempotency. Clients must send a unique key per logical operation.

```
Idempotency-Key: <client-generated-uuid>
```

Same key within 24 hours returns the original response without re-processing. Key must be a UUID v4.

### Request Body
```json
{
  "{{field_1}}": "string — required — description",
  "{{field_2}}": "string — optional — description",
  "{{field_3}}": 0
}
```

### Validation Rules
| Field | Type | Required | Constraints |
|---|---|---|---|
| `{{field_1}}` | string | Yes | max 255 chars |
| `{{field_2}}` | string | No | max 1000 chars |

### Response 201
```json
{
  "data": {
    "id": "uuid",
    "{{field_1}}": "value",
    "status": "pending",
    "created_at": "2024-01-15T09:30:00.000Z"
  },
  "meta": null,
  "error": null
}
```

### Side Effects
- [ ] Audit log entry created
- [ ] Email notification sent to {{recipient}}
- [ ] Background job enqueued: `{{job_name}}`

### Errors
| Code | Status | Trigger |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Missing required field or invalid format |
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Lacks `{{resource}}:create` permission |
| `CONFLICT` | 409 | Duplicate — {{unique constraint description}} |

---

## GET /{{resource}}/:id

Get a single resource by ID.

### Path Parameters
| Param | Type | Description |
|---|---|---|
| `id` | UUID | Resource ID |

### Response 200
```json
{
  "data": {
    "id": "uuid",
    "{{field}}": "value",
    "created_at": "2024-01-15T09:30:00.000Z",
    "updated_at": "2024-01-15T09:30:00.000Z"
  },
  "meta": null,
  "error": null
}
```

### Errors
| Code | Status | Trigger |
|---|---|---|
| `UNAUTHORIZED` | 401 | |
| `NOT_FOUND` | 404 | ID doesn't exist or belongs to another tenant |

---

## PUT /{{resource}}/:id

Full replacement update. All fields required.

### Optimistic Locking

Include the `version` field from the GET response. Returns `409 CONFLICT` if the record was modified since the client last read it.

```json
{
  "version": 3,
  "{{field_1}}": "updated value"
}
```

*(Use same request/response shape as POST with updated fields + version)*

---

## PATCH /{{resource}}/:id

Partial update. Only provided fields are updated.

### Request Headers

```
Idempotency-Key: <client-generated-uuid>
```

### Request Body
All fields optional. At least one required.

```json
{
  "version": 3,
  "{{field_1}}": "new value"
}
```

---

## DELETE /{{resource}}/:id

Soft delete. Sets `deleted_at` timestamp. Data is retained.

### Response 204
No body.

### Errors
| Code | Status | Trigger |
|---|---|---|
| `NOT_FOUND` | 404 | ID doesn't exist |
| `CONFLICT` | 409 | {{any precondition — e.g., "has active children"}} |

---

## Rate Limiting

All endpoints return these headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

When exceeded: `429 RATE_LIMITED` with `Retry-After: <seconds>`.

| Endpoint | Limit |
|---|---|
| `GET /{{resource}}` | 100 req/min per user |
| `POST /{{resource}}` | 20 req/min per user |
| `PUT/PATCH /{{resource}}/:id` | 20 req/min per user |
| `DELETE /{{resource}}/:id` | 10 req/min per user |

---

## Audit Fields

Every resource response includes standard audit fields:

```json
{
  "id": "uuid",
  "version": 1,
  "created_at": "2024-01-15T09:30:00.000Z",
  "created_by": "user-uuid",
  "updated_at": "2024-01-15T09:30:00.000Z",
  "updated_by": "user-uuid",
  "deleted_at": null
}
```

| Field | Type | Description |
|---|---|---|
| `version` | integer | Incremented on every write. Used for optimistic locking. |
| `created_by` | UUID | User ID who created the record |
| `updated_by` | UUID | User ID who last modified the record |
| `deleted_at` | timestamp or null | Set on soft delete; null means active |

---

## Error Taxonomy

All errors follow the standard envelope. Machine-readable codes used in this contract:

| Code | HTTP Status | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Missing required field, wrong type, constraint violation |
| `UNAUTHORIZED` | 401 | Missing or expired session token |
| `FORBIDDEN` | 403 | Valid session but lacks required permission |
| `NOT_FOUND` | 404 | ID does not exist or belongs to another tenant |
| `CONFLICT` | 409 | Duplicate unique key, version mismatch (optimistic lock), invalid state transition |
| `UNPROCESSABLE` | 422 | Input is valid but violates a business rule |
| `RATE_LIMITED` | 429 | Request rate exceeded — see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Database Migrations

> **Multi-tenancy:** the `tenant_id` column and index below apply when `{{IS_MULTI_TENANT}} = true` in `CLAUDE.md`. For single-tenant projects, remove the `tenant_id` column, the `tenants(id)` reference, and the `idx_{{resource}}_tenant_id` index.

```sql
-- migrations/NNNN_create_{{resource}}.sql

CREATE TABLE {{resource}} (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),  -- multi-tenant only
  version     INTEGER NOT NULL DEFAULT 1,
  -- add columns here
  created_by  UUID NOT NULL REFERENCES users(id),
  updated_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_{{resource}}_tenant_id ON {{resource}}(tenant_id);  -- multi-tenant only
```

---

## Open Questions

| ID | Question | Owner | Status |
|---|---|---|---|
| Q-01 | | | Open |
