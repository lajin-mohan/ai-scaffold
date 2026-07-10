---
name: agents
description: Thin executor-focused guide for Codex, Cursor, and other AI coding assistants. Points to CLAUDE.md as source of truth.
---

# AI Agents — Executor Guide

If you're an AI coding assistant (Codex, Cursor, Copilot, etc.) working in this repo, start here.

## Source of Truth

**`CLAUDE.md`** is the authority for every decision, convention, and constraint in this project. Read it before doing anything else. If CLAUDE.md conflicts with any other document, CLAUDE.md wins.

## Quick Orientation

| Question | Answer |
|---|---|
| Where are the rules? | `.claude/rules/` |
| Where are the agents? | `.claude/agents/` |
| Where are the commands? | `.claude/commands/` |
| Where can AI write code? | `apps/`, `packages/`, `docs/`, `tasks/` |
| Where should AI NOT write? | `.env`, production config, secrets |
| What's off-limits without asking? | Destructive actions, force-push, direct main/dev commits |
| How do I run a command? | `/command-name` in Claude Code, or invoke via `@agent-name` |

## What This Scaffold Provides

This repo is an **AI development scaffold** — a pre-built operating system for AI-assisted software development. It includes:

- **Governance rules** — hallucination guards, plan-and-confirm protocol, verification mandate
- **Agents** — specialized AI assistants for planning, architecture, review, QA, security
- **Commands** — `/start-task`, `/review`, `/health`, `/loop`, `/kickoff`, and more
- **Skills** — domain knowledge for UX, backend APIs, frontend, debugging, accessibility

## Daily Loop (for executor agents)

1. Read the ticket spec
2. Check `tasks/lessons.md` for past patterns
3. Implement against the approved plan
4. Run lint + tests
5. Report status — do not skip verification

## What NOT to do

- Do not claim "done" without running lint and tests
- Do not commit directly to `main` or `dev` — use feature branches
- Do not invent APIs, packages, or function signatures — verify first
- Do not hardcode secrets or credentials
- Do not skip error handling or edge cases

## Claude Code Specific

Claude Code has built-in commands. Use `/start-task` for any multi-step implementation. Use `/review` before claiming done. Use `/health` to check code quality.

---

For governance questions, architecture decisions, or ambiguous requirements: ask first. Don't guess.