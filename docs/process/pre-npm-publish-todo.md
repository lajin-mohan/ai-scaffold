# Pre-Next-Publish TODO

**Purpose:** Release follow-up checklist for AI Scaffold after the `v0.8.5`
CLI publish and docs/profile hardening work.

This file tracks housekeeping, near-term product improvements, and future
roadmap work for the `v0.8.x` release line. It supersedes the older
pre-`v0.8.0` checklist.

Version policy for this list:

- Small correctness/docs fixes should ship as `v0.8.6`, `v0.8.7`, etc.
- Larger feature packs should still stay in `v0.8.x` unless they introduce a
  breaking install/update contract.
- Do not reserve these items for a later minor release by default.

---

## Current Release State

`v0.8.5` is live on npm as:

```text
@lajin.m/ai-scaffold@0.8.5
CLI bin: ais
```

Confirmed for `v0.8.5`:

- Package name is `@lajin.m/ai-scaffold`.
- CLI bin is `ais`.
- Trusted publishing from GitHub Actions to npm is configured and proven.
- `v0.8.5` was published by the tag workflow with npm provenance.
- `main` and `dev` are protected and require the real `CI passed` check.
- Default install is project-local.
- `create` and `init` use a core-only default install surface.
- Default installs do not create root `docs/`, `tasks/`, `_ai/`, `apps/`,
  `packages/`, `infra/`, or `scripts/`.
- Default installs do not create `.ai-scaffold/docs/`,
  `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/`.
- `.ai-scaffold/README.md` and `.ai-scaffold/context.md` are generated.
- Setup prompts store meaningful values instead of numeric select indexes.
- Node/JavaScript profile is available from day one.
- `js`, `javascript`, and `nodejs` resolve to `node`.
- Python profile is available with pytest/ruff/mypy defaults.
- Go profile is available with `go test`, `go vet`, and `go build` defaults.
- Starter hook safety is shipped in generated projects.
- Memory safety policy is generated into project memory.
- Publish smoke checks passed locally, in CI, and in the publish workflow.
- Current post-release docs work is tracked in PR #47.

`v0.8.2` housekeeping scope:

- Clean stale release TODO/history docs.
- Keep package metadata aligned with the next patch version.
- Remove template `docs/`, `tasks/`, and `_ai/` folders from the published npm
  package surface until optional packs exist.

---

## P0 - Completed In v0.8.1

### 1. Configure And Prove Trusted npm Publishing

Status: done in `v0.8.1`; verified by successful GitHub Actions npm publish.

Problem:

- Both `v0.8.0` publish workflow runs failed at the final npm publish step.
- The workflow reached provenance signing, then npm returned `E404` for
  `@lajin.m/ai-scaffold`.
- `v0.8.0` was later published manually, without workflow provenance.

Required:

- Configure npm trusted publishing for:
  - npm package: `@lajin.m/ai-scaffold`
  - GitHub owner: `lajin-mohan`
  - GitHub repo: `ai-scaffold`
  - workflow filename: `publish.yml`
  **Done.**
- Ensure `.github/workflows/publish.yml` uses a supported Node/npm runtime for
  trusted publishing. **Done: workflow uses Node 24.**
- Validate with the next patch tag. **Done: `v0.8.1` published.**
- Do not move or re-point an existing release tag to retry publishing.

Acceptance:

```bash
git tag -a v0.8.1 -m "Release v0.8.1"
git push origin v0.8.1
npm view @lajin.m/ai-scaffold version
```

Expected result:

- GitHub Actions publishes `@lajin.m/ai-scaffold@0.8.1`. **Done.**
- npm shows `0.8.1`. **Done.**
- The npm release has provenance/attestation from GitHub Actions. **Done.**
- `npm view @lajin.m/ai-scaffold@0.8.1 dist.attestations` or the npm package
  page confirms provenance exists.

### 2. Apply Branch Protection And Document The v0.8.0 Bypass

Status: done in `v0.8.1`; verified live on GitHub.

Problem:

- `main` was not branch protected during the `v0.8.0` release.
- Release commits were pushed directly to `main`.
- The `v0.8.0` tag was force-updated during release recovery.
- That contradicts the scaffold's own branching governance.

Required:

