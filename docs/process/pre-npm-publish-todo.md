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
- Template hook safety is actually shipped in generated projects, not only in this scaffold repo.

Already confirmed for v0.7.1:

- Package name is `@lajin.m/ai-scaffold`.
- CLI bin is `ais`.
- Default install remains project-local.
- Clean root install surface is implemented and covered by smoke tests.

---

## P0 — Must Fix Before Publish

### 1. Route `ais .` to `init` — Done For v0.7.1

Previous behavior routed bare `.` to `create .`.

Implemented behavior:

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
- E2E and publish smoke tests spawn the real CLI.

### 2. Isolate Existing Project Installs — Done For v0.7.1

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

### 3. Add a Namespaced Scaffold Folder — Done For v0.7.1

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

### 4. Control npm Package Contents — Done For v0.7.1

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

### 5. Split Create and Init Template Behavior — Done For v0.7.1

`create` and `init` should not install the same full tree.

Required:

- `create <project>` may generate a clean starter project.
- `init` must stay minimal and non-invasive.
- Both flows must generate `.ai-scaffold.json`, `.claude/MEMORY.md`, and `.claude/settings-overrides.json`.

### 6. Ship Node/JS Profile From Day 1 — Done For v0.7.1

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

### 7. Sync Hook Safety Into Templates — Done For v0.7.1

The current scaffold repo has the starter hook safety layer, but generated
projects must receive the same safety layer.

Status: verified. The shipped profile templates include and wire the starter
safety hooks, and the publish smoke gate checks generated output.

Required:

- Copy these hooks into every shipped profile template:
  - `.claude/hooks/pre-secret-guard.sh`
  - `.claude/hooks/pre-dangerous-bash-guard.sh`
  - `.claude/hooks/governance-file-guard.sh`
- Update every `templates/*/.claude/settings.json` to wire the hooks.
- Ensure generated projects have executable hook files.
- Add smoke checks that `create` and `init` output include and wire these hooks.
- Verify each template settings file references only hook files that exist in
  that same template.

Acceptance:

```bash
node bin/ai-scaffold.js create /private/tmp/ai-scaffold-hook-smoke --profile node --yes
test -f /private/tmp/ai-scaffold-hook-smoke/.claude/hooks/pre-secret-guard.sh
test -f /private/tmp/ai-scaffold-hook-smoke/.claude/hooks/pre-dangerous-bash-guard.sh
test -f /private/tmp/ai-scaffold-hook-smoke/.claude/hooks/governance-file-guard.sh
```

Final verification:

```bash
npm test
bash scripts/pre-publish-smoke.sh
```

### 8. Add Memory Safety Policy — Done For v0.7.1

Persistent memory is useful but risky. Keep this lightweight for v0.7.x.

Status: verified. Generated `.claude/MEMORY.md` contains the lightweight
project-memory safety policy.

Required:

- Document project memory only; no global/user-home memory install by default.
- Forbid secrets, credentials, tokens, production data, and client-confidential text unless explicitly allowed.
- Require review for memory changes.
- Add this policy to scaffold rules/docs that generated projects receive.
- Ensure generated project docs explain that memory is operational context, not
  a place for private data, secrets, credentials, or unreviewed instructions.

Acceptance:

- Generated projects contain a clear memory safety policy.
- `README.md` and/or `HOW-TO-USE.md` do not overstate memory as risk-free automation.
- The policy appears in at least one scaffold-managed file that every shipped
  profile receives.

---

## P1 — Strongly Recommended Soon After Publish

### 9. Reduce Default Template Surface — Done For v0.7.1

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

### 10. Decide Light Profile Status — Mostly Done For v0.7.1

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

Remaining:

- Keep docs honest that `laravel` is a light profile, not a full Laravel application scaffold.
- Revisit profile overlays after v0.7.x.

### 11. Add Dry-Run JSON Plan

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
- whether placeholders were defaulted

### 12. Add Install Operation Records

Extend `.ai-scaffold.json` beyond a flat managed file list.

Add operation records such as:

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

This will power future `doctor`, `repair`, `uninstall`, and safe `update`.

### 13. Add Context Collection for Existing Projects

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

### 14. Add Starter Hooks Safety Roadmap

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
- Add template hook parity checks for every shipped profile.
- Add a `pre-push` safety hook for secret scan, lint, typecheck, tests, and protected branch warnings.
- Add a `commit-msg` policy hook for useful commit messages and optional ticket references.
- Add `post-merge` and `post-checkout` warning hooks for changed lockfiles, hooks, `.env.example`, or dependency manifests.
- Document clearly that local hooks can be bypassed and CI/repository policy remains authoritative.

---

## P2 — Can Ship After MVP

### 15. Implement Real Update Flow

Current `update` is a placeholder.

Pending:

- managed file hashes
- modified/missing detection
- safe diff plan
- confirmation before overwrite
- `update --target-version`
- manifest updates after file writes

### 16. Improve `status` and `doctor`

Pending:

- managed file count from manifest
- modified managed file count
- missing managed file count
- unresolved placeholder detection
- unbootstrapped metadata detection
- hook presence checks
- profile validity checks
- version mismatch checks

### 17. Add Repair And Uninstall Dry Runs

Do not implement destructive repair/uninstall behavior first. Start with preview-only.

Future commands:

```bash
ais repair --dry-run
ais uninstall --dry-run
```

These should rely on install operation records and managed file hashes.

### 18. Add Missing CLI Docs

Create:

```text
docs/cli/installation.md
docs/cli/commands.md
docs/cli/profiles.md
docs/cli/updates.md
docs/cli/conflict-handling.md
```

Keep scaffold process/history docs out of generated project installs.

### 19. Expand Tests

Add coverage for:

- hook safety files are present in generated projects
- template `.claude/settings.json` references only hooks that exist
- `--dry-run --json` returns a machine-readable file plan
- install operation records are written
- existing `README.md`, `package.json`, workflows, and app dirs are preserved
- Laravel profile behavior is explicitly tested or removed

Already covered:

- `ais .` routes to init.
- `init` does not create root `docs/`, `apps/`, `packages/`, `infra/`, `scripts/`, or `tasks/` by default.
- Minimal install writes `.ai-scaffold/`.
- Package allowlist excludes unintended root files.
- Node profile behavior is tested through the real CLI.

### 20. Enterprise Safe Hooks Pack

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
- generated projects include the starter hook safety layer
- generated projects include a clear memory safety policy
