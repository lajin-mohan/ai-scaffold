---
name: role-based-orchestration
description: Role-based orchestration decisions, V1/V2 scope, and evidence matrices
metadata:
  type: project
---

# Role-Based Orchestration — Accepted Decisions

Captured from `docs/brd/role-based-orchestration-brd.md` v1.1 (2026-05-28).

## V1 Roles (implemented first)

| Role | Purpose | Default Entry |
|---|---|---|
| `dev` | Feature implementation, bug fixing, review fixes, commits | `/start-task` |
| `qa` | Test planning, test generation, QA review, live verification | `/qa-plan` |
| `architect` | Architecture, API contracts, code review, system risk | `/architecture-review` |
| `ux` | UX creation, UX review, accessibility, responsive behavior | `/ux-analyze` |
| `owner` | All-inclusive project view and orchestration | `/what-next` |

## V2 Roles (documented, not yet routed)

`pm`, `ba`, `security`, `devops` — documented in BRD, no routing until V1 is dogfooded.

## Key Decisions

- **DEC-01:** Use "AI role" in documentation for AI workflow mode — avoids conflict with product user roles in BRDs, UX specs, and permission docs
- **DEC-02:** Use existing `qa-reviewer` for QA planning/review; keep `/gen-tests` responsible for generation — no new wrapper agents
- **DEC-03:** Persist AI role locally in `.claude/settings.local.json` as `role` key — gitignored, per-user
- **DEC-04:** Defer graph orchestration to advisory phase — role config must prove useful first
- **DEC-05:** V1 = 5 roles, V2 = 4 roles — keeps first rollout small

## QA Evidence Categories

Every QA plan must cover or explicitly mark N/A:
1. Schema validation
2. Response contract
3. DB validation
4. Business rule validation
5. Timing/performance
6. Idempotency
7. Security

## Evidence Matrix by Role

| Role | Required Evidence |
|---|---|
| `dev` | Lint/typecheck/test/build, /review BLOCKs resolved, task ACs satisfied |
| `qa` | All 7 categories above |
| `architect` | Architecture decisions, API contract alignment, data model, security/performance/dependency risk |
| `ux` | Accessibility, responsiveness, light/dark theme, state coverage, design-system consistency |
| `owner` | Gate status, blockers, risks, QA/review/CI/deploy readiness, required approvals |
| `pm` | Scope document, estimate approval, blocker status, delivery risk summary |
| `ba` | BRD approval, acceptance criteria sign-off, assumptions/questions resolved |
| `security` | Threat model, auth/data risk, compliance evidence, unresolved security BLOCKs |
| `devops` | Deployment checklist, CI status, rollback plan, smoke test plan, environment readiness |

## Out of Scope (Do Not Add in V1)

- Runtime graph engine
- Role-specific command families (`/dev-*`, `/qa-*`, etc.)
- Wrapper agents per role
- Shared committed settings for active AI role
- V2 roles until V1 is dogfooded

## Related

- BRD: `docs/brd/role-based-orchestration-brd.md`
- Plan: `docs/process/role-based-orchestration-plan.md`
- Gap analysis: `docs/process/role-capability-gap-analysis.md`
- Cleanup plan: `docs/process/scaffold-cleanup-review-plan.md`
