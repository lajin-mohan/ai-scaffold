# Pattern: Transactional Outbox

The transactional outbox pattern guarantees that **side effects (jobs, events, emails) are delivered if and only if the database transaction that triggered them commits**. It is the standard solution to the "the row was created but the email never sent" class of bugs.

Use this pattern for any side effect that **must not be lost** even if the process crashes, the queue is unreachable, or the network is partitioned at exactly the wrong moment.

---

## When to use it

| Side effect | Use outbox? | Reason |
|---|---|---|
| Welcome email after signup | Yes | Lost emails are user-visible; "we created your account but the email never came" is a support ticket. |
| Audit log entry | No (write inline in same tx) | The audit log lives in the same DB; a transactional INSERT is sufficient. |
| Webhook to external partner | Yes | Partner integrations have SLAs; lost webhooks break contracts. |
| Cache invalidation | Acceptable to skip outbox | Cache will eventually reach consistency on its own. |
| Real-time notification (best-effort) | No | If the user is offline, the notification was going to be lost anyway. |
| Payment capture | Yes (and idempotency key on the payment provider) | Money. |
| Search index update | Yes | Stale indices cause real bugs in user-facing search. |
| Internal metrics emission | No | Loss is acceptable in exchange for simpler code. |

Rule of thumb: **if losing the side effect would require human investigation, use the outbox.**

---

## How it works

```
+-----------+       1. INSERT app row              +------------+
|  service  |  --------------------------------->  |  database  |
|           |       2. INSERT outbox row           |            |
|           |  --------------------------------->  |            |
|           |       3. COMMIT (atomic)             |            |
+-----------+                                      +------------+
                                                          |
                                                          v
+----------+         4. Poll for unsent rows        +------------+
| outbox   |  <----------------------------------   |  database  |
| worker   |         5. Send to queue/HTTP/email    |            |
| (separate|  --------------------------------->    |            |
| process) |         6. Mark sent                   |            |
+----------+  ------------------------------->      +------------+
```

Both step 1 and step 2 happen inside the **same transaction**. They commit or roll back together. Once committed, the worker drains the outbox at its own pace and at-least-once semantics guarantee delivery.

---

## Schema

```sql
CREATE TABLE outbox_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  destination     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

ALTER TABLE outbox_events
  ADD CONSTRAINT chk_outbox_events_status
  CHECK (status IN ('pending', 'sent', 'failed_permanent'));

-- Worker picks the next batch via this index.
CREATE INDEX idx_outbox_events_pending
  ON outbox_events (next_attempt_at)
  WHERE status = 'pending';

-- Cleanup after retention window.
CREATE INDEX idx_outbox_events_sent_at
  ON outbox_events (sent_at)
  WHERE status = 'sent';
```

`destination` lets one outbox table serve multiple workers (`'job:send-application-confirmation'`, `'webhook:partner-x'`, `'email:transactional'`). Each worker filters on its own destination prefix.

---

## Service-layer integration

In the service, write the outbox row inside the same transaction as the primary entity:

```typescript
const application = await this.db.transaction(async (tx) => {
  const created = await this.repo.create(input, tx)

  await this.audit.record({ ... }, tx)

  await this.outbox.enqueue({
    tenantId: ctx.tenantId,
    eventType: 'application.created',
    destination: 'job:send-application-confirmation',
    payload: { applicationId: created.id },
  }, tx)

  return created
})
// At this point: applications row + audit row + outbox row are all
// committed atomically. The outbox worker will pick the row up on its
// next poll and dispatch it.
```

The service never directly enqueues into the job queue. **All side effects flow through the outbox.**

---

## Worker process

A separate, long-lived process (or a scheduled job in serverless environments):

