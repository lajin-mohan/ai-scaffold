# AI Roles

AI role configuration for the AI OS. Each AI role is a lightweight YAML file that maps to existing commands and agents — no new capabilities added.

Use **AI role** for workflow modes such as `dev`, `qa`, `architect`, `ux`, and `owner`. Use **user role** for application roles such as admin, recruiter, manager, candidate, or approver.

## Quick Start

Pick your AI role and use the default entry command to start:

| AI Role | Default Entry |
|---|---|
| `dev` | `/start-task` |
| `qa` | `/qa-plan` |
| `architect` | `/architecture-review` |
| `ux` | `/ux-analyze` |
| `owner` | `/what-next` |

## Setting Your AI Role

Store your active AI role locally:

```json
{
  "role": "dev"
}
```

Edit `.claude/settings.local.json` and set the `role` key. This file is gitignored and per-user.

## Role Tutorials

Each role has a detailed tutorial with step-by-step workflows, command reference, common scenarios, and troubleshooting:

| Role | Tutorial |
|---|---|
| `dev` | [dev-role-tutorial.md](tutorials/dev-role-tutorial.md) |
| `qa` | [qa-role-tutorial.md](tutorials/qa-role-tutorial.md) |
| `architect` | [architect-role-tutorial.md](tutorials/architect-role-tutorial.md) |
| `ux` | [ux-role-tutorial.md](tutorials/ux-role-tutorial.md) |
| `owner` | [owner-role-tutorial.md](tutorials/owner-role-tutorial.md) |

## Files

```
.claude/roles/
  README.md              — this file
  dev.yaml               — implementation role
  qa.yaml                — QA planning and verification role
  architect.yaml         — architecture and API design role
  ux.yaml                — UX creation and review AI role
  owner.yaml             — project orchestration AI role
  tutorials/             — step-by-step role tutorials
    dev-role-tutorial.md
    qa-role-tutorial.md
    architect-role-tutorial.md
    ux-role-tutorial.md
    owner-role-tutorial.md
```

## Config Schema

Each role YAML uses the same schema:

| Field | Description |
|---|---|
| `name` | AI role identifier (dev, qa, architect, ux, owner) |
| `description` | One-sentence purpose description |
| `default_entry` | Recommended command to start with |
| `allowed_commands` | Commands relevant to this role |
| `recommended_agents` | Specialist agents to invoke for this role's work |
| `required_evidence` | Evidence gates this role must satisfy before claiming done |
| `blocked_actions` | Actions that require human approval regardless of role |
| `output_style` | Preferred output format and severity model |

## V2 AI Roles

`pm`, `ba`, `security`, and `devops` are documented in `docs/brd/role-based-orchestration-brd.md`. They are not routed until V1 is validated through real usage.

## Commands

AI role routing for `/what-next` and `/loop` is planned for Phase 3 — after V1 role configs are live and usage patterns are understood.

## See Also

- BRD: `docs/brd/role-based-orchestration-brd.md`
- Human guide: `docs/ai-os/README.md`
- Decisions: `.claude/memory/role-based-orchestration.md`
- Cleanup plan: `docs/process/scaffold-cleanup-review-plan.md`
