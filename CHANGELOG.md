# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the **permanent record of what shipped**. In-flight working state lives in `tasks/todo/` (per-ticket files) and `.claude/work/` (gitignored AI ephemera). Each merging PR adds an entry here.

This file is configured with `merge=union` in `.gitattributes` so parallel additions from multiple branches do not conflict.

---

## [Unreleased]

### Changed
- **One-button release flow — no more post-release sync or version/CHANGELOG
  drift.** Releases now run from a single `workflow_dispatch` (`Release`): it
  runs the gates, stamps the version + dates the CHANGELOG **on `dev`**
  (`scripts/prepare-release.sh`), fast-forwards `main` to that commit, and tags
  it (which fires publish). Because the bump lands on `dev` and `main` only ever
  fast-forwards, `main` is always an ancestor of `dev` — the `main→dev` sync is
  designed out (removed `post-release-sync.yml` and `scripts/sync-main-into-dev.sh`)
  and the recurring metadata drift (backlog item 57) can no longer happen. One-
  time repo setup (a `RELEASE_PAT` secret + a branch-protection bypass for that
  identity) is documented in `docs/setup/release-flow.md`. Closes items 47 and 57.

### Fixed
- **Secrets scan in the shipped hooks now uses a valid gitleaks command.** Both
  `pre-commit` and `pre-commit-secrets` ran `gitleaks detect --staged`, which
  errors (`unknown flag: --staged`) on gitleaks v8.19+ — the `detect` scan form
  was replaced by the `git` subcommand. Any user with a current gitleaks
  installed got a failing pre-commit with a usage error on every commit. Fixed
  to `gitleaks git --staged --exit-code 1` (verified against gitleaks 8.30.1:
  passes on a clean staged tree, blocks a real secret) across all five profiles
  and the repo copies. A smoke gate now asserts the gitleaks command runs
  cleanly when gitleaks is installed, so a stale command can't slip through
  again.
- **Go profile quality gates are now real and shared across all profiles.**
  The hook, review, permission, command, and CI template files had drifted into
  Node-flavored defaults that ignored `go.mod`, so a generated Go project could
  pass pre-commit/pre-review without running Go verification. The shared
  profile files now detect `go.mod`, allow Go verification commands, run
  `go build ./...`, `go vet ./...`, and `go test ./...` from hooks/CI, and use
  stack-neutral `/start-task` and `/review` examples. Regression coverage
  asserts these files stay byte-identical across all five profiles and the
  pre-publish smoke verifies a generated Go project's pre-commit hook actually
  runs Go checks.
- **Windows: generated `.claude/MEMORY.md` and `.claude/settings-overrides.json`
  were never created.** `buildFilePlan` computed each template's relative path
  with `path.relative()`, which emits backslashes on Windows, then used that
  path as an exact key in the forward-slash `GENERATED_FILE_MAP` (and the
  rename/exclusion lookups). On Windows every key missed, so the `.template`
  sources fell through to the "skip raw template marker" branch and their
  generated outputs were silently omitted — surfacing as two HIGH `ais doctor`
  failures on a freshly installed project. Normalized the relative path to
  posix (via the existing `toPosixPath` helper, which was already used in the
  manifest and dry-run planners but not here). Affects **all five profiles** on
  Windows, on both `create` and `init`. Regression test mocks `path.relative`
  to emit backslashes and asserts the generated files survive; a cross-profile
  test asserts both files appear in every profile's plan. Reported by a team
  member installing the golang profile on Windows.
- **Windows PowerShell install note.** Running `npx @lajin.m/ai-scaffold ...`
  in PowerShell failed to parse — PowerShell treats a leading `@` as the
  splatting operator, so the scoped package name blew up before `npx` ran
  (`SplattingNotPermitted`). The CLI can't fix this (the failure is in
  PowerShell's own command parsing, before `npx` launches), so the install
  sections of `README.md`, `HOW-TO-USE.md`, and `docs/cli-reference.md` now
  tell PowerShell users to quote the package name — `npx "@lajin.m/ai-scaffold"
  ...` — and note that a global install avoids the quoting entirely. Found by a
  team member installing on Windows.

## [0.10.0] - 2026-07-14

### Added
- **Per-command CLI reference (item 28).** New `docs/cli-reference.md` covers
  all 7 commands (`create`, `init`, `status`, `doctor`, `list`,
  `export-context`, `update`) with every flag, generated from the CLI's actual
  `--help` output rather than from memory, plus bare-shortcut routing and exit
  codes. Linked from the README's Command Reference section.
