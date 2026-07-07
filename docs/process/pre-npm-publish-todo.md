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
- A stricter core-only install surface is still pending for the next version:
  no default `.ai-scaffold/docs/`, `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/`.

---

## P0 — Must Fix Before Publish

Current v0.7.1 publish gates are complete. The remaining P0 items below are
for the next npm-published CLI version because they affect release confidence,
CI correctness, or the public installation surface.

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

### 9. Fix CI For This CLI Repository

Status: pending.

The current `.github/workflows/ci.yml` is still shaped like a generated
application pipeline. Because this repository has a root `package.json`, the
workflow detects Node and then attempts app-style commands that do not exist in
this CLI package:

```text
npm run db:migrate
npm run test:integration
npm run build
npm run test:coverage
```

Verified CI/CD findings from repo review:

- Latest GitHub Actions runs on both `main` and `dev` were failing.
- The integration job fails because `npm run db:migrate` is not defined in this
  CLI package.
- The workflow also references `npm run test:integration`, `npm run build`, and
  `npm run test:coverage`, which are not defined in the current `package.json`.
- The audit job fails on the current dev dependency chain around
  `vitest`/`vite`/`esbuild`.
- Local CLI checks pass:
  - `npm test`
  - `npm run typecheck`
  - `bash scripts/pre-publish-smoke.sh`
- The publish smoke gate passed locally with `71 OK / 0 FAIL`, so the main
  problem is the GitHub workflow shape and audit policy, not the basic CLI smoke
  behavior.

Required for the scaffold platform repo:

- Replace app-specific CI jobs with CLI-package checks.
- Run `npm ci`.
- Run `npm test`.
- Run `npm run typecheck`.
- Run `bash scripts/pre-publish-smoke.sh`.
- Run `npm pack --dry-run` or equivalent package-content verification.
- Keep npm audit and secret scanning if they are stable for this repo.
- Keep one final required `ci-passed` job for branch protection.
- Remove PostgreSQL service containers from this repo's CI unless a future test
  actually requires them.
- Avoid generated-app assumptions such as `apps/api/dist/` and `apps/web/dist/`
  artifact uploads.

Acceptance:

```bash
npm test
npm run typecheck
bash scripts/pre-publish-smoke.sh
npm pack --dry-run
```

GitHub Actions must pass on `dev`, `main`, and pull requests into those
branches.

### 10. Add Tag-Based npm Publish Workflow

Status: pending.

Publish should be automatic when a version tag is pushed from `main`.

Recommended behavior:

- Trigger on tags matching `v*.*.*`.
- Verify the tag commit is contained in `main`.
- Run the same release checks as CI.
- Publish with `npm publish --access public`.
- Use `NODE_AUTH_TOKEN` from an npm automation token stored in GitHub Actions
  secrets.
- Use least-privilege GitHub permissions.
- Do not publish on every push to `main`.

Required repository secret:

```text
NPM_TOKEN
```

Acceptance:

```bash
git tag -a v0.7.2 -m "Release v0.7.2"
git push origin v0.7.2
```

The GitHub release workflow publishes `@lajin.m/ai-scaffold@0.7.2` to npm.

CI/CD research finding:

- No tag-based npm publish workflow exists yet.
- Manual `npm publish --access public` worked only after browser/OTP auth; for
  automated releases, use an npm automation token stored as `NPM_TOKEN`.
- The release workflow must depend on the fixed CLI-package CI gates above.

### 11. Make `/update` / `ais update` Safe And Honest

Status: pending.

Current `ais update` is a placeholder that can write a new version into
`.ai-scaffold.json` without applying file updates, diffs, migrations, or managed
file reconciliation. That can create false confidence because a project may
look updated while still containing old scaffold files.

Required for the next CLI release:

- Keep `update` available as a discoverable command.
- Do not mutate `.ai-scaffold.json` unless real file update logic runs.
- If full update logic is not implemented yet, make `update` report that it is
  not available and exit safely.
- `update --dry-run` may show installed version, CLI version, profile, and a
  clear "file migrations not implemented yet" message.