- Enable branch protection for `main`. **Done: verified via GitHub API.**
- Enable branch protection for `dev`. **Done: verified via GitHub API.**
- Require the final CI status check. **Done: `CI passed` is required.**
- Disallow force pushes and branch deletion on `main`. **Done.**
- Prefer pull requests or a documented release branch for future releases.
- Document the `v0.8.0` manual-publish and tag-move bypass in release notes or
  `docs/process/scaffold-build-history.md`. **Done in branch.**
- Adopt a release rule: failed publish means a new patch tag, not a moved tag.
- Keep local `dev`, remote `dev`, and `main` synchronized before starting the
  next release branch.

Acceptance:

```bash
gh api repos/lajin-mohan/ai-scaffold/branches/main/protection
```

returns branch-protection settings instead of `404`.

Verified:

- `main` requires `CI passed`, 1 approving review, linear history,
  conversation resolution, admin enforcement, and blocks force pushes/deletion.
- `dev` requires `CI passed`, 1 approving review, conversation resolution, and
  blocks force pushes/deletion.
- Repository default branch is `dev`.

### 3. Restore Security Gates In CI

Status: done in `v0.8.1`; passes on GitHub Actions.

Problem:

- The CLI CI rewrite removed the previous security gates.
- The review found production dependencies clean, but dev dependencies had
  audit findings through the Vitest/Vite/esbuild chain.
- This repo ships governance as its product, so its own CI should model the
  security posture it recommends.

Required:

- Add `npm audit --audit-level=high` or an equivalent policy to CI.
- Add gitleaks secret scanning to CI.
- Decide whether Semgrep is required for this repo now or later. **Deferred;
  npm audit and gitleaks are the restored P0 gate.**
- Upgrade or pin dev tooling to resolve high/critical audit findings.
- Keep production dependency audit clean.

Acceptance:

```bash
npm audit --audit-level=high
gitleaks detect --source .
```

or equivalent CI steps pass on `main` and PRs.

### 4. Remove Or Replace `.github/BRANCH-PROTECTION.yml`

Status: done in `v0.8.1`.

Problem:

- `.github/BRANCH-PROTECTION.yml` is not consumed by an enforced tool.
- It contradicts `.claude/rules/branching-rules.md` by allowing force pushes
  and deletions on `main`.
- It creates a third source of truth for branch policy.

Required:

- Delete the file, or replace it with a generated/read-only artifact that
  matches the real branch-protection policy.
- Keep `.claude/rules/branching-rules.md`, setup docs, and any scripts aligned.

Acceptance:

- No repository policy file recommends force pushes or branch deletion for
  protected release branches.

### 5. Make `ais update` Safe While It Is Still A Placeholder

Status: done in `v0.8.1`.

Problem:

- The current update flow can create false confidence if it mutates metadata
  without applying real file migrations.
- `v0.7.x` installs and `v0.8.x` core-only installs have different managed-file
  expectations.

Required:

- Keep `ais update` discoverable.
- Do not mutate `.ai-scaffold.json` unless a real update plan is applied.
- Let `ais update --dry-run` report installed version, CLI version, profile, and
  "file update engine not implemented yet".
- Refuse `--target-version` mutation until real migration/update logic exists.
- Document this limitation clearly.

Acceptance:

- `ais update` writes nothing while update is still a placeholder.
- `ais update --dry-run` exits successfully and writes nothing.
- Tests cover placeholder update safety.

### 6. Write The Managed-File Ownership Contract ADR

Status: done in `v0.8.1`.

Problem:

- `v0.8.0` changed the default install surface and managed-file contract.
- Older manifests may still list docs/tasks files that users are expected to
  edit.
- Future `doctor`, `repair`, `uninstall`, and `update` cannot be safe unless
  the ownership model is explicit.

Required:

- Add an ADR for managed file ownership contract v2.
- Define what is scaffold-managed, user-editable, generated, optional pack
  content, and protected app content.
- Define the migration/re-baseline approach for `v0.7.x` manifests.
- Make manifest re-baselining an explicit acceptance criterion for Phase 3
  update work.

Acceptance:

- ADR exists under `docs/architecture/adr/`.
- `update` and `doctor` roadmap tasks reference the ADR.

### 7. Decide And Document The Downstream CI Story