- **`ais export-context` — back up project memory before a delete-and-reinstall
  upgrade (item 56).** With `ais update` deferred until after the pilot phase,
  "delete the project and re-run `ais create`" is the accepted interim upgrade
  path — but that silently destroys `tasks/lessons.md` and `.claude/MEMORY.md`,
  the two files where a project's real, non-regenerable value accumulates.
  `ais export-context [dir]` copies those two files plus
  `.ai-scaffold/context.md`, `.claude/settings-overrides.json`, and
  `.claude/rules/` to `~/.ai-scaffold-backups/<project>-<timestamp>/` —
  **outside** the project directory on purpose, verified to survive the
  source project being deleted. `--out <path>` to override the destination.
  Deliberately a fixed, definite file list, not drift detection (that's item
  26, deferred alongside `ais update`). New "Before You Reinstall" README
  section. Ships via the existing `src/cli/` package glob — no new dependency.
- **`create` wires the git `pre-commit` hook on every new project (item 54).**
  Generated projects shipped `.claude/hooks/pre-commit`, but nothing installed
  it into `.git/hooks/`, so branch-name and lint gates only applied to commits
  made through Claude Code (`pre-bash-quality-gate.sh`) — a commit from a plain
  terminal bypassed them entirely. `create` now copies the hook into
  `.git/hooks/pre-commit` and sets it executable, right after the initial
  scaffold commit succeeds (installing it earlier would let the newly-wired
  hook block that very commit). Respects `--no-git`. Verified end-to-end: the
  hook allows the initial commit and any commit on `main`/`dev`/`master` or a
  well-formed `feature/*` branch, and genuinely rejects a malformed branch name
  (no commit object is created).

### Fixed
- **Docs audit for 0.10.0.** The README Command Reference table was missing the
  `list` command row (7 commands registered, 6 documented). The repo's own
  `CLAUDE.md` "Current State" section was six releases stale (still described
  the v0.8.1 milestone). The repo's own `.claude/skills/design-system.md` had 4
  broken `DESIGN_TOKENS.md` links with a doubled `.claude/skills/` prefix
  (hygiene item 46 — template copies were already correct; the repo copy now
  matches them byte-for-byte). The backlog misreferenced the pilot retro as
  item 52 after the renumbering (it is 55) and undercounted the smoke gates
  (99 → 105). All relative links across README, cli-reference,
  README.scaffold, HOW-TO-USE, and CONTRIBUTING verified to resolve.
- **Three verified defects in the shipped `pre-commit` hook, found while
  wiring it live for item 54** (previously silent — the hook was never
  invoked automatically, so these never fired):
  - The branch-name regex only allowed `feature|fix|chore|hotfix|release`
    with a required slash suffix — it rejected `main`, `dev`, and `master`
    outright. Since `git init` on this machine (and many others without
    `init.defaultBranch` configured) defaults to `master`, wiring the hook
    as-is would have blocked the *second* commit on every fresh project.
    Fixed to `^(main|dev|master)$|^(feature|fix|chore|hotfix|release)/...+$`
    across all five profiles and this repo's own copy (which had a related
    bug: its regex accidentally also allowed *bare* `feature`/`fix`/`chore`/
    `hotfix`/`release` with no slug, contradicting its own naming convention).
  - The Node/generic "Unit Tests" check ran `npm run test:unit -- --run`, but
    generated projects only define a `test` script (`node --test` for node,
    a stub for generic) — `test:unit` doesn't exist, so the check would FAIL
    on every commit. Fixed to `npm test`.
  - The Python "pytest" check ran `pytest tests/unit/ -v`, but the generated
    project's real test file is `test_smoke.py` at the project root and
    `pyproject.toml` already sets `testpaths = ["."]`. Fixed to bare `pytest`.
- **`dev`'s `CHANGELOG.md` was missing the `[0.9.0]` and `[0.9.1]` dated
  headings** that exist on `main` — the post-release `main→dev` sync uses
  `git merge -s ours` (ancestry-only, intentionally discards `main`'s content),
  so the heading-dating done on each release branch never made it back to
  `dev`; all that content sat undated under `[Unreleased]` instead. Restored
  from `main` (content was otherwise byte-identical). Tracked as hygiene item
  57 to fix the underlying process so this doesn't recur every release.

## [0.9.1] - 2026-07-13

### Added
- **`/review --lite` tiered review mode (T1).** One consolidated review pass in
  the main context instead of the five-subagent fan-out, for XS/S low-risk
  changes — same BLOCK/WARN/NIT report and verdict. Hard, non-negotiable
  escalation back to the full fan-out when the diff touches auth, sessions,
  permissions, tenant isolation, payments, data access, migrations, secrets, a
  new endpoint, or exceeds ~S / one architectural layer. Trims the ~5× fan-out
  cost on trivial work, never the guardrails on risky work. Shipped in
  `review.md` across all five profiles.
- **`npm run token-report` corpus measurement (T0).** Dependency-free, show-only
  report of the scaffold's context footprint: per-category tokens (always-loaded
  vs on-demand), largest files, and the `/review` fan-out floor. Baseline
  captured (~138K est-tokens; `CLAUDE.md` only 5% — the weight is commands 34% +
  rules 29%), so every token optimization is measured, not guessed.
  `scripts/token-report.js` ships in the package and a pre-publish smoke gate
  asserts it (`buildTokenReport` is unit-tested).