- `update --target-version` must not mark the project as updated unless the
  selected version's files are actually applied.
- Documentation must describe the current limitation clearly.

Preferred interim behavior:

```bash
ais update --dry-run
```

prints:

```text
Installed version: 0.7.x
CLI version: 0.7.x
Profile: node
File update engine: not implemented yet
No files changed
```

Acceptance:

- `ais update` does not change `.ai-scaffold.json` while update is still a
  placeholder.
- `ais update --dry-run` exits successfully and writes nothing.
- `ais update --target-version <version>` refuses to mutate metadata until real
  update plans exist.
- Tests cover update placeholder safety.

---

## P1 — Strongly Recommended Soon After Publish

### 12. Reduce Root Template Surface — Done For v0.7.1

Status: completed for v0.7.1 as a root-folder cleanup, but superseded by item
15 for the next release.

Implemented:

- New `create` keeps the project root minimal and puts scaffold-owned docs/tasks under `.ai-scaffold/`.
- Existing-project `init` stays namespaced and does not create root `docs/`, `tasks/`, `_ai/`, `apps/`, `packages/`, `infra/`, or `scripts/`.
- Root `HOW-TO-USE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.env.example`, `.editorconfig`, `.gitattributes`, `.gitleaks.toml`, and `.cursorrules` are moved under `.ai-scaffold/`.
- `tasks/ponytail-debt.md` and heavy example/source folders are excluded from the default install plan.
- Publish smoke tests now fail if noisy root folders/files are generated.

Next direction:

- Keep only the core operating layer in default installs.
- Do not install `.ai-scaffold/docs/`, `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/` by default.
- Add larger material through explicit packs.

Future optional packs can re-enable examples or heavier docs explicitly:

