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
| [`update`](#ais-update-target-dir) | Preview what updating to this CLI version would change; `--apply` applies it |

**Bare shortcuts:** `ais <name>` routes to `create <name>`; `ais .` routes to
`init` in the current directory.

---

## `ais create <project-name>`

Creates a new project from a profile template: copies governance files
(`.claude/`, `constitution.md`, `CLAUDE.md`, `AGENTS.md`, rules, hooks),
resolves placeholders from your answers, writes install metadata
(`.ai-scaffold.json`), initializes git with an initial scaffold commit, and
wires `.claude/hooks/pre-commit` and `commit-msg` into `.git/hooks/` so
branch-name, lint and attribution-trailer gates apply to every commit,
including ones made outside Claude Code. The hook scripts are committed with
the executable bit, on Windows too, so Linux and macOS clones run them.

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
settings overrides, managed files (a line-ending-only difference is not a
modification), unmerged `.ais-new` files left by `ais update --apply`,
meaningful setup values, wired hooks, verification commands, and git presence. Exits non-zero when a critical or
high-severity check fails, so CI and scripts can gate on it.

It also reports **effective** governance rather than configured intent:

| Check | Question |
|---|---|
| Branch protection | Are `main` and `dev` actually protected — by legacy branch protection, a ruleset, or both? |
| Required status checks | Is a check both *required* and *observed reporting*? |
| Administrator bypass | Can an administrator override that protection? |
| Pre-commit hook | Is `.git/hooks/pre-commit` really installed and executable — not merely wired in `.claude/settings.json`? |
| Commit-msg hook | Is `.git/hooks/commit-msg` installed and executable? Both hook checks also fail when `.claude/hooks/<hook>` is committed without the executable bit, which makes Linux and macOS clones skip it. |

The hook check is local and needs no network. The three GitHub checks use the
`gh` CLI and are read-only: the only commands they can issue are
`gh api --method GET` and `gh repo view`.

**The required-checks lookback.** A required check that never runs blocks every
pull request; a check that runs but is not required gates nothing. Only the
intersection is enforcement, so `doctor` reads both halves. Configuration comes
from the two protection surfaces; evidence comes from **check runs and commit
statuses on the heads of up to the 5 most recent merged pull requests** into the
first governed branch, and the output names that window. Merged pull requests
only — one closed without merging may have been abandoned before its checks ran,
so its silence proves nothing.

The check reports `unavailable` rather than guessing when the population is
empty (no merged pull request in the window), when a protection surface could
not be read and may require more, or when either scan hit its page budget — the
listing of closed pull requests or the check runs on one head. A context may be
on a page that was never fetched, and that is not evidence of absence.

Governed branches that do not exist in the repository are excluded and named,
not reported as unverifiable — a repository with `main` and no `dev` is not a
governance gap.

Run it after setup and after any manual change to scaffold-managed files.

```bash
ais doctor
ais doctor ./my-project --json
ais doctor --require-remote --repo acme/widgets
```

| Option | Meaning |
|---|---|
| `--json` | Output diagnostics as JSON |
| `--require-remote` | Treat an unavailable **GitHub** check as a failure. For CI where `gh` is installed and authenticated |
| `--repo <owner/name>` | Repository to check, overriding `gh repo view` detection. Same precedence as `scripts/setup-branch-protection.sh` |

### Three states, not two

Every check reports `pass`, `fail`, or `unavailable`, and `passed` is true only
for `pass`.

| State | Human output | Counted in `criticalFailed`/`highFailed`/… |
|---|---|---|
| `pass` | `✓ [SEV] name` | no |
| `fail` | `✗ [SEV] name` | yes |
| `unavailable` | `? [UNAVAILABLE] name — reason` | **no by default**; yes for GitHub checks under `--require-remote` |

`unavailable` means verification was attempted and could not produce evidence —
`gh` is missing, unauthenticated, or lacks permission; there is no GitHub remote;
the budget expired; or the API returned a 200 without the field. It is never a
skip and never a pass: a check that could not read `bypass_actors` reports
`unavailable`, not "no bypass". Each one names the single action that would make
it available.

`--require-remote` affects **only** the GitHub checks (`verifiedBy: "api"`). A
local check that verified nothing — the hook check in a directory with no `.git`
— stays out of the counts in both modes.

The `--json` output names the repository it checked under `repository`, adds
`state`, `verifiedBy` and (when unavailable) `reason` to every check, and adds a
top-level `unavailableCount`. All pre-existing fields keep their names and types;
the five aggregates (`allPassed`, `criticalFailed`, `highFailed`, `mediumFailed`,
`lowFailed`) now count `state === "fail"`, which is what `!passed` meant before
the third state existed.

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

Without `--apply`, a **read-only preview**: shows what updating the project to
this CLI's version would change and writes nothing. With `--apply`, applies
that plan: takes the update lock, resolves an interrupted earlier update where
it can, checks git, backs up every file it will change, writes, and rolls back
on failure. The README's "Update An Installed Scaffold" section describes what
is replaced, kept, merged and never touched.

```bash
ais update                               # preview
ais update --apply                       # apply
ais update ./my-project --json           # one JSON document
npx @lajin.m/ai-scaffold@0.17.0 update   # preview against another version
```

| Option | Meaning |
|---|---|
| `--apply` | Apply the update: back up, write, roll back on failure |
| `--allow-dirty` | With `--apply`, proceed although files the update changes have uncommitted git changes |
| `--allow-no-git` | With `--apply`, proceed although git safety cannot be checked (no repository, or no `git`) |
| `--json` | Print exactly one JSON document to stdout in every outcome: `ais-update-preview/1`, or `ais-update-apply/1` with `--apply` |
| `--target-version <version>` | Must equal this CLI's version; otherwise the error names the `npx …@<version> update` form |
| `--keep-removed <rule>` | Keep a removed scaffold `deny`/`ask` rule removed (repeatable); saved by `--apply` |
| `--restore-removed <rule>` | Restore a rule kept removed (repeatable); saved by `--apply` |
| `--dry-run` | Preview only; overrides `--apply` |
| `--force` | **Removed in 0.17.0**; exits 1 |

`--apply`, `--allow-dirty`, `--allow-no-git`, `--dry-run` and `--json` take no
value: `--apply=foo` exits 1 with `INVALID_OPTION` before anything runs.

What `--apply` leaves behind:

| Path | Meaning |
|---|---|
| `<file>.ais-new` | The new version of a scaffold file you edited. Merge, then delete it; `ais doctor` warns until you do. A differing one already present stops the next apply (`SIDECAR_EXISTS`) |
| `.ai-scaffold/backups/<timestamp>-<id>/` | Copies of every file the apply changed, its journal, and a marker: `complete`, `rolled-back` or `abandoned`. The last five such backups are kept |
| `.ai-scaffold/update.lock` | Present only while an update runs. A lock left by a killed update is reported with its pid, host, age and whether that process is still running; delete it once no update is running |
| `.ai-scaffold/.gitignore` | Keeps `update.lock` and `backups/` out of git. Written at install; an older project gets it from its next `--apply` |

Exit codes: `0` nothing to merge (applied, already current, or a preview with
no conflicts; a preview does not check git), `2` conflicts (a preview found
some, or an apply wrote `.ais-new` files), `1` error, refusal, lock held,
interrupted update, or a rolled-back apply.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Failure — including `doctor` critical/high findings and `export-context` finding nothing to back up |

`doctor` exits `0` when a check is `unavailable` and no check failed: being
unable to verify is an environment problem the user may not control, while a
detected gap is one they can fix, and collapsing the two is what makes
diagnostics get ignored. Pass `--require-remote` where `gh` is guaranteed to
turn an unavailable GitHub check into exit `1`.

## See also

- [README](../README.md) — install, quick start, "Before You Reinstall"
- [README.scaffold.md](../README.scaffold.md) — scaffold platform internals
- In-project slash commands (`/start-task`, `/review`, `/what-next`, …) are
  documented inside each generated project: run `ais list commands` or read the
  generated `CLAUDE.md`.
