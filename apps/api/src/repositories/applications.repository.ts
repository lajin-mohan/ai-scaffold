// EXAMPLE — repository layer.
// Use this as the template for new repositories in apps/api/src/repositories/.
//
// Rules:
// - Owns ALL SQL for one entity type
// - Returns domain types from packages/domain — never raw rows
// - Every query scoped by tenantId (multi-tenant)
// - Parameterised queries only — never string interpolation in SQL
// - No business rules — just CRUD + simple queries

import type { Application, ApplicationStatus } from '@app/domain'

export interface DatabaseClient {
  queryOne<T>(sql: string, params: unknown[]): Promise<T | null>
  queryMany<T>(sql: string, params: unknown[]): Promise<T[]>
  execute(sql: string, params: unknown[]): Promise<number>
}

interface ApplicationRow {
  id: string
  tenant_id: string
  candidate_id: string
  requisition_id: string
  status: string
  version: number
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateApplicationInput {
  tenantId: string
  candidateId: string
  requisitionId: string
  createdBy: string
}

export interface ApplicationRepository {
  findById(id: string, tenantId: string): Promise<Application | null>
  findActiveForCandidate(
    candidateId: string,
    requisitionId: string,
    tenantId: string,
  ): Promise<Application | null>
  create(input: CreateApplicationInput): Promise<Application>
  updateStatus(
    id: string,
    tenantId: string,
    status: ApplicationStatus,
    expectedVersion: number,
  ): Promise<Application | null>
}

export class PostgresApplicationRepository implements ApplicationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(id: string, tenantId: string): Promise<Application | null> {
    const row = await this.db.queryOne<ApplicationRow>(
      `SELECT * FROM applications
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    )
    return row ? this.mapRow(row) : null
  }

  async findActiveForCandidate(
    candidateId: string,
    requisitionId: string,
    tenantId: string,
  ): Promise<Application | null> {
    const row = await this.db.queryOne<ApplicationRow>(
      `SELECT * FROM applications
       WHERE candidate_id = $1
         AND requisition_id = $2
         AND tenant_id = $3
         AND status NOT IN ('withdrawn', 'rejected')
         AND deleted_at IS NULL`,
      [candidateId, requisitionId, tenantId],
    )
    return row ? this.mapRow(row) : null
  }

  async create(input: CreateApplicationInput): Promise<Application> {
    const row = await this.db.queryOne<ApplicationRow>(
      `INSERT INTO applications
         (id, tenant_id, candidate_id, requisition_id, status, version,
          created_by, updated_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'pending', 1,
               $4, $4, NOW(), NOW())
       RETURNING *`,
      [input.tenantId, input.candidateId, input.requisitionId, input.createdBy],
    )
    if (!row) throw new Error('Insert returned no row')
    return this.mapRow(row)
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ApplicationStatus,
    expectedVersion: number,
  ): Promise<Application | null> {
    const row = await this.db.queryOne<ApplicationRow>(
      `UPDATE applications
         SET status = $1, version = version + 1, updated_at = NOW()
       WHERE id = $2
         AND tenant_id = $3
         AND version = $4
         AND deleted_at IS NULL
       RETURNING *`,
      [status, id, tenantId, expectedVersion],
    )
    return row ? this.mapRow(row) : null
  }

  private mapRow(row: ApplicationRow): Application {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      candidateId: row.candidate_id,
      requisitionId: row.requisition_id,
      status: row.status as ApplicationStatus,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
