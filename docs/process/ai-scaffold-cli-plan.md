# AI Scaffold CLI Plan

## Objective

Turn this repository into a reusable CLI-distributed AI engineering scaffold that can:

- Create new projects from the scaffold.
- Install scaffold-managed files into existing projects.
- Track installed scaffold version and profile.
- Safely update scaffold-managed files over time.
- Support technology profiles such as generic, Laravel, Next.js, Go, Flutter, Python, Java, and .NET.

The CLI should build around the existing scaffold structure. Do not remove or restructure the current scaffold content unless it is required for packaging, install safety, or upgrade support.

## Target Commands

```bash
npx @lajin/ai-scaffold my-project
npx @lajin/ai-scaffold .
npx @lajin/ai-scaffold init
npx @lajin/ai-scaffold init --profile laravel
npx @lajin/ai-scaffold init --profile node
npx @lajin/ai-scaffold init --profile javascript
npx @lajin/ai-scaffold status
npx @lajin/ai-scaffold doctor
npx @lajin/ai-scaffold update
npx @lajin/ai-scaffold update --target-version 1.2.0
```

## Phase 0: Stabilize Current Scaffold

Before adding the CLI, fix the current readiness issues:

1. Fix the `/review` template-mode mismatch.
   - Either set `PRE_REVIEW_ALLOW_UNCONFIGURED=1` in `.claude/settings.json`, or update docs to say `/review` is blocked until checks are configured.
   - Preferred: make template mode explicit so fresh scaffold users are not blocked unexpectedly.

2. Untrack `.claude/MEMORY.md`.
   - Keep `.claude/MEMORY.template.md`.
   - Generate `.claude/MEMORY.md` per adopted project during bootstrap/init.
   - Add `.claude/MEMORY.md` to `.gitignore`.
   - Move any scaffold build history into tracked docs such as `docs/process/scaffold-build-history.md` or `tasks/lessons.md`.

3. Clarify `.claude/settings-overrides.json`.
   - Placeholder-filled settings must count as unbootstrapped.
   - Rename the placeholder-filled file to `.claude/settings-overrides.template.json`.
   - Add `.claude/settings-overrides.json` to `.gitignore`.
   - Generate the real `.claude/settings-overrides.json` during bootstrap/init with explicit values.

4. Fix broken UX reference links.
   - Either add the referenced `docs/ux/reporting/...` example files, or remove/replace those links.

5. Resolve missing Vue overlay messaging.
   - Either add `.claude/rules/stacks/frontend-vue.md`, or remove Vue/Nuxt from ready profile support until implemented.

## Phase 1: CLI Architecture

Recommended structure:

```text
bin/
  ai-scaffold.js

src/
  cli/
    index.js
    commands/
      create.js
      init.js
      status.js
      doctor.js
      update.js
    core/
      manifest.js
      profiles.js
      file-plan.js
      copy.js
      conflicts.js
      diff.js
      version.js
      prompts.js

templates/
  generic/
  laravel/
  node/
  nextjs/
  golang/
  flutter/
  python/
  java/
  dotnet/
```

Package entry:

```json
{
  "name": "@lajin/ai-scaffold",
  "version": "1.0.0",
  "bin": {
    "ais": "bin/ai-scaffold.js"
  }
}
```

Recommended dependencies:

- `commander` or `cac` for command parsing
- `prompts` or `enquirer` for confirmations
- `fs-extra` for copying
- `picomatch` for file matching
- `diff` for showing changes
- `kleur` or `chalk` for readable output
- `semver` for version handling

### Placeholder Resolution Pipeline

`create` and `init` must not copy unresolved `{{PLACEHOLDER}}` tokens into an adopted project and then leave the user to discover `/bootstrap`.

Required flow:

1. Copy selected template files into a staging area.
2. Collect bootstrap values from interactive prompts or flags.
3. Replace placeholders across every staged text file.
4. Generate `.claude/MEMORY.md` from `.claude/MEMORY.template.md`.
5. Generate `.claude/settings-overrides.json` from `.claude/settings-overrides.template.json`.
6. Write `.ai-scaffold.json` with `bootstrapped: true`.
7. Copy staged files into the target using the safe file plan.

Minimum prompt/flag inputs:

- Project name
- Display name
- One-line purpose
- Project type
- Owner email
- Backend stack
- Frontend stack
- Database
- Multi-tenant true/false
- Compliance scope
- Profile

Support non-interactive installs with `--yes` and explicit flags. When `--yes` is used without all values, use conservative defaults and mark every defaulted value in `.ai-scaffold.json`.

Detailed spec: [docs/cli/placeholder-resolution.md](../cli/placeholder-resolution.md).

## Phase 2: Template Packaging Model

Create a template layer while preserving the current scaffold.

```text
templates/generic/
  .claude/
  .cursor/
  .github/
  _ai/
  docs/
  tasks/
  AGENTS.md
  CLAUDE.md
  HOW-TO-USE.md
  CONTRIBUTING.md
  README.scaffold.md
  CHANGELOG.scaffold.md
```

