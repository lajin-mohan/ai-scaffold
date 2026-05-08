-- EXAMPLE migration. Use as the template for new migrations in apps/api/migrations/.
--
-- Rules (from database-optimization.md):
-- - Reversible (down section MUST undo the up section)
-- - tenant_id NOT NULL on multi-tenant tables (per CLAUDE.md IS_MULTI_TENANT)
-- - Standard audit columns: created_at, updated_at, deleted_at, version
-- - Indexes on foreign keys and on (tenant_id, common-filter-columns)
-- - CONSTRAINTs enforce domain invariants (status enum, etc.)
-- - Use CREATE INDEX CONCURRENTLY for new indexes on existing large tables in production

-- ============================================================
-- UP
-- ============================================================

CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  requisition_id  UUID NOT NULL REFERENCES requisitions(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID NOT NULL REFERENCES users(id),
  updated_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE applications
  ADD CONSTRAINT chk_applications_valid_status
  CHECK (status IN ('pending', 'active', 'withdrawn', 'rejected', 'offered', 'hired'));

-- Tenant-scoped lookup by status
CREATE INDEX idx_applications_tenant_status_created
  ON applications (tenant_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- Lookup by candidate
CREATE INDEX idx_applications_candidate
  ON applications (tenant_id, candidate_id)
  WHERE deleted_at IS NULL;

-- Enforce: at most one active application per candidate per requisition
CREATE UNIQUE INDEX idx_applications_active_unique
  ON applications (tenant_id, candidate_id, requisition_id)
  WHERE status NOT IN ('withdrawn', 'rejected') AND deleted_at IS NULL;

-- Idempotency cache for write endpoints (per api-standards.md "Idempotency").
-- Composite PK on (tenant_id, key) gives tenant-isolated lookups; the same
-- client-generated UUID may exist for different tenants without collision.
-- The endpoint column lets one key be valid for one operation only (a stored
-- POST /applications response cannot be reused as a PATCH /applications/:id
-- response). request_hash detects accidental key reuse with different bodies.
-- expires_at + index supports a nightly cleanup job.
CREATE TABLE idempotency_keys (
  key             UUID NOT NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  endpoint        TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (tenant_id, key)
);

-- Cleanup job query: DELETE FROM idempotency_keys WHERE expires_at < NOW();
CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ============================================================
-- DOWN
-- ============================================================

DROP INDEX IF EXISTS idx_idempotency_keys_expires;
DROP TABLE IF EXISTS idempotency_keys;
DROP INDEX IF EXISTS idx_applications_active_unique;
DROP INDEX IF EXISTS idx_applications_candidate;
DROP INDEX IF EXISTS idx_applications_tenant_status_created;
DROP TABLE IF EXISTS applications;
