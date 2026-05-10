# Definition of Ready (DoR)

A ticket is **Ready** only when every applicable criterion below is met. Ready means *safe to start building* — all upstream questions are answered, all dependencies are resolved, and there's no reason for the developer to stop and ask after they've started.

Mirrors [dod-rules.md](./dod-rules.md) — DoR gates `BACKLOG → IN PROGRESS`, DoD gates `IN PROGRESS → DONE`.

---

## Why DoR exists

A story that enters development with unanswered questions, unclear acceptance criteria, or missing UX will pause mid-sprint. Pauses cost more than the upfront analysis that prevents them.

DoR is the team's contract: **we don't start until we can finish.**

---

## Story-Level DoR

A story can move from `BACKLOG` to `IN PROGRESS` only if all of the following are true.

### Problem clarity
- [ ] Problem statement is one sentence the team can agree on
- [ ] Affected user role(s) named explicitly
- [ ] Business value articulated — why it matters, not just what changes
- [ ] If solution-analyst has flagged BLOCKER ambiguities, all are resolved

### Scope boundary
- [ ] In-scope items listed
- [ ] Out-of-scope items explicitly listed (prevents creep)
- [ ] Dependencies on other tickets / external teams identified and accepted

### Acceptance criteria
- [ ] At least one acceptance criterion per user-facing behaviour
- [ ] Each AC is testable — pass/fail can be determined without judgement
- [ ] Each AC is binary — no "looks good", "feels right", "should be reasonably fast"
- [ ] Edge cases identified: empty input, max input, permission denied, concurrent write, network failure
- [ ] Non-functional requirements stated where relevant (performance budget, accessibility level, compliance constraint)

### Spec & design
- [ ] BRD section linked (or N/A for chore/refactor work)
- [ ] API contract written and approved (or N/A) — see [api-contract-template.md](../templates/api-contract-template.md)
- [ ] LLD written for any non-trivial implementation — see [lld-template.md](../templates/lld-template.md)
- [ ] UX wireframes approved for any UI work — covers loading, empty, error, populated states
- [ ] Architectural decisions recorded as ADRs where significant

### Estimation & sizing
- [ ] Estimated using three-point method (`/estimate`)
- [ ] Estimate confidence is **HIGH** or **MEDIUM**. LOW confidence → spike first
- [ ] Effort fits within one sprint — if not, split

### Test strategy
- [ ] Test approach noted: unit / integration / E2E / snapshot — what each will cover
- [ ] Test data requirements identified (fixtures, factories, seeds)
- [ ] Tenant isolation test path identified (where applicable)

### Dependencies & access
- [ ] Required env vars / secrets exist in target environment (or are provisioned and noted)
- [ ] Required third-party API access granted, with contract / docs available
- [ ] Required design assets exported / available
- [ ] Required test accounts / data available in dev/staging

---

## Sprint-Level DoR

A sprint can be **committed** when:

- [ ] Every selected story meets Story-Level DoR above
- [ ] Total estimate ≤ team capacity × 0.7 (accounts for meetings, reviews, interruptions)
- [ ] Sprint goal stated in one sentence
- [ ] No story has a dependency on a story outside this sprint that isn't already done
- [ ] No story has a `LOW` confidence estimate

---

## Feature-Level DoR

Before any new feature begins, **all six gates** of `/kickoff` return PASS:

1. Requirements (BRD approved)
2. UX (wireframes approved)
3. Architecture (HLD + API + LLD approved)
4. Estimation (effort signed off) — invoke `/estimate` for the feature
5. QA strategy (test plan defined)
6. Governance (DoD agreed, CR process in place)

If `/kickoff` returns CONDITIONAL GO, every conditional item must have a named owner and a resolution date before the feature starts.

---

## Phase-Level DoR

Before any phase begins (Phase 0, Phase 1, etc.), all of the following must be complete. Phases are infrastructure — they must be estimated like any other deliverable.

### Phase prerequisites
- [ ] Phase BRD exists in `docs/brd/phases/` and is approved
- [ ] All dependent ADRs are written and accepted (architecture decisions gate implementation)
- [ ] Open questions from BRD are resolved or have explicit deferral with owner and date
- [ ] External dependencies identified (third-party APIs, access, credentials) with confirmed availability

### Phase estimation
- [ ] **Three-point estimate created** in `docs/estimates/phase-{N}-*-estimate.md`
- [ ] Estimate covers ALL tasks in the phase task list (no informal estimates)
- [ ] Estimate reviewed by Tech Lead — sign-off documented in the estimate file
- [ ] Estimate confidence is **HIGH** or **MEDIUM**. LOW confidence → spike first.
- [ ] **No phase work begins without a signed-off estimate.** This is a hard gate, not a preference.

### Phase kickoff
- [ ] Sprint allocation determined: estimate ÷ 0.7 = calendar days ÷ sprint length
- [ ] Parallel tracks identified (e.g., backend vs. frontend tracks can run concurrently)
- [ ] Phase tasks assigned to engineers with capacity
- [ ] Blockers from previous phases resolved (no carry-over blockers)

---

## DoR Exceptions

A criterion may be waived only with:

1. Written justification on the ticket
2. Owner accepting the risk recorded
3. Tech Lead + PM approval

Waiving Acceptance Criteria, BRD link, or test strategy is **not allowed** — those are the contract for "what done means".

---

## Quick Reference Card

| Level | Key Gate |
|---|---|
| Story | Problem clear + ACs binary/testable + spec linked + estimated + test strategy noted |
| Sprint | All stories meet Story DoR + capacity ≤ 70% + sprint goal stated |
| Feature | All 6 `/kickoff` gates return PASS |
| Phase | BRD approved + ADRs accepted + Estimate signed off by Tech Lead |

---

## DoR vs DoD — at a glance

| | DoR | DoD |
|---|---|---|
| Gates | `BACKLOG → IN PROGRESS` | `IN PROGRESS → DONE` |
| Question | "Can we start safely?" | "Is it production-ready?" |
| Owner | PM + Tech Lead | Developer + reviewers + QA |
| Failure cost | Mid-sprint pause, scope churn | Production defect, rework, missed UAT |

Both are non-negotiable. Skipping DoR causes mid-sprint discovery; skipping DoD causes production discovery.
