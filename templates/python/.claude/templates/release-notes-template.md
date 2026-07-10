# Release Notes Template

Produced as part of the release process. Generated with help from the `documentation-writer` agent and reviewed as part of `/deployment-review`. Store in `docs/deployment/release-notes-{{version}}.md`.

---

## How to Use

1. Copy this template when preparing a release
2. Fill in all sections — reference merged PRs, resolved tickets, and the UAT sign-off
3. Share with PM and client before deployment
4. Publish internally after deployment completes

---

```markdown
# Release Notes — {{VERSION}}

**Version:** {{e.g. v1.2.0}}
**Release Date:** {{YYYY-MM-DD}}
**Environment:** Production / Staging
**Release Type:** Major / Minor / Patch / Hotfix
**Prepared by:** {{Name}}
**Approved by:** {{PM Name}}

---

## Summary

{{2–3 sentence overview of what this release delivers and why it matters.
Focus on business value, not technical detail.}}

---

## What's New

### New Features
{{List each new feature with a one-line description. Link to ticket.}}

- **{{Feature Name}}** — {{One-line description of what it does and its value.}} [{{TICKET-ID}}]
- 

### Improvements
{{Enhancements to existing features.}}

- **{{Area}}** — {{What improved and why it matters.}} [{{TICKET-ID}}]
-

---

## Bug Fixes

| ID | Description | Severity | Reported In |
|---|---|---|---|
| {{TICKET-ID}} | {{Short description of what was broken and what was fixed.}} | CRITICAL / HIGH / MEDIUM / LOW | {{version or sprint}} |

---

## Breaking Changes

{{List any changes that require action from other teams, consumers of the API, or end users.
If none, write: None.}}

| Change | Affected Area | Required Action | Migration Guide |
|---|---|---|---|
| | | | |

---

## Migration Steps

{{Steps required to deploy this release. Include DB migrations, config changes, feature flags.
If none required, write: No migration steps required.}}

1. Run database migration: `{{migration command}}`
2. Update environment variable: `{{VAR_NAME}}` — {{what to set it to and why}}
3. 

---

## Configuration Changes

| Variable | Change | Required? | Notes |
|---|---|---|---|
| `{{ENV_VAR}}` | Added / Updated / Removed | Yes / No | |

---

## Known Issues

{{Issues that are known but not resolved in this release. Include workarounds.}}

| Issue | Severity | Workaround | Target Fix |
|---|---|---|---|
| | | | |

---

## Rollback Instructions

If issues are detected post-deployment, follow these steps to roll back:

1. {{Step 1 — e.g. revert to previous container image tag}}
2. {{Step 2 — e.g. run rollback migration if DB changes were applied}}
3. {{Step 3 — e.g. notify stakeholders}}

**Rollback window:** {{How long after deployment rollback is feasible without data loss}}
**Data loss risk on rollback:** YES / NO — {{detail if YES}}

---

## Deployment Checklist

- [ ] Deployment review completed via `/deployment-review`
- [ ] UAT sign-off obtained (see `docs/qa/uat-{{version}}.md`)
- [ ] Database migrations tested in staging
- [ ] Rollback procedure tested or reviewed
- [ ] Monitoring alerts confirmed active
- [ ] Smoke test plan ready

---

## References

| Type | Link |
|---|---|
| UAT Sign-off | `docs/qa/uat-{{version}}.md` |
| Deployment Review | `docs/deployment/deployment-review-{{version}}.md` |
| Sprint / Milestone | {{Jira sprint or milestone link}} |
| Merged PRs | {{PR list or milestone link}} |
```