Status: done in `v0.8.1`.

Problem:

- `v0.8.0` excludes `.github/**` from default installs.
- Generated projects therefore receive no CI workflow by default.
- Some scaffold docs still refer to a detect-stack CI workflow as if it exists
  in generated projects.

Required:

- Decide whether template CI is:
  - re-shipped by default, or
  - moved behind an explicit `ci` pack. **Decision: CI remains out of the
    default install and should become an explicit future `ci` pack.**
- Fix `CLAUDE.md` and template docs so they do not claim generated projects
  have CI files that are not installed.
- Add a validation step for template workflow YAML if workflows remain in the
  package or future packs.

Acceptance:

- Default generated projects do not claim missing CI exists.
- CI pack behavior, if chosen, is explicit and documented.
- Template workflow files are parsed or checked if they continue to ship.

### 8. Validate Choice-Valued Flags And Stored Metadata

Status: done in `v0.8.1`.

Problem:

- Interactive prompt values are now meaningful, but explicit flags can still
  persist out-of-vocabulary values.
- `doctor` currently catches numeric legacy prompt indexes, but not every
  invalid string value.

Required:

- Validate normalized values against allowed vocabularies before writing
  `.ai-scaffold.json`.
- Reject invalid `projectType`, `lifecycleStage`, `frontendStack`,
  `dataSensitivity`, `profile`, and compliance values.
- Print allowed values in CLI error messages.
- Teach `doctor` to flag out-of-vocabulary values in existing manifests.

Acceptance:

```bash
ais init --project-type Platform --yes
ais init --compliance "iso 27001,PCI DSS,bogusscope" --yes
```

must reject invalid values or report them through `doctor`.

### 9. Replace The Fake Lint Gate

Status: done in `v0.8.1`.

Problem:

- `npm run lint` currently delegates to `npm run typecheck`.
- `typecheck` only syntax-checks `bin/ai-scaffold.js`.
- `src/cli/**` is not checked by the current lint/typecheck gate.

Required:

- Either add a real lint gate, preferably ESLint flat config, or rename the
  current check honestly as a syntax check.
- Extend syntax or static validation across `src/cli/**`.
- Update generated command defaults so downstream projects are not taught that
  "lint equals typecheck one file".

Acceptance:

- `npm run lint` performs real linting, or docs/package scripts clearly state
  no linter is configured yet.
- CI does not run the same one-file syntax parse twice under different names.

### 10. Add Tests For The Changed Release Surface

Status: partially done in `v0.8.1`; remaining coverage is tracked for
follow-up.
Priority: high.

Required test coverage:

- `doctor` recognizes healthy core-only installs.
- `doctor` flags numeric legacy values and out-of-vocabulary strings. **Done for
  out-of-vocabulary strings; numeric legacy coverage remains existing.**
- `update` placeholder writes nothing. **Done.**
- `--dry-run` writes nothing.
- `init` on an already scaffolded project is idempotent.
- Explicit flags flow correctly into `.ai-scaffold.json`.
- Invalid explicit flags are rejected. **Done.**
- `v0.7.x` shaped manifests do not get falsely marked as fully updated. **Done
  for update placeholder safety.**

Acceptance:

- Tests cover the release claims in `CHANGELOG.md`.
- The next release does not rely only on smoke-script assertions for core CLI
  behavior.

---

## P0 - Next v0.8.x Patch

### 11. Add Install And Dev Command Defaults Per Profile

Status: pending.
Priority: high.
Target: `v0.8.6`.

Problem:

- Generated READMEs still render some "Getting Started" commands as `N/A`,
  especially for non-Node profiles.
- `src/cli/core/copy.js` hardcodes `{{INSTALL_COMMAND}}`,
  `{{MIGRATION_COMMAND}}`, and `{{DEV_COMMAND}}` to `N/A`.
- New users should be able to run the generated starter without guessing the
  first install or dev command.

Required:

- Add `installCommand`, `migrationCommand`, and `devCommand` to resolved
  bootstrap values where relevant.
- Wire placeholder replacement through `commandOrNA(values.installCommand)`,
  `commandOrNA(values.migrationCommand)`, and `commandOrNA(values.devCommand)`.
