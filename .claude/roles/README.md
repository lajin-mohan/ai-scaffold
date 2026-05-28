# Roles

Role-based configuration for the AI OS. Each role is a lightweight YAML file that maps to existing commands and agents — no new capabilities added.

## Quick Start

Pick your role and use the default entry command to start:

| Role | Default Entry |
|---|---|
| `dev` | `/start-task` |
| `qa` | `/qa-plan` |
| `architect` | `/architecture-review` |
| `ux` | `/ux-create` |
| `owner` | `/supervisor` |

## Setting Your Role

Store your active role locally:

```json
{
  "role": "dev"
}
```

Edit `.claude/settings.local.json` and set the `role` key. This file is gitignored and per-user.

## Files

```
.claude/roles/
  README.md          — this file
  dev.yaml           — implementation role
  qa.yaml            — QA planning and verification role
  architect.yaml     — architecture and API design role
  ux.yaml            — UX creation and review role
  owner.yaml         — project orchestration role
```

## Config Schema

Each role YAML uses the same schema:

| Field | Description |
|---|---|
| `name` | Role identifier (dev, qa, architect, ux, owner) |
| `description` | One-sentence purpose description |
| `default_entry` | Recommended command to start with |
| `allowed_commands` | Commands relevant to this role |
| `recommended_agents` | Specialist agents to invoke for this role's work |
| `required_evidence` | Evidence gates this role must satisfy before claiming done |
| `blocked_actions` | Actions that require human approval regardless of role |
| `output_style` | Preferred output format and severity model |

## V2 Roles

`pm`, `ba`, `security`, and `devops` are documented in `docs/brd/role-based-orchestration-brd.md`. They are not routed until V1 is validated through real usage.

## Commands

Role routing for `/what-next`, `/supervisor`, and `/loop` is planned for Phase 3 — after V1 role configs are live and usage patterns are understood.

## See Also

- BRD: `docs/brd/role-based-orchestration-brd.md`
- Decisions: `.claude/memory/role-based-orchestration.md`
- Cleanup plan: `docs/process/scaffold-cleanup-review-plan.md`