```bash
ais add docs
ais add examples
ais add ci
ais add templates
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

For existing projects, do not create either root `docs/` or
`.ai-scaffold/docs/` unless the user explicitly requests the docs pack.

### 13. Decide Light Profile Status — Mostly Done For v0.7.1

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

### 14. Add Dry-Run JSON Plan

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

Recommended priority: v0.7.2 quick win.

### 15. Make Core-Only Install And Meaningful Setup Context The Default

Status: pending.

This combines two cleanup needs into one implementation task:

1. Remove default docs/tasks/_ai install noise.
2. Fix setup prompts so stored project context is meaningful and not numeric
   choice indexes.

Do not add a separate `--minimal` flag unless backward compatibility later
requires it. The better product model is:

- `create` and `init` install the core operating layer by default.
- Larger docs, examples, QA, UX, research, CI, and templates are optional packs.
- Users add packs only when needed.
- Initial setup collects only context that helps AI agents work safely and
  accurately.
- Selected prompt values must be stored as meaningful values, not numeric choice
  indexes.
- Prompt, flag, and `--yes` flows must all produce the same normalized metadata
  shape.

Default core install should include:

```text
.ai-scaffold.json
AGENTS.md
CLAUDE.md
.claude/                         # hidden AI operating layer: rules, commands, agents, hooks, roles, skills
.ai-scaffold/README.md
.ai-scaffold/context.md
```

The cleanup target is the visible/default scaffold reference surface, not the
hidden `.claude/` operating layer. Removing `.claude/commands/`,
`.claude/agents/`, or `.claude/rules/` would make the install quieter but would
also remove much of the scaffold's day-one value.

Optional pack model:

```bash
ais add docs
ais add qa
ais add ux
ais add research
ais add ci
ais add templates
ais init --with-docs
ais init --with-qa
ais init --with-ux
ais init --with-research
ais init --with-ci
```

Pack examples:

```text
docs      -> .ai-scaffold/packs/docs/
qa        -> .ai-scaffold/packs/qa/
ux        -> .ai-scaffold/packs/ux/
research  -> .ai-scaffold/packs/research/
ci        -> .ai-scaffold/packs/ci/
templates -> .ai-scaffold/packs/templates/
```

Do not install by default:

```text
.ai-scaffold/docs/
.ai-scaffold/tasks/
.ai-scaffold/_ai/
large BRD/architecture/example documents
UX packs
QA browser testing packs
research packs
generated-app CI workflows
```

Setup/context collection issue found:

- `prompts` `select` choices are currently passed as plain strings.
- In `prompts`, plain string choices become `{ title: string, value: index }`.
- This can store `0`, `1`, etc. into fields such as `projectType`,
  `frontendStack`, `complianceScope`, or `profile`.
- Numeric indexes do not help humans, AI agents, `doctor`, or future updates.
- Existing numeric values should be treated as legacy/invalid context and
  repaired or warned about by `doctor`.

Required setup prompt model:

Ask fewer questions, but ask the ones that shape AI behavior:

| Field | Why it matters | Store as |
|---|---|---|
| Project slug | Stable machine/project id | `billing-api` |
| Display name | Human-friendly project name | `Billing API` |
| Purpose | Gives AI the main product intent | `Subscription billing service` |
| Project kind | Routes guidance and expectations | `api`, `web-app`, `full-stack`, `library`, `cli`, `mobile`, `infra`, `data`, `internal-tool`, `saas` |
| Lifecycle stage | Changes risk posture | `discovery`, `active-development`, `production`, `maintenance`, `legacy-modernization` |
| Owner/team | Human accountability | email or team slug |
| Primary stack | Helps pick rules and commands | detected or explicit string |
| Frontend stack | Helps UX/frontend guidance | `none`, `react`, `nextjs`, `vue`, `nuxt`, `flutter`, `other` |
| Database | Affects API/data/testing guidance | detected or explicit string |
| Requirements source | Tells AI where truth lives | `existing-docs`, `create-later`, `create-now` |
| Requirements path | Index existing BRD/functional docs | `docs/requirements/`, `.ai-scaffold/context.md`, or explicit path |
| Multi-tenant | Affects auth/data rules | boolean |
| Data sensitivity | Affects memory/security policy | `public`, `internal`, `confidential`, `regulated` |
| Compliance scope | Affects review gates | array such as `["GDPR", "SOC2"]` or `[]` |
| Test command | Verification command | `npm test`, `composer test`, etc. |
| Lint/typecheck command | Verification command | explicit string or `none` |
| Build command | Verification command | explicit string or `none` |

Use object choices for every select prompt:

```js
{
  title: 'API / backend service',
  value: 'api'
}
```

Never store raw select indexes. Store normalized values and, where useful,
store a display label as metadata.

Example stored context:

```json
{
  "profile": "node",
  "project": {
    "slug": "billing-api",
    "displayName": "Billing API",
    "kind": "api",
    "lifecycleStage": "active-development",
    "purpose": "Subscription billing service"
  },
  "stack": {
    "primary": "Node.js",
    "frontend": "none",
    "database": "PostgreSQL"
  },
  "risk": {
    "multiTenant": false,
    "dataSensitivity": "internal",
    "complianceScope": []
  },
  "requirements": {
    "source": "existing-docs",
    "paths": ["docs/requirements/brd.md"]
  },
  "commands": {
    "test": "npm test",
    "lint": "npm run lint",
    "typecheck": "npm run typecheck",
    "build": "npm run build"
  }
}
```

Prompt implementation rules:

- Replace string select choices with `{ title, value }` objects.
- Use `multiselect` or an explicit comma-separated parser for compliance
  scopes so teams can store more than one scope.
- Normalize profile aliases before writing metadata: `js`, `javascript`, and
  `nodejs` become `node`.
- Normalize "none" values consistently rather than mixing `None`, `N/A`,
  `optional`, and numeric indexes.
- Preserve user-supplied explicit flag values where valid, but validate them
  before writing `.ai-scaffold.json`.
- Store defaults in `defaultedValues` so teams can revisit assumptions later.

Requirements/BRD handling:

- During `init`, detect existing documentation paths but do not create root
  `docs/` by default.
- If existing BRD, functional requirements, specs, ADRs, or user stories are
  found, index them in `.ai-scaffold/context.md`.
- If none are found, record `requirements.source = "create-later"` and print a
  next step.
- Only create requirements files when explicitly requested.

Future explicit commands:

```bash
ais add requirements
ais add requirements --target docs
ais add requirements --target .ai-scaffold
ais create my-app --with-requirements
ais init --with-requirements
```

Recommended generated files when explicitly requested:

```text
docs/requirements/brd.md
docs/requirements/functional-requirements.md
```

or, for teams that want no root docs:

```text
.ai-scaffold/packs/requirements/brd.md
.ai-scaffold/packs/requirements/functional-requirements.md
```

Acceptance:

- Default `create` and `init` do not create root `docs/`, `tasks/`, `_ai/`,
  `apps/`, `packages/`, `infra/`, or `scripts/`.
- Default `create` and `init` do not create `.ai-scaffold/docs/`,
  `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/`.
- `doctor` understands a core-only install and does not report optional packs as
  missing.
- Optional packs are explicitly requested and recorded in `.ai-scaffold.json`.
- `--minimal` is not introduced unless there is a backward-compatibility reason.
- Interactive select prompts use `{ title, value }` choices, not string arrays.
- `.ai-scaffold.json`, `.claude/settings-overrides.json`, `.claude/MEMORY.md`,
  and `.ai-scaffold/context.md` never store prompt choice indexes for project
  type, frontend stack, compliance scope, profile, or lifecycle stage.
- Existing docs/requirements are indexed, not moved.
- Root `docs/requirements/` is created only with explicit confirmation or a
  flag such as `--with-requirements`.

Recommended priority: v0.7.2 because it lowers first-install trust cost.

### 16. Add Install Operation Records

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

Recommended priority: v0.8.0 because this shapes future repair/update logic.

### 17. Add Automatic Context Detection For Existing Projects

After item 15 fixes the core setup questions and stored values, add deeper
automatic detection during `init`.

Detect where possible:

- Test command
- Lint/typecheck command
- Build command
- Deployment target
- Existing docs/requirements paths
- Package manager
- Framework/library hints
- CI provider
- Compliance/security hints from docs or config

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
.ai-scaffold/context.md
```