Template files must be safe to publish and safe to install. Per-project runtime files are generated, not copied:

- `.claude/MEMORY.md`
- `.claude/settings-overrides.json`
- `.ai-scaffold.json`

Add a template manifest:

```json
{
  "profile": "generic",
  "files": [
    ".claude/**",
    ".github/copilot-instructions.md",
    "_ai/**",
    "docs/**",
    "tasks/**",
    "AGENTS.md",
    "CLAUDE.md",
    "HOW-TO-USE.md",
    "CONTRIBUTING.md"
  ],
  "protectedFiles": [
    ".env",
    "README.md",
    "package.json",
    "composer.json",
    "pyproject.toml",
    "requirements.txt",
    "pom.xml",
    "build.gradle",
    "*.csproj",
    ".github/workflows/**"
  ]
}
```

## Phase 3: Version Tracking

Create `.ai-scaffold.json` in installed projects:

```json
{
  "version": "1.0.0",
  "profile": "laravel",
  "bootstrapped": true,
  "bootstrapCompletedAt": "2026-06-24",
  "installedAt": "2026-06-24",
  "updatedAt": "2026-06-24",
  "source": "ai-scaffold",
  "defaultedValues": [],
  "managedFiles": [
    {
      "path": ".claude/rules/ai-coding-rules.md",
      "hash": "sha256:..."
    }
  ]
}
```

This powers `status`, `doctor`, and `update`. `doctor` must warn when `bootstrapped` is false, when placeholder tokens remain in managed files, or when `.claude/settings-overrides.json` still contains template values.

## Phase 4: Commands

### Create New Project

```bash
npx @lajin/ai-scaffold my-project
```

Behavior:

1. Create `my-project/`.
2. Select profile (`generic` by default).
3. Run placeholder resolution prompts or consume flags.
4. Build a staged file plan from the selected template.
5. Generate `.ai-scaffold.json`.
6. Generate `.claude/MEMORY.md` from template.
7. Generate `.claude/settings-overrides.json` from template.
8. Copy staged files.
9. Print next steps.

### Install Into Current Directory

```bash
npx @lajin/ai-scaffold .
```

Equivalent to `npx @lajin/ai-scaffold init` in the current directory. Installs scaffold-managed files without touching application code.

### Install Into Existing Project

```bash
npx @lajin/ai-scaffold init --profile laravel
```

Installs scaffold files into an existing project and protects existing application files.

Conflict rules:

- If `.ai-scaffold.json` already exists, treat the directory as an installed project and route to `status` or `update` unless `--force` is passed.
- If `.claude/` exists but `.ai-scaffold.json` does not, show a full file plan and require explicit confirmation before writing.
- If a managed file already exists, show a diff and prompt for overwrite, keep, or skip.
- If `CLAUDE.md` already exists, treat it as protected and do not overwrite without explicit confirmation.
- Never delete files that are not listed in the manifest.

### Status

```bash
npx @lajin/ai-scaffold status
```

Displays installed version, available version, profile, installation date, managed file count, modified managed file count, and missing managed file count.

### Doctor

```bash
npx @lajin/ai-scaffold doctor
```

Checks missing files, modified managed files, configuration issues, version mismatch, profile validity, hook presence, and unresolved bootstrap state.

### Update

```bash
npx @lajin/ai-scaffold update
npx @lajin/ai-scaffold update --target-version 1.2.0
```

Reads `.ai-scaffold.json`, compares managed files, shows a file plan, asks for confirmation, applies safe updates, and updates hashes/version.

## Phase 5: Safe File Handling

Managed files may be created or updated:

```text
.claude/
.cursor/
.github/copilot-instructions.md
_ai/
docs/
tasks/
AGENTS.md
CLAUDE.md
HOW-TO-USE.md
CONTRIBUTING.md
```

Protected files must never be overwritten without confirmation:

```text
.env
README.md
package.json
composer.json
pyproject.toml
requirements.txt
pom.xml
build.gradle
*.csproj
.github/workflows/**
```

Avoid application source by default:

```text
apps/**
packages/**
src/**
lib/**
app/**
resources/**
database/**
```

Support:

- `--dry-run`
- `--force`
- conflict detection
- diff display
- confirmation before overwriting

`--force` only bypasses confirmation for scaffold-managed files. It must not overwrite protected application files unless the command also names the file or uses a future explicit override such as `--allow-protected`.

## Phase 6: Profiles

Initial profile structure:

```text
templates/
  generic/
  laravel/
  nextjs/
  golang/
  flutter/
  python/
  java/
  dotnet/
```

Profile metadata example:

```json
{
  "name": "laravel",
  "extends": "generic",
  "description": "Laravel/PHP AI scaffold profile",
  "stack": {
    "backend": "PHP/Laravel",
    "frontend": "optional"
  },
  "overlays": [
    ".claude/rules/stacks/backend-php.md"
  ]
}
```

