// EXAMPLE - route handler layer.
// Use this as the template for new routes in apps/api/src/routes/.
//
// Rules:
// - THIN: validate input, authorise, call service, format response
// - No business logic
// - No SQL or repository access
// - Validation via schema (Zod / Joi / equivalent)
// - tenantId and userId derived from auth context, never from request body
// - Errors thrown by services (any AppError subclass) are caught here and
//   piped through `mapErrorToEnvelope` for consistent envelope output.
// - Write endpoints accept an Idempotency-Key header (UUID v4) and forward
//   it + a request hash to the service for replay-safe behaviour.

import { createHash } from 'node:crypto'

import { z } from 'zod'

import {
  ForbiddenError,
  mapErrorToEnvelope,
  ValidationError,
  type ErrorLogger,
} from '../middleware/error-handler.js'
import type { ApplicationService } from '../services/applications.service.js'

const CREATE_APPLICATION_SCHEMA = z.object({
  candidateId: z.string().uuid(),
  requisitionId: z.string().uuid(),
})

const TRANSITION_STATUS_SCHEMA = z.object({
  status: z.enum(['active', 'withdrawn', 'rejected', 'offered', 'hired']),
  version: z.number().int().nonnegative(),
})

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface AuthContext {
  tenantId: string
  userId: string
  permissions: ReadonlyArray<string>
}

interface Request {
  body: unknown
  params: Record<string, string>
  headers: Record<string, string | undefined>
  auth: AuthContext
}

interface Response {
  status(code: number): Response
  json(body: unknown): void
}

export class ApplicationsRoute {
  constructor(
    private readonly service: ApplicationService,
    private readonly logger?: ErrorLogger,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      this.requirePermission(req, 'applications:create')

      const parsed = CREATE_APPLICATION_SCHEMA.safeParse(req.body)
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid input',
          flattenZodFieldErrors(parsed.error.flatten().fieldErrors),
        )
      }

      const idempotencyKey = readIdempotencyKey(req)
      const requestHash = idempotencyKey
        ? hashRequestBody(parsed.data)
        : undefined

      const application = await this.service.create(parsed.data, {
        tenantId: req.auth.tenantId,
        userId: req.auth.userId,
        idempotencyKey,
        requestHash,
      })

      res.status(201).json({ data: application, meta: null, error: null })
    } catch (err) {
      this.respondWithError(res, err, {
        route: 'POST /applications',
        tenant_id: req.auth.tenantId,
        user_id: req.auth.userId,
      })
    }
  }

  async transitionStatus(req: Request, res: Response): Promise<void> {
    try {
      this.requirePermission(req, 'applications:update')

      const parsed = TRANSITION_STATUS_SCHEMA.safeParse(req.body)
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid input',
          flattenZodFieldErrors(parsed.error.flatten().fieldErrors),
        )
      }

      const application = await this.service.transitionStatus(
        req.params.id,
        parsed.data.status,
        parsed.data.version,
        { tenantId: req.auth.tenantId, userId: req.auth.userId },
      )

      res.status(200).json({ data: application, meta: null, error: null })
    } catch (err) {
      this.respondWithError(res, err, {
        route: 'PATCH /applications/:id/status',
        tenant_id: req.auth.tenantId,
        user_id: req.auth.userId,
        application_id: req.params.id,
      })
    }
  }

  private requirePermission(req: Request, permission: string): void {
    if (!req.auth.permissions.includes(permission)) {
      throw new ForbiddenError(`Missing ${permission} permission`)
    }
  }

  private respondWithError(
    res: Response,
    err: unknown,
    context: Record<string, unknown>,
  ): void {
    const mapped = mapErrorToEnvelope(err, this.logger, context)
    res.status(mapped.status).json(mapped.body)
  }
}

// Read and validate the Idempotency-Key header. Returns undefined if absent.
// Throws ValidationError if present but malformed (not UUID v4).
function readIdempotencyKey(req: Request): string | undefined {
  const raw =
    req.headers['idempotency-key'] ??
    req.headers['Idempotency-Key'] ??
    undefined
  if (raw === undefined) return undefined
  if (!IDEMPOTENCY_KEY_PATTERN.test(raw)) {
    throw new ValidationError('Idempotency-Key must be a UUID v4', {
      'Idempotency-Key': 'must be a valid UUID v4',
    })
  }
  return raw.toLowerCase()
}

// Stable hash of the request body so that reusing an Idempotency-Key with a
// different body can be detected and rejected by the IdempotencyStore.
function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

// Zod's flatten() returns string[] per field. The error envelope expects a
// single string per field, so join with '; '.
function flattenZodFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) out[key] = msgs.join('; ')
  }
  return out
}
