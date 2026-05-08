// EXAMPLE — route handler layer.
// Use this as the template for new routes in apps/api/src/routes/.
//
// Rules:
// - THIN: validate input, authorise, call service, format response
// - No business logic
// - No SQL or repository access
// - Validation via schema (Zod / Joi / equivalent)
// - tenantId and userId derived from auth context, never from request body

import { z } from 'zod'

import type { ApplicationService } from '../services/applications.service.js'

const CREATE_APPLICATION_SCHEMA = z.object({
  candidateId: z.string().uuid(),
  requisitionId: z.string().uuid(),
})

const TRANSITION_STATUS_SCHEMA = z.object({
  status: z.enum(['active', 'withdrawn', 'rejected', 'offered', 'hired']),
  version: z.number().int().nonnegative(),
})

interface AuthContext {
  tenantId: string
  userId: string
  permissions: ReadonlyArray<string>
}

interface Request {
  body: unknown
  params: Record<string, string>
  auth: AuthContext
}

interface Response {
  status(code: number): Response
  json(body: unknown): void
}

export class ApplicationsRoute {
  constructor(private readonly service: ApplicationService) {}

  async create(req: Request, res: Response): Promise<void> {
    if (!req.auth.permissions.includes('applications:create')) {
      res.status(403).json({
        data: null,
        meta: null,
        error: { code: 'FORBIDDEN', message: 'Missing applications:create permission' },
      })
      return
    }

    const parsed = CREATE_APPLICATION_SCHEMA.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        meta: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input',
          fields: parsed.error.flatten().fieldErrors,
        },
      })
      return
    }

    const application = await this.service.create(parsed.data, {
      tenantId: req.auth.tenantId,
      userId: req.auth.userId,
    })

    res.status(201).json({ data: application, meta: null, error: null })
  }

  async transitionStatus(req: Request, res: Response): Promise<void> {
    if (!req.auth.permissions.includes('applications:update')) {
      res.status(403).json({
        data: null,
        meta: null,
        error: { code: 'FORBIDDEN', message: 'Missing applications:update permission' },
      })
      return
    }

    const parsed = TRANSITION_STATUS_SCHEMA.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        meta: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input',
          fields: parsed.error.flatten().fieldErrors,
        },
      })
      return
    }

    const application = await this.service.transitionStatus(
      req.params.id,
      parsed.data.status,
      parsed.data.version,
      { tenantId: req.auth.tenantId, userId: req.auth.userId },
    )

    res.status(200).json({ data: application, meta: null, error: null })
  }
}
