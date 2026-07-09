# Skill: project-delivery-workflow

Sprint delivery workflow for Techversant engineering teams. Adapts to `{{PM_TOOL}}` (Jira, Linear, GitHub Projects).

---

## Workflow Overview

```
BACKLOG → ANALYSIS → SPEC → READY → IN PROGRESS → IN REVIEW → QA → DONE
```

| Status | Definition |
|---|---|
| `BACKLOG` | Captured but not yet analysed |
| `ANALYSIS` | Being broken down, questions being answered |
| `SPEC` | API contract / BRD / UX design in progress |
| `READY` | Fully specced, estimated, unblocked — ready to pick up |
| `IN PROGRESS` | Developer actively working |
| `IN REVIEW` | AI review + human review in progress |
| `QA` | In QA on staging |
| `DONE` | Deployed to production, tested, ticket closed |

---

## Ticket Lifecycle

### 1. Capture (BACKLOG)
Any team member can capture a ticket. Required:
- Title: clear, one-line description of the outcome
- Type: Feature / Bug / Chore / Spike / Tech Debt
- Reporter and approximate priority

### 2. Analysis (ANALYSIS)
Before a ticket can be specced:
- [ ] Problem statement written
- [ ] Acceptance criteria drafted (testable, binary)
- [ ] Open questions identified and assigned
- [ ] Stakeholder sign-off on scope

Use `/create-brd` for features, direct ticket refinement for bugs.

### 3. Spec (SPEC)
Before a ticket is READY:
- [ ] API contract written and reviewed (`/create-api`)
- [ ] UX spec approved (`/ux-create` artifacts, wireframes, component spec, `/ux-review` pass)
- [ ] Database migration plan reviewed
- [ ] Estimate completed (`/estimate`)
- [ ] Architecture decision recorded if needed (`/architecture-review`)

### 4. Ready
Ticket is ready when:
- All open questions answered
- Spec approved by technical lead
- Estimate accepted
- No external blockers
- Target sprint assigned

### 5. In Progress
Developer picks up the ticket:
- Branch created: `feature/TICKET-123-short-description`
- CLAUDE.md read if starting a new area
- Daily standup update: what was done, what's planned, any blockers

### 6. In Review
- Self-review checklist completed (`.claude/rules/review-rules.md`)
- PR opened with description, screenshots (if UI), and test plan
- `/review` run — all BLOCK findings resolved
- Human reviewer assigned
- QA environment up-to-date

### 7. QA
- Feature tested on staging by QA or developer
- `/gen-tests` run and verified
- Regression scope identified and tested
- Sign-off recorded on ticket

### 8. Done
- Merged to `main` via `release/*` branch
- Deployed and smoke-tested in production
- Ticket closed, stakeholder notified
- Changelog entry written if user-facing

---

## Sprint Ceremonies

### Sprint Planning
1. Review READY tickets — confirm estimates and priorities
2. Team capacity calculation (days × 0.7 for meetings, reviews, interruptions)
3. Select sprint scope — don't over-commit
4. Assign owners
5. Sprint goal stated in one sentence

### Daily Standup (async or sync, max 15 min)
- What did I complete since last standup?
- What will I work on today?
- Any blockers?

No problem-solving in standup — take it offline.

### Sprint Review
- Demo working software — not slides, not code
- Mark done vs. incomplete
- Capture feedback as new tickets

### Retrospective
- What went well? (keep doing)
- What slowed us down? (improve or stop)
- One concrete action for next sprint

---

## Estimation Rules

- Estimate in story points or days — be consistent within the team
- Include analysis, implementation, review, QA, deployment — not just coding
- Use `/estimate` for features > 1 day of effort
- P0 bugs are never estimated — fix immediately
- Spikes are time-boxed: 1-2 days max, output is a decision or proof-of-concept

---

## Escalation

| Situation | Action |
|---|---|
| Blocked for > 4 hours | Flag in standup, escalate to team lead |
| Scope creep discovered mid-sprint | Create new ticket, don't expand current one |
| Estimate was wrong by > 50% | Flag for retrospective, don't pad future estimates |
| Production incident | P0 ticket, all sprints paused until resolved |

---

## Ticket Template

```
Title: [Action] [Object] — [Context]
Example: "Add candidate bulk import via CSV with duplicate detection"

Type: Feature / Bug / Chore / Spike
Priority: P0 (now) / P1 (this sprint) / P2 (next sprint) / P3 (backlog)
Epic: [Epic name]
Labels: [backend, frontend, database, infra, security]

## Problem Statement
What user or business problem does this solve?

## Acceptance Criteria
- [ ] Given [context], when [action], then [outcome]
- [ ] ...

## Technical Notes
- API contract: link to docs/api/
- UX spec: link to docs/ux/ and `/ux-review` output
- Migrations required: Yes / No

## Definition of Done
- [ ] Code reviewed (AI + human)
- [ ] Tests written and passing
- [ ] QA signed off on staging
- [ ] Deployed to production
- [ ] Ticket closed
```
