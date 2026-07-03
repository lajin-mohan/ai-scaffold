# Agent Handoff Protocol

Standard format and rules for when one agent hands off work to another agent. Applies to all custom agents in this project — invoked via `@agent-name`, `/agent-name`, or internal handoff within a multi-agent session.

---

## Why This Protocol Exists

Without a standard handoff format, context gets lost between agents. The next agent doesn't know what was already decided, what's still open, or what the constraints are. This protocol ensures every handoff is self-contained and actionable.

---

## Required Context (Every Handoff)

Every agent handoff must include all of the following:

### Summary
One paragraph: what problem or task is being handed off, why it matters, and what the expected outcome is.

### Decisions Made
Named list of decisions already made in this session. Format: `**Decision:** [what] — [why]` for each.

### Open Questions
Named list of questions still unresolved. Format: `**Question:** [what] — [owner/who resolves] — [blocker?]`.

### Files in Scope
Exact paths of files the next agent will read or modify. Not "the auth system" — `apps/api/src/routes/auth.route.ts`.

### Governance Status
One-liner: any relevant constraints, rules, or conventions that apply. E.g., "tenant_id scoping required on all queries" or "Decision Brief format required before architectural trade-off discussion."

### Phase / Stage Context
Where the work sits in the 10-stage workflow (or fast lane). E.g., "Stage 5 — Execution, feature branch: `feature/PROJ-42-auth`" or "Bug fix fast lane — Stage 6 review."

### Stop Condition
If the next agent should stop and escalate rather than proceed, state it explicitly. E.g., "Stop if the fix requires a schema migration — escalate to human."

---

## Handoff Format

```
## Agent Handoff: {{Sending agent}} → {{Receiving agent}}

**Task:** {{one sentence}}
**Phase:** {{Stage N / Fast lane / Ad hoc}}
**Branch:** {{current branch if applicable}}

### Decisions Made
- **{{Decision name}}:** {{what}} — {{why}}

### Open Questions
- **Q{{N}}:** {{question}} — {{who resolves}} — {{blocker?}}

### Files in Scope
- `{{path}}` — {{reason}}
- `{{path}}` — {{reason}}

### Governance
{{relevant constraints, rules, conventions}}

### Stop Condition
{{when to stop and escalate, or "None — proceed to completion"}}

---
{{Sending agent}} — {{YYYY-MM-DD HH:MM}}
```

---

## Forbidden Patterns

These patterns break the protocol and must not be used:

- **Vague handoffs** — "handle the auth stuff" or "you know what to do"
- **Lost context** — handing off mid-decision without completing the thought
- **Backward handoffs** — sending work back to an agent that already completed its part without new information
- **Unbounded scope** — handing off without a defined stop condition
- **Secret handoffs** — passing credentials, tokens, or `.env` values in handoff context

---

## Example: Debugging → Supervisor

```
## Agent Handoff: @debugging-agent → @supervisor

**Task:** Auth endpoint returns 401 on valid credentials — root cause found
**Phase:** Bug fix fast lane — Stage 6 (review pending)
**Branch:** fix/PROJ-42-auth-401-bug

### Decisions Made
- **Root cause:** Session token extracted from DB but not set in HttpOnly cookie — race condition in `auth.service.ts:78`
- **Fix applied:** Reordered cookie set to happen inside the DB transaction commit callback

### Open Questions
- **Q1:** Should we add a regression test for this specific race condition? — Developer decision

### Files in Scope
- `apps/api/src/services/auth.service.ts` — root cause file, fix applied
- `apps/api/src/routes/auth.route.ts` — test coverage needed
- `apps/api/tests/auth.test.ts` — regression test to add

### Governance
- All fixes require regression test before claiming done (ai-coding-rules.md §8)
- No direct commits to dev — use `/commit-changes` (branching-rules.md)

### Stop Condition
None — proceed to completion (regression test + commit). Stop only if verification fails.

---
@debugging-agent — 2026-05-26 09:15
```

---

## Agent-to-Agent Rules

1. **Never handoff mid-thought.** Complete your current unit of work before handing off.
2. **Be explicit about what you don't know.** State uncertainty, don't hide it.
3. **Cross-reference past lessons.** Use `/lessons` to find related patterns before handoff.
4. **The sending agent owns the handoff quality.** If the receiving agent is confused, the sender failed.
5. **Handoffs are synchronous.** Wait for acknowledgment before assuming the receiving agent has context.

---

## Governance Reference

- [governance.md](./governance.md) — enforcement chain and escalation paths
- [ai-coding-rules.md](./ai-coding-rules.md) — H1-H8 hallucination guards
- [agent-handoff-protocol.md](./agent-handoff-protocol.md) — this file