# /kickoff

Run the Project Readiness Checklist before starting any project or major epic. Produces a go/no-go decision with all blockers explicitly listed.

---

## Usage

```
/kickoff
/kickoff "{{PROJECT_NAME or EPIC_NAME}}"
```

---

## Process

Read the current state of the project — CLAUDE.md current state section, docs/ folder, and any context provided — then evaluate each gate below.

For each gate, mark:
- ✅ PASS — artifact exists, is complete, and is approved
- ⚠️ PARTIAL — artifact exists but has open items or lacks approval
- ❌ MISSING — not done

---

## Gate 1 — Requirements

- [ ] BRD exists and is approved (check `docs/brd/`)
- [ ] User personas defined
- [ ] End-to-end user flows documented
- [ ] Acceptance criteria written for all features in scope
- [ ] Edge cases and exception paths identified
- [ ] Non-functional requirements defined (performance, availability, compliance)
- [ ] Solution analysis completed — assumptions and ambiguities resolved (use `solution-analyst` agent if not done)

## Gate 2 — UX / Design

- [ ] Wireframes or Figma designs completed for all primary flows
- [ ] UX reviewed and approved by PM and stakeholder
- [ ] Component spec produced (check `docs/ux/`)
- [ ] Responsive behaviour defined
- [ ] Empty, loading, and error states designed

## Gate 3 — Architecture

- [ ] HLD (High-Level Design) produced (check `docs/architecture/`)
- [ ] Tech stack confirmed and documented in CLAUDE.md
- [ ] API contracts defined (check `docs/api/`)
- [ ] Database schema reviewed
- [ ] Security and compliance requirements assessed
- [ ] ADRs written for all significant technical decisions
- [ ] Architecture review approved via `/architecture-review`

## Gate 4 — Estimation & Planning

- [ ] Effort estimate completed using three-point method (check `docs/estimates/`)
- [ ] Risk register produced
- [ ] Sprint plan / phasing defined
- [ ] Team assigned with right seniority mix for the complexity
- [ ] Dependencies identified and owners confirmed

## Gate 5 — QA Strategy

- [ ] QA strategy defined (what will be tested, at what level)
- [ ] Test environments confirmed
- [ ] UAT plan agreed with client (check `docs/qa/`)
- [ ] Regression scope defined for affected areas

## Gate 6 — Governance

- [ ] Change Request (CR) process explained to all stakeholders
- [ ] Escalation path documented
- [ ] Definition of Done agreed with the team (see `.claude/rules/dod-rules.md`)
- [ ] RACI confirmed (who is responsible, accountable, consulted, informed)

---

## Output Format

```
## Project Readiness Report — {{PROJECT_NAME or EPIC_NAME}}
**Date:** {{DATE}}
**Assessed by:** Claude (Project Readiness Command)

---

### Overall Verdict
## 🟢 GO / 🟡 CONDITIONAL GO / 🔴 NO-GO

{{One sentence summary of readiness.}}

---

### Gate Results

| Gate | Status | Notes |
|---|---|---|
| Gate 1 — Requirements | ✅ / ⚠️ / ❌ | |
| Gate 2 — UX / Design | ✅ / ⚠️ / ❌ | |
| Gate 3 — Architecture | ✅ / ⚠️ / ❌ | |
| Gate 4 — Estimation & Planning | ✅ / ⚠️ / ❌ | |
| Gate 5 — QA Strategy | ✅ / ⚠️ / ❌ | |
| Gate 6 — Governance | ✅ / ⚠️ / ❌ | |

---

### Blockers (Must Resolve Before Starting)
{{List every ❌ MISSING item. Each is a hard blocker.}}

1. 
2. 

### Conditions (Resolve Within First Sprint)
{{List every ⚠️ PARTIAL item. Project may start but these must close.}}

1. 
2. 

### Recommended Actions
{{Ordered list of what to do next to reach GO status.}}

1. 
2. 
```

---

## Rules

- A single ❌ in Gate 1 (Requirements) or Gate 3 (Architecture) is an automatic NO-GO — these failures cascade into everything downstream
- 🟡 CONDITIONAL GO is only valid if all blockers have a named owner and a resolution date
- Do not start execution (Stage 5) unless this checklist returns 🟢 GO