- Add sensible per-profile defaults:
  - `node`: `npm install`, `npm run dev` when a dev script exists.
  - `python`: `pip install -e ".[dev]"`, no dev server by default.
  - `golang`: `go mod download`, no dev server by default.
  - `laravel`: `composer install`, `php artisan serve`.
  - `generic`: `N/A` unless the user passes explicit commands.
- Add tests or smoke assertions that generated README command blocks do not show
  `N/A` when a supported profile has a real default.

Acceptance:

- Fresh `node`, `python`, `golang`, and `laravel` projects show useful install
  commands in `README.md`.
- Fresh Python README no longer says `Install dependencies -> N/A`.
- Existing-project installs still preserve protected application files.

---

## P1 - Strongly Recommended In v0.8.x

### 12. Clean Internal Artifacts From Published Templates

Status: done in `chore/v0.8.2-housekeeping-cleanup`; verified locally by
`npm pack --dry-run` and `scripts/pre-publish-smoke.sh`.

Problem:

- The npm tarball still includes internal scaffold-history material inside
  shipped templates, such as repo estimates, orchestration BRD notes, and real
  task lessons.
- No secrets were found, but these files increase noise and expose internal
  development context.

Required:

- Review `templates/*/docs/**`, `templates/*/tasks/**`, and
  `templates/*/_ai/**`. **Done.**
- Move internal-only artifacts to this repo's own docs, not generated
  templates. **Decision for v0.8.2: keep source files in-repo, but exclude them
  from the published npm package until optional packs exist.**
- Keep only content that should be installed into downstream projects or future
  optional packs. **Done for npm package contents.**
- Keep the smoke gate enforcing that template `docs/`, `tasks/`, and `_ai/`
  folders are not published by default. **Done.**

Acceptance:

- `npm pack --dry-run --json` shows no scaffold-internal planning artifacts in
  shipped templates unless intentionally part of an optional pack.

### 13. Refactor `copy.js` Into Smaller Core Modules

Status: pending.
Priority: medium.

Problem:

- `src/cli/core/copy.js` owns copying, manifest construction, settings
  generation, memory generation, and content builders.
- Lifecycle and vocabulary values are duplicated across multiple modules.

Required:

- Extract manifest building into `src/cli/core/manifest.js`.
- Extract generated content builders into `src/cli/core/content-templates.js`.
- Centralize vocabularies shared by prompts, validation, and doctor.
- Keep behavior unchanged while refactoring.

Acceptance:

- `copy.js` becomes primarily orchestration/copy logic.
- Tests and smoke checks still pass.

### 14. Add Dry-Run JSON Plan

Status: pending.
Priority: high.

Enterprise users should be able to inspect what the CLI will do before writing.

Required commands:

```bash
ais init --profile node --dry-run --json
ais create my-project --profile node --dry-run --json
```

Output should include:

- profile
- target path
- files to copy
- files to generate
- protected files skipped
- app/source paths skipped
- conflicts
- defaulted values
- optional packs selected

### 15. Add Install Operation Records

Status: pending.
Priority: high.

Extend `.ai-scaffold.json` beyond a flat managed file list.

Example:

```json
{
  "operations": [
    {
      "type": "copy",
      "path": ".claude/settings.json",
      "source": "templates/node/.claude/settings.json",
      "hash": "sha256:..."
    },
    {
      "type": "skip-protected",
      "path": "README.md",
      "reason": "existing project file"
    }
  ]
}
```

This powers future `doctor`, `repair`, `uninstall`, and safe `update`.

### 16. Add Automatic Context Detection For Existing Projects

Status: pending.
Priority: high.

Detect where possible:

- package manager
- primary stack/framework
- test command
- lint/typecheck command
- build command
- deployment target
- existing docs/requirements paths
- CI provider
- compliance/security hints from docs or config

Write confirmed context to:

```text
.ai-scaffold.json
.claude/settings-overrides.json
.claude/MEMORY.md
.ai-scaffold/context.md
```

Do not create root `docs/` by default. Existing docs should be indexed, not
moved.

### 17. Move Lessons Capture Into `.ai-scaffold/`

Status: pending.
Priority: high.

Problem:

- `tasks/lessons.md` conflicts with the current clean install model.
- Existing projects may already use `tasks/` for Jira exports, sprint planning,
  Linear syncs, project work queues, or application-specific task tracking.
