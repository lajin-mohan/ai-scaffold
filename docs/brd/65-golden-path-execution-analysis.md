# Item 65 follow-up — golden-path execution in CI · Stage 1 Analysis

**Status:** Draft for review · **Date:** 2026-09-01 · **Wave:** 1 (rank 4, P0)
**Predecessor:** item 65 (✅ done — named smoke coverage for all five profiles)

---

## 1. The problem, in the backlog's own words

> **P0 follow-up:** replace README string/presence assertions with execution of
> every profile's documented install and first test/health commands in CI.
> A passing source suite cannot substitute for running the generated project.

Item 76 restates the same risk from the other side: once the scaffold stops
dogfounding its own shipped corpus, *nothing exercises it*, and item 65's
follow-up becomes **more** important, not less.

Item 74's baseline records the consequence already: **M-01 golden-path success
has no honest source** and is recorded as null-with-a-start-condition, because
`scripts/pre-publish-smoke.sh` greps generated READMEs rather than running what
they document.

---

## 2. Evidence — every documented command, actually executed

Generated all five profiles with `ais create --profile <p> --yes` at `01d4680`
and ran each command the generated `README.md` documents. This is execution, not
inspection.

| Profile | install | test | lint | typecheck | build | dev / health |
|---|---|---|---|---|---|---|
| **golang** | ✅ `go mod download` | ✅ `go test ./...` | ✅ `go vet ./...` | ✅ `go build ./...` | ✅ | — |
| **python** | ✅ `pip install -e ".[dev]"` | ✅ `pytest` | ✅ `ruff check .` | ✅ `mypy .` | ✅ `python -m compileall .` | — |
| **node** | ✅ `npm install` | ✅ `npm test` (real, `node --test`) | ⚠️ stub | ⚠️ stub | ⚠️ stub | ⚠️ stub |
| **laravel** | ⚠️ network | ⚠️ needs `vendor/` | — | — | — | ❌ **`php artisan` — file does not exist** |
| **generic** | — none | — none | — none | — none | — none | — none |

### Finding 1 — laravel's documented golden path cannot run *(blocking)*

The generated `README.md` documents three steps:

```bash
composer install
php artisan migrate
php artisan serve
```

The generated project contains **no `artisan` file**, and no `app/`,
`bootstrap/`, `config/` or `database/` directories. Step 2 fails immediately:

```
$ php artisan migrate
Could not open input file: artisan
```