Recommended priority: v0.8.0. Keep this separate from item 15 so v0.7.2 can
fix the most important prompt/storage behavior without overbuilding detection.

### 18. Add Starter Hooks Safety Roadmap

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

Recommended priority: keep `ais hooks doctor` as v0.7.2 quick win; keep the
larger enterprise hooks pack for P2.

### 19. Add Optional Deep Research Agent/Skill

Status: pending design.

Deep research should be available to developers before or during planning, but
it must not become a mandatory question or automatic step for every task.

Decision:

- Add deep research as an opt-in command/agent/skill.
- Do not run deep research automatically during `create`, `init`, `/start-task`,
  or normal planning.
- Do not ask the developer every time whether they want deep research.
- Let the developer invoke it when the task involves uncertainty, unfamiliar
  technology, external facts, product/market research, security/regulatory
  claims, or architectural tradeoffs.

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

Use cases:

- Research an unfamiliar library, framework, API, protocol, or vendor tool.
- Compare implementation options before an ADR or architecture plan.
- Verify current external facts before making docs, compliance, security, or
  dependency recommendations.
- Produce evidence-backed notes for BRDs, estimates, spike reports, or
  implementation planning.

Acceptance:

- `/research` is optional and developer-invoked.
- Research outputs separate facts, assumptions, and recommendations.
- Current/external claims require citations or clear source notes.
- The researcher does not write production code directly; it informs planning
  and decisions.
- Default install remains lightweight; research docs/skill are included only if
  they do not materially increase install noise, or are placed behind a future
  `--with-research` optional pack.

---

## P2 — Can Ship After MVP

### 20. Implement Real Update Flow

Current `update` is a placeholder. After the P0 update-safety fix above, this
P2 item is the full implementation of safe managed-file updates.

Pending:

- managed file hashes
- modified/missing detection
- safe diff plan
- confirmation before overwrite
- `update --target-version`
- manifest updates after file writes

### 21. Improve `status` and `doctor`

Pending:

