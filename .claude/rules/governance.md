# AI Governance Engine

Central reference for how AI tools operate within this project. Aggregates enforcement mechanisms, escalation paths, authority limits, and the multi-agent verification pipeline from existing rules and agents.

This file is the **enforcement layer** — it tells you *what happens when rules are violated* and *what requires human approval*. For rule definitions, see the source files it references.

---

## The Five Pillars

1. **Hallucination Guards** — H1-H8 from `ai-coding-rules.md`
2. **Plan-and-Confirm** — mandatory approval gate for multi-step work
3. **Verification Mandate** — lint, tests, and acceptance criteria must pass before "done"
4. **Production-Grade Mandate** — no half-implementations, no stubs that ship
5. **Completeness Mandate** — boil the lake; full implementation costs the same as partial

---

## Enforcement Chain

### How Violations Are Caught

| Rule | Enforcement Method | Who Catches It |
|---|---|---|
| H1-H8 (hallucination) | `ai-coding-rules.md` H1-H8 | AI self-check, then `/review` catches remaining |
| Plan-and-confirm skipped | `ai-coding-rules.md` §2 | BLOCK in any review |
| Missing verification | `ai-coding-rules.md` §5 | BLOCK — cannot claim done without evidence |
| Half-implementation | `ai-coding-rules.md` P1-P8 | BLOCK — no stubs, no TODOs without tickets |
| Token budget exceeded | `token-usage-rules.md` | Advisory warning at 300K tokens |

### Escalation When Violations Compound

**Threshold: ≥3 BLOCK findings in one session.**

When this threshold is reached:
1. Log the pattern to `tasks/lessons.md` with: what failed, why, and what rule adjustment prevents recurrence.
2. Flag to Tech Lead: "Session reached 3+ BLOCK violations. Pattern logged to tasks/lessons.md. Recommend reviewing the triggering context."
3. Do not proceed with new work until the pattern is understood.

This escalation is documented in `ai-coding-rules.md` §7 ("Severity for AI Rule Violations") as: "A pattern of BLOCK violations from AI tools is itself a meta-issue."

---

## Multi-Agent Verification Pipeline

All non-trivial code changes pass through this pipeline before merge:

```
/start-task (with self-critique gate)
    ↓ write code
/review  ← runs 5 agents in parallel
    ├── backend-reviewer    (logic, security, SQL, performance)
    ├── frontend-reviewer   (UI, design tokens, a11y, mobile)
    ├── security-reviewer   (OWASP, auth, tenant isolation)
    ├── qa-reviewer         (test coverage, traceability)
    └── architect           (architecture fit, ADRs)
    ↓ BLOCK findings resolved
/gen-tests  ← implements regression tests
    ↓ tests pass
/qa  ← browser verification (live-site)
/commit-changes  ← git workflow enforcement
    ↓ human approval
PR → merge
```

**No step is skippable for production-bound changes.** Dev-only changes may bypass `/qa` at reviewer discretion.

---

## Human-in-the-Loop Gates

These actions require **explicit human approval** — "go", "yes", "approved", or "proceed":

| Action | Why |
|---|---|
| Any destructive operation (drop, delete, truncate) | Data loss is irreversible |
| Force push to main or dev | Can destroy others' work |
| Direct commit to main or dev (no PR) | Bypasses review pipeline |
| Schema migration (add column, add index) | Can lock tables or corrupt data |
| Third-party API changes (Stripe, Twilio, etc.) | Real money, real users |
| Secrets or credentials in code | Security breach if committed |
| Access to `.env` or production config | Out of scope per operating rules |
| Removing branch protection rules | Dev team collaboration at risk |
| Disabling CI or pre-commit hooks | Quality gates bypassed |

**If human is unavailable:** Stop, document the decision, and wait. Do not proceed without approval.

---

## Authority Limits

### What the AI Can Do Without Asking

- Read any file in the project
- Write or edit files in `apps/`, `packages/`, `docs/`, `tasks/` (tracked workspace)
- Run lint, typecheck, and test commands
- Use `git add`, `git commit`, `git branch`, `git status`, `git diff`
- Invoke any command in the Custom Commands table (`/start-task`, `/review`, `/gen-tests`, etc.)
- Invoke any agent in the Custom Agents table
- Read and write to `.claude/memory/` and `.claude/work/`

### What the AI Cannot Do Without Asking

- Run `git push`, `git merge`, `git pull`, or `git rebase` (use `/commit-changes` instead)
- Delete files or branches
- Overwrite files outside `apps/`, `packages/`, `docs/`, `tasks/` without explicit permission
- Run shell commands that modify system state outside the project
- Access `.env`, production config, or any file containing secrets
- Modify `.claude/settings.json` directly (use `/settings` command)
- Override branch protection rules

---

## Token Budget

Per `token-usage-rules.md`:
- **Advisory warning at 300K tokens:** Suggest `/compact` to compress conversation.
- **Hard flag at 500K tokens:** Flag to Tech Lead; session may have a process problem.
- **Operationalized via `/compact`:** When session approaches warning threshold, `/what-next --brief` appends `/compact?` to the status line. `/health` also suggests compaction when tokens are high.

There is no hard enforcement — token management is advisory. The goal is efficient use, not arbitrary restriction.

---

## AI-to-AI Collaboration (Claude + Codex/Cursor)

When multiple AI tools work on the same project:

1. **Claude owns the spec** — `/start-task` produces the plan; Codex/Cursor executes against it.
2. **Codex/Cursor must verify** — before claiming done, it runs lint + tests. If they fail, it fixes before reporting.
3. **CLAUDE.md is the authority** — any conflict between AI outputs is resolved by CLAUDE.md, not by assumption.
4. **No AI merges without human approval** — even if lint and tests pass.

---

## References

| Source | What It Defines |
|---|---|
| `ai-coding-rules.md` | H1-H8 hallucination guards, plan-and-confirm protocol, verification mandate, production-grade mandate, AI-readability rules, completeness mandate |
| `token-usage-rules.md` | Token budget, model selection, when to use AI |
| `security-rules.md` | SQL injection, tenant isolation, auth, secrets |
| `dod-rules.md` | Story/sprint/release-level DoD |
| `review-rules.md` | Pre-review checklist, severity labels, merge rules |
| `/review` | The 5-agent parallel verification pipeline |
| `/start-task` | Self-critique gate + plan-and-confirm enforcement |
| `/health` | Composite score including hallucination guard sub-score |