`composer.json` compounds it: it requires `laravel/framework: ^12.0` — roughly
100 MB of dependencies — and declares PSR-4 autoload roots (`App\` → `app/`,
`Database\Factories\` → `database/factories/`, `Database\Seeders\` →
`database/seeders/`) for **directories that do not exist**. The only test it
ships, `tests/Unit/SmokeTest.php`, is a plain PHPUnit `TestCase` asserting
`true` and needs nothing from Laravel at all.

**The current gate cannot see this.** `pre-publish-smoke.sh:439-441` greps the
README for the literal strings `composer install` and `composer test`. It greps
for a command it never runs, and it does not grep the two commands that are
broken. This is precisely the defect class the follow-up exists to catch, and it
is present today, in a shipped profile, on `dev`.

### Finding 2 — node's lint, typecheck, build and dev are `echo` stubs

```json
"dev":       "echo \"Configure your Node.js dev command\"",
"build":     "echo \"Configure your Node.js build command\"",
"lint":      "echo \"Configure your Node.js lint command\"",
"typecheck": "echo \"Configure your Node.js typecheck command\""
```

Each exits `0`. A CI gate that "runs the documented commands" would run these
four, see four successes, and prove nothing — a **green gate over an unconfigured
project**. Only `install` and `test` are real on this profile.

This is the item's central design question, not an incidental defect: *executing*
a placeholder is not more honest than *grepping* for one. The gate has to
distinguish a command that ran from a command that echoed, or it manufactures
exactly the false confidence it was created to remove.

### Finding 3 — generic has no golden path, and says so in a way that misleads

Every command in generic's manifest is `"none"`, which is correct: generic is
stack-agnostic. But its `README.md` renders the placeholders literally, inside
fenced code blocks:

```bash
N/A
N/A    # Production build
N/A     # Run tests
```

A reader is being shown `N/A` as a command to type. The golden-path gate must
record generic as **having no golden path** rather than inventing one; the README
rendering is adjacent (item 77's territory) but is surfaced here because it is
the same root cause — a documented command that is not a command.

### Finding 4 — python and golang are genuinely green, end to end

Both profiles' full documented sets pass, including lint, typecheck and build.
They are the proof that the golden path is achievable and worth gating, not a
counsel of despair.

---

## 3. Current CI, and what execution would need

`.github/workflows/ci.yml` runs one job on `ubuntu-latest` with `setup-node`
only. Golden-path execution needs, per profile:

| Profile | Toolchain | Standard action | Network |
|---|---|---|---|
| node | Node (already present) | `actions/setup-node` | npm registry |
| python | Python + pip | `actions/setup-python` | PyPI |
| golang | Go | `actions/setup-go` | none (no module deps) |
| laravel | PHP + composer | `shivammathur/setup-php` | Packagist (~100 MB) |
| generic | — | — | — |

All are first-party or widely-used actions on free runners. The cost is CI
minutes and, for laravel, a large dependency download on every run.

---

## 4. Options

| # | Option | Trade-off |
|---|---|---|
| A | Execute install + test only, on the four profiles that have them | Smallest, honest, catches finding 1 immediately. Leaves node's four stubs ungated — but they are *documented as unconfigured*, so there is nothing to gate |
| B | Execute every documented command, with a **placeholder detector** that fails the gate if a command is a stub *while the README presents it as real* | Catches findings 1 **and** 2. Requires defining "placeholder" precisely — the single most important decision in this item |
| C | Execute everything, treat stubs as passes | Cheapest to build, and reintroduces the false confidence the item exists to remove. **Not recommended** |
| D | Fix laravel first as its own change, then gate | Sequencing question, not an alternative — the gate is what proves the fix |

**Recommendation: B, with A as the first shipped slice.** A is a day; it turns
finding 1 from an argument into a red build. B needs the placeholder contract
agreed first.

---

## 5. Open questions — these are decisions, not research

- **Q-01. What is laravel's correct golden path?** Two honest answers, and they
  are materially different products: (a) ship a runnable minimal Laravel skeleton
  (`artisan`, `bootstrap/`, `config/`, `app/`) so the documented commands work;
  or (b) document what the profile actually is — a PHPUnit-tested PHP project
  with Laravel conventions — and drop `php artisan` from the README until a real
  Laravel app exists. (b) also makes `laravel/framework` a candidate for removal,
  cutting the CI cost from ~100 MB to nearly nothing.
- **Q-02. Does a placeholder command count as documented?** Node ships four
  `echo` stubs. Should the gate fail them, skip them, or require the README to
  stop presenting them as commands?
- **Q-03. Where does this run** — the existing `ci.yml` on every PR, or a
  scheduled/pre-release workflow? Four toolchains on every push is a real
  minutes cost for a repository whose own suite is fast.
- **Q-04. Does the gate replace the README greps, or join them?** The backlog says
  "replace". The greps are cheap and catch a different failure (documentation
  drift). Recommend keeping both, and saying so explicitly.

---

## 6. Size

The backlog records **S–M**. The evidence moves it to **M**: finding 1 is not a
test-harness gap but a broken shipped profile whose repair (Q-01) is a product
decision with two defensible answers, and finding 2 requires a contract before
any gate can be written honestly.

Per `task-size-policy.md`, **M requires BRD + estimate + architecture (HLD + ADR)**
before execution.

---

## 7. What this unblocks

- **Item 74 M-01** — golden-path success gains its first honest source; the
  metric moves from null-with-a-start-condition to a real series.
- **Item 76** — makes it safe for the scaffold to stop dogfooding its own shipped
  corpus, which that item requires.
- **Item 34** — a shared base plus overlays is far safer to attempt once each
  profile's day-one workflow is executed on every change.
