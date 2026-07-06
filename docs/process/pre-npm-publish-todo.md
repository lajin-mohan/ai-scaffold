# Pre-NPM Publish TODO

**Purpose:** Final cleanup checklist before publishing `ai-scaffold` for `npx @lajin.m/ai-scaffold ...` usage.

This combines the CLI plan with the release-readiness cleanup review. The goal is to make the package useful without taking over an existing repository's own `docs/`, `apps/`, `packages/`, `infra/`, `scripts/`, or CI structure.

---

## Release Decision

Use this checklist to verify that the v0.7.x package keeps a smaller, safer install surface.

The CLI can be published as an MVP only after:

- Existing project installs are isolated.
- New project creation remains useful but not noisy.
- Node/JavaScript is available as a day-one profile.
- npm package contents are explicitly controlled.
- `npx @lajin.m/ai-scaffold .` behaves as documented.

---

## P0 — Must Fix Before Publish

### 1. Route `ais .` to `init`

Current behavior routes bare `.` to `create .`.

Required behavior:

```bash
npx @lajin.m/ai-scaffold .
```

must behave like:

```bash
npx @lajin.m/ai-scaffold init
```

Acceptance:

- `ais . --dry-run` runs the init flow.
- Existing project files are protected.
- Add/keep an e2e test that spawns the real CLI.

### 2. Isolate Existing Project Installs

For `init`, do not create or modify generic project-owned root folders by default.

Do not install these by default into existing projects:

```text
docs/
apps/
packages/
infra/
scripts/
tasks/
.github/workflows/
package.json
composer.json
README.md
```

Default existing-project install should be limited to scaffold-owned files:

```text
.ai-scaffold/
.claude/
.ai-scaffold.json
AGENTS.md
CLAUDE.md
```

Optional root files may be added only with explicit flags in a future pass.

### 3. Add a Namespaced Scaffold Folder

Move scaffold-owned docs and operational context out of the project root namespace.

Target install namespace:

```text
.ai-scaffold/
  README.md
  docs/
    workflow.md
    roles.md
    commands.md
    context.md
  manifest.json
```

This keeps scaffold guidance separate from the application's own documentation.

### 4. Control npm Package Contents

Add an explicit npm publish allowlist.

Recommended `package.json` shape:

```json
{
  "files": [
    "bin/",
    "src/",
    "templates/",
    "docs/cli/",
    "docs/process/pre-npm-publish-todo.md",
    "README.md",
    "README.scaffold.md",
    "LICENSE",
    "CHANGELOG.md"
  ]
}
```

Acceptance:

```bash
npm_config_cache=/private/tmp/ai-scaffold-npm-cache npm pack --dry-run
```

shows only intentional package files.

### 5. Split Create and Init Template Behavior

`create` and `init` should not install the same full tree.

Required:

- `create <project>` may generate a clean starter project.
- `init` must stay minimal and non-invasive.
- Both flows must generate `.ai-scaffold.json`, `.claude/MEMORY.md`, and `.claude/settings-overrides.json`.

### 6. Ship Node/JS Profile From Day 1

Node/JavaScript is required for the first npm-published version.

Required behavior:

- `--profile node` works for `create` and `init`.
- `--profile js`, `--profile javascript`, and `--profile nodejs` resolve to `node`.
- Generated `.ai-scaffold.json` stores `"profile": "node"` after alias resolution.
- Node profile README uses Node/npm defaults such as `npm install`, `npm run dev`, `npm test`, and `npm run lint`.
- Node profile behavior is covered through the real CLI, not only core helpers.

Acceptance:

```bash
node bin/ai-scaffold.js create /private/tmp/ai-scaffold-node-smoke --profile js --yes
node bin/ai-scaffold.js init /private/tmp/ai-scaffold-node-init-smoke --profile javascript --yes --dry-run
```

---

## P1 — Strongly Recommended Before Publish

### 7. Reduce Default Template Surface — Done For v0.7.1

Implemented:

