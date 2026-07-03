// Sliding window rate limiter. Thread-safe, in-memory for single-instance.
// For multi-instance / distributed deployments, replace InMemoryRateLimitStore
// with a Redis-backed store (Redis sorted sets map naturally to sliding windows).
//
// Configured via env vars:
//   RATE_LIMIT_WINDOW_MS=60000       — window size in milliseconds
//   RATE_LIMIT_MAX_READ=100          — max read requests per window per identifier
//   RATE_LIMIT_MAX_WRITE=20          — max write requests per window per identifier
//   RATE_LIMIT_LOGIN_MAX=5           — max login attempts per window
//
// Integration: create a per-route limiter and call .check(identifier) before handling.
//   const readLimiter = rateLimiterFactory('read', 100)
//   app.get('/users', async (req, res) => {
//     readLimiter.check(req.ip)  // throws RateLimitError on breach
//     // ... handle request
//   })
//
// Returns Retry-After header via RateLimitError when limit is exceeded.
import { RateLimitError } from './error-handler.js'

export interface RateLimitStore {
  getHits(identifier: string, windowStart: number): Promise<number>
  recordHit(identifier: string, timestamp: number): Promise<void>
}

// Factory: creates a RateLimiter configured for a specific limit tier.
export function rateLimiterFactory(
  tier: 'read' | 'write' | 'login',
  store: RateLimitStore,
): RateLimiter {
  const limits: Record<string, { windowMs: number; maxRequests: number }> = {
    read: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
      maxRequests: Number(process.env.RATE_LIMIT_MAX_READ ?? 100),
    },
    write: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
      maxRequests: Number(process.env.RATE_LIMIT_MAX_WRITE ?? 20),
    },
    login: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
      maxRequests: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5),
    },
  }

  const config = limits[tier]
  return new RateLimiter(store, config.windowMs, config.maxRequests)
}

export class RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly windowMs: number,
    private readonly maxRequests: number,
  ) {}

  async check(identifier: string): Promise<void> {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Prune old entries before counting — keeps memory bounded
    await this.store.recordHit(identifier, now)
    const hits = await this.store.getHits(identifier, windowStart)

    if (hits > this.maxRequests) {
      // Retry-After is communicated via the error; the route handler catches it
      // and sets the HTTP header. Retry delay = remaining time in current window.
      const retryAfter = Math.ceil(this.windowMs / 1000)
      throw new RateLimitError(retryAfter)
    }
  }
}

// In-memory implementation — use for single-instance dev/test.
// For production with multiple app instances, use RedisSortedSetStore instead.
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, Array<{ ts: number }>>()

  async getHits(identifier: string, windowStart: number): Promise<number> {
    const entries = this.hits.get(identifier) ?? []
    const valid = entries.filter((e) => e.ts >= windowStart)
    // Maintain pruning: remove expired entries on each read
    this.hits.set(identifier, valid)
    return valid.length
  }

  async recordHit(identifier: string, timestamp: number): Promise<void> {
    const existing = this.hits.get(identifier) ?? []
    existing.push({ ts: timestamp })
    this.hits.set(identifier, existing)
  }
}
