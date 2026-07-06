# Command: /architecture-review

Reviews a proposed architecture or existing system design against project invariants, best practices, and long-term maintainability. Invokes `architect` and `security-reviewer` agents.

## Usage

```
/architecture-review .ai-scaffold/docs/architecture/feature-x-design.md
/architecture-review                    # Review current branch changes for architectural concerns
/architecture-review --adr              # Produce ADRs for key decisions found
```

## Process

1. **Understand the proposal** — read the design doc or infer from code/diff
2. **Map to existing architecture** — how does this fit (or conflict) with current structure?
3. **Validate against invariants** — check `.claude/rules/coding-standards.md` and project architectural rules
4. **Identify coupling risks** — what becomes harder to change if this design is adopted?
5. **Security pass** — hand off auth/data/network surface to `security-reviewer`
6. **Produce ADR recommendations** — flag decisions that need to be recorded
7. **Recommend alternatives** — if the proposal has significant flaws, suggest a better path

## Feature Flags (Settings)

This command reads `.claude/settings-overrides.json`. Compliance checks only run when the corresponding feature is `true`:

| Feature flag | Additional checks performed |
|---|---|
| `gdpr: true` | Data minimization, lawful basis, PII handling in design |
| `iso27001: true` | Access control design, encryption at rest/transit, audit logging architecture |
| `auditLog: true` | Audit trail integration points in the design |
| `asyncJobs: true` | Background job design, idempotency, retry patterns |

When a feature flag is `false`, its corresponding architectural checks are skipped.

## Checklist

### Domain Integrity
- [ ] Business logic is in the domain/service layer, not in routes or controllers
- [ ] No direct database access from outside the repository layer
- [ ] Domain entities don't depend on infrastructure

### Data Layer
- [ ] Tenant isolation enforced at repository boundary
- [ ] No shared mutable state between tenants
- [ ] Migrations are additive and non-destructive

### Coupling & Cohesion
- [ ] Modules communicate through defined interfaces, not shared internals
- [ ] No circular dependencies
- [ ] Database not shared between services (if applicable)

### Scalability
- [ ] Stateless service layer (sessions in DB or cache, not process memory)
- [ ] Background jobs for slow operations
- [ ] No synchronous external calls in critical paths without circuit breaker

### Observability
- [ ] Key operations emit structured logs
- [ ] Error paths are observable and alertable

## Output Format

```
## Architecture Review — [Proposal Name]

### Verdict
APPROVED / APPROVED WITH CHANGES / REDESIGN REQUIRED

### Alignment with Existing Architecture
[How well this fits the current system — no conflicts / minor conflicts / major conflicts]

### Findings

#### Critical (Redesign Required)
- [Issue description and recommended alternative]

#### Significant (Fix Before Implementing)
- [Issue and fix]

#### Minor (Consider Before Finalising)
- [Suggestion]

### ADRs Required
- ADR: [Decision title] — [why it needs recording]

### Recommended Next Steps
1. [Action]
```
