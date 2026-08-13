---
name: backend-api-design
description: Design and review backend HTTP APIs using this project's lifecycle, validation, authorization, error-handling, and service-layer conventions. Use for new endpoints, API contracts, or backend API reviews.
---

# Skill: backend-api-design

Reference for designing and implementing backend APIs. Adapt to the project's stack (`{{BACKEND_STACK}}`).

---

## Request Lifecycle

```
HTTP Request
  → Auth Middleware      (validate session, extract user + tenant)
  → Rate Limit Middleware
  → Input Validation     (schema validation — reject 400 early)
  → Route Handler        (thin — calls service only)
    → Service Layer      (business logic, orchestration)
      → Repository Layer (data access, SQL)
      → Side Effects     (email, jobs, events — after commit)
  → Response Formatter   (consistent envelope)
HTTP Response
```

---

## Route Handler Pattern

Handlers are thin. No business logic, no SQL, no conditional chains.

```typescript
// Express / Fastify / similar
async function createApplication(req: Request, res: Response) {
  const body = validateCreateApplication(req.body)  // throws 400 if invalid
  const result = await applicationService.create({
    ...body,
    tenantId: req.user.tenantId,
    createdBy: req.user.id,
  })
  res.status(201).json({ data: result, meta: null, error: null })
}
```

---

## Service Layer Pattern

Services contain all business logic. They don't touch the database directly.

```typescript
class ApplicationService {
  constructor(
    private readonly applicationRepo: ApplicationRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly emailService: EmailService,
    private readonly jobQueue: JobQueue,
  ) {}

  async create(input: CreateApplicationInput): Promise<Application> {
    // 1. Validate business rules
    const candidate = await this.candidateRepo.findById(input.candidateId, input.tenantId)
    if (!candidate) throw new NotFoundError('Candidate not found')

    const existing = await this.applicationRepo.findActiveForCandidate(
      input.candidateId, input.requisitionId, input.tenantId
    )
    if (existing) throw new ConflictError('Active application already exists')

    // 2. Execute primary operation
    const application = await this.applicationRepo.create(input)

    // 3. Side effects after success
    await this.jobQueue.enqueue('send-application-confirmation', { applicationId: application.id })

    return application
  }
}
```

---

## Repository Pattern

Repositories own all SQL. They return domain types, never raw rows.

```typescript
class ApplicationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: CreateApplicationInput): Promise<Application> {
    const row = await this.db.queryOne<ApplicationRow>(
      `INSERT INTO applications (id, tenant_id, candidate_id, requisition_id, status, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'pending', $4)
       RETURNING *`,
      [input.tenantId, input.candidateId, input.requisitionId, input.createdBy]
    )
    return this.mapToApplication(row)
  }

  async findById(id: string, tenantId: string): Promise<Application | null> {
    const row = await this.db.queryOne<ApplicationRow>(
      `SELECT * FROM applications WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )
    return row ? this.mapToApplication(row) : null
  }

  private mapToApplication(row: ApplicationRow): Application {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      candidateId: row.candidate_id,
      status: row.status as ApplicationStatus,
      createdAt: row.created_at,
    }
  }
}
```

---

## Error Handling

Typed errors with HTTP-mappable codes.

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super('VALIDATION_FAILED', message, 400, fields)
  }
}

class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404)
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super('FORBIDDEN', message, 403)
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}
```

Global error handler maps `AppError` to response envelope.

---

## Input Validation

Use a schema validation library at API boundaries.

```typescript
// Zod example
const CreateApplicationSchema = z.object({
  candidateId: z.string().uuid(),
  requisitionId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
})

function validateCreateApplication(body: unknown) {
  const result = CreateApplicationSchema.safeParse(body)
  if (!result.success) {
    throw new ValidationError('Validation failed', formatZodErrors(result.error))
  }
  return result.data
}
```

---

## Idempotency Key Pattern

For write operations that must be safe to retry:

```typescript
async function handleWithIdempotency<T>(
  key: string,
  tenantId: string,
  operation: () => Promise<T>
): Promise<T> {
  const existing = await idempotencyStore.get(key, tenantId)
  if (existing) return existing.result as T

  const result = await operation()
  await idempotencyStore.set(key, tenantId, result, { ttlHours: 24 })
  return result
}
```

---

## Audit Logging Pattern

Every state change gets an audit record — append-only, immutable.

```typescript
await auditLog.record({
  tenantId: context.tenantId,
  actorId: context.userId,
  action: 'application.status_changed',
  resourceType: 'application',
  resourceId: application.id,
  before: { status: previousStatus },
  after: { status: newStatus },
  ip: context.ip,
  userAgent: context.userAgent,
})
```

---

## Background Jobs

Operations that take >200ms or have side effects belong in jobs.

```typescript
// Enqueue
await jobQueue.enqueue('send-interview-invitation', {
  applicationId: application.id,
  interviewerId: stage.assignedTo,
  scheduledAt: stage.scheduledAt,
}, {
  runAt: new Date(),
  retryLimit: 3,
  retryDelay: 60, // seconds
})

// Handler
jobHandlers['send-interview-invitation'] = async (job) => {
  const { applicationId, interviewerId } = job.data
  // fetch, send email, mark sent
}
```
