# Business Requirements Document
**Project:** ai-scaffold
**Feature:** Role-Based Orchestration
**Version:** 1.1
**Date:** 2026-05-28
**Status:** Draft
**Author:** Codex
**Approved By:** TBD

---

## 1. Executive Summary

Role-Based Orchestration adds simple AI role modes to the AI OS so each team member can use the same scaffold without learning every command, rule, and workflow path. A user selects an AI role such as `dev`, `qa`, `architect`, `ux`, or `owner`; commands then show the right next actions, evidence requirements, stop conditions, and output style for that AI role.

Product/application roles such as admin, recruiter, candidate, manager, or approver remain **user roles**. They are separate from AI roles.

This is a routing/configuration layer over existing agents and commands. It is not a new runtime engine and it does not bypass governance.

---

## 2. Objectives

| ID | Objective | Success Metric |
|---|---|---|
| OBJ-01 | Reduce command overload | A user can choose an AI role and see relevant commands without reading the full scaffold |
| OBJ-02 | Reuse existing capabilities | V1 adds AI role config and documentation without duplicating agents or commands |
| OBJ-03 | Preserve governance consistency | All AI roles still respect hard gates for security, destructive actions, deploy, schema migration, and merge |
| OBJ-04 | Enable owner-level visibility | `owner` AI role can see project-wide status, risks, blockers, and recommended next actions |

---

## 3. Scope

### V1 Roles

| Role | Purpose | Default Entry |
|---|---|---|
| `dev` | Feature implementation, bug fixing, review fixes, commits | `/start-task` |
| `qa` | Test planning, test generation, QA review, live verification | `/qa-plan` |
| `architect` | Architecture, API contracts, code review, system risk | `/architecture-review` |
| `ux` | UX creation, UX review, accessibility, responsive behavior | `/ux-analyze` |
| `owner` | All-inclusive project view and orchestration | `/what-next` |

### V2 Roles

| Role | Purpose | Default Entry |
|---|---|---|
| `pm` | Scope, blockers, delivery tracking, estimates | `/what-next` |
| `ba` | Requirements, BRD, acceptance criteria, assumptions | `/create-brd` |
| `security` | Threat review, auth/data/compliance risk | `/review --security-only` |
| `devops` | CI/CD, deployment, rollback, smoke tests | `/deployment-review` |

### In Scope

| ID | Item |
|---|---|
| S-01 | Add V1 AI role configuration files under `.claude/roles/` |
| S-02 | Document local AI role persistence through `.claude/settings.local.json` |
| S-03 | Update `/what-next` and `/loop` guidance to respect active AI role |
| S-04 | Update QA AI role to require schema validation, response contract, DB validation, business rules, timing/performance, idempotency, and security evidence |
| S-05 | Update `CLAUDE.md`, `HOW-TO-USE.md`, and `CONTRIBUTING.md` so team members know how to use AI roles |
| S-06 | Defer graph/orchestration implementation to a later phase while keeping AI role config graph-compatible |

### Out of Scope

| ID | Item | Reason |
|---|---|---|
| OS-01 | Building a runtime graph engine in V1 | Role config must prove useful first |
| OS-02 | Adding separate commands per AI role | Existing commands should be reused with AI role context |
| OS-03 | Adding wrapper agents per AI role | New agents must add unique judgment, not just a new name |
| OS-04 | Per-user access control | AI roles guide AI workflow; they are not security permissions |

---

## 4. Functional Requirements

### 4.1 Role Configuration

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system SHALL define V1 roles: `dev`, `qa`, `architect`, `ux`, `owner` | Must Have |
| FR-02 | The system SHALL document V2 roles: `pm`, `ba`, `security`, `devops` | Must Have |
| FR-03 | The system SHALL store AI role configuration under `.claude/roles/` | Must Have |
| FR-04 | Each AI role config SHALL define allowed commands, default entry command, required evidence, blocked actions, and output style | Must Have |
| FR-05 | AI role configuration SHALL be declarative and avoid duplicating command documentation | Must Have |

### 4.2 Local Role Settings

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | The active AI role SHOULD be stored locally in `.claude/settings.local.json` as `role` | Should Have |
| FR-11 | `.claude/settings.local.json` SHALL remain gitignored and per-user | Must Have |
| FR-12 | If no local AI role is configured, commands SHALL default to `dev` for implementation contexts and `owner` for project-status contexts | Should Have |
| FR-13 | A later `/ai-role {{name}}` command MAY update the local AI role setting | Nice to Have |
| FR-14 | A per-command/session override MAY be supported later, e.g. `/what-next --role qa` | Nice to Have |

Example local settings:

```json
{
  "role": "dev"
}
```

### 4.3 Role Routing

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | `/what-next` SHALL show AI-role-relevant next actions once AI role routing is implemented | Must Have |
| FR-21 | Supervisor/orchestration guidance SHALL use the active AI role when routing work across existing commands and agents | Must Have |
| FR-22 | `/loop` SHALL respect AI-role-specific blocked actions and stop conditions | Must Have |
| FR-23 | `/commit-changes` SHALL ask for verification evidence appropriate to the active AI role | Should Have |

### 4.4 Role Evidence

