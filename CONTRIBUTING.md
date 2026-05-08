# Contributing

Welcome. This project follows the Techversant AI development workflow — every contribution goes through a strict gating sequence to keep production-grade quality high.

**Read these first:**
1. [CLAUDE.md](./CLAUDE.md) — the master rules for AI collaboration and the 10-stage workflow
2. [HOW-TO-USE.md](./HOW-TO-USE.md) — stage-by-stage guide for every role
3. [.claude/rules/ai-coding-rules.md](./.claude/rules/ai-coding-rules.md) — non-negotiable rules for any AI tool generating code

---

## Quick Start

```bash
# 1. Bootstrap the scaffold (first time on a fresh clone)
/bootstrap

# 2. See where the project stands
/what-next

# 3. Begin work on a story (Stage 5)
/start-task "{{ticket-id-and-summary}}"

# 4. Before opening a PR (Stage 6)
/review

# 5. Generate test coverage (Stage 8)
/gen-tests

# 6. Pre-deployment review (Stage 10)
/deployment-review
```

---

## Branch Workflow

```
main          ← production-stable, protected
dev           ← integration, CI must pass
feature/*     ← new features, branched from dev
fix/*         ← bug fixes, branched from dev
chore/*       ← maintenance, deps, config changes
hotfix/*      ← production fixes, branched from main
```

Full rules: [.claude/rules/branching-rules.md](./.claude/rules/branching-rules.md)

---

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional body explaining WHY (not WHAT).

Closes #ticket-id
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

---

## Pre-PR Checklist

Before requesting any review, complete the self-review checklist in [.claude/rules/review-rules.md](./.claude/rules/review-rules.md). Specifically:

- [ ] Self-review against own diff
- [ ] No hardcoded secrets, no commented-out code, no TODOs without ticket reference
- [ ] All acceptance criteria from the spec are implemented
- [ ] Tests cover happy path + ≥2 edge/failure cases + auth/permission/tenant-isolation
- [ ] `/review` (Stage 6 AI review) run, all BLOCK findings resolved
- [ ] CI green locally (`npm run lint`, `npm run typecheck`, `npm test`)
- [ ] PR description references the ticket, screenshots for UI, test plan

---

## Definition of Ready / Done

A story can move to `IN PROGRESS` only when DoR criteria are met: [.claude/rules/definition-of-ready.md](./.claude/rules/definition-of-ready.md).

A story is `DONE` only when DoD criteria are met: [.claude/rules/dod-rules.md](./.claude/rules/dod-rules.md).

Both are non-negotiable.

---

## Asking Questions

- **Ambiguous requirement?** Run `@solution-analyst` and surface assumptions before coding.
- **Architectural question?** Run `@architect` or `/architecture-review`.
- **API design question?** Run `@api-architect` or `/create-api`.
- **Stuck?** Run `/what-next` — it tells you what's blocking and what to do.

---

## Reporting Security Issues

See [SECURITY.md](./SECURITY.md). Do not file public issues for security vulnerabilities.

---

## License

This is proprietary software. See [LICENSE](./LICENSE).