- Lessons are scaffold-owned institutional memory, not application source or
  project task management.

Decision:

- Make `.ai-scaffold/lessons.md` the canonical lessons file for new installs.
- Keep `tasks/lessons.md` as a legacy/backward-compatible read path when it
  already exists.
- Do not create root `tasks/` by default during `init`.

Required:

- Generate `.ai-scaffold/lessons.md` for `create` and `init`.
- Update `/lessons`, `/reflect`, `/compact`, `/investigate`, `/debug-fix`, and
  `/start-task` guidance to read/write `.ai-scaffold/lessons.md`.
- Update `.claude/MEMORY.md`, `AGENTS.md`, README, HOW-TO-USE, and generated
  `.ai-scaffold/README.md` references.
- Update `doctor` to check `.ai-scaffold/lessons.md` instead of requiring root
  `tasks/lessons.md`.
- Keep a migration note: if `tasks/lessons.md` exists, read it and optionally
  suggest moving entries into `.ai-scaffold/lessons.md`.
- Stop generating root `tasks/lessons.md`, `tasks/todo/`, and `tasks/done/`
  unless a future optional task-management pack is selected.

Acceptance:

- `ais create` and `ais init` both produce `.ai-scaffold/lessons.md`.
- Existing-project installs do not create root `tasks/` by default.
- `/lessons` works when only `.ai-scaffold/lessons.md` exists.
- `doctor` passes for a healthy install with `.ai-scaffold/lessons.md` and no
  root `tasks/` folder.
- Smoke tests cover the new canonical path and legacy fallback.

### 18. Improve Hooks Roadmap

Status: pending.
Priority: medium.

Done in `v0.8.0`:

- Secret path guard.
- Dangerous Bash guard.
- Governance file guard.
- Hook simulation checks in the publish smoke script.
- Template hook wiring for generated projects.

Pending:

- `ais hooks doctor`.
- Template hook parity checks for every shipped profile.
- Optional `pre-push` safety hook.
- Optional `commit-msg` policy hook.
- Optional `post-merge` and `post-checkout` warning hooks.
- Clear docs that local hooks can be bypassed and CI/repository policy remains
  authoritative.

### 19. Add Per-Profile CI Pack

Status: pending design.
Priority: high.
Target: `v0.8.x`.

Problem:

- Generated projects currently receive rules, hooks, commands, and guidance, but
  no CI workflow by default.
- That means governance can remain advisory unless the adopting team adds its
  own CI.
- The scaffold's strongest value is not just guidance; it is making quality
  checks repeatable on every PR.

Decision needed:

- Prefer an explicit CI pack first, for example `ais init --with-ci`, to avoid
  surprising existing repos.
- Consider enabling CI by default for `ais create` only after the explicit pack
  proves stable.

Required:

- Add per-profile GitHub Actions workflow templates for supported profiles.
- Keep workflows out of default `init` until the user requests `--with-ci`.
- Include profile-appropriate checks:
  - `node`: install, lint, typecheck, test, audit.
  - `python`: install dev extras, ruff, mypy, pytest, optional pip-audit.
  - `golang`: go mod download, go vet, go test, go build.
  - `laravel`: composer install, PHP lint/static checks where configured, tests.
- Add package allowlist and smoke checks so CI pack files ship only when intended.
- Update docs so generated projects do not claim CI exists unless the pack is
  installed.

Acceptance:

- `ais create --with-ci --profile node|python|golang|laravel` produces a valid
  workflow.
- `ais init --with-ci --dry-run` shows the workflow plan without writing.
- Default existing-project `init` still does not create `.github/workflows/**`.
- Smoke checks parse or validate packed workflow YAML.

### 20. Add Release Mergeability And Main-Dev Sync Gate

Status: pending.
Priority: high.
Target: `v0.8.x`.

Problem:

- Squash-promoting release PRs can leave `main` and `dev` with non-linear or
  divergent histories.
- Green CI does not mean a PR is mergeable.
- Recent releases needed conflict repair even though checks were green.

Required:

- Add a release checklist step that verifies PR mergeability before tagging.
- Add a standing post-release step: merge or PR `main` back into `dev` after
  every tag publish.
