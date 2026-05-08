// EXAMPLE - service layer.
// Use this as the template for new services in apps/api/src/services/.
//
// Rules:
// - Contains ALL business logic for one bounded operation set
// - Receives validated, authorised input (validation/auth happen at the route)
// - Delegates persistence to repositories - never queries the database directly
// - Wraps insert + audit in a single DB transaction (atomicity)
// - For durable side effects (job queue, external API), see the transactional
//   outbox pattern: docs/architecture/patterns/transactional-outbox.md
// - Throws typed errors that extend AppError; the route layer maps them to
//   the standard response envelope via mapErrorToEnvelope.

import {
  type Application,
  canTransition,
  InvalidTransitionError,
  transitionApplication,
} from '@app/domain'

import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from '../middleware/error-handler.js'
import type { ApplicationRepository } from '../repositories/applications.repository.js'

// ---------------------------------------------------------------
// Dependencies (interfaces - inject concrete implementations)
// ---------------------------------------------------------------

export interface Transaction {
  // Marker type. The concrete implementation depends on the DB driver
  // (e.g., pg's PoolClient, knex's Transaction, Prisma's TransactionClient).
  readonly _tx: true
}

export interface DatabaseClient {
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
}

export interface JobQueue {
  enqueue(name: string, payload: Record<string, unknown>): Promise<void>
}

export interface AuditLog {
  record(
    entry: AuditEntry,
    tx?: Transaction,
  ): Promise<void>
}

export interface AuditEntry {
  tenantId: string
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

// Idempotency cache. Backed by the `idempotency_keys` table from the
// 0001 migration. The store is responsible for the (tenant_id, key)
// composite-key lookup and TTL handling.
export interface IdempotencyStore {
  get(
    key: string,
    tenantId: string,
    endpoint: string,
  ): Promise<CachedResponse | null>
  set(
    key: string,
    tenantId: string,
    endpoint: string,
    requestHash: string,
    response: CachedResponse,
    tx?: Transaction,
  ): Promise<void>
}

export interface CachedResponse {
  status: number
  body: Application
}

// ---------------------------------------------------------------
// Public types
// ---------------------------------------------------------------

export interface ApplyContext {
  tenantId: string
  userId: string
  idempotencyKey?: string
  requestHash?: string
}

export interface CreateInput {
  candidateId: string
  requisitionId: string
}

const ENDPOINT_CREATE = 'POST /api/v1/applications'

// ---------------------------------------------------------------
// Service
// ---------------------------------------------------------------

export class ApplicationService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly repo: ApplicationRepository,
    private readonly jobs: JobQueue,
    private readonly audit: AuditLog,
    private readonly idempotency: IdempotencyStore,
  ) {}

  async create(input: CreateInput, ctx: ApplyContext): Promise<Application> {
    // 1. Idempotency check - serve cached response if this key has been seen.
    if (ctx.idempotencyKey) {
      const cached = await this.idempotency.get(
        ctx.idempotencyKey,
        ctx.tenantId,
        ENDPOINT_CREATE,
      )
      if (cached) return cached.body
    }

    // 2. Business-rule pre-check (outside the transaction since it's read-only
    //    and gives a fast 409 without holding a write lock).
    const existing = await this.repo.findActiveForCandidate(
      input.candidateId,
      input.requisitionId,
      ctx.tenantId,
    )
    if (existing) {
      throw new ConflictError(
        'An active application already exists for this candidate and requisition',
      )
    }

    // 3. Atomic insert + audit + idempotency cache. If any step throws, the
    //    transaction rolls back and nothing is committed.
    //
    //    NOTE: The job enqueue at step 4 is OUTSIDE the transaction. If the
    //    job-queue write fails after the DB commits, the application exists
    //    but the welcome email never sends. For durable side effects, use
    //    the transactional outbox pattern (insert an outbox row inside this
    //    transaction; a separate worker drains the outbox into the queue).
    //    See docs/architecture/patterns/transactional-outbox.md.
    const application = await this.db.transaction(async (tx) => {
      const created = await this.repo.create(
        {
          tenantId: ctx.tenantId,
          candidateId: input.candidateId,
          requisitionId: input.requisitionId,
          createdBy: ctx.userId,
        },
        tx,
      )

      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId: ctx.userId,
          action: 'application.created',
          resourceType: 'application',
          resourceId: created.id,
          after: { status: created.status },
        },
        tx,
      )

      if (ctx.idempotencyKey && ctx.requestHash) {
        await this.idempotency.set(
          ctx.idempotencyKey,
          ctx.tenantId,
          ENDPOINT_CREATE,
          ctx.requestHash,
          { status: 201, body: created },
          tx,
        )
      }

      return created
    })

    // 4. Best-effort side effect (post-commit). Failure here logs but does
    //    not undo the application. See outbox pattern for durable delivery.
    await this.jobs.enqueue('send-application-confirmation', {
      applicationId: application.id,
    })

    return application
  }

  async transitionStatus(
    id: string,
    to: Application['status'],
    expectedVersion: number,
    ctx: ApplyContext,
  ): Promise<Application> {
    const current = await this.repo.findById(id, ctx.tenantId)
    if (!current) throw new NotFoundError('Application not found')

    if (!canTransition(current.status, to)) {
      throw new UnprocessableError(
        `Invalid status transition from ${current.status} to ${to}`,
      )
    }

    // Validate the transition via the domain layer (throws if illegal).
    transitionApplication(current, to)

    return this.db.transaction(async (tx) => {
      const updated = await this.repo.updateStatus(
        id,
        ctx.tenantId,
        to,
        expectedVersion,
        tx,
      )
      if (!updated) {
        throw new ConflictError(
          'Application was modified concurrently - refresh and retry',
        )
      }

      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId: ctx.userId,
          action: 'application.status_changed',
          resourceType: 'application',
          resourceId: updated.id,
          before: { status: current.status },
          after: { status: updated.status },
        },
        tx,
      )

      return updated
    })
  }
}

// Re-export so callers can import errors and InvalidTransitionError from one place.
export { ConflictError, NotFoundError, UnprocessableError, InvalidTransitionError }
