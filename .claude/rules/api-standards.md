# API Standards

Rules for designing and implementing HTTP APIs in this project.

---

## URL Design

- Base path: `/api/v{n}/` — current version: `v1`
- Resources are **plural nouns**: `/users`, `/applications`, `/documents`
- Nested only one level deep: `/users/:id/applications` — not `/users/:id/applications/:appId/stages`
- Actions that don't map to CRUD are allowed as sub-resources: `POST /applications/:id/submit`
- IDs in path params are **UUIDs only** — never auto-increment integers
- No verbs in resource URLs. Action sub-resources such as `/submit` are the only exception.

## HTTP Methods

| Method | Semantics | Idempotent? |
|---|---|---|
| `GET` | Read — never mutate | Yes |
| `POST` | Create or action | No |
| `PUT` | Full replace | Yes |
| `PATCH` | Partial update | Depends on endpoint design; use idempotency key for retryable writes |
| `DELETE` | Soft delete | Yes |

## Request Bodies

- JSON request bodies use `Content-Type: application/json`
- Field names use `snake_case`
- Invalid JSON returns `400 VALIDATION_FAILED`
- Unsupported `Content-Type` returns `415 UNSUPPORTED_MEDIA_TYPE`
- Unknown fields return `400 VALIDATION_FAILED` unless the endpoint explicitly documents otherwise
- Empty request bodies are allowed only when the endpoint documents no body

## Response Envelope

All JSON responses use this structure. `204 No Content` has no body.

```json
{
  "data": { ... } | null,
  "meta": { "page": 1, "per_page": 20, "total": 150 } | null,
  "error": null
}
```

Error response:
```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "fields": {
      "email": "Must be a valid email address",
      "name": "Required"
    }
  }
}
```

## Status Codes

| Code | Use Case |
|---|---|
| `200` | Successful read or update |
| `201` | Successful create |
| `202` | Async job accepted |
| `204` | Successful delete (no body) |
| `400` | Validation failure — bad input |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized |
| `404` | Resource not found (or hidden — tenant isolation) |
| `409` | Conflict — duplicate, stale version, or invalid state transition |
| `413` | Payload too large |
| `415` | Unsupported media type |
| `422` | Valid input but business rule violation |
| `429` | Rate limited |
| `500` | Unexpected server error |

## Error Codes (Machine-Readable)

```
VALIDATION_FAILED       — 400
UNAUTHORIZED            — 401
FORBIDDEN               — 403
NOT_FOUND               — 404
CONFLICT                — 409
PAYLOAD_TOO_LARGE       — 413
UNSUPPORTED_MEDIA_TYPE  — 415
UNPROCESSABLE           — 422
RATE_LIMITED            — 429
INTERNAL_ERROR          — 500
```

## List Endpoints — Required Behaviour

Every `GET` endpoint that returns a collection implements the following unless the endpoint explicitly documents why a rule does not apply.

### Pagination

No unbounded queries. Every list response is page-scoped.

```json
GET /api/v1/users?page=2&per_page=20

{
  "data": [ ... ],
  "meta": {
    "page": 2,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  },
  "error": null
}
```

| Parameter | Default | Maximum | Notes |
|---|---|---|---|
| `page` | `1` | - | 1-indexed |
| `per_page` | `20` | `100` | Requests above max are clamped, not rejected |

- `meta` is always returned on list responses — never `null`
- An empty result returns `data: []` and `meta.total: 0` — never a 404

### Sorting

Every list endpoint must accept `sort` and `dir` parameters.

```
GET /api/v1/users?sort=created_at&dir=desc
```

| Parameter | Default | Allowed values |
|---|---|---|
| `sort` | `created_at` | Endpoint-defined allowlist only |
| `dir` | `desc` | `asc`, `desc` |

- Each list endpoint documents its allowed sort fields
- Unsupported sort field returns `400 VALIDATION_FAILED`
- Sort must be applied before pagination

### Filtering

Every list endpoint must accept at minimum a `status` filter where the resource has a status field. Additional filters are added per resource.

```
GET /api/v1/users?status=active&created_at[gte]=2024-01-01
```

| Pattern | Example | Meaning |
|---|---|---|
| `field=value` | `status=active` | Exact match |
| `field[gte]=value` | `created_at[gte]=2024-01-01` | Greater than or equal |
| `field[lte]=value` | `created_at[lte]=2024-12-31` | Less than or equal |
| `field[like]=value` | `name[like]=john` | Case-insensitive partial match |

- Unknown filter keys return `400 VALIDATION_FAILED`
- Filter values are validated as part of input validation (type, format)

## Async Operations

Any operation expected to take longer than ~2 seconds should be handled asynchronously. Do not make the client wait on slow or unpredictable work.

**Applies to:** report generation, bulk exports, large file processing, batch imports, data migrations, email campaigns, anything involving third-party API calls with unpredictable latency.

### Pattern

1. Client submits the job — receives `202 Accepted` immediately with a `job_id`
2. Client polls the job status endpoint, or receives a signed webhook when done
3. On completion, client fetches the result via a provided URL or the job endpoint

### Step 1 — Submit