- Consider a small script or GitHub check that reports:
  - `git merge-base --is-ancestor origin/main origin/dev`
  - PR mergeability state
  - required checks present and passing
  - no stale release branch.
- Document whether release branches are allowed, and when direct `dev -> main`
  PRs are preferred.

Acceptance:

- Release checklist catches "green but blocked/unmergeable" PRs.
- After a tag publish, `main` and `dev` are reconciled before new feature work
  starts.

### 21. Documentation Honesty Pass

Status: pending.
Priority: medium.

Required:

- Replace stale `0.7.1` references where they describe the current release.
- Update stale "current state" docs that still mention `v0.7.0`.
- Reword `CHANGELOG.md` if it claims a public `--minimal` option was removed;
  that option was planned but never shipped.
- Fix root and template `CLAUDE.md` claims about CI behavior.
- Wire this repo's actual checks into `/review` and remove
  `PRE_REVIEW_ALLOW_UNCONFIGURED=1` for the scaffold repo itself if checks are
  now configured.

### 22. Publish Workflow Cleanup

Status: pending follow-up; trusted publishing is now proven in `v0.8.1`.
Priority: low.

Required:

- Remove ignored/invalid workflow inputs such as `package-manager-cache: false`
  if they are not supported by the action.
- Decide whether `prepublishOnly` should continue duplicating workflow checks.
- Trusted publishing has passed at least once. **Done in `v0.8.1`.**
- Reduce duplicate `prepublishOnly` check runs only if CI still protects manual
  publishes, or keep the duplicate checks as a conservative release guard.

### 23. Add Optional Deep Research Command/Agent

Status: pending design.
Priority: medium.

Decision:

- Deep research should be opt-in, not a mandatory prompt during every planning
  flow.
- It should help developers research unfamiliar technologies, external facts,
  security/regulatory claims, vendor choices, or architecture tradeoffs.
- It should not write production code directly.

Recommended shape:

```text
.claude/agents/deep-researcher.md
.claude/skills/deep-research/SKILL.md
.claude/commands/research.md
```

Future command:

```text
/research <topic-or-question>
```

Expected output:

```text
Research question
Context and scope
Sources checked
Findings
Facts vs assumptions
Risks and unknowns
Recommendation
Confidence level
Follow-up questions, if any
```

### 24. Small Code Cleanup From Review

Status: pending.
Priority: low.

Required:

- Remove the dead no-op `.replace(/^SOC2$/, 'SOC2')` in compliance
  normalization. **Done.**
- Decide whether `installedPacks: []` should become a real manifest field or be
  dropped until optional packs exist. **Dropped for now.**
- Keep `prepublishOnly` for now, but revisit duplicated checks after trusted
  publishing succeeds. **Kept for now.**

---

## P2 - v0.8.x Backlog

### 25. Implement Real Update Flow

Status: pending.
Priority: high.

Build full safe update support after the P0 update placeholder safety and the
managed-file ownership ADR are done.

Pending:

- managed file hashes
- modified/missing detection
- safe diff plan
- confirmation before overwrite
- `update --target-version`
- manifest re-baselining
- optional pack update behavior

### 26. Improve `status` And `doctor`

Status: pending.
Priority: high.

Pending:

- managed file count from manifest
- modified managed file count
- missing managed file count
- unresolved placeholder detection
- unbootstrapped metadata detection
- hook presence checks
- profile validity checks
- version mismatch checks
- optional pack health checks

### 27. Add Repair And Uninstall Dry Runs

Status: pending.
Priority: medium.

Start with preview-only commands:

```bash
ais repair --dry-run
ais uninstall --dry-run
```

These should rely on install operation records and managed file hashes.

### 28. Add Missing CLI Docs

Status: pending.
Priority: medium.

Create or refresh:

```text
docs/cli/installation.md
docs/cli/commands.md
docs/cli/profiles.md
docs/cli/updates.md
docs/cli/conflict-handling.md
```

Keep scaffold process/history docs out of generated project installs.

### 29. Resolve Stray Historical `v1.0` Tag

Status: pending decision.
Priority: low.
Target: `v0.8.x`.

Problem:

