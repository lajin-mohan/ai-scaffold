# Command: /create-api

Designs a complete API contract for a new feature or resource. Invokes `api-architect` agent and produces a spec that can be handed directly to Codex/Cursor for implementation.

## Usage

```
/create-api "User management — CRUD for users with role assignment"
/create-api .ai-scaffold/docs/brd/feature-x.md      # From a BRD section
/create-api --resource users           # From an entity name
```

## Process

1. **Clarify scope** — what resource(s) does this cover? What operations?
2. **Design endpoint list** — RESTful resource mapping
3. **Define request/response contracts** — typed fields, validations, error codes
4. **Design database migrations** — new tables, columns, indexes
5. **Identify side effects** — emails, jobs, audit logs, events
6. **Produce pseudocode** — high-level implementation notes per endpoint
7. **Self-review** — run through `api-standards` and `security-rules` checklist

## Output

```
## API Contract — [Resource / Feature Name]

### Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|

### [ENDPOINT]: METHOD /path
**Purpose:** ...
**Auth:** Required — permission: `resource:action`

**Request**
\`\`\`json
{ "field": "type — description" }
\`\`\`

**Response 200**
\`\`\`json
{ "data": { ... } }
\`\`\`

**Errors**
| Code | Status | Trigger |
|---|---|---|

**Side Effects**
- [what else happens when this succeeds]

---

### Database Migrations
\`\`\`sql
-- Migration: NNNN_description
\`\`\`

### Validation Rules
| Field | Type | Required | Constraints |
|---|---|---|---|

### Permissions Required
| Endpoint | Permission Code | Roles with this permission |
|---|---|---|

### Open Questions
- [ ] Question that must be answered before implementation
```

## Notes

- Every contract produced by this command must be approved before implementation begins.
- Save output to `.ai-scaffold/docs/api/[resource-name]-contract.md`.
- Use `.claude/templates/api-contract-template.md` as the base format.
