// EXAMPLE — pure domain entity. Has no infrastructure dependencies.
// Use this as the template for new entities in packages/domain/src/.
//
// Rules:
// - No imports from packages/services, packages/repositories, or apps/
// - No I/O — no DB, no HTTP, no filesystem
// - Methods enforce invariants; constructors validate state
// - State transitions are explicit functions, not setter chains
//
// Replace this file with your real domain entities once /bootstrap completes.

export type ApplicationStatus =
  | 'pending'
  | 'active'
  | 'withdrawn'
  | 'rejected'
  | 'offered'
  | 'hired'

export interface Application {
  readonly id: string
  readonly tenantId: string
  readonly candidateId: string
  readonly requisitionId: string
  readonly status: ApplicationStatus
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

const VALID_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  pending: ['active', 'withdrawn', 'rejected'],
  active: ['offered', 'rejected', 'withdrawn'],
  offered: ['hired', 'rejected', 'withdrawn'],
  withdrawn: [],
  rejected: [],
  hired: [],
}

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export class InvalidTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Cannot transition application from "${from}" to "${to}"`)
    this.name = 'InvalidTransitionError'
  }
}

export function transitionApplication(
  application: Application,
  to: ApplicationStatus,
): Application {
  if (!canTransition(application.status, to)) {
    throw new InvalidTransitionError(application.status, to)
  }
  return {
    ...application,
    status: to,
    version: application.version + 1,
    updatedAt: new Date(),
  }
}
