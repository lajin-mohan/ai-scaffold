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

## Role Tutorials

Detailed step-by-step tutorials for each role are in `.claude/roles/tutorials/`:

| Role | Tutorial |
|---|---|
| `dev` | [.claude/roles/tutorials/dev-role-tutorial.md](../../.claude/roles/tutorials/dev-role-tutorial.md) |
| `qa` | [.claude/roles/tutorials/qa-role-tutorial.md](../../.claude/roles/tutorials/qa-role-tutorial.md) |
| `architect` | [.claude/roles/tutorials/architect-role-tutorial.md](../../.claude/roles/tutorials/architect-role-tutorial.md) |
| `ux` | [.claude/roles/tutorials/ux-role-tutorial.md](../../.claude/roles/tutorials/ux-role-tutorial.md) |
| `owner` | [.claude/roles/tutorials/owner-role-tutorial.md](../../.claude/roles/tutorials/owner-role-tutorial.md) |

## Source of Truth

Machine-readable AI role configs (allowed commands, blocked actions, evidence gates) live in `.claude/roles/*.yaml`. This folder is the human-readable guide layer — short and linking to the details, not duplicating them.

## Naming Rule

- **AI role:** `dev`, `qa`, `architect`, `ux`, `owner`
- **User role:** admin, recruiter, candidate, manager, approver, customer, etc.
- **Permission/capability:** explicit application access, such as `applications:submit`
