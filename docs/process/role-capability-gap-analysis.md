# Role Capability Gap Analysis

**Feature:** Role-Based Orchestration  
**Related BRD:** `docs/brd/role-based-orchestration-brd.md`  
**Related Plan:** `docs/process/role-based-orchestration-plan.md`  
**Date:** 2026-05-28  
**Status:** Draft  

---

## 1. Purpose

This document lists the missing agents, commands, rules, and skills needed to serve the planned roles without duplicating existing capabilities.

V1 roles:

```text
dev, qa, architect, ux, owner
```

V2 roles, documented for later:

```text
pm, ba, security, devops
```

---

## 2. Core Principle

Do not create a new agent or command just because a role exists.

Add a new capability only when it provides unique behavior:
- new judgment
- new evidence collection
- new stop condition
- new artifact
- new verification path

If the role can be served by routing to existing commands/agents, use routing.

---

## 3. Current Coverage

| Role | Existing Agents | Existing Commands | Coverage |
|---|---|---|---|
| `dev` | `debugging-agent`, `backend-reviewer`, `frontend-reviewer`, `critic` | `/start-task`, `/loop`, `/review`, `/gen-tests`, `/debug-fix`, `/investigate`, `/commit-changes` | Strong |
| `qa` | `qa-reviewer`, `debugging-agent` | `/qa-plan`, `/gen-tests`, `/qa-review`, `/qa-auth`, `/qa` | Strong, needs evidence consistency |
| `architect` | `architect`, `api-architect`, `backend-reviewer`, `security-reviewer` | `/create-api`, `/architecture-review`, `/review`, `/health` | Strong |
| `ux` | `ux-designer`, `frontend-reviewer` | `/ux-create`, `/ux-review`, `/qa` | Strong |
| `owner` | `supervisor`, `critic`, all specialist agents via routing | `/what-next`, `/supervisor`, `/health`, `/loop`, `/review`, `/qa-review`, `/deployment-review`, `/reflect`, `/compact` | Strong, needs role routing |
| `pm` | `pm`, `estimator`, `solution-analyst` | `/what-next`, `/kickoff`, `/estimate`, `/create-brd` | Good, V2 |
| `ba` | `solution-analyst`, `documentation-writer`, `pm` | `/create-brd`, `/what-next`, `/reflect` | Good, V2 |
| `security` | `security-reviewer`, `architect` | `/review --security-only`, `/qa-auth`, `/deployment-review` | Good, V2 |
| `devops` | `devops-engineer` | `/deployment-review`, `/health`, `/commit-changes` | Good, V2 |

---

## 4. P0 Gaps for V1

| Gap | Type | Applies To | Recommendation |
|---|---|---|---|
| Role config files do not exist | Config | all V1 roles | Add `.claude/roles/dev.yaml`, `qa.yaml`, `architect.yaml`, `ux.yaml`, `owner.yaml` |
| Local role setting is not documented in config examples | Config | all | Add `"role": "dev"` to `.claude/settings.local.example.json` |
| `/qa-plan` must not rely on missing agent | Command | `qa` | Use existing `qa-reviewer` in V1 |
| QA evidence categories are not consistently applied | Rules/Commands/Templates | `qa`, `dev` | Update `/qa-plan`, `/gen-tests`, `/qa-review`, `qa-reviewer`, `testing-rules`, `test-case-template` |
| Public docs are not role-aware | Docs | all | Update `CLAUDE.md`, `HOW-TO-USE.md`, `CONTRIBUTING.md` |
| Role routing is not documented in command guidance | Commands | all | Update `/what-next`, `/supervisor`, `/loop`, `/commit-changes` docs |

---

## 5. Not Needed in V1

| Proposed Capability | Decision | Reason |
|---|---|---|
| `qa-automation-engineer` agent | Do not add in V1 | `qa-reviewer` can plan/review; `/gen-tests` generates tests |
| `/owner` or `/role` command | Defer | Local settings docs are enough for first rollout |
| Runtime graph engine | Defer | Role configs must prove useful first |
| Role-specific command families | Do not add | Existing commands should be routed by role |
| Wrapper agents per role | Do not add | Adds names without new behavior |

---

## 6. V1 Role-Specific Gaps

### `dev`

Missing:
- `dev.yaml`
- role-specific evidence list for `/commit-changes`

No new agent needed.

### `qa`

Missing:
- `qa.yaml`
- QA evidence categories across QA command/rule/template docs
- `/qa-plan` alignment to `qa-reviewer`

No new agent needed in V1.

### `architect`

Missing:
- `architect.yaml`
- role guidance for architecture evidence and review-only behavior

No new agent needed.

### `ux`

Missing:
- `ux.yaml`
- UX-only scope guard in role config

No new agent needed.

### `owner`

Missing:
- `owner.yaml`
- safe automation boundary in role config
- project-wide output style guidance

No new agent needed.

---

## 7. V2 Capabilities to Revisit Later

| Role | Possible Future Capability | Add Only If |
|---|---|---|
| `pm` | `/status` or `/risk-review` | PMs repeatedly ask for status/risk output not covered by `/what-next` |
| `ba` | `/ac-review` | Acceptance criteria quality becomes a recurring bottleneck |
| `security` | `/threat-model` | Security review needs a standalone artifact before implementation |
| `devops` | `/ci-review` | CI/deploy readiness gaps appear repeatedly |

---

## 8. Cleanup Review Candidate List

These should be reviewed before adding new capabilities:

| Area | Why Review |
|---|---|
| duplicate docs that restate the workflow | Reduces drift |
| legacy skills such as `ux-audit` vs `ux-review` | Avoids duplicate UX review paths |
| `design-system` vs `ux-system` boundary | Clarifies token/component vs UX workflow responsibility |
| command registry consistency across `CLAUDE.md`, `HOW-TO-USE.md`, command files | Prevents stale command docs |
| memory files committed vs local-only | Keeps template clean |
| `.claude` vs `.Claude` references | Prevents cross-platform drift |

---

## 9. Verification Checklist

- [ ] V1 role configs exist
- [ ] Role configs reference only existing agents and commands
- [ ] `qa-automation-engineer` is absent or implemented intentionally
- [ ] QA evidence categories appear across all QA paths
- [ ] No `.Claude/` files are tracked
- [ ] Docs do not duplicate full workflow unnecessarily
- [ ] No wrapper agents were added without unique behavior