Start with `generic`, `laravel`, and `node`; add the rest after CLI fundamentals are stable.

### Profile Inheritance Model

Use pre-merged complete profiles for the first release.

- `templates/generic/` contains the base scaffold.
- `templates/laravel/` contains a complete installable file set with generic files plus Laravel overlays already applied.
- `templates/node/` contains a complete installable file set with Node.js/JavaScript defaults. `javascript`, `js`, and `nodejs` resolve to this profile.
- The CLI copies from exactly one resolved profile directory.
- `update` compares the installed profile against the complete template for that same profile and version.
- Profile metadata may still include `extends` for documentation and future build tooling, but runtime install/update logic should not merge profiles on the fly in v1.

Vue/Nuxt should remain planned, not advertised as ready, until `.claude/rules/stacks/frontend-vue.md` exists or a Vue profile has a complete overlay.

## Phase 7: Documentation

Create or update:

- `README.md`
- `HOW-TO-USE.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/cli/installation.md`
- `docs/cli/commands.md`
- `docs/cli/profiles.md`
- `docs/cli/placeholder-resolution.md`
- `docs/cli/updates.md`
- `docs/cli/conflict-handling.md`

Document:

- Installation
- New project creation
- Existing project installation
- Updates
- Version management
- Profiles
- Dry-run usage
- Force usage
- Managed files
- Protected files
- Conflict handling
- Placeholder resolution and non-interactive defaults

## Phase 8: Testing

Use automated tests with temporary directories.

Recommended: `vitest`.

Test cases:

1. Creates a new project directory.
2. Installs into the current directory.
3. Installs into an existing project without touching app files.
4. Writes `.ai-scaffold.json`.
5. Applies selected profile.
6. Detects protected file conflicts.
7. `--dry-run` writes nothing.
8. `--force` overwrites allowed conflicts.
9. `status` reads installed metadata.
10. `doctor` detects missing managed files.
11. `doctor` detects modified managed files.
12. `update` applies changed managed files.
13. `update --target-version` selects a specific version.
14. Laravel profile includes PHP stack rules.
15. Existing `README.md` is not overwritten without confirmation.
16. Placeholder tokens are resolved during `create`.
17. Placeholder tokens are resolved during `init`.
18. `.claude/MEMORY.md` is generated from template, not copied.
19. `.claude/settings-overrides.json` is generated from template, not copied.
20. `doctor` reports unresolved placeholders.
21. `doctor` reports unbootstrapped metadata.
22. Existing `.claude/` without `.ai-scaffold.json` requires confirmation.

## Phase 9: Release Strategy

Use semantic versioning.

```bash
npm version patch
git push --follow-tags
npm publish
```

Version policy:

- Patch: docs, bug fixes, safe hook fixes
- Minor: new commands, new profiles, new managed files
- Major: breaking manifest/update behavior

Release checklist:

```text
1. npm test
2. npm run lint
3. npm run build, if applicable
4. npx ./bin/ai-scaffold.js /tmp/test-project --dry-run
5. npx ./bin/ai-scaffold.js init --profile laravel --dry-run
6. npm version patch|minor|major
7. git push --follow-tags
8. npm publish
```

## Timeline Estimate

CLI MVP: 8-12 working days.

Full version with safe updates, all profiles, docs, and release polish: 15-25 working days.

## Recommended Milestones

### Milestone 1: Scaffold Readiness Cleanup

Fix:

- `/review` template-mode mismatch
- tracked `.claude/MEMORY.md`
- placeholder-filled `settings-overrides.json` ambiguity
- missing UX reference links
- missing Vue overlay or remove Vue claim
- placeholder resolution spec for `create` and `init`

### Milestone 2: CLI MVP

Implement:

```bash
npx @lajin/ai-scaffold my-project
npx @lajin/ai-scaffold init --profile generic
npx @lajin/ai-scaffold init --profile laravel
npx @lajin/ai-scaffold init --profile node
npx @lajin/ai-scaffold status
npx @lajin/ai-scaffold doctor
```

### Milestone 3: Safe Updates

Implement:

```bash
npx @lajin/ai-scaffold update
npx @lajin/ai-scaffold update --target-version 1.2.0
```

### Milestone 4: Profiles

Add:

- Next.js
- Go
- Python
- Java
- .NET
- Flutter

### Milestone 5: Public Release

Publish once tests, docs, upgrade flow, and sample installs are verified.

## Recommended Immediate Next Step

Ship the CLI in two releases:

1. v1 CLI MVP: `create`, `init`, `status`, `doctor`, `generic`, `laravel`, `node`, safe conflict handling.
2. v1.1 or v1.2: `update`, version pinning, more profiles, richer doctor checks.

This gets the team using the scaffold faster without waiting for every profile to be perfect.
