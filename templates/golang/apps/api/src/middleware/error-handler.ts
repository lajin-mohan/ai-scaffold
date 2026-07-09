// EXAMPLE - global error handler.
// Maps domain / service errors to the standard API response envelope defined
// in .claude/rules/api-standards.md. Used by every route, so error mapping
// happens in one place and response shape stays consistent.
//
// Pattern: services and domain code throw typed errors that extend AppError.
// Routes catch any thrown error and pipe it through `mapErrorToEnvelope`.
// Unknown errors (anything not extending AppError) become INTERNAL_ERROR 500
// without leaking internals to the client. Server-side they are logged with
// the original stack for debugging.
//
// Rules:
// - Never expose stack traces, SQL fragments, or internal paths to the client.
// - Every AppError subclass MUST have a stable machine-readable code matching
//   the error taxonomy in api-standards.md (VALIDATION_FAILED, NOT_FOUND, etc.)
// - Field-level validation errors travel through `fields`.

export interface ErrorResponseEnvelope {
  data: null
  meta: null
  error: {
    code: string
    message: string
    fields?: Record<string, string> | null
  }
}

export interface ErrorMappingResult {
  status: number
  body: ErrorResponseEnvelope
}

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly fields?: Record<string, string>

  constructor(
    code: string,
    message: string,
    statusCode: number,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.fields = fields
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super('VALIDATION_FAILED', message, 400, fields)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super('UNPROCESSABLE', message, 422)
    this.name = 'UnprocessableError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', `Too many requests; retry after ${retryAfterSeconds}s`, 429)
    this.name = 'RateLimitError'
  }
}

export interface ErrorLogger {
  error(message: string, context: Record<string, unknown>): void
}

export function mapErrorToEnvelope(
  err: unknown,
  logger?: ErrorLogger,
  context: Record<string, unknown> = {},
): ErrorMappingResult {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: {
        data: null,
        meta: null,
        error: {
          code: err.code,
          message: err.message,
          fields: err.fields ?? null,
        },
      },
    }
  }

  // Unknown error - log full detail server-side, return generic 500 to client.
  const cause = err instanceof Error ? err : new Error(String(err))
  logger?.error('Unhandled error mapped to INTERNAL_ERROR', {
    ...context,
    error_name: cause.name,
    error_message: cause.message,
    stack: cause.stack,
  })

  return {
    status: 500,
    body: {
      data: null,
      meta: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again or contact support.',
      },
    },
  }
}
