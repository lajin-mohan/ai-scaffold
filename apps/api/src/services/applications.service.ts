// EXAMPLE — service layer.
// Use this as the template for new services in apps/api/src/services/.
//
// Rules:
// - Contains ALL business logic for one bounded operation set
// - Receives validated, authorised input (validation/auth happen at the route)
// - Delegates persistence to repositories — never queries the database directly
// - Side effects (emails, jobs, audit logs) only after the primary operation succeeds
// - Throws typed errors with HTTP-mappable codes

import {
  type Application,
  canTransition,
  InvalidTransitionError,
  transitionApplication,
} from '@app/domain'

import type { ApplicationRepository } from '../repositories/applications.repository.js'

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  readonly code = 'CONFLICT'
  readonly statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class UnprocessableError extends Error {
  readonly code = 'UNPROCESSABLE'
  readonly statusCode = 422
  constructor(message: string) {
    super(message)
    this.name = 'UnprocessableError'
  }
}

export interface JobQueue {
  enqueue(name: string, payload: Record<string, unknown>): Promise<void>
}

export interface AuditLog {
  record(entry: {
    tenantId: string
    actorId: string
    action: string
    resourceType: string
    resourceId: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }): Promise<void>
}

export interface ApplyContext {
  tenantId: string
  userId: string
}

export interface CreateInput {
  candidateId: string
  requisitionId: string
}

export class ApplicationService {
  constructor(
    private readonly repo: ApplicationRepository,
    private readonly jobs: JobQueue,
    private readonly audit: AuditLog,
  ) {}

  async create(input: CreateInput, ctx: ApplyContext): Promise<Application> {
    const existing = await this.repo.findActiveForCandidate(
      input.candidateId,
      input.requisitionId,
      ctx.tenantId,
    )
    if (existing) {
      throw new ConflictError('An active application already exists for this candidate and requisition')
    }

    const application = await this.repo.create({
      tenantId: ctx.tenantId,
      candidateId: input.candidateId,
      requisitionId: input.requisitionId,
      createdBy: ctx.userId,
    })

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'application.created',
      resourceType: 'application',
      resourceId: application.id,
      after: { status: application.status },
    })

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
      throw new UnprocessableError(`Invalid status transition from ${current.status} to ${to}`)
    }

    // Apply the transition in domain to validate, but persist via repository
    transitionApplication(current, to)

    const updated = await this.repo.updateStatus(id, ctx.tenantId, to, expectedVersion)
    if (!updated) {
      throw new ConflictError('Application was modified concurrently — refresh and retry')
    }

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'application.status_changed',
      resourceType: 'application',
      resourceId: updated.id,
      before: { status: current.status },
      after: { status: updated.status },
    })

    return updated
  }
}

// Re-export typed errors and InvalidTransitionError for global error handler use
export { InvalidTransitionError }