- A legacy `v1.0` tag exists outside the current `v0.8.x` release line.
- Local and remote `v1.0` may point to different commits.
- This can confuse release history, npm expectations, and future maintainers.

Required:

- Decide whether `v1.0` should be deleted or documented as a historical
  pre-semver/pre-npm tag.
- Do not delete or rewrite remote tags without explicit maintainer approval.
- If keeping it, document it in release history.
- If deleting it, delete both local and remote tags and record why.

Acceptance:

- `git tag --list 'v*'` has no confusing undocumented tag above the active
  release line.

### 30. Add More Stack Profiles

Status: pending design.
Priority: medium.
Target: `v0.8.x`.

Candidate profiles:

- `.NET`
- Java
- Rust
- Next.js
- Flutter

Required:

- Each profile must be useful on day one, not just a renamed generic profile.
- Each profile must ship real starter commands, build/test files, README command
  defaults, package allowlist entries, and smoke coverage.
- Avoid adding profiles until the install/dev command defaults task is done, so
  new profiles do not repeat the `N/A` command issue.

Acceptance:

- `ais create --profile <profile> --yes` creates a project whose advertised
  install/test/lint/build commands work or are honestly marked unavailable.

### 31. Optional QA Browser Testing Pack

Status: pending design.
Priority: medium.

Decision:

- Do not include Playwright or Selenium by default.
- Provide optional guidance/config packs only when requested.
- Do not add browser binaries or browser-test CI jobs to generated projects
  unless explicitly requested.

Future options:

```bash
ais init --with-qa
ais init --with-playwright
ais init --with-selenium
```

### 32. Optional UI/UX Pack

Status: pending design.
Priority: medium.

Decision:

- Do not add heavy UX material to default existing-project installs.
- Prefer `--with-ux` before a standalone `ux` profile.
- Keep default installs suitable for backend, API, CLI, library, and infra
  repositories.

Future options:

```bash
ais init --with-ux
ais init --with-accessibility
ais init --with-visual-testing
```

### 33. Enterprise Safe Hooks Pack

Status: pending design.
Priority: medium.

Future commands:

```bash
ais hooks install --profile enterprise-safe
ais hooks status
ais hooks doctor
ais hooks update
ais hooks test
ais hooks uninstall
```

Future controls:

- Policy-file-driven secret path guard.
- Policy-file-driven dangerous command guard.
- Policy-file-driven governance file guard.
- Stop hook requiring changed-files, tests, security, and manual verification
  evidence.
- Hook simulation tests.
- Optional `.pre-commit-config.yaml` integration.
- CODEOWNERS and branch-protection verification in `ais hooks doctor`.

---

## P3 - v0.8.x Maintainability Backlog

### 34. De-Duplicate Profile Templates

Status: pending design.
Priority: low.
Target: `v0.8.x`.

Problem:

- Supported profiles currently duplicate a large number of near-identical
  scaffold files.
- Duplication increases maintenance cost and makes it easy for fixes to land in
  one profile but not another.

Required:

- Design a build-time or packaging-time profile composition flow.
- Keep runtime installs simple: the CLI should still copy from a resolved
  complete profile directory or packaged file list.
- Add parity checks so shared files stay synchronized across profiles.
- Do not make this a blocker for user-facing fixes.

Acceptance:

- Shared scaffold files can be updated once and propagated consistently.
- Packaged output remains predictable and smoke-tested.

---

## Standard Publish Gate

Before tagging:

```bash
git status --short --branch
git fetch --all --prune
git merge-base --is-ancestor origin/main HEAD
npm test
npm run typecheck
npm run lint
bash scripts/pre-publish-smoke.sh
npm_config_cache=/private/tmp/ai-scaffold-npm-cache npm pack --dry-run
```

Publish only when:

- git is clean
- tests pass
- lint/typecheck are meaningful and pass
- package contents are intentional
- existing-project install is isolated
- Node/JS profile aliases resolve to `node`
- `ais .` routes to init
- no generated README/settings/context file has unresolved project placeholders
- generated projects include the starter hook safety layer
- generated projects include a clear memory safety policy
- branch protection is active
- release PR is mergeable, not merely green
- `main` and `dev` sync plan is explicit after publishing
- trusted publishing has been configured for the package
- failed publish attempts will use a new patch tag, not a moved existing tag
