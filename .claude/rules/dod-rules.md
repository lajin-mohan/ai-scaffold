# Definition of Done (DoD)

A task, story, or feature is **Done** only when every applicable criterion below is met. "Code complete" is not done. "Merged" is not done. Done means ready for production.

Referenced by: `backend-reviewer`, `frontend-reviewer`, `qa-reviewer`, `review-rules.md`

---

## Story-Level DoD

Every user story must satisfy all of the following before being marked Done in Jira.

### Code
- [ ] All acceptance criteria from the spec are implemented — no partial delivery
- [ ] No hardcoded values, secrets, or credentials
- [ ] No commented-out code
- [ ] No TODO comments without a linked ticket reference
- [ ] No dead code introduced
- [ ] Functions are single-purpose; no function exceeds ~50 lines
- [ ] Naming is clear without requiring context to understand

### Tests
- [ ] Happy path test passes
- [ ] At least two edge/failure case tests pass
- [ ] Auth failure (401) test passes for all protected endpoints
- [ ] Authorization failure (403) test passes for all permission-gated actions
- [ ] Tenant isolation test passes — a user cannot access another tenant's data
- [ ] No test is skipped without a documented reason

### Security
- [ ] All SQL uses parameterized queries — no string interpolation
- [ ] `tenant_id` scoped on every query that touches tenant data
- [ ] Input validated at API boundary
- [ ] No PII in logs or error messages
- [ ] No secrets in code

### Review
- [ ] Self-review checklist in `review-rules.md` completed by the author
- [ ] AI review (`/review`) run and all BLOCK findings resolved
- [ ] Human peer review approved

### Documentation
- [ ] Public API endpoints documented (or existing API contract updated)
- [ ] Any new environment variables added to `.env.example`
- [ ] ADR written if a significant technical decision was made

---

## Sprint-Level DoD

A sprint is Done when:

- [ ] All stories meet the Story-Level DoD above
- [ ] CI pipeline is green (lint, typecheck, unit tests, integration tests, build)
- [ ] No known P0 or P1 defects outstanding
- [ ] QA sign-off obtained from qa-reviewer or QA team
- [ ] Staging environment reflects the sprint's delivered features
- [ ] Sprint demo completed with PM / stakeholder

---

## Release / Milestone DoD

A release is Done when:

- [ ] All features in the release meet Story-Level and Sprint-Level DoD
- [ ] UAT completed and client sign-off obtained (see `uat-template.md`)
- [ ] Performance tested against defined NFRs
- [ ] Security review completed for any auth, data, or permission changes
- [ ] Rollback plan documented and tested
- [ ] Release notes produced (see `release-notes-template.md`)
- [ ] Deployment review approved via `/deployment-review`
- [ ] Smoke test passed in the target environment post-deploy

---

## DoD Exceptions

Any criterion may be waived only with:
1. Written justification in the PR description
2. A linked ticket for the deferred work
3. Approval from the Tech Lead

Waiving a security criterion requires Tech Lead + PM approval and must be resolved within the next sprint.

---

## Quick Reference Card

| Level | Key Gate |
|---|---|
| Story | All ACs met + tests pass + AI review clean + human review approved |
| Sprint | All stories done + CI green + QA sign-off + staging deployed |
| Release | Sprint DoD + UAT + perf test + security review + release notes + deployment review |