```typescript
async function drainOutbox(db: DatabaseClient, dispatcher: Dispatcher) {
  while (true) {
    // Use FOR UPDATE SKIP LOCKED to allow multiple workers to safely run
    // in parallel without picking the same row.
    const batch = await db.queryMany(
      `SELECT * FROM outbox_events
        WHERE status = 'pending' AND next_attempt_at <= NOW()
        ORDER BY next_attempt_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED`,
      [],
    )

    if (batch.length === 0) {
      await sleep(1000)
      continue
    }

    for (const row of batch) {
      try {
        await dispatcher.send(row)
        await db.execute(
          `UPDATE outbox_events
             SET status = 'sent', sent_at = NOW()
             WHERE id = $1`,
          [row.id],
        )
      } catch (err) {
        const attempts = row.attempts + 1
        const isPermanent = attempts >= MAX_ATTEMPTS
        await db.execute(
          `UPDATE outbox_events
             SET attempts = $1,
                 status = $2,
                 last_error = $3,
                 next_attempt_at = NOW() + INTERVAL '1 minute' * POWER(2, $1)
             WHERE id = $4`,
          [
            attempts,
            isPermanent ? 'failed_permanent' : 'pending',
            String(err),
            row.id,
          ],
        )
      }
    }
  }
}
```

Backoff is exponential: 2 minutes, 4, 8, 16, ... up to `MAX_ATTEMPTS` (typically 8-10), at which point the row is marked `failed_permanent` and an alert fires for human investigation.

---

## At-least-once delivery — consumer must be idempotent

The outbox guarantees **at-least-once** delivery, not exactly-once. A worker may successfully dispatch a side effect, then crash before marking the row sent — on restart it dispatches again. The downstream consumer (the email service, the webhook target, the job handler) **must be idempotent**.

Practical patterns:
- Use the outbox `id` as the idempotency key when calling the external service.
- Consumers de-dupe on that key.
- For job queues like BullMQ / pg-boss, use `id` as the job's deduplication key.

---

## Cleanup / retention

Old `sent` rows accumulate forever unless cleaned. A nightly job:

```sql
DELETE FROM outbox_events
WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';
```

`failed_permanent` rows stay indefinitely (they are bug evidence, deleting them hides the failure).

---

## Operational concerns

| Concern | Mitigation |
|---|---|
| Worker lag (outbox backlog grows) | Alert on `count(*) WHERE status='pending' AND next_attempt_at < NOW()` exceeding a threshold |
| Poison messages stuck retrying | `MAX_ATTEMPTS` cap + alert on `failed_permanent` rows |
| Hot lock contention on the index | Use `FOR UPDATE SKIP LOCKED` and partition by `tenant_id` if needed |
| Bursty load on the queue/email provider | Outbox naturally smooths the rate by batch size + sleep interval |
| Duplicate sends after worker crash | Consumer must be idempotent (see above) |
| Large payloads bloating the table | Move large blobs to S3, store URL in `payload` |

---

## When NOT to use this pattern

- **You can lose the side effect without anyone noticing.** Don't pay the complexity cost.
- **The side effect must complete synchronously before responding to the user.** Outbox is asynchronous — the user's HTTP response returns before the side effect happens. If the user expects to see the result immediately (e.g. a charge confirmation), do the work synchronously and accept the failure mode.
- **You're using a managed serverless DB without long-running connections.** The worker pattern assumes a process that can hold a DB connection. With Lambda + RDS Proxy this is workable but adds complexity.

---

## How this pattern relates to the example in `apps/api/src/`

The example `applications.service.ts` does **not** implement the full outbox. It wraps `insert + audit + idempotency_keys` in a single transaction (atomicity for the DB writes) and then enqueues the welcome-email job **outside** the transaction (best-effort delivery). This is a deliberate simplification:

- The pattern is documented (this file) so teams know what to do when they need durability.
- A working example would require a worker process, a service runtime, and a real job queue — all of which are out of scope for the template.
- The first time a real project loses an email and gets a support ticket, the team implements this pattern. Until then, the simpler code is easier to read.

If you are building a payments flow, signups with strict notification SLAs, or any partner-webhook integration, **start with the outbox**. Don't wait for the support ticket.

---

## References

- Chris Richardson, _Microservices Patterns_, ch. 3 (the canonical reference)
- [microservices.io — Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [pg-boss documentation](https://github.com/timgit/pg-boss) — a Postgres-backed job queue that conveniently colocates outbox + jobs in the same DB
