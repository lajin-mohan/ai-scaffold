# UAT Sign-off Template

User Acceptance Testing is the final gate before a release is approved for production. The client confirms the software meets agreed requirements. No release proceeds without a completed and signed UAT.

---

## How to Use

1. Copy this template to `docs/qa/uat-{{version}}-{{feature-or-release}}.md`
2. PM and QA Lead prepare the scenario table before testing begins
3. Client or designated UAT tester executes each scenario
4. Defects found are logged in the defect table and raised in Jira
5. Client signs off only when all P0 scenarios pass and no open P0/P1 defects remain

---

```markdown
# UAT Sign-off — {{FEATURE or RELEASE NAME}}

**Version / Release:** {{e.g. v1.2.0 or Sprint 5 Delivery}}
**UAT Period:** {{START_DATE}} → {{END_DATE}}
**Environment:** {{URL or environment name}}
**Prepared by:** {{PM / QA Lead Name}}
**Date:** {{DATE}}

---

## 1. Test Scope

### In Scope for UAT
- 
- 

### Out of Scope for UAT
- 

### Entry Criteria (UAT may not begin unless all are met)
- [ ] All stories meet Definition of Done (see `dod-rules.md`)
- [ ] QA sign-off obtained on staging environment
- [ ] UAT environment is stable and seeded with test data
- [ ] UAT test scenarios have been shared with the client at least 2 business days in advance

---

## 2. Participants

| Role | Name | Organisation |
|---|---|---|
| UAT Coordinator | | your organization |
| UAT Tester(s) | | {{Client}} |
| QA Support | | your organization |
| Tech Lead (escalation) | | your organization |

---

## 3. UAT Scenarios

**Priority:**
- P0 — Blocking: release cannot proceed if this fails
- P1 — High: must pass before sign-off, defect must be logged and scheduled
- P2 — Medium: should pass, acceptable with documented workaround

| ID | Feature | Scenario | Steps | Expected Result | Actual Result | Status | Priority | Tester | Date |
|---|---|---|---|---|---|---|---|---|---|
| UAT-001 | | | | | | PASS / FAIL / BLOCKED | P0/P1/P2 | | |
| UAT-002 | | | | | | PASS / FAIL / BLOCKED | P0/P1/P2 | | |
| UAT-003 | | | | | | PASS / FAIL / BLOCKED | P0/P1/P2 | | |

---

## 4. Defect Log

| Defect ID | Scenario | Description | Severity | Jira Ticket | Status | Resolution |
|---|---|---|---|---|---|---|
| DEF-001 | UAT-00X | | CRITICAL / HIGH / MEDIUM / LOW | | OPEN / FIXED / DEFERRED | |

---

## 5. Test Summary

| Metric | Count |
|---|---|
| Total scenarios | |
| Passed | |
| Failed | |
| Blocked | |
| Pass rate | % |
| Open defects (P0) | |
| Open defects (P1) | |
| Open defects (P2) | |

---

## 6. Known Issues / Deferred Items

| Issue | Severity | Agreed Resolution | Target Sprint |
|---|---|---|---|
| | | | |

---

## 7. UAT Verdict

**Overall Result:** PASS / PASS WITH CONDITIONS / FAIL

**Conditions (if applicable):**
- 

**Release Recommendation:** APPROVED FOR PRODUCTION / HOLD — DEFECTS MUST BE FIXED / REJECT

---

## 8. Sign-off

By signing below, the client confirms that the software meets the agreed acceptance criteria and authorises release to production.

| Role | Name | Organisation | Signature | Date |
|---|---|---|---|---|
| Client Approver | | | | |
| PM | | your organization | | |
| QA Lead | | your organization | | |

---

## 9. Notes

{{Any additional context, observations, or agreements made during UAT.}}
```
