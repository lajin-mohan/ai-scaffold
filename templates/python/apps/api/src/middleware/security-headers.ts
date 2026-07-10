// Security headers middleware. Adds HSTS, CSP, X-Frame-Options, etc.
// to every HTTP response. Plug into Fastify/Koa/Express/etc. via:
//   app.use(addSecurityHeaders)
//
// Headers are tuned for a JSON API — no browser rendering, minimal attack surface.
// CSP is restrictive: no scripts, no frames, no inline styles. For SPAs that need
// browser JS, override the CSP directives per docs in security-rules.md §CSP.
import type { IncomingMessage, ServerResponse } from 'node:http'

export function addSecurityHeaders(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  // Prevent MIME type sniffing — forces browser to respect Content-Type
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Prevent clickjacking — blocks embedding in iframes on same origin
  res.setHeader('X-Frame-Options', 'DENY')
  // Prevent referrer leakage when navigating away from the API
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Force HTTPS for 1 year; include subdomains to cover all app subdomains
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  )
  // CSP for a pure JSON API: no scripts, no frames, no form posting to third parties.
  // This is the strictest safe setting — nothing renders in-browser from this API.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'none'",
      "frame-ancestors 'none'",
      'form-action \'self\'',
      'base-uri \'self\'',
      'object-src \'none\'',
    ].join('; '),
  )
  // Legacy IE header — belt-and-suspenders alongside nosniff above
  res.setHeader('X-Content-Security-Policy', "default-src 'none'")
  // Block all caching — API responses may contain auth-sensitive or personal data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  // Explicit content type for all API responses
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
}
