# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

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
{{BUILD_COMMAND}}    # Production build
{{TEST_COMMAND}}     # Run tests
{{LINT_COMMAND}}     # Lint and typecheck
{{MIGRATE_COMMAND}}  # Database migrations
{{SEED_COMMAND}}     # Seed development data
```

## Project Structure

```text
{{PROJECT_NAME}}/
+-- .claude/         # AI commands, agents, hooks, and rules
+-- .ai-scaffold/    # Scaffold docs, templates, examples, and task records
+-- AGENTS.md        # Cross-agent executor guide
+-- CLAUDE.md        # Main AI operating guide
```

## AI Workflow

Read [CLAUDE.md](./CLAUDE.md) before starting implementation. It is the source of truth for agent roles, workflow gates, coding standards, review rules, and verification expectations.

Useful entry points:

- [AGENTS.md](./AGENTS.md)
- [.claude/rules/ai-coding-rules.md](./.claude/rules/ai-coding-rules.md)

## License

{{LICENSE}} - {{YEAR}} Lajin M J.
