# Spike — minimal runnable Laravel skeleton (item 65b)

**Date:** 2026-09-01
**Run by:** Claude (Cowork session)
**Purpose:** price FR-10…FR-14 and settle the readiness question the BRD left open.
**Method:** built a real `laravel/laravel` app, stripped it until the golden path broke,
added back only what was required. Every claim below is an observed exit code, not a reading
of the framework docs.

---

## Result: the skeleton is smaller than the estimate assumed

**31 files** (excluding `vendor/`, lockfile, `.env`, the SQLite file and runtime cache).
The reference app ships 48 non-vendor files; the working minimum is 31, and the deletions
are whole directories rather than a scattered subset.

### What is required

| Path | Why |
|---|---|
| `artisan` | Entry point. Without it the documented path dies at step 2 — today's defect |
| `bootstrap/app.php`, `bootstrap/providers.php` | Application assembly |
| `app/Providers/AppServiceProvider.php` | Referenced by `bootstrap/providers.php` |
| `composer.json` | Already present; PSR-4 roots must point at directories that now exist |
| `database/migrations/*` (3 files) | What `migrate` actually runs |
| `routes/web.php`, `routes/console.php` | Route registration; `web.php` carries the health route |
| `public/index.php` | Required by `artisan serve` |
| `phpunit.xml`, `tests/TestCase.php`, `tests/**` | Test harness |
| `storage/**` empty dirs + `bootstrap/cache/` | Runtime writable paths — ship as `.gitkeep` |

### What is NOT required — the finding that matters

- **`config/` — zero files.** All ten were deleted and `migrate`, `phpunit` and `serve` still
  pass. Laravel 12 resolves framework defaults. This removes a whole directory the estimate
  assumed would need shipping and maintaining.
- **`resources/`** — no Blade views, no CSS/JS, no `vite.config.js`, no `package.json`
- **`app/Http`, `app/Models`, `database/factories`, `database/seeders`**

### The one real trap

The stock `routes/web.php` returns `view('welcome')`. Delete `resources/` and the default
feature test fails with `View [welcome] not found` — a 500, not a missing file, so it reads as
an application bug rather than a stripped asset. Replacing the route with a viewless JSON
health response fixes it **and** produces the readiness probe FR-22 needs. One change, two
requirements.

---

## Verified golden path

| Step | Result |
|---|---|
| `composer install` | exit 0 — 14s, 84 MB, 38 packages (measured for the estimate) |
| `php artisan migrate --force` | **exit 0**, SQLite, no database service |
| `./vendor/bin/phpunit` | **exit 0**, 2 tests, 2 assertions |
| `php artisan serve` → probe → terminate | **ready in ~750 ms** (3 probes at 250 ms), HTTP 200 on `/up`, clean kill, **no orphaned process, no port left bound** |

---

## Readiness — the BRD's open question, now answerable

The recommended default holds and is now evidenced:

- **Probe:** HTTP GET on a known health route (`/up`), **accept 200 only**. The failure mode
  this must catch returned **500 with a valid HTTP response** — accepting "any valid HTTP
  response" would have reported that broken app as ready.
- **Liveness:** the process must still be alive at each probe; a dead process fails fast
  rather than waiting out the timeout.
- **Cadence/deadline:** 250 ms interval, 10 s deadline. Observed readiness was 750 ms, so the
  deadline carries ~13× headroom.
- **Log-line matching:** not used, per the recommendation. It was never needed.

`/up` is Laravel's conventional health route, so this is not a scaffold invention.

---

## Estimate impact

Assessed against the four re-estimate triggers:

| Trigger | Outcome |
|---|---|
| Realistic effort moves >20% | **Downward pressure, not upward.** `config/` is not needed and the skeleton is 31 files copied from a known-good source, not authored |
| Skeleton needs substantially more framework structure | **No** — it needs less |
| Readiness needs profile-specific infrastructure | **No** — HTTP probe plus liveness, no service, no container |
| Packed-artifact execution exposes another unsupported command | **Not yet tested** — this spike ran against a reference app, not a project generated from the packed tarball |

**Recommendation: hold the approved 12.0 days, do not re-cut.** The largest row
(laravel skeleton, 1.0/2.0/4.0) should land nearer optimistic, but the fourth trigger is still
untested and is exactly the kind of thing that has surprised this project before. Spending the
saving as contingency against that is the honest call.

---

## Carried into the HLD

1. Accept **200 only**, not 2xx/3xx — evidenced above, and the reason is a real observed 500.
2. Liveness check on every probe, not just at the deadline.
3. Port allocation must avoid collisions — this spike hardcoded 8123 on an idle machine, which
   proves nothing about a busy CI runner running profiles in parallel.
4. Process-tree cleanup was verified on **macOS only**. `artisan serve` spawns a child PHP
   process; Linux and Windows behaviour is unverified and is the largest remaining portability
   risk.
5. `storage/**` and `bootstrap/cache/` must ship as directories with writable permissions —
   `npm pack` does not preserve empty directories, so `.gitkeep` entries are required and must
   be in the `files` allowlist.
