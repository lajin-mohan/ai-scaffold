// CORS middleware. Configured via env vars — no code changes needed to update origins.
//
// Env vars:
//   CORS_ALLOWED_ORIGINS=    — comma-separated list of allowed origins
//   CORS_ALLOWED_METHODS=    — comma-separated HTTP methods (default: standard REST)
//   CORS_ALLOWED_HEADERS=    — comma-separated request headers the client may send
//   CORS_EXPOSE_HEADERS=     — comma-separated response headers the client may read
//   CORS_CREDENTIALS=        — "true" to allow credentials (cookies, auth headers)
//   CORS_MAX_AGE=86400       — preflight cache duration in seconds (1 day default)
//
// Integration:
//   app.use(corsMiddleware)
//
// Security notes:
// - Never echo back the Origin header without an allowlist check.
//   A wildcard or unchecked echo enables CORS-based attacks.
// - credentials=true requires a specific allowed origin (no '*').
// - Preflight cache (MAX_AGE) reduces OPTIONS overhead for active clients.
//
// For local dev, add http://localhost:5173 (Vite) and http://localhost:3000 (API).
import type { IncomingMessage, ServerResponse } from 'node:http'

export function corsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const origin = req.headers.origin
  const allowedOrigins = parseEnvList(
    process.env.CORS_ALLOWED_ORIGINS ?? '',
  )

  // Check if the requesting origin is in our allowlist
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)

    // Credentials require a specific origin — not allowed with wildcard
    if (process.env.CORS_CREDENTIALS === 'true') {
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
  }

  // Handle preflight OPTIONS requests — browser checks permissions before sending
  // the actual request. Respond with which methods/headers are allowed.
  if (req.method === 'OPTIONS') {
    const allowedMethods = parseEnvList(
      process.env.CORS_ALLOWED_METHODS ??
        'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    )
    const allowedHeaders = parseEnvList(
      process.env.CORS_ALLOWED_HEADERS ??
        'Content-Type,Authorization,Idempotency-Key,X-Request-Id',
    )
    const exposeHeaders = parseEnvList(
      process.env.CORS_EXPOSE_HEADERS ??
        'X-Request-Id,X-RateLimit-Remaining,X-RateLimit-Limit',
    )
    const maxAge = process.env.CORS_MAX_AGE ?? '86400'

    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(','))
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','))
    res.setHeader('Access-Control-Expose-Headers', exposeHeaders.join(','))
    res.setHeader('Access-Control-Max-Age', maxAge)
  }
}

// Parse a comma-separated env var into an array, trimming whitespace.
function parseEnvList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
