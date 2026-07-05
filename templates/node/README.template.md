# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Project Info

| Field | Value |
|---|---|
| Organization | Techversant Infotech |
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
npm install

# Configure environment
cp .env.example .env

# Run migrations, if applicable
{{MIGRATION_COMMAND}}

# Start development
npm run dev
```

## Common Commands

```bash
npm run build      # Production build
npm test           # Run tests
npm run lint       # Lint and typecheck
{{MIGRATE_COMMAND}}    # Database migrations
{{SEED_COMMAND}}       # Seed development data
```

## Project Structure

```text
{{PROJECT_NAME}}/
+-- apps/       # Deployable applications
+-- packages/   # Shared modules
+-- docs/       # Architecture, BRD, API, UX, QA, deployment docs
+-- tasks/      # Active and completed work records
+-- _ai/        # AI-generated drafts and experiments
```

## AI Workflow

Read [CLAUDE.md](./CLAUDE.md) before starting implementation. It is the source of truth for agent roles, workflow gates, coding standards, review rules, and verification expectations.

Useful entry points:

- [HOW-TO-USE.md](./HOW-TO-USE.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [AGENTS.md](./AGENTS.md)

## License

{{LICENSE}} - {{YEAR}} Techversant Infotech.
