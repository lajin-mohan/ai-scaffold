// Auth middleware. Reads session token from cookie or Authorization header,
// looks up session in DB, enforces absolute + inactivity timeouts, and
// populates req.auth with { userId, tenantId, permissions }.
//
// Integration: apply to Fastify/Koa/Express/etc. via:
//   app.use(authMiddlewareFactory(sessionStore, inactivityTimeoutMs))
//
// Rules:
// - 401 UNAUTHORIZED for missing/invalid token — never 403 for missing auth
// - tenantId and userId come from DB lookup — NOT from token payload
//   (tokens are opaque; we look up the session to get authoritative identity)
// - Inactivity timeout resets on every authenticated request
// - Absolute timeout enforces maximum session age (e.g. 8h)
// - Both timeouts invalidate the session on breach — prevents session hijacking
import type { IncomingMessage, ServerResponse } from 'node:http'

import { UnauthorizedError } from './error-handler.js'

export interface SessionStore {
  findByToken(token: string): Promise<Session | null>
  invalidate(token: string): Promise<void>
  updateLastActivity(sessionId: string): Promise<void>
}

export interface Session {
  id: string
  userId: string
  tenantId: string
  permissions: ReadonlyArray<string>
  createdAt: Date
  lastActivityAt: Date
}

interface AuthenticatedRequest extends IncomingMessage {
  auth: {
    userId: string
    tenantId: string
    permissions: ReadonlyArray<string>
  }
}

export function authMiddlewareFactory(
  sessionStore: SessionStore,
  inactivityTimeoutMs: number,
) {
  return async function authMiddleware(
    req: IncomingMessage,
    _res: ServerResponse,
  ): Promise<void> {
    const token = extractToken(req)
    if (!token) {
      throw new UnauthorizedError('Authentication required')
    }

    const session = await sessionStore.findByToken(token)
    if (!session) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    // Absolute timeout: session exists but has exceeded maximum age.
    // Invalidate so stolen sessions can't persist beyond the absolute limit.
    const ageMs = Date.now() - session.createdAt.getTime()
    const maxAgeMs = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 28800) * 1000
    if (ageMs > maxAgeMs) {
      await sessionStore.invalidate(token)
      throw new UnauthorizedError('Session expired — please log in again')
    }

    // Inactivity timeout: user was idle past threshold.
    // Invalidate so abandoned sessions can't be hijacked.
    const idleMs = Date.now() - session.lastActivityAt.getTime()
    if (idleMs > inactivityTimeoutMs) {
      await sessionStore.invalidate(token)
      throw new UnauthorizedError(
        `Session inactive — please log in again`,
      )
    }

    // Reset inactivity timer on every authenticated request.
    // This is the sliding window: each request extends the session life.
    await sessionStore.updateLastActivity(session.id)

    // Attach auth context — this is what routes read via req.auth.
    // All repository queries scope by tenantId from this context.
    ;(req as AuthenticatedRequest).auth = {
      userId: session.userId,
      tenantId: session.tenantId,
      permissions: session.permissions,
    }
  }
}

// Extract Bearer token from Authorization header or session cookie.
// Accepts both "Bearer <token>" and raw token formats.
function extractToken(req: IncomingMessage): string | undefined {
  const authHeader = req.headers.authorization ?? ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // Cookie extraction if using cookie-based sessions
  const cookieHeader = req.headers.cookie ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/)
  return match?.[1]
}
