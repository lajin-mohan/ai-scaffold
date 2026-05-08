-- Audit log table for tracking all state changes across the system.
--
-- Design decisions:
-- - Immutable: no UPDATE or DELETE path exists. Corrections are made via
--   new audit entries recording the fix, not by modifying existing entries.
-- - Composite (tenant_id, resource_id) index covers all common lookup patterns
--   (filter by tenant, filter by resource, filter by actor, filter by action).
-- - before_state and after_state are JSONB — stores full state snapshots.
--   Sensitive fields are masked by AuditService.maskSensitive() before storage.
-- - Soft delete NOT applied — audit entries must never be removed, even when
--   the associated resource (user, application, etc.) is deleted.
-- - No foreign key constraints on actor_id or resource_id — deleted resources
--   still have an audit trail; the IDs serve as historical references.

-- ============================================================
-- UP
-- ============================================================

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  actor_id        UUID NOT NULL,          -- user who performed the action
  action          TEXT NOT NULL,          -- e.g. 'application.created', 'user.permission_changed'
  resource_type   TEXT NOT NULL,          -- e.g. 'application', 'user', 'role'
  resource_id     UUID NOT NULL,          -- ID of the affected resource
  before_state    JSONB,                   -- null for create operations
  after_state     JSONB,                  -- null for delete operations
  metadata        JSONB,                  -- e.g. { ip: '1.2.3.4', userAgent: 'Mozilla/5.0' }
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core lookup patterns
CREATE INDEX idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (tenant_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (tenant_id, resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (tenant_id, action, created_at DESC);

-- ============================================================
-- DOWN
-- ============================================================

DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_actor;
DROP INDEX IF EXISTS idx_audit_logs_tenant;
DROP TABLE IF EXISTS audit_logs;