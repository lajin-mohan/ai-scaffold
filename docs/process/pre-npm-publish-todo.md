# Pre-NPM Publish TODO

**Purpose:** Final cleanup checklist before publishing `ai-scaffold` for `npx ai-scaffold ...` usage.

This combines the CLI plan with the release-readiness cleanup review. The goal is to make the package useful without taking over an existing repository's own `docs/`, `apps/`, `packages/`, `infra/`, `scripts/`, or CI structure.

---

## Release Decision

Do not publish until the v0.7.x package has a smaller, safer install surface.

The CLI can be published as an MVP only after:

- Existing project installs are isolated.
- New project creation remains useful but not noisy.
- Node/JavaScript is available as a day-one profile.
- npm package contents are explicitly controlled.
- `npx ai-scaffold .` behaves as documented.

---

## P0 — Must Fix Before Publish

### 1. Route `ai-scaffold .` to `init`

Current behavior routes bare `.` to `create .`.

Required behavior:

```bash
npx ai-scaffold .
```

must behave like:

```bash
npx ai-scaffold init
```

Acceptance:

- `ai-scaffold . --dry-run` runs the init flow.
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

### 7. Reduce Default Template Surface

Move these from default install to optional examples or scaffold-internal docs:

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

---

## P2 — Can Ship After MVP

### 10. Implement Real Update Flow

Current `update` is a placeholder.

Pending:

- managed file hashes
- modified/missing detection
- safe diff plan
- confirmation before overwrite
- `update --version`
- manifest updates after file writes

### 11. Improve `status` and `doctor`

Pending:

- managed file count from manifest
- modified managed file count
- missing managed file count
- unresolved placeholder detection
- unbootstrapped metadata detection
- hook presence checks
- profile validity checks
- version mismatch checks

### 12. Add Missing CLI Docs

Create:

```text
docs/cli/installation.md
docs/cli/commands.md
docs/cli/profiles.md
docs/cli/updates.md
docs/cli/conflict-handling.md
```

Keep scaffold process/history docs out of generated project installs.

### 13. Expand Tests

Add coverage for:

- `ai-scaffold .` routes to init
- `init` does not create root `docs/`, `apps/`, `packages/`, `infra/`, `scripts/` by default
- existing `README.md`, `package.json`, workflows, and app dirs are preserved
- minimal install writes `.ai-scaffold/`
- package allowlist excludes unintended root files
- Node profile behavior is explicitly tested through the real CLI
- Laravel profile behavior is explicitly tested or removed

---

## Proposed Install Modes

### New Project

```bash
npx ai-scaffold my-project
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
npx ai-scaffold init
npx ai-scaffold .
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
- `ai-scaffold .` routes to init
- no generated README or settings file has unresolved project placeholders