```
POST /api/v1/reports
{
  "type": "monthly_summary",
  "filters": { "month": "2024-01" }
}

202 Accepted
{
  "data": {
    "job_id": "uuid",
    "status": "queued",
    "poll_url": "/api/v1/jobs/uuid",
    "estimated_seconds": 30
  },
  "meta": null,
  "error": null
}
```

### Step 2 — Poll

```
GET /api/v1/jobs/:job_id

200 OK
{
  "data": {
    "job_id": "uuid",
    "status": "processing",   // queued | processing | complete | failed
    "progress_pct": 45,
    "created_at": "...",
    "updated_at": "..."
  },
  "meta": null,
  "error": null
}
```

### Step 3 — Fetch Result

```
GET /api/v1/jobs/:job_id  (when status = complete)

{
  "data": {
    "job_id": "uuid",
    "status": "complete",
    "result_url": "/api/v1/reports/uuid/download",
    "expires_at": "2024-01-15T10:30:00.000Z"
  },
  "meta": null,
  "error": null
}
```

### Job Status Values

| Status | Meaning |
|---|---|
| `queued` | Accepted, waiting for a worker |
| `processing` | Worker has picked it up |
| `complete` | Done — result available |
| `failed` | Permanent failure — see `error` field |

### Rules

- Never return a result inline on the initial POST — always `202` + `job_id`
- Job results expire after a defined TTL (default: 24 hours) — document per endpoint
- Failed jobs must include a machine-readable error code in the job record
- Jobs are scoped to `tenant_id` — users cannot poll another tenant's job
- Recommended polling interval: communicate via `Retry-After` header on the `202` response
- Webhooks must be signed, timestamped, and safe to retry
- For file uploads: accept the upload synchronously (the bytes), enqueue processing asynchronously

### Large File Uploads

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

202 Accepted
{
  "data": {
    "job_id": "uuid",
    "status": "queued",
    "poll_url": "/api/v1/jobs/uuid"
  },
  "meta": null,
  "error": null
}
```

- Validate file type and size limit synchronously before enqueuing
- Return `415` for unsupported file type and `413` for oversized file — do not enqueue
- Validate extension, MIME type, and file signature where possible
- Store uploads with generated names in private storage; never trust client filenames
- Do not expose uploaded files until validation and malware scanning pass
- Processing (virus scan, transformation, storage) runs in the background job

---

## API Documentation

- Every endpoint must be documented in OpenAPI 3.x
- OpenAPI must include auth, request schema, response envelope, errors, pagination, filters, and sort allowlists
- Generated docs must match implementation before review

## Versioning

- Breaking changes require a new version: `/api/v2/`
- Non-breaking additions (new fields, new endpoints) don't require a new version
- Deprecation notices via `Deprecation` header with sunset date

## Idempotency

Write endpoints that must be safe to retry use an idempotency key:

```
POST /api/v1/applications
Idempotency-Key: client-generated-uuid
```

- Idempotency keys are scoped by tenant, authenticated user, HTTP method, endpoint, and request body hash
- Same key within 24 hours returns the original response without re-processing
- Same key with a different body returns `409 CONFLICT`

## Optimistic Concurrency

- Updates to mutable resources should use a `version` field or `ETag` / `If-Match`
- Stale updates return `409 CONFLICT`
- Version checks happen in the same transaction as the update

## Authentication

- Auth via session token in `Authorization: Bearer {token}` header
- `tenant_id` derived from the authenticated session — never passed as a parameter
- Anonymous endpoints must be explicitly marked — default is auth required
- Authorization is checked before data access
- Tenant-scoped resources must filter by `tenant_id` at the repository/query layer
- Cross-tenant access returns `404 NOT_FOUND` unless security policy requires `403 FORBIDDEN`

## Soft Deletes

- `DELETE` marks resources deleted; it does not physically remove rows by default
- Deleted resources are excluded from normal reads and list endpoints
- Repeated deletes return `204 No Content`
- Hard deletes require an explicit maintenance/admin policy

## Rate Limiting

- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Exceeded: `429 RATE_LIMITED` with `Retry-After` header
- Default limits: 100 requests/minute for read, 20 requests/minute for write
- Limits are scoped by authenticated user and tenant; anonymous endpoints are scoped by IP/client key

## Request Tracing

- Accept `X-Request-ID` from clients when valid; otherwise generate one
- Return `X-Request-ID` on every response
- Include request ID in logs and error reports

## Timestamps & Types

- Timestamps: ISO 8601 UTC — `2024-01-15T09:30:00.000Z`
- Money: integer cents — never floats
- IDs: UUID v4 strings
- Booleans: `true`/`false` — never `0`/`1` or `"yes"`/`"no"`
- Enums: lowercase snake_case strings — `"active"`, `"pending_review"`

## Testing Expectations

- API tests cover success, validation errors, auth failures, authorization failures, and tenant isolation
- List endpoint tests cover pagination, sorting, filtering, unknown filters, and empty results
- Async endpoint tests cover `202`, job polling, failure state, and tenant-scoped job access
- File upload tests cover type, size, and rejected unsafe files

## AI Implementation Expectations

- Before adding or changing an endpoint, read this file and the adjacent route/service/repository patterns
- Generate OpenAPI, validation schema, handler, service, repository, and tests together where applicable
- Do not invent response shapes, error codes, filters, sort fields, or auth behavior
- Report verification commands and any rule intentionally not applied
