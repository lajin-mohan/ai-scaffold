# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

> **Start here:** read [`constitution.md`](constitution.md) — the one-page source
> of truth for how this project works — then `AGENTS.md`, then run `/ais-what-next`.

## Project Info

| Field | Value |
|---|---|
| Type | {{SaaS / Internal Tool / API / Platform}} |
| Status | {{Active Development / MVP / Production}} |
| Owner | {{OWNER_EMAIL}} |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | {{BACKEND_STACK}} |
| Frontend | {{FRONTEND_STACK}} |
| Database | {{DATABASE}} |
| Infrastructure | {{CLOUD_PROVIDER}} |
| CI/CD | {{CICD_PLATFORM}} |

## Getting Started

```bash
# Install dependencies
{{INSTALL_COMMAND}}

# Create a .env file if your project needs one
# (the scaffold does not ship an .env.example into generated projects)

# Run migrations, if applicable
{{MIGRATION_COMMAND}}

# Start development
{{DEV_COMMAND}}
```

## Common Commands

```bash
{{BUILD_COMMAND}}      # Production build
{{TEST_COMMAND}}           # Run tests
{{LINT_COMMAND}}       # Lint
{{MIGRATE_COMMAND}}    # Database migrations
{{SEED_COMMAND}}       # Seed development data
```
{{UNSUPPORTED_CAPABILITIES}}
## Project Structure

```text
{{PROJECT_NAME}}/
+-- .claude/         # AI commands, agents, hooks, and rules
+-- .ai-scaffold/    # Scaffold docs, templates, examples, and task records
+-- AGENTS.md        # Shared AI instructions (every tool)
+-- CLAUDE.md        # Imports AGENTS.md, adds Claude Code notes
+-- package.json     # Node.js project scripts and metadata
```

## AI Workflow

Read [`constitution.md`](./constitution.md) first — it is the one-page source of truth for **governance order** (which rule wins on a conflict). Then read [AGENTS.md](./AGENTS.md), the shared instructions every AI assistant reads: commands, conventions, security boundaries and what needs approval. Detailed rules live in `.claude/rules/`; the staged delivery workflow is opt-in.

### AI commands

Type these in Claude Code. Start with the six everyday ones:

| Command | Use it to | Example |
|---|---|---|
| `/ais-what-next` | See the next action and what blocks it | `/ais-what-next --brief` |
| `/ais-plan` | Plan a change, approve it, then let the AI build and verify it | `/ais-plan "Add CSV export to invoices"` |
| `/ais-debug` | Fix a bug from its root cause, with a regression test | `/ais-debug "Login loops back to /login"` |
| `/ais-review` | Get an AI review before opening a pull request | `/ais-review` (or `--lite` for small changes) |
| `/ais-commit` | Commit with the project's git rules checked | `/ais-commit` |
| `/ais-lessons` | Find or record past root causes | `/ais-lessons "session"` |

Every command, with usage and examples: `.ai-scaffold/commands.md` (from the
project root). In Codex, Cursor or Copilot, ask the assistant to read and follow
the matching file in `.claude/commands/`.

## License

© {{YEAR}} {{PROJECT_DISPLAY_NAME}}.
