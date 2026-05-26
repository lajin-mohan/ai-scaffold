# AI-OS Workflow

How to run an AI-assisted development session in this project.

---

## Who Does What

| Role | Tools | Responsibility |
|---|---|---|
| **Planner / Governor** | Claude Code (full session) | `/what-next`, spec, architecture, /review, governance |
| **Executor** | Claude Code `/loop` | Implements approved plans, runs tests, reports status |

Both roles can be the same Claude Code session — use `/loop` for continuous execution after approval.

---

## Daily Development Loop

```
┌─────────────────────────────────────────────────────────┐
│ 1. START: Human identifies a task or receives a ticket  │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. CLAUDE: /what-next                                   │
│    → Orient. Read project state. Identify current stage │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. CLAUDE: /start-task  (for features, fixes, chores)   │
│    → Read spec. Write plan. Wait for 'go'.              │
│    Branch automatically: feature/* or fix/* from dev     │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 4. CLAUDE: Plan approved → /loop starts                 │
│    → Autonomous execution. Reports at each phase.        │
│    Human can interrupt with corrections at any time.     │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 5. CLAUDE: /review                     │
│    → 5-agent parallel: backend + frontend + security +  │
│      qa + architect. BLOCK findings must resolve.       │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 6. HUMAN: PR review + merge                             │
│    → Feature branch → dev for general work              │
│    → dev -> main for releases only                       │
└──────────────────────┬────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 7. QA SIGN-OFF required before CI/CD trigger           │
│    → /qa for browser verification (UI changes)          │
│    → /qa-review for test coverage verification          │
└─────────────────────────────────────────────────────────┘
```

---

## Sleep-Safe Execution

When running `/loop` for long sessions while awake:

- **Pause, don't abandon.** If session needs input, state it clearly and wait — don't silently proceed
- **Compaction.** If `/health` suggests `/compact`, pause and compact before continuing
- **Mid-session corrections.** If you spot an issue, tell the planner immediately — corrections at step 2 cost 10× less than corrections at step 5

---

## File Safety Model

| What | Who can modify |
|---|---|
| `apps/`, `packages/`, `docs/`, `tasks/` | AI freely (with verification) |
| `.claude/` | AI for rules, agents, commands, skills |
| `.env`, secrets, prod config | Never — out of scope |
| CI/CD, branch protection, infra | Human approval required |

Scratch/working notes go in `.claude/work/` (gitignored per clone).

---

## Key Commands

| Session start | `/what-next` — orient before doing anything |
|---|---|
| Feature work | `/start-task` — plan + confirm before building |
| Continuous execution | `/loop` — autonomous after approval |
| Quality check | `/health` — composite score, lint + typecheck |
| AI review | `/review` — 5-agent parallel review |
| Post-task reflection | `/reflect` — capture lessons to `tasks/lessons.md` |
| Session compaction | `/compact` — compress at token threshold |

---

## Governance First

Every session starts with `/what-next`. This isn't ceremony — it prevents building the wrong thing, at the wrong time, for the wrong reason.

If the task touches auth, billing, tenant isolation, or compliance: slow down. Get alignment before writing code.