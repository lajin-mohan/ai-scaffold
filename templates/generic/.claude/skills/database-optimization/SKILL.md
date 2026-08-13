---
name: database-optimization
description: Design and optimize relational schemas, indexes, queries, and safe migrations with PostgreSQL-oriented guidance. Use for database modeling, slow-query investigation, indexing, or migration reviews.
---

# Skill: database-optimization

Reference for schema design, query optimization, and migration safety. PostgreSQL-focused but principles apply broadly.

---

## Schema Design Principles

### Every Table Gets

> Rules below assume `{{IS_MULTI_TENANT}} = true`. For single-tenant projects, omit the `tenant_id` column and any composite indexes that lead with it.

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id   UUID NOT NULL REFERENCES tenants(id)  -- multi-tenant only
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at  TIMESTAMPTZ  -- soft delete; NULL = active
```

### Naming Conventions
- Tables: `snake_case`, plural (`users`, `applications`, `stage_templates`)
- Columns: `snake_case` (`created_at`, `tenant_id`, `first_name`)
- Indexes: `idx_{table}_{columns}` (`idx_users_tenant_id`, `idx_applications_tenant_status`)
- Foreign keys: `fk_{table}_{referenced_table}` or rely on DB-generated names
- Constraints: `chk_{table}_{condition}` (`chk_applications_valid_status`)

### Constraints Enforce Invariants
Don't rely on application logic alone — database constraints are the last line of defence.

```sql
-- Status enum
ALTER TABLE applications
  ADD CONSTRAINT chk_applications_valid_status
  CHECK (status IN ('pending', 'active', 'withdrawn', 'rejected', 'offered', 'hired'));

-- Unique active application per candidate per requisition
CREATE UNIQUE INDEX idx_applications_active_unique
  ON applications (tenant_id, candidate_id, requisition_id)
  WHERE status NOT IN ('withdrawn', 'rejected') AND deleted_at IS NULL;

-- Positive amounts only
ALTER TABLE offers ADD CONSTRAINT chk_offers_positive_salary CHECK (salary_cents > 0);
```

---

## Indexing Strategy

### Always Index
- All foreign key columns: `CREATE INDEX idx_table_fk ON table(fk_column)`
- All `tenant_id` columns (already covered if part of composite index)
- All columns used in `WHERE` clauses with high cardinality

### Composite Indexes
Put the most selective column first, then tenant scoping.

```sql
-- For: WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC
CREATE INDEX idx_applications_tenant_status_created
  ON applications (tenant_id, status, created_at DESC);
```

### Partial Indexes
Index only the rows you actually query — much smaller, much faster.

```sql
-- Only active (non-deleted) records
CREATE INDEX idx_users_tenant_active
  ON users (tenant_id, email)
  WHERE deleted_at IS NULL;
```

### When NOT to Index
- Low-cardinality columns used alone (`boolean`, `status` with few values)
- Columns only written, never read in WHERE/JOIN
- Small tables (< 10k rows) — sequential scan is often faster

---

## Query Patterns

### Always Scope by tenant_id
```sql
-- CORRECT
SELECT * FROM applications
WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL;

-- WRONG — tenant isolation violation
SELECT * FROM applications WHERE id = $1;
```

### Pagination
```sql
-- Offset pagination (simple, acceptable for < 100k rows)
SELECT * FROM applications
WHERE tenant_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- Cursor pagination (better for large datasets)
SELECT * FROM applications
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND created_at < $2  -- cursor value
ORDER BY created_at DESC
LIMIT $3;
```

### Avoid N+1 Queries
```sql
-- WRONG: 1 query for list + N queries for each related entity
SELECT * FROM applications WHERE tenant_id = $1;
-- then for each: SELECT * FROM candidates WHERE id = $n;

-- CORRECT: join or batch
SELECT a.*, c.first_name, c.last_name, c.email
FROM applications a
JOIN candidates c ON c.id = a.candidate_id AND c.tenant_id = a.tenant_id
WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
ORDER BY a.created_at DESC;
```

### Batch Inserts
```sql
-- Use unnest for bulk inserts — far faster than individual INSERTs
INSERT INTO applications (id, tenant_id, candidate_id, status)
SELECT gen_random_uuid(), $1, unnest($2::uuid[]), 'pending';
```

---

## Concurrent Write Safety

### SELECT FOR UPDATE
Prevent race conditions on state transitions:

```sql
BEGIN;
SELECT id, status FROM applications
WHERE id = $1 AND tenant_id = $2
FOR UPDATE;

-- validate transition, then update
UPDATE applications SET status = $3, updated_at = NOW()
WHERE id = $1 AND tenant_id = $2;
COMMIT;
```

### Optimistic Locking
For lower-contention scenarios:

```sql
-- version column increments on every write
UPDATE applications
SET status = $1, version = version + 1, updated_at = NOW()
WHERE id = $2 AND tenant_id = $3 AND version = $4;
-- 0 rows updated = concurrent modification detected → retry or conflict error
```

---

## Migration Safety

### Safe Operations (no lock, non-destructive)
- `ADD COLUMN` with a default or nullable
- `CREATE INDEX CONCURRENTLY`
- `CREATE TABLE`
- Add `NOT NULL` on a column that already has no nulls

### Risky Operations (require care)
- `ADD COLUMN NOT NULL` without default on large table — add nullable first, backfill, then add constraint
- `DROP COLUMN` — ensure no code reads it first
- `ALTER COLUMN TYPE` — requires full table rewrite
- `ADD CONSTRAINT` on large table — validate in a separate transaction

### Migration Template
```sql
-- migrations/NNNN_description.sql

-- ============================================================
-- UP
-- ============================================================

ALTER TABLE applications
  ADD COLUMN assigned_to UUID REFERENCES users(id);

CREATE INDEX CONCURRENTLY idx_applications_assigned_to
  ON applications (tenant_id, assigned_to)
  WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- DOWN
-- ============================================================

DROP INDEX CONCURRENTLY IF EXISTS idx_applications_assigned_to;
ALTER TABLE applications DROP COLUMN IF EXISTS assigned_to;
```

---

## Connection Pooling (PgBouncer Transaction Mode)

When using PgBouncer in transaction mode:
- **No prepared statements** — they don't survive connection reuse
- **No session-level settings** (`SET`, `SET LOCAL`) — use transaction-level instead
- **No advisory locks** — they're session-scoped
- **No `LISTEN/NOTIFY`** — session-scoped
- Connection pool size: `(num_cores * 2) + effective_spindle_count` — tune per load test

---

## Monitoring Queries

```sql
-- Slow queries (requires pg_stat_statements extension)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Missing indexes (high seq scan on large tables)
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND n_live_tup > 10000
ORDER BY seq_scan DESC;

-- Bloat check
SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_class
WHERE relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 20;
```