### Fixed
- **token-report counted the wrong fifth reviewer.** It listed `critic-agent`;
  `/review` actually fans out to backend, frontend, security, qa, **architect**.
  The unit test now asserts the exact five so the list cannot drift.
- **`dev` release metadata no longer lags the published CLI.** `package.json`,
  `package-lock.json`, and `.ai-scaffold.json` were stale at 0.8.8 after the
  0.9.0 release; aligned to the published version so promotion PRs never
  downgrade.

## [0.9.0] - 2026-07-12

### Added
- **Generated projects ship a one-page `constitution.md`.** A root-level,
  profile-aware source of truth that names the 10 non-negotiables and — its real
  job — **owns precedence and order** so an AI agent knows which rule wins on a
  conflict. Each point links to the detailed file in `.claude/rules/`; the
  constitution is a tie-breaker and index, not a second rulebook. Generated like
  `.claude/MEMORY.md` (single-source `buildConstitution`), kept at the project
  root, and protected on `init` (never overwritten if it already exists). The
  tenant-isolation line adapts to tenancy: conditional for single-tenant
  projects, a hard rule for multi-tenant ones.
- **Generated `CLAUDE.md` and `README` point to the constitution first.** Both
  entry points open with a "read `constitution.md` first" pointer across all five
  profiles, so the governance order is the first thing a human or agent sees.
- **Smoke + unit coverage for the constitution.** `pre-publish-smoke.sh` Gate 4d
  verifies the generated file exists, stays a one-pager (≤120 lines), is pointed
  to from `CLAUDE.md`/`README`, and carries the correct tenant line for both
  tenancy modes (checked against a packed tarball). `buildConstitution` has unit
  tests for the tie-breaker framing, resolving rule links, and tenant behaviour.

### Fixed
- **Generated README no longer contradicts the constitution-first model.** The
  header pointed to `constitution.md` but the "AI Workflow" section still called
  `CLAUDE.md` the source of truth. It now reads: constitution first (governance
  order — which rule wins on a conflict), then `CLAUDE.md` for the full operating
  guide. Fixed across all five profiles.
- **`create`/`init` no longer default to multi-tenant.** Defining
  `--no-multi-tenant` made commander default `multiTenant` to `true`, so a plain
  `ais create` produced a multi-tenant project (and tenant-scoping guidance)
  against the documented single-tenant default. The `--no-multi-tenant` flag is
  removed; `--multi-tenant` now opts in, matching `resolveWithDefaults`. The
  stale `--no-multi-tenant` example is gone from the README.
- **Generated projects no longer inherit the scaffold's identity or license.**
  The generated `README` footer credited the scaffold author (`AI Scaffold
  Community License - <year> Lajin M J.`) while shipping no `LICENSE` file, and
  the generated `package.json` set `"license": "AI Scaffold Community License"`
  (not a valid SPDX id). The footer now reads `© <year> <project display name>`
  and the `{{LICENSE}}` default is a neutral `UNLICENSED` the user replaces with
  their own. Author identity leaking through generic examples is gone too
  (`UX Lead (Lajin)` → `UX Lead`; bootstrap sample `Owner:` email →
  `owner@example.com`).

### Changed
- **Modernized Claude Code feature usage across agents, commands, and skills.**
  All 17 subagents now declare a `model` (Opus for architecture/security/
  verification/orchestration, Sonnet elsewhere — per `token-usage-rules.md`) and
  the five pure reviewers (`backend`, `frontend`, `security`, `qa`, `critic`) are
  restricted to inspection + verification `tools` (`Read`, `Grep`, `Glob`,
  `Bash`) — no `Edit`/`Write`/`MultiEdit`, so a reviewer reads code and runs
  checks but has no file-editing tools. All 35 slash
  commands gained `description` frontmatter so they show up with summaries in the
  `/` menu. The "Custom Skills" list is now honest: it distinguishes the four real
  auto-discovered Agent Skills (`<name>/SKILL.md`) from the reference docs that
  agents read by path. Fanned out to all five profiles.
- **Removed the remaining hardcoded organization name from scaffold files.**
  `.cursorrules`, `.github/copilot-instructions.md`, and the scaffold's own
  `CLAUDE.md` still named a specific company; genericized to "Project Team" /
  "AI development workflow" to match the rest of the (already-genericized)
  `.claude/` content. (These files are not copied into generated projects; this
  is repo-hygiene so browsing the scaffold shows nothing company-specific.)