| ID | Role | Required Evidence |
|---|---|---|
| FR-30 | `dev` | Lint/typecheck/test/build evidence before claiming done; `/review` BLOCK findings resolved |
| FR-31 | `qa` | Schema validation, response contract, DB validation, business rule validation, timing/performance, idempotency, and security test evidence |
| FR-32 | `architect` | Architecture decision evidence, API contract alignment, data model review, security/performance risk review, dependency-boundary review |
| FR-33 | `ux` | Accessibility, responsiveness, light/dark theme, state coverage, design-system consistency, and primary workflow verification |
| FR-34 | `owner` | All unresolved gate failures, release confidence, blockers, risks, and required human approvals |
| FR-35 | `pm` | Scope document, estimate approval, blocker status, delivery risk summary |
| FR-36 | `ba` | BRD approval, acceptance criteria sign-off, assumptions/questions resolved |
| FR-37 | `security` | Threat model, auth/data risk assessment, compliance evidence, unresolved security BLOCKs |
| FR-38 | `devops` | Deployment checklist, CI status, rollback plan, smoke test plan, environment readiness |

---

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | AI roles filter and guide workflow; they do not bypass governance gates |
| BR-02 | `owner` may orchestrate broadly but must still stop for destructive actions, secrets, schema migrations, production deploy, and merge-to-main approval |
| BR-03 | `qa` cannot mark QA complete unless required automation evidence is covered or explicitly marked N/A with reason |
| BR-04 | `ux` should not modify backend/business logic except when explicitly approved |
| BR-05 | `architect` should prefer review/design guidance; implementation changes require explicit task scope |
| BR-06 | Missing AI role config must fail soft: show available AI roles and ask the user to choose |
| BR-07 | Command documentation must not reference a command, AI role, or agent that does not exist |
| BR-08 | V1 SHALL reuse existing agents and commands; wrapper agents are not allowed without unique behavior |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Simplicity | AI role names must be obvious without explanation |
| NFR-02 | Maintainability | Adding an AI role should require one YAML file and minimal docs changes |
| NFR-03 | Portability | Only `.claude` may be used; `.Claude` must not be tracked |
| NFR-04 | Safety | Hard gates remain enforced regardless of AI role |
| NFR-05 | Adoption | A new team member should identify their AI role path in under one minute |

---

## 7. Accepted Decisions

| ID | Decision | Status | Rationale |
|---|---|---|---|
| DEC-01 | Use "AI role" in documentation for the AI workflow mode; keep the local settings key as `role` | Accepted | Avoids conflict with product user roles in BRDs, UX specs, and permission docs without changing the existing settings shape |
| DEC-02 | Use `qa-reviewer` for QA planning/review in V1; keep `/gen-tests` responsible for generation | Accepted | Avoids duplicate `qa-automation-engineer` wrapper agent |
| DEC-03 | Persist AI role locally in `.claude/settings.local.json` as `role` | Accepted | Useful per-user default without team-wide coupling |
| DEC-04 | Defer graph orchestration to a later advisory phase | Accepted | Role config must prove useful before graph execution |
| DEC-05 | V1 supports `dev`, `qa`, `architect`, `ux`, `owner`; V2 documents `pm`, `ba`, `security`, `devops` | Accepted | Keeps first rollout small while preserving the larger model |

---

## 8. Acceptance Criteria

| ID | Criterion | Test Scenario |
|---|---|---|
| AC-01 | V1 role configs exist for `dev`, `qa`, `architect`, `ux`, and `owner` | Inspect `.claude/roles/*.yaml` |
| AC-02 | Local AI role setting is documented as `.claude/settings.local.json` with key `role` | Inspect docs and settings example |
| AC-03 | `/qa-plan` references `qa-reviewer`, not a missing `qa-automation-engineer` agent | Search repo for stale active references |
| AC-04 | QA evidence categories are present in QA command/rule/template docs | Inspect `/qa-plan`, `/gen-tests`, `/qa-review`, `qa-reviewer`, `testing-rules`, `test-case-template` |
| AC-05 | Public docs explain role-based usage without repeating the full workflow in every file | Inspect `CLAUDE.md`, `HOW-TO-USE.md`, `CONTRIBUTING.md` |
| AC-06 | No Git-tracked `.Claude/` files exist | `git ls-files | grep '^\.Claude/'` returns nothing |

---

## 9. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Role config becomes another source of drift | Medium | High | Keep configs thin and reference existing commands/rules |
| R-02 | `owner` role is interpreted as unsafe autonomy | Medium | High | Explicit blocked actions and approval gates |
| R-03 | Commands reference missing agents | Medium | Medium | V1 uses existing `qa-reviewer`; verification search before release |
| R-04 | Too many roles confuse users | Low | Medium | V1 supports five roles only; V2 roles are documented but not routed |
| R-05 | Docs repeat stale workflow text | High | Medium | Keep `CLAUDE.md` authoritative, `HOW-TO-USE.md` practical, `CONTRIBUTING.md` short |

---

## 10. Glossary

| Term | Definition |
|---|---|
| AI role | A simple AI workflow mode such as `dev`, `qa`, or `architect` |
| Active AI role | The local or session-selected AI workflow mode currently guiding command routing |
| User role | A product/application role used in requirements, permissions, and UX flows, such as admin, manager, candidate, or approver |
| Blocked action | An action that cannot proceed without human approval |
| Evidence | Test, review, command output, file reference, or documented reason proving a gate is satisfied |
| Workflow graph | Future machine-readable map of nodes, edges, conditions, and stop gates |

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-28 | Codex | Initial owner-type draft |
| 1.1 | 2026-05-28 | Codex | Changed terminology to role, resolved Q-02/Q-03, phased V1/V2 roles |
