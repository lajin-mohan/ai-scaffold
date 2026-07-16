# CLI Reference

Complete reference for every `ais` command. Generated from the CLI's actual
`--help` output — if this file and `ais <command> --help` ever disagree, the
`--help` output is right; please file an issue.

Install: `npm install -g @lajin.m/ai-scaffold` (gives you the `ais` binary), or
run any command via `npx @lajin.m/ai-scaffold <command>` without installing.

> **Windows PowerShell:** quote the package name — `npx "@lajin.m/ai-scaffold" <command>` — because PowerShell treats a leading `@` as the splatting operator and cannot parse the unquoted form. cmd.exe, Git Bash, macOS, and Linux need no quotes. A global install avoids it entirely (the `ais` binary has no `@`).

| Command | One-liner |
|---|---|
| [`create`](#ais-create-project-name) | Create a new project from a scaffold profile |
| [`init`](#ais-init-target-dir) | Install the scaffold into an existing repository |
| [`status`](#ais-status-target-dir) | Show installed version, profile, and managed-file status |
| [`doctor`](#ais-doctor-target-dir) | Diagnose scaffold installation health |
| [`list`](#ais-list-category-target-dir) | List installed commands, agents, skills, and rules |
| [`export-context`](#ais-export-context-target-dir) | Back up memory/lessons/settings before a reinstall |
| [`update`](#ais-update-target-dir) | Update scaffold metadata (placeholder — full migrations planned) |

**Bare shortcuts:** `ais <name>` routes to `create <name>`; `ais .` routes to
`init` in the current directory.

---

## `ais create <project-name>`

Creates a new project from a profile template: copies governance files
(`.claude/`, `constitution.md`, `CLAUDE.md`, `AGENTS.md`, rules, hooks),
resolves placeholders from your answers, writes install metadata
(`.ai-scaffold.json`), initializes git with an initial scaffold commit, and
wires `.claude/hooks/pre-commit` into `.git/hooks/` so branch-name and lint
gates apply to every commit — including ones made outside Claude Code.

```bash
ais create billing-api
ais create my-app --profile node --yes
ais create my-app --dry-run
```

| Option | Meaning |
|---|---|
| `--profile <profile>` | Scaffold profile: `generic` (default), `node`, `python`, `golang`, `laravel`. Aliases: `js`, `javascript`, `nodejs` → node; `py`, `python3` → python; `go` → golang |
| `--yes` | Use defaults for all options, no prompts |
| `--dry-run` | Show what would be created without writing files |
| `--json` | Print a machine-readable dry-run plan as JSON (implies non-interactive) |
| `--force` | Overwrite existing files without prompting |
| `--no-git` | Skip git init, the initial commit, and pre-commit hook wiring |
| `--project-name <name>` | Project name (slug) |
| `--display-name <name>` | Display name |
| `--purpose <text>` | One-line purpose |
| `--project-type <type>` | `api`, `web-app`, `full-stack`, `library`, `cli`, `mobile`, `infra`, `data`, `internal-tool`, `saas` |
| `--owner-email <email>` | Owner email |
| `--backend-stack <stack>` / `--frontend-stack <stack>` / `--database <db>` | Stack declarations (flow into generated docs and agent prompts) |
| `--multi-tenant` | Enable multi-tenancy (default: single-tenant) |
| `--compliance <scope>` | Comma-separated compliance scope, e.g. `GDPR,SOC2` |
| `--lifecycle-stage <stage>` | `discovery`, `active-development`, `production`, `maintenance`, `legacy-modernization` |
| `--data-sensitivity <level>` | `public`, `internal`, `confidential`, `regulated` |
| `--requirements-source <source>` | `existing-docs`, `create-later`, `create-now` |
| `--requirements-path <path>` | Existing or intended requirements path |
| `--test-command` / `--lint-command` / `--typecheck-command` / `--build-command` | Verification commands wired into the generated project's settings |

---

## `ais init [target-dir]`

Installs the scaffold into an **existing** repository, safely: scaffold-owned
context goes under `.ai-scaffold/`, runtime files (`.ai-scaffold.json`,
`.claude/`, `CLAUDE.md`, `AGENTS.md`) go to their expected paths, and existing
files like `README.md`, `package.json`, and `.env` are **protected** — never
overwritten without `--force`. Does not create root application folders
(`apps/`, `docs/`, `packages/`, …).

**Always run `--dry-run` first on a repository you care about.**

```bash
ais init
ais init ./my-existing-project --profile node --yes
ais init --dry-run
```

Options are the same as `create` (minus `--no-git`; `init` never touches git),
including `--dry-run`, `--json`, `--force`, `--profile`, and all identity/stack
flags. With requirements:

```bash
ais init --profile node \
  --requirements-source existing-docs \
  --requirements-path docs/requirements/frd.md
```

---

## `ais status [target-dir]`

Quick install report: scaffold version, profile, install/update timestamps,
managed-file count, and integrity (missing or locally modified managed files),
plus an overall health verdict.

```bash
ais status
ais status ./my-project --json
```

| Option | Meaning |
|---|---|
| `--json` | Output status as JSON |

---

## `ais doctor [target-dir]`

Deep health check: validates the manifest, required files, project memory,
settings overrides, managed files, meaningful setup values, wired hooks,
verification commands, and git presence. Exits non-zero when a critical or
high-severity check fails, so CI and scripts can gate on it.

Run it after setup and after any manual change to scaffold-managed files.

```bash
ais doctor
ais doctor ./my-project --json
```

| Option | Meaning |
|---|---|
| `--json` | Output diagnostics as JSON |

---

## `ais list [category] [target-dir]`

Lists what the installed scaffold provides: commands, agents, skills, and
rules. Optionally filter to one category.

```bash
ais list
ais list commands
ais list rules ./my-project
```

| Option | Meaning |
|---|---|
| `--json` | Output as JSON |

---

## `ais export-context [target-dir]`

Backs up the project's **non-regenerable context** before a delete-and-reinstall
upgrade: `tasks/lessons.md`, `.claude/MEMORY.md`, `.ai-scaffold/context.md`,
`.claude/settings-overrides.json`, and `.claude/rules/`. The backup goes to
`~/.ai-scaffold-backups/<project>-<timestamp>/` — **outside** the project
directory, so it survives deleting the project folder. Exits non-zero when
nothing was found to back up.

Run this **before** deleting a project to reinstall a newer scaffold version.
See "Before You Reinstall" in the README.

```bash
ais export-context
ais export-context ./my-project --out ~/backups/my-project
```

| Option | Meaning |
|---|---|
| `--out <path>` | Backup destination (default: `~/.ai-scaffold-backups/<project>-<timestamp>/`) |
| `--json` | Output the backup manifest as JSON |

---

## `ais update [target-dir]`

**Placeholder in the current release.** Reports installed metadata but does not
apply file updates — full managed-file migrations (diff, preview, apply with
backup/rollback, version-pinned) are planned. Until then, the supported upgrade
path is `export-context` → delete → `create` (see "Before You Reinstall" in the
README).

```bash
ais update
ais update ./my-project --target-version 1.0.0
ais update --dry-run
```

| Option | Meaning |
|---|---|
| `--target-version <version>` | Update to a specific version |
| `--dry-run` | Show what would be updated without making changes |
| `--force` | Force update even if already up to date |

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Failure — including `doctor` critical/high findings and `export-context` finding nothing to back up |

## See also

- [README](../README.md) — install, quick start, "Before You Reinstall"
- [README.scaffold.md](../README.scaffold.md) — scaffold platform internals
- In-project slash commands (`/start-task`, `/review`, `/what-next`, …) are
  documented inside each generated project: run `ais list commands` or read the
  generated `CLAUDE.md`.
