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

-- ============================================================
-- DOWN
-- ============================================================

DROP INDEX IF EXISTS idx_applications_active_unique;
DROP INDEX IF EXISTS idx_applications_candidate;
DROP INDEX IF EXISTS idx_applications_tenant_status_created;
DROP TABLE IF EXISTS applications;
