---
description: Three-point effort estimate with risk weights and phasing recommendation
---

# Command: /estimate

Produces a risk-weighted effort estimate for a feature, epic, or full project. Invokes the `estimator` agent and formats output ready for sprint planning or SOW inclusion.

## Usage

```
/estimate "Add candidate bulk import via CSV"
/estimate docs/brd/feature-x.md             # Estimate from a BRD section
/estimate --epic "Requisition Management"   # Estimate a full epic
/estimate --sprint                          # Estimate everything in current sprint scope
```

## Process

1. **Read the input** — feature description, BRD section, or list of tasks
2. **Identify unknowns** — flag anything requiring a spike before estimating
3. **Break down into tasks** — analysis, backend, frontend, migrations, tests, review, QA, deployment
4. **Apply risk multipliers** — per task based on complexity and risk factors
5. **Produce three-point estimate** — optimistic / realistic / pessimistic
6. **List assumptions and exclusions** — make the estimate's scope explicit

## Output

Uses the `estimator` agent output format. Produces:

- Task breakdown table with O/R/P estimates
- Risk register
- Explicit assumptions
- Explicit exclusions
- Recommended phasing (if applicable)
- Confidence level: HIGH / MEDIUM / LOW

## Notes

- Estimates are in business days (1 day = 7.5 productive hours).
- If requirements are unclear, the estimate will show LOW confidence and recommend a spike.
- The estimate includes analysis, implementation, review, QA, and deployment — not implementation only.
- Risk buffer (15%) is included in the realistic total.
- Use `.claude/templates/estimation-template.md` for the SOW-ready format.
