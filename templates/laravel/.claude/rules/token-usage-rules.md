# Token Usage Rules

Guidelines for using AI tools efficiently at Techversant Infotech. Token cost is real — use AI thoughtfully.

---

## Core Principle

**Use the right tool at the right granularity.** Don't use a heavy model for a trivial task. Don't use a cheap model for a critical architecture decision.

---

## When to Use AI (High Value)

- Architecture design and review
- Security review of auth/data paths
- Generating test matrices and test cases
- Reviewing complex business logic
- Writing API contracts and BRDs
- Explaining unfamiliar code to new team members
- Generating initial code from an approved spec (Codex/Cursor)
- Debugging non-obvious issues after human investigation

## When NOT to Use AI (Low Value)

- Formatting code — use a formatter (Prettier, Black, etc.)
- Renaming variables — use your IDE's refactor tools
- Writing obvious boilerplate — use snippets or templates
- Answering questions already in the documentation
- Reviewing trivial changes (single-line fixes, typo corrections)

---

## Context Window Rules

- **Include only relevant context.** Don't paste entire files when a function is enough.
- **Reference files instead of pasting** when the AI has file access.
- **Break large tasks into phases** — don't ask for a full feature in one prompt.
- **Use agents for specialized work** — don't ask a general prompt for security review.
- **Clear context between unrelated tasks** — stale context degrades quality.

---

## Prompt Quality Rules

- **Be specific about scope.** "Review this function for security issues" beats "review my code."
- **Provide the spec.** AI cannot review for correctness without knowing what correct means.
- **State the constraint.** "This must work with PgBouncer transaction pooling" not "use PostgreSQL."
- **One task per prompt** for complex work — not "design, implement, and test this."
- **Iterate on output** — a second pass with specific feedback is cheaper than a single long prompt.

---

## Model Selection

| Task | Recommended Model | Reason |
|---|---|---|
| Architecture design | Claude Opus 4+ | Requires deep reasoning |
| Security review | Claude Opus 4+ | High-stakes, complex analysis |
| Code generation | Claude Sonnet 4+ | Good balance of speed and quality |
| Code review | Claude Sonnet 4+ | Effective at pattern recognition |
| Documentation | Claude Sonnet 4+ | Clear writing capability |
| Simple Q&A | Claude Haiku 4+ | Fast and cheap for simple lookups |
| Linting/formatting | Don't use AI | Use static tools |

---

## Context Caching

- Long system prompts (CLAUDE.md, rules files) benefit from prompt caching.
- Claude Code handles this automatically for files read during a session.
- Avoid re-reading the same files repeatedly in a session.

---

## Cost Awareness

- Track approximate token usage per session for large projects.
- Flag to team lead if a single session exceeds 500K tokens (likely a process problem).
- Batch related questions into a single prompt rather than many small ones.
- Use `/compact` in Claude Code to compress conversation history for long sessions.
