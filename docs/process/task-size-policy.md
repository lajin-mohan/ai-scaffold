# Task Size Policy

Every task gets classified by size. Size determines which workflow gates are required. This policy exists so fast lanes are first-class, not edge cases.

**The core rule:** Match the gate to the size. A typo does not need an ADR. A distributed transaction rewrite does.

---

## Size Matrix

| Size | Definition | Gated? | Workflow Path |
|---|---|---|---|
| **XS** | Typo, copy, config, single-line fix, <10 lines, no logic change | No | Code → `/review` → merge |
| **S** | Contained bug or contained single-module change; no new endpoint, no schema change | Yes | Plan → Code → `/review` → test → merge |
| **M** | New feature or significant change touching 1-2 modules | Yes | Full 10-stage workflow |
| **L** | Multi-module, cross-service, or architecturally significant change | Yes | Full 10-stage workflow + architect review required |

**Critical path:** Any task touching auth, payments, tenant isolation, or personal data always requires security review regardless of size.

---

## Size Detection

AI tools should classify based on:

1. **Branch name prefix** — `fix/` defaults to S; `chore/` defaults to XS
2. **Ticket description** — mentions "new endpoint", "schema change", "multi-service" → at least M
3. **Line count estimate** — <10 lines → XS; 10-150 lines → S; 150-400 lines → M; 400+ → L
4. **Architectural scope** — changes cross-layer boundaries (route + service + repo) → M minimum

When in doubt, classify up. An S task that turns out to need architecture is painful; an M task that turns out to be an S is just a faster review.

---

## Gate Requirements by Size

| Gate | XS | S | M | L |
|---|---|---|---|---|
| Bootstrap (/bootstrap run) | — | — | — | — |
| Analysis + BRD | — | — | Required | Required |
| Estimation (/estimate) | — | — | Required | Required |
| Architecture (HLD + ADR) | — | — | Required | Required |
| UX design (wireframes) | — | — | Required (if UI) | Required |
| `/kickoff` gate | — | — | Required | Required |
| Code + self-review | Required | Required | Required | Required |
| `/review` (AI review) | Required | Required | Required | Required |
| Human review | — | — | Required | Required |
| QA sign-off | — | — | Required | Required |
| `/deployment-review` | — | — | Required | Required |
| Architect reviewer | — | — | — | Required |

---

## Escalation Triggers

A task that starts as one size may need to escalate when more is discovered:

| Trigger | Action |
|---|---|
| XS bug fix requires a new endpoint | Escalate to M |
| S change requires a schema migration | Escalate to M |
| M change touches auth/payments/tenant isolation | Require security review + architect |
| M change introduces a new shared package | Require architect reviewer |
| L change touches >3 architectural layers | Split into M-sized chunks if possible |

**Escalation is not failure.** It means the initial sizing was imprecise. Correct it and continue.

---

## Fast Lane Reference

The `/what-next` command uses this policy to detect fast lane eligibility. Fast lanes use the same size matrix — XS and S can take reduced paths; M and L always use the full workflow.

| Branch prefix | Default size | Fast lane eligible? |
|---|---|---|
| `fix/*` | S | Yes, unless escalated |
| `hotfix/*` | S | Yes (reduced AI review), always requires security |
| `chore/*` | XS | Yes (XS path) |
| `feature/*` | M or L | No fast lane |
| `spike/*` | Any | No merge to dev/main |

---

## What This Policy Does NOT Change

- Security gates apply regardless of size
- Tenant isolation must always be enforced
- Tests are always required (scale with size: XS needs 0, S needs happy-path, M/L need full suite)
- CI must always pass before merge

---

## Quick Reference Card

| If the task is... | Do this |
|---|---|
| Typo, copy, config, <10 lines | XS: code → `/review` → merge |
| Contained bug, single module, no schema | S: plan → code → `/review` → test → merge |
| New feature, 1-2 modules | M: full workflow |
| Multi-module or architecturally significant | L: full workflow + architect reviewer |
| Any auth, payments, tenant data, personal data | +security review always |