<!--
Adapted from DietrichGebert/ponytail (MIT), v4.7.0
Source: https://github.com/DietrichGebert/ponytail
License: https://github.com/DietrichGebert/ponytail/blob/main/LICENSE

Adapted: rule extracted and rephrased to match this scaffold's governance voice;
SessionStart activation, statusline, MCP server, persona, and cross-agent packaging
intentionally not taken. See HOW-TO-USE.md "Ponytail Integration" for what was taken.
-->

# Ponytail Ladder — The Decision Flow

This rule is a **pressure layer** that sits *below* the scaffold's gates, DoD, layered architecture, and test pyramid. It does not override them. If this rule conflicts with any rule in `ai-coding-rules.md`, `coding-standards.md`, `security-rules.md`, `testing-rules.md`, `dod-rules.md`, or `governance.md`, those rules win.

## Default State

**OFF.** The agent runs the ladder only when the user passes `--intensity lite|full|ultra` to `/start-task`. There is no session-persistent mode, no auto-activation, and no flag file written to user-scope config.

## The Ladder

Before writing code, stop at the first rung that holds. Don't run all six — take the first one that answers the question.

1. **Does this need to exist at all?** Speculative need → skip it. Surface the skip in the plan as `not built: X (no current need)`. If the skip is conditional on a future trigger, mark it in the plan as a `[deferred]` item that becomes a `// TODO(<TICKET-ID>):` only when a real ticket exists. *(YAGNI)*
2. **Does the standard library do it?** Use it.
3. **Does a native platform feature cover it?** Browser `<input type="date">` over a picker lib. CSS over JS. DB constraint over app code.
4. **Does an already-installed dependency solve it?** Use it. New dependency must justify itself against the few lines it replaces.
5. **Can it be one line?** Make it one line.
6. **Only then:** write the minimum code that works.

The ladder is a reflex, not a research project. Two rungs work → take the higher one and move on. The first solution that works is the right one.

## What This Rule Does NOT Override

| Hard constraint | Source rule |
|---|---|
| Plan-and-confirm for tasks >3 steps | [ai-coding-rules.md §2](./ai-coding-rules.md) |
| Layered architecture (routes → services → repositories → domain) | [coding-standards.md "Layer Architecture"](./coding-standards.md) |
| Test pyramid (unit / integration / component / E2E) | [testing-rules.md](./testing-rules.md) |
| Definition of Done (story / sprint / release) | [dod-rules.md](./dod-rules.md) |
| Input validation at trust boundaries | [security-rules.md "Input Validation"](./security-rules.md) |
| Tenant scoping on every query | [security-rules.md "Tenant Isolation"](./security-rules.md) |
| Audit log on every state change | [security-rules.md "A09 Logging"](./security-rules.md) |
| Verification before "done" (lint + tests + AC walkthrough) | [ai-coding-rules.md §5](./ai-coding-rules.md) |
| File:line citations on any claim about code | [ai-coding-rules.md H1, H2](./ai-coding-rules.md) |

A `--intensity ultra` invocation that produces a single-line solution which skips tenant scoping is **not done**. The ladder simplifies; the gates enforce.

## Non-Negotiables (Never Cut)

Even at `--intensity ultra`, these are never simplified away:

- Input validation at trust boundaries
- Error handling that prevents data loss
- Security measures (authn, authz, tenant isolation, parameterized queries)
- Accessibility basics (semantic HTML, focus management, contrast tokens)
- Anything the user explicitly asked to keep
- The single runnable check (assert-based self-check or one test file) required for non-trivial logic per [testing-rules.md](./testing-rules.md)
- A real ticket reference on every `TODO(<TICKET-ID>):`

## Intensity Levels

| Level | What changes |
|-------|--------------|
| *(omitted)* | OFF. Default scaffold behavior. No ladder pressure applied. |
| `lite` | Build what was asked. At the end of the plan or response, name the lazier alternative in one line. User picks. |
| `full` | The ladder is enforced. Stdlib and native first. Shortest diff, shortest explanation. |
| `ultra` | YAGNI extremist. Deletion before addition. Ship the one-liner and challenge the rest of the requirement in the same breath. *Gates still win.* |

## How to Apply

When `/start-task --intensity <level>` is invoked:

1. **Phase 2 (Plan):** include `Intensity: <level>` in the plan header. Add a "Skipped alternatives" line per rung where a higher rung was rejected and why.
2. **Phase 4 (Execute):** before each commit unit, mentally walk the ladder. If rung 1 (skip) holds, the plan changes — surface it, don't silently omit it.
3. **Phase 5 (Verify):** the verification report includes a `Ladder compliance` section listing which rungs were checked and where the higher rung was rejected.

When the agent is invoked *without* `--intensity`, the ladder is not active. The default rules in `ai-coding-rules.md` apply on their own.

## Cross-References

- [coding-standards.md "Shortcut Markers"](./coding-standards.md) — the `ponytail:` comment convention used to mark deliberate simplifications
- [HOW-TO-USE.md "Ponytail Integration"](../../HOW-TO-USE.md) — user-facing overview of what was integrated
- `/ponytail-audit` — whole-repo over-engineering scan
- `/ponytail-debt` — shortcut debt ledger (harvests `ponytail:` comments)