- New `create` keeps the project root minimal and puts scaffold-owned docs/tasks under `.ai-scaffold/`.
- Existing-project `init` stays namespaced and does not create root `docs/`, `tasks/`, `_ai/`, `apps/`, `packages/`, `infra/`, or `scripts/`.
- Root `HOW-TO-USE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.env.example`, `.editorconfig`, `.gitattributes`, `.gitleaks.toml`, and `.cursorrules` are moved under `.ai-scaffold/`.
- `tasks/ponytail-debt.md` and heavy example/source folders are excluded from the default install plan.
- Publish smoke tests now fail if noisy root folders/files are generated.

Future optional install flags can re-enable examples or heavier docs explicitly:

```bash
--with-docs
--with-examples
--with-ci
--with-vscode
```

Moved from default install to scaffold-internal docs or future optional examples:

```text
apps/
packages/
infra/
scripts/
docs/process/
docs/estimates/
docs/brd/role-based-orchestration-brd.md
docs/architecture/ai-coding-scaffold-review.md
tasks/ponytail-debt.md
```

Keep only starter project docs when useful:

```text
docs/architecture/README.md
docs/api/README.md
docs/qa/README.md
docs/deployment/README.md
docs/ux/README.md
docs/compliance/accessibility.md
```

For existing projects, prefer `.ai-scaffold/docs/` instead of root `docs/`.

### 8. Decide Light Profile Status

Current Laravel and Node profiles are light profiles.

Known Laravel differences:

- `composer.json`
- `README.template.md`

Known Node differences:

- `README.template.md`
- `package.json`
- default backend stack resolves to `Node.js`
- `javascript`, `js`, and `nodejs` aliases resolve to `node`

Decision options:

1. Keep Node as a required day-one light profile and label it clearly.
2. Keep Laravel only if docs clearly label it as a light profile.
3. Convert profiles to overlays after v0.7.x.

Recommended for v0.7.x:

- Keep `generic`.
- Keep `node` as the required JavaScript profile.
- Keep `laravel` only if docs clearly call it a light profile.

### 9. Add Context Collection for Existing Projects

During `init`, collect or detect:

- Project name
- Purpose
- Owner/team
- Project type
- Backend stack
- Frontend stack
- Database
- Test command
- Lint/typecheck command
- Build command
- Deployment target
- Compliance needs

Detect where possible:

```text
package.json
composer.json
pyproject.toml
requirements.txt
go.mod
pom.xml
build.gradle
.github/workflows/
```

Write confirmed context to:

```text
.ai-scaffold.json
.claude/settings-overrides.json
.claude/MEMORY.md
.ai-scaffold/docs/context.md
```

### 10. Add Starter Hooks Safety Roadmap

Current hook state is a useful starter layer, not a full enterprise-safe hooks
pack. Keep public docs accurate unless these controls are implemented.

Done:

- Claude Code hook wiring in `.claude/settings.json`.
- `/review` pre-review hook.
- Pre-edit fact-check hook.
- Post-edit debug-log warning hook.
- Bash pre-commit quality gate for `git commit` / `git push`.
- Git pre-commit hook with branch, lint, typecheck, test, and optional gitleaks checks.
- Branch protection docs/scripts.
- CI secret scanning.
- Secret path guard file exists: `.claude/hooks/pre-secret-guard.sh`.
- Dangerous Bash guard file exists: `.claude/hooks/pre-dangerous-bash-guard.sh`.
- Governance file guard file exists: `.claude/hooks/governance-file-guard.sh`.
- Template `.gitignore` files were strengthened for env files, private keys, cloud credentials, Terraform state, and secret directories.
- New Claude Code hooks parse JSON payloads from stdin.
- Blocking guards exit with Claude Code's blocking status (`2`).
- Hook simulation tests are part of `scripts/pre-publish-smoke.sh`.
- Package manifests such as `composer.json` are not treated as secrets by default.
- `.env.example`, `.env.sample`, and `.env.template` remain explicitly allowed in template `.gitignore` files.

Pending P1 hook improvements:

- Add `ais hooks doctor` to report hook install/config health.
- Add a `pre-push` safety hook for secret scan, lint, typecheck, tests, and protected branch warnings.
- Add a `commit-msg` policy hook for useful commit messages and optional ticket references.
- Add `post-merge` and `post-checkout` warning hooks for changed lockfiles, hooks, `.env.example`, or dependency manifests.
- Document clearly that local hooks can be bypassed and CI/repository policy remains authoritative.

