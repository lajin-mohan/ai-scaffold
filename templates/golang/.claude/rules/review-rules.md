# Review Rules

Every PR goes through AI review → manual review. Both gates must pass before merge.

---

## Pre-Review Checklist (Author)

Complete this before requesting any review. Do not open a PR without it.

### Self-Review
- [ ] I have read my own diff and it matches the approved spec
- [ ] I have removed all debugging code, `console.log`, and temporary comments
- [ ] I have removed all TODO comments without a ticket reference
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] All new environment variables are documented in `.env.example`

### Correctness
- [ ] Every acceptance criterion from the spec is implemented
- [ ] All edge cases identified in the spec are handled
- [ ] State transitions validated before execution
- [ ] Side effects (emails, jobs) triggered only on confirmed success

### Security
- [ ] All SQL uses parameterized queries
- [ ] `tenant_id` scoped on all tenant data queries
- [ ] Input validated at API boundary
- [ ] No PII in logs or error messages

### Tests
- [ ] Happy path test exists
- [ ] At least two edge/failure case tests exist
- [ ] Auth and permission failure tests exist
- [ ] Tenant isolation test exists

### Code Quality
- [ ] Functions are single-purpose
- [ ] No dead code
- [ ] No functions longer than ~50 lines
- [ ] Naming is clear without requiring context

### Frontend / UX
- [ ] Changed screens/components use design tokens for colors, spacing, typography, borders, and focus states
- [ ] Theme colors are organization-overridable through branding settings; no page/component hardcodes brand hex values
- [ ] Primary workflows work at approximately 390px mobile width
- [ ] Desktop light and dark theme states are verified
- [ ] Mobile light and dark theme states are verified
- [ ] No hardcoded colors prevent theme switching or organization branding overrides
- [ ] `/ux-review` evidence is attached for frontend/full-stack changes
- [ ] Browser verification evidence is attached for frontend/full-stack changes

---

## AI Review (Claude)

Run `/review` before requesting human review. Address all BLOCK findings before proceeding.

Claude reviews for:
- Logic correctness against spec
- Security vulnerabilities (OWASP top 10)
- Performance anti-patterns
- Code quality and maintainability
- Test coverage adequacy

**BLOCK findings must be fixed.** WARN findings must be acknowledged in the PR description.

---

## Manual Review (Human)

The human reviewer checks what AI cannot:
- Business domain correctness — does this actually make sense for the product?
- UX coherence — does this feel right in context of the full product?
- Mobile and theme coherence — does the flow work on mobile and in light/dark themes?
- Architecture alignment — does this fit the system's direction?
- Team knowledge transfer — does the team understand this change?

### Reviewer Responsibilities
- Review within 1 business day of request
- Leave actionable comments — not just "this seems off"
- Approve, request changes, or block with explanation
- Do not rubber-stamp — a bad review is worse than a slow review

---

## Review Severity Labels

| Label | Meaning | Author Action |
|---|---|---|
| `BLOCK` | Must fix before merge | Fix and re-request review |
| `WARN` | Should fix, acknowledge if not | Fix or comment explaining why not |
| `NIT` | Optional improvement | Fix or ignore — your call |
| `QUESTION` | Clarification needed | Answer in comment |

---

## Merge Rules

- **Two approvals required for production-bound changes** — one AI, one human
- **One approval for dev-only changes** — human only
- **No self-merge** — author cannot approve their own PR
- **CI must be green** — no exceptions, no manual overrides without team lead approval
- **Branch must be up-to-date** — rebase or merge dev before final approval

---

## Post-Merge

- Delete the feature branch
- Update the ticket/issue status
- Notify QA if the feature needs QA verification on the target environment
