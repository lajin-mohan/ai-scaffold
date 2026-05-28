# AI Role Guides

This folder documents AI workflow roles for the scaffold.

AI roles are not product user roles. Product user roles belong in BRDs, UX specs, permission matrices, and security docs. AI roles describe how a team member wants the AI OS to route commands, evidence, and handoffs.

## Active AI Roles

| AI Role | Start Here | Use For |
|---|---|---|
| `dev` | `/start-task` | implementation, bug fixes, review fixes, commits |
| `qa` | `/qa-plan` | test planning, test generation, QA review, browser verification |
| `architect` | `/architecture-review` | architecture, API contracts, system risk, technical trade-offs |
| `ux` | `/ux-analyze` | UX requirements, flows, screen specs, Figma specs, handoff |
| `owner` | `/what-next` | project status, orchestration, blockers, release readiness |

## Local Setting

Set your active AI role locally:

```json
{
  "role": "dev"
}
```

File:

```text
.claude/settings.local.json
```

This file is gitignored and per-user.

## Source of Truth

Machine-readable AI role configs live in `.claude/roles/`.

This folder is the human-readable guide layer. Keep it short and link to command docs instead of duplicating every workflow.

## Naming Rule

- **AI role:** `dev`, `qa`, `architect`, `ux`, `owner`
- **User role:** admin, recruiter, candidate, manager, approver, customer, etc.
- **Permission/capability:** explicit application access, such as `applications:submit`