---

## P2 — Can Ship After MVP

### 11. Implement Real Update Flow

Current `update` is a placeholder.

Pending:

- managed file hashes
- modified/missing detection
- safe diff plan
- confirmation before overwrite
- `update --target-version`
- manifest updates after file writes

### 12. Improve `status` and `doctor`

Pending:

- managed file count from manifest
- modified managed file count
- missing managed file count
- unresolved placeholder detection
- unbootstrapped metadata detection
- hook presence checks
- profile validity checks
- version mismatch checks

### 13. Add Missing CLI Docs

Create:

```text
docs/cli/installation.md
docs/cli/commands.md
docs/cli/profiles.md
docs/cli/updates.md
docs/cli/conflict-handling.md
```

Keep scaffold process/history docs out of generated project installs.

### 14. Expand Tests

Add coverage for:

- `ais .` routes to init
- `init` does not create root `docs/`, `apps/`, `packages/`, `infra/`, `scripts/` by default
- existing `README.md`, `package.json`, workflows, and app dirs are preserved
- minimal install writes `.ai-scaffold/`
- package allowlist excludes unintended root files
- Node profile behavior is explicitly tested through the real CLI
- Laravel profile behavior is explicitly tested or removed

### 15. Enterprise Safe Hooks Pack

Build a reusable enterprise-safe hooks profile after the MVP surface is stable.

Future commands:

```bash
ais hooks install --profile enterprise-safe
ais hooks status
ais hooks doctor
ais hooks update
ais hooks test
ais hooks uninstall
```

Future AI hook architecture:

```text
.ai-scaffold/
  hooks/
    ai/
      guard-pretool.js
      guard-posttool.js
      guard-stop.js
      guard-user-prompt.js
      policies/
        dangerous-commands.json
        protected-files.json
        secret-paths.json
    git/
      commit-msg-policy.sh
      forbid-dangerous-files.sh
      forbid-env-files.sh
      pre-push-safety.sh
```

Future enterprise controls:

- Policy-file-driven AI secret path guard.
- Policy-file-driven dangerous command guard.
- Policy-file-driven protected governance file guard.
- Stop hook requiring changed-files, tests, security, and manual verification evidence.
- Hook simulation tests such as `--simulate-env-read` and `--simulate-secret-commit`.
- Optional `.pre-commit-config.yaml` integration for teams that standardize on the pre-commit framework.
- CODEOWNERS and branch-protection verification in `ais hooks doctor`.

---

## Proposed Install Modes

### New Project

```bash
npx @lajin.m/ai-scaffold my-project
```

Creates a clean starter project:

```text
my-project/
  .ai-scaffold/
  .claude/
  .ai-scaffold.json
  AGENTS.md
  CLAUDE.md
  README.md
```

Optional future flags:

```bash
--with-docs
--with-examples
--with-ci
--with-vscode
```

### Existing Project

```bash
npx @lajin.m/ai-scaffold init
npx @lajin.m/ai-scaffold .
```

Installs only scaffold-owned assets:

```text
.ai-scaffold/
.claude/
.ai-scaffold.json
AGENTS.md
CLAUDE.md
```

No root project folders are created by default.

---

## Publish Gate

Before tagging:

```bash
npm test
npm run typecheck
npm_config_cache=/private/tmp/ai-scaffold-npm-cache npm pack --dry-run
node bin/ai-scaffold.js /private/tmp/ai-scaffold-create-smoke --yes
node bin/ai-scaffold.js create /private/tmp/ai-scaffold-node-smoke --profile js --yes
node bin/ai-scaffold.js init /private/tmp/ai-scaffold-init-smoke --yes --dry-run
node bin/ai-scaffold.js init /private/tmp/ai-scaffold-node-init-smoke --profile javascript --yes --dry-run
node bin/ai-scaffold.js . --yes --dry-run
```

Publish only when:

- tests pass
- pack contents are intentional
- existing-project install is isolated
- Node/JS profile aliases resolve to `node`
- `ais .` routes to init
- no generated README or settings file has unresolved project placeholders
