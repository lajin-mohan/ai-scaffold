# Completed roadmap entries — archived 2026-10-13

Moved from the active roadmap during the maintainer-requested A + E reconciliation.
These are preserved historical statements, not new verification claims. CHANGELOG.md
remains the permanent shipped record; original investigations are retained here.
Partial/open tickets such as item 66 stay in the active roadmap.

Additional reconciliation: item 85 shipped in 0.16.1 and its completed ticket
is `tasks/done/85-token-report-always-loaded.md`. Item 94 was verified by the
maintainer against installed npm 0.16.0/0.16.1 with decoy tests; its completed
ticket is `tasks/done/94-spawn-from-path.md`. Both are prerequisites/evidence,
not remaining implementation work. Basic item 86 guidance shipped with 95;
its domain-control slice remains in the active backlog.

- **56. Safeguard the delete-and-reinstall workaround — ✅ DONE.** Before `ais
  update` became P0, "delete the project and re-run `ais create`" was the
  accepted interim path; it remains a recovery fallback. Shipped: a
  "Before You Reinstall" README section naming the non-regenerable files
  (`tasks/lessons.md`, `.claude/MEMORY.md`, `.ai-scaffold/context.md`,
  `.claude/settings-overrides.json`, hand-edited `.claude/rules/*`), and `ais
  export-context [dir]` — copies those paths to
  `~/.ai-scaffold-backups/<project>-<timestamp>/` (**outside** the project, on
  purpose: verified the backup survives the source project being deleted, the
  exact scenario this exists for). `--out <path>` to override the destination.
  Not drift detection (that's item 26, deferred with 25) — a fixed, definite
  file list. 2 e2e tests + 3 smoke gates; ships via the existing `src/cli/`
  package glob (no new dependency — plain `fs-extra` copy). *(done)*

---

- **54 (was 51). Auto-wire the git `pre-commit` hook on `create` — ✅ DONE
  (#85).** `create` copies `.claude/hooks/pre-commit` into `.git/hooks/`
  (executable) right after the initial scaffold commit, so gates apply to
  commits made *outside* Claude Code too; respects `--no-git`. Wiring it live
  surfaced and fixed 3 previously-silent hook defects (branch regex rejected
  `main`/`dev`/`master`; Node check called a nonexistent `test:unit` script;
  Python check pointed at a nonexistent `tests/unit/` dir) across all 5
  profiles + this repo's own copy. E2E test + 3 smoke gates. *(done)*

---

- **28 (elevated). Per-command CLI reference — ✅ DONE.** `docs/cli-reference.md`
  covers all 7 commands with every flag, generated from the CLI's actual
  `--help` output (not memory), linked from the README Command Reference
  section. *(done)*

---

- **T0. Token measurement (enabler) — ✅ DONE (0.9.1).** `npm run token-report`
  (`scripts/token-report.js` + unit-tested `src/cli/core/token-report.js`) measures
  the scaffold's own corpus by category, always-loaded vs on-demand, top files, and
  the `/review` fan-out floor. Run before/after every change below.
  - **Baseline 2026-07-13: ~138K est-tokens** (chars/4). Always-loaded (`CLAUDE.md`)
    only **7K / 5%** — confirms leaner-`CLAUDE.md` (T4) is low-value. The fat is
    **commands 47K / 34%** and **rules 39K / 29%** → T5 (prune) + T2 (dedup) are the
    real levers. Largest single files: `ai-coding-rules.md` (~6.1K),
    `design-system.md` (~5.6K), `what-next.md` (~4.5K).
  - **Corrected 2026-10-09 — the "only 7K / 5%" premise was wrong.** Rules
    without `paths:` frontmatter load at launch with the same priority as
    `CLAUDE.md` (memory docs), and only the 8 `stacks/` overlays carry it. Real
    always-loaded size in a generated project is about **37k tokens** (147.5 KB).
    The report's "on reference" label for rules is the defect; it is fixed in
    item 85, and T4 is superseded by item 84.
  - Maintainer tool (measures this repo). A user-facing `ais tokens` / `/health`
    view of a *generated* project's corpus is a later optional extension.
    *(done)*

---

- **T1. Tiered / lite review — ✅ DONE (0.9.1).** `/review --lite` runs one
  consolidated pass (no 5-subagent fan-out) for XS/S changes, with a **hard,
  non-negotiable escalation** back to the full review when the diff touches
  auth/tenant/payments/data/migrations/secrets/new-endpoint or is > S. Same
  BLOCK/WARN/NIT report; security always surfaced. Removes the ~⅘ fan-out cost on
  small work without trimming guardrails on risky work. Shipped in `review.md`
  across all five profiles. *(done)*

---

- **T3. — ✅ DONE.** All 8 `.claude/rules/stacks/*.md` overlays now carry
  `paths:` frontmatter (extension + manifest-file globs per stack — e.g.
  `backend-python.md` scopes to `**/*.py`, `**/pyproject.toml`,
  `**/requirements*.txt`), so an overlay only enters context when Claude
  actually reads a matching file, instead of loading unconditionally every
  session regardless of profile. Every profile ships all 8 overlays
  unconditionally (confirmed 2026-08-13 — even a `python`-profile project
  carries `backend-java.md`, `backend-dotnet.md`, `backend-coldfusion.md`,
  etc.), so this was broader than "a Go project carries React rules" — every
  non-matching profile was carrying every other profile's rules, unscoped.
  Verified: byte-identical across the 6 copies (main + 5 templates), same
  pattern as every other cross-profile file in this repo. **Not yet verified
  live**: adding a project-side `InstructionsLoaded` hook to confirm
  empirically that a Go session never actually loads `backend-python.md` —
  worth doing before calling T3 fully proven, not just correctly configured.

---

- **47. — ✅ DONE / superseded (one-button release flow).** The post-release
  `main→dev` sync no longer exists to automate: the new fast-forward release
  flow (`docs/setup/release-flow.md`, `.github/workflows/release.yml`) promotes
  `dev → main` by fast-forward, so `main` is always an ancestor of `dev` and
  there is nothing to sync. Removed `post-release-sync.yml` and
  `scripts/sync-main-into-dev.sh`. Remaining human step is the one-time repo
  setup in `release-flow.md` (a `RELEASE_PAT` secret + a branch-protection
  bypass for that identity). *(superseded — the sync problem is designed out)*

---

- **29. — ✅ DONE (2026-07-14).** Deleted the stray `v1.0` tag (local + remote,
  explicit human confirmation obtained). `v1.0.0` was never published to npm —
  nothing real was at risk. `git fetch --tags` is clean again. Confirmed
  alongside a versioning decision: the next release stays on the `0.x` line
  (e.g. `0.11.0`); `1.0.0` is not cut until the v1.0 completeness criteria in
  "The 8.5+ path" are actually met, not implied by a leftover tag name.

---

- **44. — ✅ DONE.** Removed stray cruft from all 5 profile template dirs.
  Broader than originally scoped: `templates/*/apps/` turned out to be a
  byte-identical duplicate of the repo's real, documented reference example
  (root-level `apps/api/src/`, referenced from CLAUDE.md) — present in **all
  five** profiles, not just golang/python, and confirmed excluded from every
  copy plan (`apps/**` in `EXCLUDED_DEFAULT_PATTERNS`), so it never shipped.
  `templates/*/.vscode/` (3 of 5 profiles) had zero documentation anywhere as
  an intentional feature and was likewise excluded/unshipped. Root-level
  `apps/` and `.vscode/` (this repo's own reference example and editor
  config) are untouched. Verified: all 5 profiles still create cleanly with
  0 CRIT/HIGH doctor failures after removal.

---

- **46. — ✅ DONE (0.10.0 docs audit).** Fixed the repo's own
  `.claude/skills/design-system/SKILL.md` → `DESIGN_TOKENS.md` links (4 occurrences
  had a doubled `.claude/skills/` prefix); the file is now byte-identical to
  the (already-correct) template copies.

---

- **57. — ✅ DONE (bump + date on dev, via the one-button release flow).** The
  `main→dev` `-s ours` sync discarded main's content, so the release-branch
  version bump + CHANGELOG dating never reached `dev` — dev's `package.json`
  and CHANGELOG drifted every release (hand-fixed three times: 0.10.0, 0.10.1,
  0.10.2, plus the 0.9.0→0.10.2 catch-up in PR #102). Designed out: the new
  release flow (`docs/setup/release-flow.md`) stamps the version and dates the
  CHANGELOG **on `dev`** and then fast-forwards `main` to that commit, so both
  branches always agree and there is no content to lose. `prepare-release.sh`
  does the stamping; `release.yml` drives it. *(done — root cause removed, not
  patched)*

---

- **58. — ✅ DONE (Go-aware shared profile wiring).** Added `go.mod` detection
  to the shared profile pre-commit hook and wired `go build ./...`,
  `go vet ./...`, and `go test ./...` behind `command -v go`. The shared
  Claude permissions, pre-review hook, `/start-task`, `/review`, and source CI
  template are now stack-aware and byte-identical across all five profiles, so
  generated Go projects no longer inherit Node-only verification prompts.
  Covered by unit tests in `src/__tests__/core.test.js` and a pre-publish smoke
  gate that runs the generated Go pre-commit hook.

---

- **59. — ✅ DONE.** `pre-commit` hook branch-name regex now allows `docs/*`,
  matching `branching-rules.md`'s documented set
  (`feature|fix|chore|docs|hotfix|release`). Fixed the regex and the header's
  human-readable pattern list in all five profile hooks + this repo's own
  copy (byte-identical). No more forced rename to `chore/` for doc-only work.

---

- **60. — ✅ DONE (2026-10-12, #145; ships in 0.16.0).** A required `Windows checks` job runs lint, typecheck and the smoke gate (with the full test suite) on `windows-latest`. Its first run reproduced the governance-guard Windows defect (items 81/83). Record: `tasks/done/60-windows-ci.md`. Original finding:
  **No Windows CI runner — Windows-only bugs ship in every release.**
  Found 2026-07-15 (PR #94): the `path.relative()` backslash bug meant
  `.claude/MEMORY.md` and `.claude/settings-overrides.json` were never
  generated on Windows for **any** profile, surfacing as two HIGH `ais doctor`
  failures. It shipped in every release the CLI has ever cut, invisible to the
  whole test suite, because every dev machine and CI runner is macOS/Linux —
  the buggy path is never exercised on a forward-slash OS. This is the
  highest-leverage prevention item on the list: the CLI's whole job is writing
  files to a user's filesystem, and half the target audience is on Windows.
  Fix: add a `windows-latest` job to the GitHub Actions matrix running at least
  the `buildFilePlan`/create/init/doctor tests (ideally the full suite). Also
  audit remaining `path.relative(`/`path.join(` sites that feed string
  comparisons for the same class of bug (see 2026-07-15 lessons entry).
  *(medium — CI matrix + a path-normalization audit pass)*

---

- **61. — ✅ DONE (option a: init fills the skeleton in when absent).**
  `init` now generates `tasks/lessons.md` and `CHANGELOG.md` at project root
  exactly when they're genuinely absent — closing the dangling `CLAUDE.md`
  reference — and leaves them completely untouched when a repo already has
  its own (both added to `PROTECTED_PATHS` first, verified in both
  directions: an existing `CHANGELOG.md` survives byte-for-byte; an absent
  one gets created). One subtlety found during implementation:
  `resolveGeneratedTargetRel` was routing generated files into the
  `.ai-scaffold/` namespace on `init` by default — the naive fix would have
  silently generated these at `.ai-scaffold/CHANGELOG.md` instead of project
  root, where neither `doctor` nor a human would ever find them. Fixed by
  treating the governance-skeleton paths as root-forced, like
  `constitution.md`.

---

- **62. — ✅ DONE (gitleaks `git --staged`).** The shipped `pre-commit` and
  `pre-commit-secrets` hooks ran `gitleaks detect --staged --exit-code`, which
  errors (`unknown flag: --staged`) on gitleaks v8.19+ — the `detect` scan form
  was replaced by the `git` subcommand. Verified against a real install
  (gitleaks 8.30.1): `gitleaks git --staged --exit-code 1` passes on a clean
  staged tree and blocks a real (non-allowlisted) secret. Fixed both hooks
  across all five profiles + the repo copies (byte-identical). Regression
  coverage: a unit test asserts the hooks use `git --staged` and never
  `detect --staged`, and a smoke gate (active when gitleaks is installed)
  asserts the hook's gitleaks command runs cleanly rather than erroring on a
  usage flag. Was pre-existing on every release and latent because dev machines
  usually lack gitleaks while CI installs it (same environment-parity blind
  spot as item 60). *(done)*

---

- **63. — ✅ DONE (php→laravel alias + fail-fast profile validation).** Found
  2026-07-19 (PR #107): `ais init --profile php` ran the entire ~18-question
  interview, then crashed with a raw `Template profile not found` stack trace
  — `php` wasn't aliased to `laravel` (the PHP profile) and nothing validated
  the profile before prompting. Added `php`/`laravel8` → `laravel` aliases; both
  `create` and `init` now validate the profile before any prompt, exiting
  cleanly with the valid set + aliases on an unknown value. Same PR also scoped
  the CI dependency-audit gate to `--omit=dev` (shipped CLI has 0
  vulnerabilities; the full-tree audit was failing releases on dev-only tooling
  advisories with no user-facing exposure — see `security-rules.md`). *(done)*

---

- **64. — ✅ DONE.** New `.claude/hooks/token-budget-guard.sh`
  (`PreToolUse`, same matcher as `governance-file-guard.sh`: `Read|Grep|Glob|
  Edit|Write|MultiEdit`) estimates session tokens from the live transcript
  file size (chars/4, matching `scripts/token-report.js`'s own
  `CHARS_PER_TOKEN`) and makes the two thresholds `governance.md` already
  documents actually real: 300K stays a WARN (suggests `/compact`, never
  blocks), 500K now exits 2 and blocks the tool call — configurable via
  `ECC_TOKEN_BUDGET_WARN_TOKENS`/`ECC_TOKEN_BUDGET_BLOCK_TOKENS`, escapable
  via `ECC_TOKEN_BUDGET_WARN_ONLY=1` (same spirit as `git commit --no-verify`
  — an override, not a bypass), and fully fail-open on any missing transcript
  or parse error. Shipped identically in all 5 profile templates and wired
  into all 6 `settings.json` copies. Verified live and unplanned: this exact
  hook blocked a real `Read` call mid-session once this project's own
  transcript passed 500K est-tokens — confirming both the detection and the
  block path work against a real, not synthetic, transcript, in addition to
  9 scripted bash-level test cases and 4 Vitest cases covering byte-identity,
  wiring, warn/block/override behaviour, and fail-open on a missing
  transcript.

---

- **65a. Profile smoke coverage — ✅ DONE.** `scripts/pre-publish-smoke.sh` gained an explicitly
  labeled "Gate 4b-2: Profile Smoke (laravel + generic)" section, following
  the same pattern already used for python/golang: `create`, a README
  real-commands check (laravel: `composer install`/`composer test`; generic:
  README.md + constitution.md existence, since generic is stack-agnostic), a
  `.gitignore`-renamed-correctly check, and a `doctor` CRIT/HIGH-clean check
  — closing the gap where only 3 of 5 profiles had named smoke coverage.
  Along the way, found and fixed 2 gates left stale by item 61's behaviour
  change (both asserted `tasks/` and `CHANGELOG.md` must never exist after
  `init`, which item 61 correctly makes false) — replaced with positive
  assertions that both are generated when absent. Baseline was 107 gates;
  the full suite is now 113/113 passing (all 5 profiles have named smoke
  coverage; the aggregate pass rate is the trackable signal this item asked
  for).
  **P0 follow-up:** replace README string/presence assertions with execution of
  every profile's documented install and first test/health commands in CI. A
  passing source suite cannot substitute for running the generated project.

---

- **65b. Packed-artifact golden-path execution — ✅ DONE (0.15.0, #137/#138).**
  Shipped as `scripts/golden-path.js` plus the runnable Laravel skeleton; see
  CHANGELOG 0.15.0. The text below is the decision record.
  65a proved the gates run; it did not prove the generated projects work. The
  smoke gate greps a generated README for `composer install` and `composer test`
  — it greps for a command it never runs, and does not grep the two that are
  broken. Stage 1 executed every documented command on all five profiles and
  found: laravel's documented path dies at `php artisan migrate` (no `artisan`,
  no `app/`, `bootstrap/`, `config/` or `database/`), and node's `lint`,
  `typecheck`, `build` and `dev` are `echo` stubs that exit 0 — a gate running
  them would see four passes and prove nothing.

  Decisions (maintainer, 2026-09-01): laravel **remains Laravel** and must
  become runnable (rename to `php` is a separate approval, never Laravel
  branding over a non-Laravel project); placeholders **fail**, they are not
  skipped; verification runs in normal CI on profile/package changes **and** in
  the pre-publish packed gate, which is authoritative; both static and
  execution layers are kept, reported separately. Success means executing
  commands from a project generated **from the packed npm artifact** — never
  from `templates/` or the working tree.

  Artifacts: analysis and BRD v1.0 in `docs/brd/65-golden-path-execution-*.md`;
  estimate `docs/estimates/65-golden-path-execution-estimate.md` **approved
  2026-09-01** at 5.6 / 12.0 / 21.3 days (PERT 12.0, MEDIUM), with four named
  re-estimate triggers. Next gates: Laravel skeleton spike → estimate
  reconfirmation → HLD/ADR with **independent architecture review** (this is
  release-gating test infrastructure) → `/kickoff` → implementation.

  Blocks Wave 0's golden-path metric, which has no honest source until this
  ships. *(M — see the approved estimate)*

---

- **71. — ✅ DONE (generated projects).** Shipped the linear flow: hook refuses
  commits on `dev`/`main`, opt-in branch-flow CI, `release/*` removed, `hotfix/*`
  kept as the documented exception with a required back-merge, and
  `setup-branch-protection.sh` now ships (configurable) at
  `.ai-scaffold/setup/`. `ais create` initialises `main` + `dev` so the flow is
  true on day one. ai-scaffold itself deliberately unchanged — see item 70.
  Original scope below.

---

## Shipped (done — detail in CHANGELOG)

Removed from the active backlog after verification against npm/git.

| Ver | Delivered (old item #) |
|---|---|
| 0.8.1–0.8.7 | Trusted publishing + provenance, branch protection, CI security gates (npm audit + gitleaks), python/go profiles, `ais list`, `--dry-run --json` (14), `copy.js` refactor (13), `release:check` (20), `.gitignore` packaging fix (11b), automated `main→dev` sync |
| 0.8.8 | Node profile real test (35); genericized shipped `.claude/` content (part of 37); sync tolerance (part of 47) |
| 0.9.0 | **Project constitution (39)**; generated-output genericization finished — no author/org/license leaks (37); **Claude-feature modernization** (per-agent `model`, read-only reviewer `tools`, command `description` frontmatter, honest Agent-Skills list); tarball-based smoke gate that runs `doctor` per profile (36); README flow diagram + zero mermaid; GH Actions on Node 24 (45); worktree-safe `vitest` |

---