- managed file count from manifest
- modified managed file count
- missing managed file count
- unresolved placeholder detection
- unbootstrapped metadata detection
- hook presence checks
- profile validity checks
- version mismatch checks

### 22. Add Repair And Uninstall Dry Runs

Do not implement destructive repair/uninstall behavior first. Start with preview-only.

Future commands:

```bash
ais repair --dry-run
ais uninstall --dry-run
```

These should rely on install operation records and managed file hashes.

### 23. Add Missing CLI Docs

Create:

```text
docs/cli/installation.md
docs/cli/commands.md
docs/cli/profiles.md
docs/cli/updates.md
docs/cli/conflict-handling.md
```

Keep scaffold process/history docs out of generated project installs.

### 24. Expand Tests

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

### 25. Improve QA Profile With Browser Testing Guidance

Status: pending scope.

This should not make generated projects depend on Playwright or Selenium by
default. Instead, provide profile guidance and optional install packs that help
teams choose and verify their browser testing approach.

Decision:

- Do not include Playwright or Selenium in the default install.
- Do not add browser-test dependencies to generated `package.json` unless the
  user explicitly asks for that pack.
- Treat browser testing as an optional QA capability pack, not a required core
  scaffold feature.

Recommended split:

- Keep default QA guidance framework-neutral.
- Add optional Playwright guidance for modern web app E2E testing.
- Add optional Selenium guidance for teams with existing Selenium/Grid
  infrastructure.
- Require implementation and verification by the project development team
  before CI gates rely on either tool.

Future optional flags:

```bash
ais init --with-qa
ais init --with-playwright
ais init --with-selenium
```

Optional pack behavior:

- `--with-qa` adds QA workflow docs, test-plan templates, and review guidance.
- `--with-playwright` adds Playwright-specific guidance and optional example
  config/templates only after confirmation.
- `--with-selenium` adds Selenium/Grid-specific guidance and optional example
  config/templates only after confirmation.
- CI examples must be disabled or clearly gated unless dependencies are
  installed in the target project.

Acceptance:

- QA docs explain when to use Playwright vs Selenium.
- Generated CI does not fail because optional test tools are missing.
- Any template CI additions are gated behind detected dependencies or explicit
  install flags.
- Default `create` and `init` do not install Playwright, Selenium, browser
  binaries, or browser-test CI jobs.

### 26. Add UI/UX Profile

Status: pending design.

Create a dedicated UI/UX profile or optional UX pack only after the core
install surface is stable.

Decision:

- Do not add UI/UX material to the default existing-project install beyond the
  current lightweight governance guidance.
- Prefer `--with-ux` as an optional pack before introducing a standalone `ux`
  profile.
- A future `ux` profile should be for design-heavy repositories, not a default
  install path for backend/API projects.

Potential scope:

- UX review workflow.
- Accessibility checklist.
- Responsive/state coverage checklist.
- Design handoff templates.
- Frontend-specific AI review prompts.
- Optional Playwright visual/interaction testing guidance.

Future optional flags:

```bash
ais init --with-ux
ais init --with-accessibility
ais init --with-visual-testing
```

Acceptance:

- Does not install heavy UX material into existing projects unless requested.
- Works as either `--profile ux` for design-heavy projects or `--with-ux` as an
  optional pack on top of another profile.
- Default `init` remains suitable for backend, API, CLI, library, and
  infrastructure repositories without UI/UX clutter.

### 27. Enterprise Safe Hooks Pack

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
    README.md
    context.md
  .claude/
  .ai-scaffold.json
  AGENTS.md
  CLAUDE.md
  README.md
```

Optional future packs:

```bash
ais add docs
ais add qa
ais add ux
ais add research
ais add ci
ais add templates
```

### Existing Project

```bash
npx @lajin.m/ai-scaffold init
npx @lajin.m/ai-scaffold .
```

Installs only scaffold-owned assets:

```text
.ai-scaffold.json
.ai-scaffold/
  README.md
  context.md
.claude/
AGENTS.md
CLAUDE.md
```

No root project folders are created by default. No `.ai-scaffold/docs/`,
`.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/` folders are created unless a pack
is explicitly requested.

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
