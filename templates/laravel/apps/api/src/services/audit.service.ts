// Audit log service. Writes an immutable, append-only audit trail for every
// state change in the system.
//
// Architecture:
//   - Entries are written inside the same DB transaction as the operation
//     (pass tx?: Transaction so atomicity is guaranteed — the state change
//     and the audit entry commit together, or rollback together)
//   - Entries can NEVER be deleted or modified — schema has no UPDATE/DELETE path
//   - before/after state is serialised as JSON; sensitive fields are masked first
//
// What to audit:
//   - Every state-changing operation (create, update, delete, status transition)
//   - Auth events (login success/failure, permission changes, session invalidation)
//   - Admin actions (role changes, tenant config changes, data exports)
//
// What NOT to audit:
//   - Read operations — audit logs are for state changes, not data access
//   - Sensitive field values — mask them before passing here (see maskSensitive)
//
// Retention:
//   Entries are retained per the data retention policy in compliance-rules.md.
//   Automated purge/anonymisation runs on a schedule, not ad-hoc DELETE.
//
// Reference: compliance-rules.md §GDPR §ISO27001
import { type AuditEntry } from './applications.service.js'

// Re-export AuditEntry so callers import from one place
export type { AuditEntry } from './applications.service.js'

export class AuditService {
  constructor(
    private readonly db: AuditDatabaseClient,
  ) {}

  async record(
    entry: AuditEntry,
    tx?: AuditTransaction,
  ): Promise<void> {
    // Mask sensitive fields in before/after state before they reach the DB.
    // This runs before serialization so the masked values are what gets stored.
    const safeEntry = {
      ...entry,
      before: this.maskSensitive(entry.before),
      after: this.maskSensitive(entry.after),
    }

    await this.db.execute(
      `INSERT INTO audit_logs
         (id, tenant_id, actor_id, action, resource_type, resource_id,
          before_state, after_state, metadata, ip_address, user_agent, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        safeEntry.tenantId,
        safeEntry.actorId,
        safeEntry.action,
        safeEntry.resourceType,
        safeEntry.resourceId,
        safeEntry.before ? JSON.stringify(safeEntry.before) : null,
        safeEntry.after ? JSON.stringify(safeEntry.after) : null,
        safeEntry.metadata ? JSON.stringify(safeEntry.metadata) : null,
        // IP and user-agent come from metadata if provided
        (safeEntry.metadata as Record<string, unknown>)?.ip as string ?? null,
        (safeEntry.metadata as Record<string, unknown>)?.userAgent as string ?? null,
      ],
      tx,
    )
  }

  // Mask fields that must never appear in audit logs per security-rules.md §Sensitive Data.
  // This is a defence-in-depth measure — the caller should also mask before passing.
  private maskSensitive(
    state?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!state) return undefined

    const sensitiveFields = new Set([
      'password',
      'password_hash',
      'passwordHash',
      'token',
      'session_token',
      'sessionToken',
      'secret',
      'api_key',
      'apiKey',
      'private_key',
      'privateKey',
      'credit_card',
      'creditCard',
      'ssn',
      'tax_id',
    ])

    return Object.fromEntries(
      Object.entries(state).map(([k, v]) => [
        k,
        sensitiveFields.has(k) || sensitiveFields.has(k.toLowerCase())
          ? '[REDACTED]'
          : v,
      ]),
    )
  }
}

// Minimal type stubs — replace with your actual DB driver types
interface AuditDatabaseClient {
  execute(sql: string, params: unknown[], tx?: AuditTransaction): Promise<number>
}

interface AuditTransaction {
  readonly _tx: true
}
