# Change Request Template

Use this template whenever a requirement, scope, or design change is requested after the BRD or sprint plan has been signed off. Every change — no matter how small — requires a CR if it affects timeline, budget, architecture, or another feature.

---

## How to Use

1. Copy this template to `docs/brd/cr-{{CR_ID}}-{{short-title}}.md`
2. Fill in all sections — incomplete CRs will not be assessed
3. Share with PM, Tech Lead, and Client for approval
4. Link the CR to the original BRD and to any affected tickets in Jira
5. Do not start implementation until all three approvals are obtained

---

```markdown
# Change Request — CR-{{ID}}

**Title:** {{Short descriptive title}}
**CR ID:** CR-{{sequence number, e.g. CR-001}}
**Raised by:** {{Name, Role}}
**Date Raised:** {{YYYY-MM-DD}}
**Related BRD / Epic:** {{link or reference}}
**Priority:** CRITICAL / HIGH / MEDIUM / LOW

---

## 1. Description of Change

{{What is changing? Be specific. Reference the original requirement being modified.}}

### Original Requirement
> {{Quote or reference the original requirement from the BRD or spec.}}

### Requested Change
{{Describe the new requirement. What should it do instead?}}

---

## 2. Reason / Business Justification

{{Why is this change needed? What business event, client feedback, or discovery prompted it?
Be specific — "client changed their mind" is not sufficient.}}

---

## 3. Impact Assessment

### Timeline Impact
| Scenario | Estimate |
|---|---|
| Optimistic | +X days |
| Realistic | +X days |
| Pessimistic | +X days |

**Impact on current sprint:** YES / NO — {{detail}}
**Impact on milestone / release date:** YES / NO — {{detail}}

### Effort Impact
| Area | Hours |
|---|---|
| Backend | |
| Frontend | |
| QA (regression) | |
| DevOps / infra | |
| Documentation | |
| **Total** | |

### Architecture Impact
**Architecture change required?** YES / NO

{{If YES, describe what changes. Does this require an ADR?}}

### Other Features Impacted
| Feature / Story | Impact | Action Required |
|---|---|---|
| | | |

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| | H/M/L | H/M/L | |

---

## 4. Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| Do nothing | |
| {{Alternative 1}} | |

---

## 5. Implementation Notes

{{Any technical notes the development team needs to understand before estimating or implementing.}}

---

## 6. Testing Impact

- [ ] Existing test cases need updating — list which
- [ ] New test cases required — describe scope
- [ ] Regression run required on: {{list areas}}
- [ ] UAT re-run required: YES / NO

---

## 7. Approval

| Role | Name | Decision | Date | Signature |
|---|---|---|---|---|
| Project Manager | | APPROVE / DEFER / REJECT | | |
| Tech Lead | | APPROVE / DEFER / REJECT | | |
| Client | | APPROVE / DEFER / REJECT | | |

**Final Decision:** APPROVED / DEFERRED / REJECTED

**If DEFERRED:** Target sprint / date: {{date}}
**If REJECTED:** Reason: {{reason}}

---

## 8. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | {{DATE}} | {{NAME}} | Initial CR |
```
