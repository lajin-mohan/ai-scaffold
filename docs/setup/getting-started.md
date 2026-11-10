# Getting Started — Setup Guide

This guide takes you from nothing to your first AI-assisted change. It takes
about 15 minutes. For the short version, see the Quick Start in the
[README](../../README.md#quick-start).

## 1. What you need

| Requirement | Notes |
|---|---|
| Node.js 16 or later | CI tests Node 24. Check with `node --version`. |
| git | `create` makes the first commit for you. |
| An AI assistant | **Claude Code** gets everything: commands, hooks, rules. Codex, Cursor and Copilot read the shared `AGENTS.md`; see step 7. |
| `gh` CLI (optional) | Only for the GitHub branch-protection checks in `ais doctor`. |

## 2. Install the CLI (optional)

You can run every command with `npx`, or install once and use the short `ais`
command:

```bash
npm install -g @lajin.m/ai-scaffold
ais --help
```

> **Windows PowerShell** treats a leading `@` specially, so quote the package
> name with npx: `npx "@lajin.m/ai-scaffold" create my-app`. A global install
> avoids the quoting. cmd.exe, Git Bash, macOS and Linux need no quotes.

The examples below use `ais`; with npx, replace `ais` with
`npx @lajin.m/ai-scaffold`.

## 3. Create a project, or add the scaffold to an existing one

**New project:**

```bash
ais create my-app --profile node
cd my-app
```

Profiles: `generic`, `node` (alias `js`, `javascript`), `python`, `golang`,
`laravel`. `create` runs `git init` and makes a first commit; add `--no-git` to
skip that.

**Existing repository** (run from its root). Preview first, then install:

```bash
ais init --profile node --dry-run
ais init --profile node
```

`init` never touches git and never overwrites your files, such as `README.md`
or `package.json`, unless you pass `--force`. If your repository already has a
`CLAUDE.md`, add this line at its top so Claude Code also loads the shared
instructions:

```text
@AGENTS.md
```

### What gets written

| Path | What it is |
|---|---|
| `AGENTS.md` | Shared instructions every AI assistant reads: commands, conventions, security boundaries, what needs approval |
| `CLAUDE.md` | Imports `AGENTS.md` and adds Claude Code notes |
| `constitution.md` | One page: which rule wins when two conflict |
| `.claude/` | Slash commands, agents, hooks, rules and skills |
| `.claude/settings-overrides.json` | Project details and feature flags |
| `.ai-scaffold/` | Setup context, the command guide (`commands.md`) and the CLI reference |
| `tasks/lessons.md` | Lessons the AI and the team record |

## 4. Check the install

```bash
ais doctor
```

It checks required files, settings, hooks and git. It exits non-zero when
something important is wrong, so it also works in CI. A GitHub check it cannot
run (no `gh`, no network) is reported as unavailable, never as passed.

Common findings:

| `doctor` says | Do this |
|---|---|
| Pre-commit or commit-msg hook not installed | Run `ais update --apply`, which installs missing hooks. If your git uses `core.hooksPath` (husky or similar), it tells you instead to copy `.claude/hooks/pre-commit` and `.claude/hooks/commit-msg` into that directory. |
| Setup values missing | Run `/ais-bootstrap` (step 5). |
| Branch protection unavailable | Install and sign in to `gh` (`gh auth login`), or ignore it locally. |

Full details: `.ai-scaffold/cli-reference.md` in your project.

## 5. Fill in the project details

Open the project in Claude Code and run:

```text
/ais-bootstrap
```

It asks for the project name, purpose, stack, whether it is multi-tenant and
which compliance rules apply, then writes the answers into the project files.
Check the result any time with `/ais-bootstrap --check`.

Feature flags (GDPR, accessibility, audit log and others) are in
`.claude/settings-overrides.json`. Edit the file to switch one on or off.

## 6. Make your first change

```text
/ais-what-next                                  # where things stand
/ais-plan "Add a health-check endpoint"         # plan → you reply "go" → it builds and verifies
/ais-review --lite                              # quick AI review of the change
/ais-commit                                     # commit with the git rules checked
```

`/ais-plan` always stops after the plan and waits for your approval. Read it,
correct anything wrong, then reply `go`. You get a verification report at the
end.

For a bug, use `/ais-debug "what is broken"` instead of `/ais-plan`.

All commands with examples: `.ai-scaffold/commands.md` in your project, or
[docs/commands.md](../commands.md).

## 7. Using Codex, Cursor or Copilot

These tools read `AGENTS.md` automatically, so they follow the same
conventions and boundaries. They do not run Claude slash commands or Claude
hooks. To use a workflow, ask the assistant to follow the command file:

```text
Read .claude/commands/ais-plan.md and follow it to add a health-check endpoint.
```

Hooks are Claude Code only. Your git `pre-commit` and `commit-msg` hooks still
run for every tool, because git runs them.

## 8. Keep it up to date

```bash
ais update            # preview: shows every file that would change; writes nothing
ais update --apply    # apply it
```

Your memory, lessons, settings overrides and application files are never
touched. Scaffold files you edited are kept, and the report lists them so you
can merge by hand. Run `ais doctor` afterwards.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| PowerShell: `The splatting operator '@' cannot be used…` | Quote the package name, or install globally (step 2). |
| `/ais-…` command not found in Claude Code | Start Claude Code from the project root, where `.claude/` is. |
| Hooks never fire | Run `ais doctor`; see the hook rows in step 4. |
| A command name from before 0.19 no longer works | Commands were renamed in 0.19.0; the CHANGELOG lists the new names. |
| You want to start over | `ais export-context` backs up memory, lessons and settings before you delete and reinstall. |

Still stuck? Run `ais doctor --json` and include the output when you ask for
help.
