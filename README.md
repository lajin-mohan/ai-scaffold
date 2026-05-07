# {{PROJECT_NAME}}

> {{ONE_LINE_PURPOSE}}

---

## Overview

{{2-3 sentences describing what this project does, who it's for, and why it exists.}}

**Organization:** Techversant Infotech
**Type:** `{{SaaS / Internal Tool / API / Platform}}`
**Status:** `{{Active Development / MVP / Production}}`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | `{{BACKEND_STACK}}` |
| Frontend | `{{FRONTEND_STACK}}` |
| Database | `{{DATABASE}}` |
| Infrastructure | `{{CLOUD_PROVIDER}}` |
| CI/CD | `{{CICD_PLATFORM}}` |

---

## Getting Started

### Prerequisites

- `{{RUNTIME}}` — e.g., Node.js 20+, PHP 8.2+, Python 3.11+
- `{{DATABASE}}` running locally or via Docker
- Environment variables configured (see `.env.example`)

### Setup

```bash
# Clone the repository
git clone {{REPO_URL}}
cd {{PROJECT_NAME}}

# Install dependencies
{{INSTALL_COMMAND}}   # e.g., npm install / composer install / pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your local values

# Run database migrations
{{MIGRATION_COMMAND}}   # e.g., npm run db:migrate / php artisan migrate

# Start development server
{{DEV_COMMAND}}   # e.g., npm run dev / php artisan serve
```

### Available Scripts

```bash
{{BUILD_COMMAND}}       # Production build
{{TEST_COMMAND}}        # Run tests
{{LINT_COMMAND}}        # Lint + typecheck
{{MIGRATE_COMMAND}}     # Database migrations
{{SEED_COMMAND}}        # Seed development data
```

---

## Project Structure

```
{{PROJECT_NAME}}/
+-- apps/               # Deployable applications
|   +-- api/            # Backend API server
|   +-- web/            # Frontend application
+-- packages/           # Shared modules
|   +-- domain/         # Business entities and rules
|   +-- services/       # Application services
|   +-- repositories/   # Data access layer
|   +-- shared/         # Types, utils, constants
+-- infra/              # Infrastructure as code
+-- scripts/            # Dev, migration, seed scripts
+-- docs/               # Architecture, BRD, API docs
+-- _ai/                # AI-generated drafts (not production)
```

---

## Development Workflow

```
Analysis → Plan → Arch Design → UX Design → Execution → AI Review → Manual Review → QA → CI/CD → Deploy
```

See [CLAUDE.md](./CLAUDE.md) for full workflow rules and AI collaboration guidelines.

---

## Documentation

| Document | Location |
|---|---|
| Architecture | `docs/architecture/` |
| Business Requirements | `docs/brd/` |
| API Reference | `docs/api/` |
| UX Specs | `docs/ux/` |
| Estimates | `docs/estimates/` |
| QA Plans | `docs/qa/` |
| Deployment | `docs/deployment/` |

---

## Contributing

1. Branch from `dev` — `feature/your-feature-name`
2. Follow commit conventions in [CLAUDE.md](./CLAUDE.md)
3. Ensure CI passes before requesting review
4. AI review → manual review → merge to `dev`

See `.claude/rules/branching-rules.md` for full git workflow.

---

## License

`{{LICENSE}}` — `{{YEAR}}` Techversant Infotech
