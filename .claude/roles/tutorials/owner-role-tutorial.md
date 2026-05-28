# Owner Role Tutorial

**Role:** `owner` | **Default command:** `/what-next` | **Purpose:** Project orchestration, gate management, blocker resolution, and cross-workstream visibility

---

## When to Use This Role

You are the **owner** when you need to:
- Get a project-wide status overview
- Identify what's blocking progress
- Orchestrate work across multiple workstreams
- Review gate status (DoD, DoR, architecture, UX, QA)
- Plan the next sprint or milestone
- Summarize project health for stakeholders

**Not the owner role:** writing code, designing UX, executing QA, making architectural decisions (you surface the need, the specialist makes the call).

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "owner"
}
```

### 2. Get project overview

```bash
/what-next
```

This reads project state, identifies the current stage, surfaces blockers, and outputs the exact next action with blockers.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/what-next` | Project status overview and next action | Current stage, blockers, exact next action |
| `/health` | Code quality dashboard | Composite score, lint/typecheck/test status |
| `/review` | Parallel AI review status | All reviewer findings (backend, frontend, security, QA, architect) |
| `/qa-review` | QA readiness status | Test coverage, edge cases, sign-off readiness |
| `/deployment-review` | Deploy readiness checklist | Migration plan, smoke tests, rollback procedure |
| `/loop` | Recurring project health check | Periodic status update |
| `/reflect` | Review sprint/phase outcome | Decisions logged, risks surfaced |
| `/lessons` | Record patterns from reviews/sprints | Saved to `tasks/lessons.md` |
| `/compact` | Compress conversation for long sessions | Session summary for next turn |

---

## Step-by-Step Workflow

### Sprint Planning

```
1. Run /what-next
   → Current stage for all active features
   → Blockers surfaced
   → Next action per feature

2. Run /health
   → Overall code quality score
   → Lint/typecheck/test status
   → CI health

3. Run /review (summary)
   → How many open BLOCK findings?
   → What's blocking PRs?

4. Run /qa-review (summary)
   → Test coverage status
   → QA sign-offs pending

5. Based on output:
   → Assign blockers to specialists
   → Gate work that needs approval
   → Plan next sprint's scope
```

### Gate Management

```
Before any feature moves to the next stage:

1. Check gate status with /what-next
   → Architecture gate: approved?
   → UX gate: wireframes approved?
   → QA gate: tests written?
   → CI gate: lint + tests green?

2. Gate BLOCK → Surface to team
   → Assign to specialist
   → Set resolution deadline

3. Gate PASS → Authorize next stage
   → Move feature to next phase
   → Notify implementer
```

### Milestone Review

```
1. Run /health for each active project
2. Run /review summary for each feature
3. Run /qa-review summary for each feature
4. Run /reflect to document decisions
5. Output milestone summary:
   → What's done
   → What's in progress
   → Blockers and owners
   → Risks and mitigation
```

---

## Required Evidence Gates

Before claiming "project health verified":

- [ ] `gate_status_surfaced` — all 6 gates (requirements, UX, architecture, estimation, QA, governance) shown
- [ ] `blockers_identified` — every blocker has a name and deadline
- [ ] `risks_acknowledged` — risks surfaced and mitigation proposed
- [ ] `qa_ready` — QA sign-off is pending or complete
- [ ] `review_ready` — AI review BLOCKs resolved
- [ ] `ci_ready` — CI is green (or blockers tracked)
- [ ] `deploy_ready` — deployment review complete
- [ ] `human_approvals_obtained` — all human approvals documented

---

## Blocked Actions (Human Required)

| Action | Why Blocked |
|---|---|
| `merge_main` | Requires human approval + CI green |
| `deploy_production` | Requires deployment review + sign-off |
| `destructive_changes` | Requires explicit human consent |
| `secrets_access` | Out of scope for AI |
| `schema_migration_without_approval` | Requires tech lead sign-off |
| `direct_commit_to_main` | Requires PR + review |

---

## Workstream Orchestration

The owner orchestrates, specialists execute:

```
Owner surfaces:
  → "Feature X needs architecture review"
  → "Stage 3 gate is blocked on API contract"
  → "PR Y has 3 BLOCK findings"

Specialist executes:
  → @architect runs /create-api → delivers contract
  → @architect runs /architecture-review → clears gate
  → @dev resolves BLOCK findings → re-runs /review

Owner monitors:
  → Gate status updated
  → Blockers resolved
  → Human approval obtained
```

---

## Common Scenarios

### Scenario 1: Mid-sprint blocker

```
User: "Sprint is blocked on the user authentication feature"

1. /what-next
   → Current stage: Stage 3 (Architecture)
   → Gate: API contract not approved
   → Blocker: Auth pattern decision not made

2. Action: Assign @architect to resolve
   → Architect runs /create-api for auth endpoints
   → Decision brief: session tokens vs JWT vs OAuth2
   → ADR filed for chosen approach
   → API contract approved

3. Monitor:
   → Feature moves to Stage 4 (UX)
   → Sprint unblocked
```

### Scenario 2: PR review escalation

```
User: "A PR has been in review for 2 days with no action"

1. /what-next
   → PR: feature/project-settings
   → Age: 2 days
   → BLOCK findings: 2 (resolved), 3 (open)

2. Run /review on the PR
   → Surface BLOCK findings to reviewer

3. Action: Assign developer to fix BLOCKs
   → @dev resolves findings
   → Re-request review

4. Monitor:
   → PR moves to "changes requested" or "approved"
```

### Scenario 3: Release readiness

```
User: "Prepare v1.2.0 release for next week"

1. /health
   → Code quality score: 8/10
   → CI: 3 failing tests on main — must resolve

2. /review (summary on all features)
   → All BLOCKs resolved?
   → Human reviews approved?

3. /qa-review (summary)
   → All QA sign-offs obtained?
   → Regression tests pass?

4. /deployment-review
   → Migration plan: v1.2.0 has 1 migration
   → Smoke tests defined
   → Rollback procedure documented

5. Output: Release readiness report
   → BLOCKER: 3 failing tests → assign to @dev
   → Release blocked until CI is green
```

### Scenario 4: Sprint retrospective

```
User: "Run sprint retrospective"

1. /reflect
   → What went well: architecture review early prevented mid-sprint pivots
   → What didn't: QA found gaps in auth tests
   → Decisions: use session tokens, not JWT

2. /lessons
   → "QA must review auth flows before implementation starts"
   → "Architecture review must include threat model"

3. /what-next
   → Next sprint: auth feature phase 2
   → Blockers: none yet
   → Risks: third-party API access pending
```

---

## Calling Specialist Agents

Invoke these for deep analysis:

```
@supervisor      — orchestrate multiple workstreams, surface cross-cutting issues
@critic          — challenge decisions before they become commitments
@pm              — sprint planning, stakeholder updates, CR summaries
@architect       — gate management, ADR review, technical debt
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Gate is blocked with no clear owner | Assign to the relevant specialist — don't let it sit |
| Blocker is a human decision (not technical) | Surface to PM/Tech Lead, set deadline |
| CI is red | Assign to @dev immediately — no feature ships with red CI |
| "I don't know" response | This is correct. Surface the knowledge gap as a blocker |
| Multiple high-priority items | Use `/what-next` to get clear ordering — don't guess |

---

## Related Files

- Role config: [owner.yaml](owner.yaml)
- Governance: [.claude/rules/governance.md](../rules/governance.md)
- DoD rules: [.claude/rules/dod-rules.md](../rules/dod-rules.md)
- DoR rules: [.claude/rules/definition-of-ready.md](../rules/definition-of-ready.md)