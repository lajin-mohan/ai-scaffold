# Architect Role Tutorial

**Role:** `architect` | **Default command:** `/architecture-review` | **Purpose:** System design, API contracts, architectural decisions, and technical risk assessment

---

## When to Use This Role

You are the **architect** when you need to:
- Design a new feature or system architecture
- Review architectural decisions before implementation
- Define API contracts for a new endpoint
- Assess technical risks and trade-offs
- Evaluate dependency boundaries and data models
- Create Architecture Decision Records (ADRs)

**Not the architect role:** writing production code, UI implementation, QA execution, project management.

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "architect"
}
```

### 2. Begin with architecture review

```bash
/architecture-review
```

This reviews the current system against project invariants and compliance rules, surfaces design issues before coding begins.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/architecture-review` | Review current architecture or proposed design | Architecture report with BLOCK/WARN/INFO findings |
| `/create-api` | Design a full REST API contract | Endpoints, request/response shapes, errors, migrations |
| `/estimate` | Effort estimation for a feature | Three-point estimate with risk weights |
| `/review` | Code review at the implementation stage | BLOCK/WARN/QUESTION findings |
| `/health` | Check project-level code quality | Composite score dashboard |
| `/lessons` | Record a decision or mistake pattern | Saved to `tasks/lessons.md` |
| `/reflect` | Review architectural decisions made | Saved to memory |

---

## Step-by-Step Workflow

### New Feature Architecture

```
1. Before any code is written:
   → Run /architecture-review to validate the approach
   → Run /create-api to define the API contract
   → Run /estimate to get effort/sizing

2. Architecture review output:
   → HLD (High-Level Design) approval
   → API contract approval
   → ADR for any non-obvious decisions
   → Data model review
   → Security risk assessment

3. Gate: No code until architecture is approved
   → Stage 3 blocks Stage 4 (UX)
   → Stage 3 blocks Stage 5 (Implementation)
```

### API Contract Design

```
1. Run /create-api
   → Specify: resource, operations, auth requirements
   → Claude generates: endpoints, request/response shapes, error taxonomy
   → Async patterns handled for long-running operations
   → Migrations scaffolded

2. Review the contract:
   → Does it match existing API conventions?
   → Are error codes consistent?
   → Is pagination handled?
   → Are security/tenant scoping requirements met?

3. Approve → contract becomes the implementation contract
```

### ADR Creation

```
When a decision has multiple valid options with different trade-offs:

1. Document the decision brief:
   → Stakes: what's at risk if this is wrong
   → Options: at least 2 alternatives with pros/cons
   → Recommendation: one clear recommendation
   → Net: one-line closing the tradeoff

2. File the ADR:
   → docs/architecture/adr/ADR-001-descriptive-name.md
   → Reference it from the relevant ticket

3. Update .claude/memory/architecture-decisions.md
```

---

## Required Evidence Gates

Before claiming "architectural approval":

- [ ] `architecture_decision_recorded` — ADR filed for any significant choice
- [ ] `api_contract_approved` — `/create-api` output reviewed and signed off
- [ ] `data_model_reviewed` — schema design validated
- [ ] `security_risk_assessed` — OWASP top 10, tenant isolation reviewed
- [ ] `performance_risk_assessed` — NFRs defined and validated
- [ ] `dependency_boundary_reviewed` — no circular dependencies, clean layering

---

## Blocked Actions (Human Required)

| Action | Why Blocked |
|---|---|
| `merge_main` | Requires human approval + CI green |
| `deploy_production` | Requires deployment review + sign-off |
| `destructive_changes` | Requires explicit human consent |
| `secrets_access` | Out of scope for AI |
| `schema_migration_without_approval` | Requires tech lead sign-off |

---

## Calling Specialist Agents

Invoke these for deep analysis:

```
@api-architect         — REST API contracts, async patterns, versioning
@security-reviewer     — threat modeling, GDPR/ISO compliance, auth review
@backend-reviewer      — server-side correctness, performance, data access
@devops-engineer       — infrastructure, scaling, deployment strategy
@estimator             — effort sizing, risk register, phasing recommendations
```

---

## Common Scenarios

### Scenario 1: New microservice

```
User: "We need a notification service"

1. Architecture review output:
   → Service scope and responsibilities defined
   → Event-driven vs REST decision made
   → Data ownership clarified (what does service own?)
   → Integration points documented

2. Create API contract (if REST):
   → /notifications POST — send notification
   → /notifications GET — list user notifications
   → /notifications/:id/read PATCH — mark as read

3. ADR filed for: async queue choice, notification storage strategy
```

### Scenario 2: Database migration

```
User: "We need to add a soft-delete pattern to all entities"

1. Run /architecture-review
   → Review: every table gets deleted_at column
   → Review: repository layer enforces soft delete
   → Review: no hard deletes in business logic
   → ADR: soft delete policy

2. Run /estimate
   → Effort estimate for all affected repositories
   → Migration sequencing plan
```

### Scenario 3: Third-party integration

```
User: "We need to integrate Stripe for payments"

1. Run /architecture-review
   → Security: PCI-DSS compliance, no card data stored
   → API contract: Stripe webhooks vs our polling
   → Error handling: idempotency, retry, reconciliation
   → ADR: payment handling approach

2. Security review required before any code
```

---

## Output Styles

| Output | Format | Severity model |
|---|---|---|
| `/architecture-review` | Architecture report | BLOCK_HIGH_MEDIUM |
| `/create-api` | API contract document | BLOCK_HIGH |
| `/estimate` | Estimation spreadsheet | BLOCK_HIGH |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No ADR exists for a significant decision | Create one before proceeding — decisions without records drift |
| API contract doesn't match existing conventions | Revise contract before implementation — spec is the contract |
| "I don't know" response | This is correct. Ask or research — don't hallucinate the architecture |
| Multiple valid options without clear winner | Use Decision Brief format — present options, recommend one |
| Security concern flagged | BLOCK — don't proceed until resolved |

---

## Related Files

- Role config: [architect.yaml](architect.yaml)
- API standards: [.claude/rules/api-standards.md](../rules/api-standards.md)
- Security rules: [.claude/rules/security-rules.md](../rules/security-rules.md)
- ADR template: [.claude/templates/adr-template.md](../templates/adr-template.md)