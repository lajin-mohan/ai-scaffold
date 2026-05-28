# Role-Based Orchestration Implementation Plan

**Feature:** Role-Based Orchestration  
**BRD:** `docs/brd/role-based-orchestration-brd.md`  
**Date:** 2026-05-28  
**Status:** Draft  

---

## 1. Summary

Implement AI-role-based routing as a thin configuration layer over the existing AI OS. V1 should not add duplicate AI-role-specific agents or commands. It should add AI role configs, document local AI role persistence, and update existing command guidance so team members get relevant next actions without losing governance.

---

## 2. Decisions

| Decision | Final Direction |
|---|---|
| Terminology | Use "AI role" in documentation for AI workflow mode; reserve "user role" for product/application roles |
| V1 roles | `dev`, `qa`, `architect`, `ux`, `owner` |
| V2 roles | `pm`, `ba`, `security`, `devops` |
| QA planning agent | Use existing `qa-reviewer` in V1 |
| Test generation | Keep actual test generation in `/gen-tests` |
| Local persistence | Store active AI role in `.claude/settings.local.json` as `role` |
| Graph orchestration | Defer to later advisory phase |
| New commands | No new commands in V1; optional `/ai-role` in V1.5/V2 |

---

## 3. Local AI Role Settings

The active AI role should be local to each developer/QA/architect machine.

File:

```text
.claude/settings.local.json
```

Shape:

```json
{
  "role": "dev"
}
```

Rules:
- `settings.local.json` stays gitignored.
- If no AI role is configured, default to `dev` for implementation work.
- For status/orchestration requests, default to `owner`.
- A future `/ai-role qa` command may update this file.
- Commands should eventually support a session override such as `/what-next --ai-role qa`.

---

## 4. V1 Role Config Files

Add:

```text
.claude/
  roles/
    README.md
    dev.yaml
    qa.yaml
    architect.yaml
    ux.yaml
    owner.yaml
```

Do not add V2 AI role configs until V1 has been dogfooded.

---

## 5. Role YAML Shape

```yaml
name: qa
description: Test planning, QA automation evidence, QA review, and live verification.

default_entry: /qa-plan

allowed_commands:
  - /qa-plan
  - /gen-tests
  - /qa-review
  - /qa-auth
  - /qa
  - /lessons

recommended_agents:
  - qa-reviewer

required_evidence:
  - schema_validation
  - response_contract
  - db_validation
  - business_rule_validation
  - timing_performance
  - idempotency
  - security

blocked_actions:
  - merge_main
  - deploy_production
  - destructive_changes
  - secrets_access
  - schema_migration_without_approval

output_style:
  format: qa_report
  severity: BLOCK_HIGH_MEDIUM_LOW
```

---

## 6. Implementation Phases

### Phase 1 - Clean Drift and Align Existing Commands

Tasks:
- Verify only `.claude/` is tracked; no `.Claude/` files.
- Ensure `/qa-plan` uses `qa-reviewer`, not missing `qa-automation-engineer`.
- Restore/apply QA evidence categories across:
  - `/qa-plan`
  - `/gen-tests`
  - `/qa-review`
  - `qa-reviewer`
  - `testing-rules`
  - `test-case-template`
- Ensure `CLAUDE.md`, `HOW-TO-USE.md`, and `CONTRIBUTING.md` do not reference missing agents/commands.

Acceptance:
- `git ls-files | grep '^\.Claude/'` returns nothing.
- `rg "qa-automation-engineer"` has no active stale references.
- QA evidence categories appear in all QA paths.

### Phase 2 - Add V1 Role Configs

Tasks:
- Create `.claude/roles/README.md`.
- Create role YAML files for `dev`, `qa`, `architect`, `ux`, `owner`.
- Add `.claude/settings.local.example.json` example for local `role`.

Acceptance:
- Every V1 role has a YAML file.
- Every role maps only to existing commands and agents.
- `settings.local.example.json` documents `"role": "dev"`.

### Phase 3 - Update Docs and Command Guidance

Tasks:
- Update `CLAUDE.md` with role table and local setting guidance.
- Update `HOW-TO-USE.md` with "Start by role" section.
- Update `CONTRIBUTING.md` with short contributor role guidance.
- Update `/what-next`, `/loop`, and `/commit-changes` docs to mention active AI role routing.

Acceptance:
- New team member can identify the right AI role in under one minute.
- Docs do not repeat the full workflow in three places.
- `CONTRIBUTING.md` stays short and checklist-oriented.

### Phase 4 - Optional `/ai-role` Command

Only build this after V1 configs are used in real sessions.

Potential behavior:

```text
/ai-role                  # show active AI role and available AI roles
/ai-role qa               # update .claude/settings.local.json role to qa
/ai-role --reset          # remove local AI role and return to default behavior
```

Acceptance:
- Command updates only local settings.
- Command never writes shared team config unless explicitly requested.

### Phase 5 - Advisory Workflow Graph

Defer graph orchestration until AI role configs are stable.

Potential files:

```text
.claude/orchestration/
  workflow-graph.yaml
  workflow-graph.md
  state-schema.md
```

Acceptance:
- Graph is advisory only.
- No runtime graph engine in this phase.
- Roles can reference graph nodes later without changing YAML shape.

---

## 7. V1 Role Evidence Matrix

| Role | Required Evidence |
|---|---|
| `dev` | Lint/typecheck/test/build evidence, `/review` clean or BLOCKs resolved, task ACs satisfied |
| `qa` | Schema validation, response contract, DB validation, business rules, timing/performance, idempotency, security |
| `architect` | Architecture decision evidence, API contract alignment, data model review, security/performance/dependency risk |
| `ux` | Accessibility, responsive behavior, light/dark theme, state coverage, design-system consistency |
| `owner` | Gate status, blockers, risks, QA/review/CI/deploy readiness, required approvals |

---

## 8. V2 Role Evidence Matrix

Document now, implement later.

| Role | Required Evidence |
|---|---|
| `pm` | Scope document, estimate approval, blocker status, delivery risk summary |
| `ba` | BRD approval, acceptance criteria sign-off, assumptions/questions resolved |
| `security` | Threat model, auth/data risk assessment, compliance evidence, unresolved security BLOCKs |
| `devops` | Deployment checklist, CI status, rollback plan, smoke test plan, environment readiness |

---

## 9. Do Not Build in V1

- Do not add wrapper agents for each AI role.
- Do not add `/dev-*`, `/qa-*`, `/ux-*` command families.
- Do not build a graph runtime engine.
- Do not persist active AI role in shared committed settings.
- Do not add V2 roles until V1 is dogfooded.

---

## 10. Verification Checklist

- [ ] `.Claude/` is absent from Git-tracked files
- [ ] `/qa-plan` uses `qa-reviewer`
- [ ] `qa-automation-engineer` is not referenced unless the agent exists
- [ ] V1 role YAML files exist
- [ ] Role YAML references only existing commands and agents
- [ ] Local AI role setting is documented as `.claude/settings.local.json` key `role`
- [ ] QA evidence categories are present across QA paths
- [ ] Public docs explain AI role usage without duplicating the full workflow
- [ ] Graph orchestration is documented as deferred