- **`vitest` no longer scans git worktrees.** The scaffold's own worktree
  feature (`spawn_task`) checks out full repo copies under `.claude/worktrees/`;
  their nested `templates/` starters and duplicate suites were scanned by
  `npm test`, failing the run (and the pre-publish smoke's `npm test` gate)
  locally whenever a worktree was present. `vitest.config.js` now excludes
  `**/templates/**` and `**/.claude/**`. Repo-own tooling only — not shipped, and
  CI was unaffected.

## [0.8.8] - 2026-07-11

### Added
- **Node profile ships a real starter test.** The node template's `test` script
  was `echo "Configure..."` — a stub that "passed" while testing nothing. It now
  ships `test/smoke.test.js` (zero-dependency `node:test`) and `"test": "node --test"`,
  so a fresh node project passes a real test day-one, matching the python/golang
  profiles. Verified against a packed tarball. (Repo `vitest` run now excludes
  `templates/` so the starter file isn't scanned by the scaffold's own suite.)
- **Automated post-release `main→dev` sync.** After every release, `main`
  diverged from `dev` (release squash) and blocked the next release's
  `release:check` until a manual, error-prone sync. Now
  `scripts/sync-main-into-dev.sh` (`npm run sync:main-dev`) does a conflict-free
  `git merge -s ours origin/main` (ancestry-only, zero content change), opens a
  `main→dev` PR, and enables auto-merge with the **merge-commit** method (a
  squash re-breaks the ancestry). `.github/workflows/post-release-sync.yml` runs
  it automatically after "Publish to npm" (full auto-merge needs a `SYNC_PAT`
  secret; see the workflow header).

### Changed
- **Genericized shipped `.claude/` governance content.** Removed the fictional
  organization name (Techversant Infotech → "your organization", 175 refs) and
  example ticket IDs (`HIRE-###` → `PROJ-###`, 60 refs) from the shipped rules,
  agents, commands, skills, and templates across all five profiles — so a
  generated project is not taught from a specific different company's codebase.
  The deeper `apps/api/src` layer examples and Jira-tracker assumptions are a
  larger contextual pass, still tracked.

## [0.8.7] - 2026-07-10

### Fixed
- **Generated projects now ship a `.gitignore`.** `npm pack` hard-excludes any
  file literally named `.gitignore` from the tarball, so the published package
  carried none and `ais create` produced a git-initialized project with nothing
  ignored (a later `.env` / `node_modules` was committable). Templates now ship
  the ignore file as `gitignore` (no dot) and it is renamed to `.gitignore` on
  copy — preserving each profile's ignore rules. Verified against a real
  `npm pack` → install → create. Added a packaging-aware smoke gate (tarball
  must contain `templates/*/gitignore` and zero `.gitignore`) plus generated-project
  and unit regression tests. Same class as the v0.8.3 inert-hooks bug.

## [0.8.6] - 2026-07-10

### Added
- **`--dry-run --json` for `create` and `init`** — emits a machine-readable file
  plan (command, profile, target, counts, per-category file lists, and conflicts)
  and writes nothing, for CI/PR-review automation. `--json` implies
  non-interactive resolution, so it never drops into prompts. Covered by unit,
  E2E (write-nothing/target-preserved), and pre-publish smoke gates.
- **Release readiness guard** — `npm run release:check` verifies that `main` is
  already contained in the branch being promoted. CI runs it on PRs targeting
  `main`, so green tests cannot hide a conflicted promotion path.

### Changed
- Refactored `copy.js` (≈570→176 lines) by extracting `content-templates.js`
  (placeholder + generated content), `manifest.js` (`.ai-scaffold.json` /
  settings-overrides / managed-file records), and `dry-run-plan.js` (JSON plan
  serialization). No behavior change to generated output.

### Fixed
- **Broken doc links in generated projects.** `.claude/rules/ux-rules.md` and
  `.claude/skills/design-system.md` linked to
  `.claude/skills/ux-system/DESIGN_TOKENS.md` with wrong relative paths
  (`../../skills/...` escaped to repo root; `.claude/skills/...` doubled the
  path), so the link 404'd in every generated project even though the file ships.
  Fixed across all five profile templates. Added `scripts/check-generated-links.js`
  and pre-publish smoke Gate 4c so broken links / unresolved identity tokens fail
  the gate instead of shipping.
- Generated project READMEs now show real per-profile **install / dev / migration**
  commands instead of `N/A`: python `pip install -e ".[dev]"`, golang
  `go mod download`, laravel `composer install` / `php artisan serve` /
  `php artisan migrate`, node `npm install` / `npm run dev`. `copy.js` wires
  `{{INSTALL_COMMAND}}` / `{{DEV_COMMAND}}` / `{{MIGRATION_COMMAND}}` /
  `{{MIGRATE_COMMAND}}` through `commandOrNA(...)`; generic stays `N/A` unless the
  user provides explicit commands. Pre-publish smoke asserts the install command
  renders for the python and golang profiles.

## [0.8.5] - 2026-07-10

### Added
- **Python and Go stack profiles** — `--profile python` / `--profile golang`
  (with `py`, `python3`, and `go` aliases). Each ships its build file
  (`pyproject.toml` with a `[build-system]` + strict mypy config / `go.mod`),
  a runnable starter (`test_smoke.py` / `main.go` + `main_test.go`) so a fresh
  project passes `pytest` and `go test ./...` day-one, and profile-appropriate
  verification defaults (pytest/ruff/mypy; go test/vet/build). Build and starter
  files were added to the package `files` allowlist so they actually ship.
- `ais list [commands|agents|skills|rules]` — discover the installed scaffold
  assets without opening `.claude/` (supports `--json` and a target directory).
- README: a "How It Works" architecture diagram and a "Core 6 — Start Here"
  on-ramp so new users are not faced with all 35 commands at once.

### Fixed
- Generated project READMEs now render the real per-profile commands (e.g.
  `pytest`, `ruff check .`, `go test ./...`) instead of `N/A`, and no longer link
  to files the scaffold does not install (`.ai-scaffold/.env.example`,
  `HOW-TO-USE.md`, `CONTRIBUTING.md`). Pre-publish smoke now guards python/go
  README contents and fresh-Go verification.
- Synced the scaffold's own `.ai-scaffold.json` version to `package.json`; a test
  now keeps them in lockstep so the self-marker cannot silently drift again.

---

## [0.8.3] - 2026-07-09

### Fixed
- **Generated projects now get live Claude Code hooks.** A bare `settings.json`
  rule in the template `.gitignore` files matched `.claude/settings.json` at any
  depth; `npm pack` honors nested `.gitignore` files, so the hook-wiring
  `settings.json` was stripped from the published package and never copied into
  generated projects (hooks were installed but inert). The rule is now anchored
  to repo root (`/settings.json`), preserving app-config secret hygiene while
  shipping the wiring. Regression test added.
- **Scaffold manifest paths are now posix-normalized.** `managedFiles` in
  `.ai-scaffold.json` stored `path.join`/`path.relative` output, producing
  backslash paths on Windows that broke `doctor`/`status` drift checks
  cross-platform. Paths are normalized via `toPosixPath()`. Regression test added.

### Added
- **`create` ships a governance skeleton** so the shipped `CLAUDE.md` workflow
  references resolve: a clean starter `tasks/lessons.md`, `CHANGELOG.md`, and
  `tasks/todo` / `tasks/done` placeholders (generated, not copied — no scaffold
  content leaks). `init` leaves existing repos untouched.
- **`create` initializes git by default** and creates an initial scaffold commit
  when git is available. Use `--no-git` to opt out. Generated projects now also
  receive `.gitattributes` with union merge rules for append-only governance
  files such as `CHANGELOG.md` and `tasks/lessons.md`.
- **`doctor` is now a real gate.** It exits non-zero when a critical/high check
  fails, and adds checks for: Claude Code hooks wired in `.claude/settings.json`
  (catches the inert-hooks class of bug), verification commands configured, and
  governance-skeleton presence.

### Changed
- Reworded the shipped template `CLAUDE.md` and `ponytail-ladder.md` so they no
  longer point at files the default install does not ship (the `apps/api/src`
  reference example, `docs/process/task-size-policy.md`, `scripts/install-hooks.sh`,
  and `HOW-TO-USE.md`) — the docs now match what a generated project actually contains.
- Interactive setup now applies profile verification-command defaults too, so a
  selected Node/JavaScript profile no longer stores `test`, `lint`, `typecheck`,
  and `build` as `none` unless a user explicitly chooses a different profile.

---

## [0.8.2] - 2026-07-08

### Changed
- Reduced the published npm package surface by excluding template `docs/`,
  `tasks/`, and `_ai/` folders from the package allowlist.
- Kept internal template planning/history material in the source repository
  while preventing it from shipping in the npm tarball.
- Updated the pre-publish smoke gate so package checks fail if template
  docs/tasks/_ai folders are accidentally included again.

### Documentation
- Updated post-release TODOs and release history after the successful
  trusted-publishing `v0.8.1` release.

---

## [0.8.1] - 2026-07-08

### Added
- Added a managed-file ownership ADR to define scaffold-managed files, generated project context, optional pack files, and protected application files.
- Added real ESLint-based linting and repository JavaScript syntax checking.
- Added CLI tests for placeholder update safety and invalid setup-context validation.

### Changed
- Prepared the tag-based npm publish workflow for trusted publishing by moving the publish runtime to Node 24.
- Restored CI security gates with high-severity npm audit checks and gitleaks scanning.
- Made `ais update` a safe placeholder: dry runs report metadata, and real update attempts refuse to mutate files or `.ai-scaffold.json` until the update engine is implemented.
- Updated setup-value validation so invalid project type, compliance, stack, and lifecycle values are rejected instead of stored silently.
- Clarified generated-project CI expectations: AI Scaffold does not install project CI workflows by default.

### Fixed
- Fixed `doctor` to report invalid stored setup context values, not only legacy numeric prompt indexes.
- Removed the stale `.github/BRANCH-PROTECTION.yml` policy file that conflicted with the live branch-protection model.
- Documented the `v0.8.0` manual publish and tag-move recovery so future releases use new patch tags instead of re-pointing release tags.

---

## [0.8.0] - 2026-07-07

### Added
- Added generated `.ai-scaffold/README.md` and `.ai-scaffold/context.md` files to keep scaffold-owned setup context small and easy to inspect.
- Added richer install metadata to `.ai-scaffold.json`, including project, stack, risk, requirements, command, and installed pack context.
- Added setup prompt fields for lifecycle stage, data sensitivity, requirements source/path, and verification commands.
- Added doctor validation for numeric legacy prompt-choice values in generated setup context.

### Changed
- Made the default install core-only: `create` and `init` no longer install `.ai-scaffold/docs/`, `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/` by default.
- Decided against adding a public `--minimal` create option because the default install is now the core install path.
- Normalized setup prompt values so project type, frontend stack, profile, compliance scope, and related fields store stable values instead of prompt indexes.
- Updated README, HOW-TO-USE, placeholder-resolution docs, tests, and pre-publish smoke gates for the quieter default install surface.

### Fixed
- Fixed `doctor` so optional docs/tasks packs are not reported as missing in a healthy core-only install.
- Fixed generated settings and memory context so compliance scope supports arrays and normalized values.

---

## [0.7.1] - 2026-07-06

### Added
- Published the scoped npm package as `@lajin.m/ai-scaffold` with the `ais` CLI bin.
- Added the Node.js/JavaScript profile, including `node`, `nodejs`, `js`, and `javascript` aliases.
- Added template hook parity for all shipped profiles: `pre-secret-guard.sh`, `pre-dangerous-bash-guard.sh`, and `governance-file-guard.sh`.
- Added a project-memory safety policy to generated `.claude/MEMORY.md` output.

### Changed
- Reduced the default generated project root surface. Scaffold-owned docs, tasks, references, and support files now install under `.ai-scaffold/`.
- Kept existing-project `init` project-local and non-invasive by default.
- Updated smoke tests to verify clean root output, generated hook wiring, generated memory policy, and package contents.

### Fixed
- Fixed generated-template hook safety so projects created from the package receive the same starter safety layer as this repo.
- Fixed generated memory output so it forbids secrets, credentials, API tokens, production data, and client-confidential text unless explicitly approved.
- Repaired corrupted template path references introduced during the `.ai-scaffold/` namespacing cleanup.

---

### Changed
- **Tasks workflow restructured** — `tasks/todo.md` retired. Replaced with per-ticket files under `tasks/todo/<TICKET-ID>-<slug>.md`, archived to `tasks/done/` on completion. Eliminates the shared-mutable-state merge-conflict pattern observed during the Phase 1-4 audit work.
- **AI ephemera relocated** — `.claude/work/` is now the gitignored home for AI scratch / planning / intermediate state. Previously these landed in `tasks/todo.md`, mixing with project history.
- **Quality gates fail-closed** — `.claude/hooks/pre-review.sh` now exits non-zero when no checks are configured. Bypass via `PRE_REVIEW_ALLOW_UNCONFIGURED=1` (the template repo opts in by default; downstream projects remove this once `/bootstrap` configures real checks).
- **CI gracefully no-ops on the template** — every Node/PHP job in `.github/workflows/ci.yml` is now gated on `hashFiles('package.json')` / `hashFiles('composer.json')` so a fresh template clone passes CI; real checks activate once a stack is bootstrapped.
- **Template state explicit** — `README.md` and `CLAUDE.md` now carry a TEMPLATE banner so the unbootstrapped state is intentional, not a defect.
- **`/bootstrap` covers more files** — `.claude/commands/bootstrap.md` now lists `.env.example`, `.github/workflows/ci.yml`, and `.claude/hooks/pre-review.sh` among the files it modifies, so a successful bootstrap leaves the operational scaffold consistent.
- **Ladder-compliance wording** — verification report line for `Ladder compliance` now reads "stopped at rung `<N>`; higher rungs rejected because `<reason>`" instead of the misleading "walked 6 rungs per code unit". Aligns with the ladder's "first rung that answers, don't run all six" rule.
- **`/ponytail-debt` allowlist** — harvest now includes `*.sql` and `*.sh` (regex already supported `#` and `--` comment syntax; migrations and scripts are exactly where shortcut markers live). YAML excluded because it's config, not source code.

### Added
- **ai-scaffold CLI** — `bin/ai-scaffold.js` entry point using CAC v6 with subcommands: `create`, `init`, `status`, `doctor`, `update`. Handles template selection, conflict detection, staged copy, and bootstrap prompts.
- **Template profiles** — `templates/generic` (default) and `templates/laravel` (derived from generic + PHP/Laravel overlays). Generic profile is a full scaffold snapshot (`.claude/`, `CLAUDE.md`, `apps/`, `packages/`, `docs/`, etc.).
- **CLI core modules** — `src/cli/core/paths.js` (path resolution: CLI_ROOT, PKG_ROOT, TEMPLATES_DIR), `prompts.js` (interactive bootstrap collection), `file-plan.js` (staged copy plan + filter lists), `conflicts.js` (overlap detection), `copy.js` (staged fs copy), `version.js` (semver check).
- **Path resolution fix** — `PKG_ROOT` correctly resolves to repo root (3 `..` from `src/cli/core/`). Templates at `templates/<profile>/` are now reliably found regardless of where the CLI is invoked from.
- **Unit tests** — `src/__tests__/core.test.js` covering version semver check, prompt defaults, path lists, conflict report structure, and template-not-found error. All 8 tests pass.
- `CHANGELOG.md` (this file) — permanent record replacing the tracked `tasks/todo.md`.
- `tasks/todo/` and `tasks/done/` directories for per-ticket workflow files.
- `.claude/work/` directory (gitignored) for AI ephemera.
- `apps/api/src/middleware/error-handler.ts` — global `AppError → envelope` mapping (Finding 5).
- `Idempotency-Key` handling in the example route + service + migration (Finding 4).
- DB-transaction wrapper around `repo.create + audit.record` in the example service (Finding 6, atomicity).
- `docs/architecture/patterns/transactional-outbox.md` — pattern doc for durable side-effects (Finding 6, full pattern).
- `docs/setup/branch-protection.md` + `scripts/setup-branch-protection.sh` — Track 5 enforcement of branching-rules.md.
- `merge=union` driver in `.gitattributes` for `CHANGELOG.md`, `tasks/lessons.md`, `docs/architecture/adr/**` (thin Track 4).
- **Hook-based enforcement for H1-H8 hallucination guards** — three new agent-side hooks wired into `.claude/settings.json`: `pre-write-fact-check.sh` (PreToolUse, warns when an edit targets a file cited as `file:line` but not Read in this session; backing H1/H2/H7), `post-write-console-warn.sh` (PostToolUse, diff-based detection of new `console.log` / `print(` / `println!(` — also scans untracked files), `pre-bash-quality-gate.sh` (PreToolUse, runs `.claude/hooks/pre-commit` inline before `git commit` / `git push` lands). All three fail open in template state and are documented in `ai-coding-rules.md` §1 "Hook Enforcement" and `governance.md` "Enforcement Chain".
- **`/ponytail-audit` and `/ponytail-debt` commands** — curated integration of Dietrich Gebert's `ponytail` YAGNI-pressure toolkit, scoped to the scaffold's actual source-code paths and aligned with `/start-task --intensity`. Source: `https://github.com/DietrichGebert/ponytail` (MIT). See `.claude/rules/ponytail-ladder.md` for the rule and the ladder.

### Fixed
- Encoding fragility in code/config files — replaced em-dashes (`—`) and arrows (`→`) with ASCII (`-`, `->`) in `.yml`, `.sh`, `.json`, `.ts`, `.sql`, `.tf` files. Markdown unchanged (renders fine). (Finding 8)
- **`pre-write-fact-check.sh` was a no-op** — the transcript path encoding was wrong (URL-encoding `%2F`/`%2E` instead of Claude Code's leading-dash + slash-to-dash rule), so `TRANSCRIPT` was never set and the hook always failed open silently. The Read-detection regex also required `Read` and `file_path` to appear in flat sequence when the actual JSON nests them under `content[].input.file_path`. Both fixed; verified against a real session transcript with positive and negative cases.
- **`pre-write-fact-check.sh` env-var reconstruction removed entirely** — the first pass at the fix kept `CLAUDE_SESSION_ID` + `CLAUDE_PROJECT_DIR` reconstruction as a "fallback" on backward-compat grounds. The /review follow-up correctly identified this as a half-fix: the fallback IS the original failure mode. The hand-rolled path reconstruction has been deleted; the hook now reads `transcript_path` via `jq` first, falls back to `python3`, and fails open if neither is available. No third-tier env-var reconstruction exists.
- **`pre-write-fact-check.sh` duplicate-basename bypass closed** — Read detection matched `Read` tool_use blocks by `endswith(basename)` / `contains("/" + basename)`, and Cited detection matched `grep -qF -- "${FILE_BASENAME}:"`. The reviewer reproduced the bypass with a controlled transcript: target `src/a/foo.ts`, citation `src/a/foo.ts:9`, and a `Read` of `src/b/foo.ts` — STRICT mode exited 0 instead of blocking. In any repo with duplicate filenames, the hook was effectively a no-op. Replaced both basename matches with **exact canonical-path comparison**: a new `canon_path` helper resolves the agent's payload `file_path` to an absolute path against the hook's `$PWD` (realpath → python3 os.path.abspath → walk-up fallback chain), and the hook compares that against the absolute `input.file_path` of every `Read` tool_use block via `==`. The regex-fallback Read path was the same class of bypass and has been dropped. Cited detection now checks both the absolute path and the relative-to-cwd form (the latter because agents commonly cite in natural-language form like `.claude/settings.json:42`), but still as exact strings, not substrings. Verified against a controlled transcript reproducing the reviewer's case; STRICT mode now correctly blocks.
- **`post-write-console-warn.sh` skipped untracked files** — the early `exit 0` when `git diff` was empty ran before the untracked-file fallback, so freshly created untracked files were never scanned. Fixed; verified for TS/Python/Rust untracked files and STRICT mode.
- **`post-write-console-warn.sh` PHP support added** — the scope filter now accepts `.php` files and the pattern branch matches `var_dump(`, `print_r(`, `var_export(`, `dd(` (Laravel), `dump(` (Symfony/Laravel), and `error_log(`. Each pattern uses a word-boundary prefix `(^|[^a-zA-Z0-9_])` so `var_dump(` doesn't match the `dump(` substring — same substring-matching class of issue that the fact-check hook bypass fix removed. The final guidance line is now language-aware so PHP authors see `coding-standards.md prefers no var_dump/print_r/dd/dump in committed code` instead of the JS-flavored message.

---

## Pre-history (audit Phases 1-4 — merged on 2026-05-08)

Pre-CHANGELOG history captured retroactively. Detailed merge log below.

### Phase 4 (chore/scaffolding, commit `fe2beb6`) — Real scaffolding artifacts
- `.github/workflows/ci.yml` — 7-job pipeline (lint, test-unit, test-integration, build, audit, coverage, ci-passed gate)
- `.env.example`, `.editorconfig`, `.gitattributes`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`
- Layered example flow in `apps/api/src/`: route -> service -> repository -> domain
- `packages/domain/src/application.ts` (pure entity with state machine)
- `apps/api/migrations/0001_create_applications.sql` (reversible migration)
- `.claude/hooks/pre-review.sh` wired into `.claude/settings.json` as `UserPromptSubmit` hook for `/review`

### Phase 3 (chore/productivity, commit `bab1aa6`) — Productivity gaps
- `.claude/rules/definition-of-ready.md` — gates `BACKLOG -> IN PROGRESS`
- `.claude/commands/start-task.md` — 5-phase plan-and-confirm execution ritual
- `.claude/rules/manual-review-checklist.md` — Stage 7 four-question framework for human reviewers
- `.claude/commands/review.md` — extended from 3 to 5 reviewers (added qa-reviewer + architect)

### Phase 2 (chore/ai-coding-rules, commit `7893590`) — AI coding rules
- `.claude/rules/ai-coding-rules.md` — hallucination guards (H1-H8), plan-and-confirm protocol with the > 3-step threshold, production-grade mandate (P1-P8), AI-readability hard limits, verification mandate (V1-V7), drift prevention (D1-D4)
- 5-rule summary mirrored into `.cursorrules` and `.github/copilot-instructions.md`
- `CLAUDE.md` Operating Rules rewritten to lead with ai-coding-rules supremacy

### Phase 1 (initial scaffold + audit fixes, commit `b02f643`) — Foundation
- 12 specialised agents, 9 commands (incl. new `/bootstrap` + Stage 0 detection in `/what-next`), 9 skills, 10 templates, 9 rule files
- Reconciled internal contradictions (JWT phrasing, `_ai/generated/` tracking, `src/` layout)
- `tenant_id` rules now gated behind `{{IS_MULTI_TENANT}}`
- Snapshot/visual-regression testing documented in `testing-rules.md`

---

[Unreleased]: https://github.com/lajin-mohan/ai-scaffold/compare/main...HEAD
