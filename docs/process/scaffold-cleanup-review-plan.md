# Scaffold Cleanup Review Plan

**Purpose:** Identify files, agents, commands, rules, skills, and docs that do not bring enough value to keep in the AI OS template.  
**Status:** Draft  
**Date:** 2026-05-28  

---

## 1. Goal

Run a cleanup review before adding more orchestration features. The goal is not to make the scaffold smaller for its own sake; the goal is to remove duplication, stale references, confusing aliases, and capabilities that do not change behavior.

---

## 2. Review Principles

Keep something only if it provides at least one of these:

- unique judgment
- unique command behavior
- unique evidence requirement
- unique reusable template
- unique workflow gate
- clear team-facing guidance

Remove, merge, or mark legacy if it only:

- repeats another file
- wraps another agent without new behavior
- references missing agents/commands
- describes an old workflow
- creates casing/path drift
- adds ceremony without improving quality

---

## 3. Cleanup Review Categories

### 3.1 Agents

Review each agent for:

- unique responsibility
- clear invocation point
- non-overlap with another agent
- command references that actually exist

Decision options:

```text
keep
merge into existing agent
mark legacy
remove
```

Likely checks:

| Check | Reason |
|---|---|
| `qa-reviewer` vs proposed `qa-automation-engineer` | Avoid duplicate QA planning agents |
| `architect` vs `api-architect` | Keep if system architecture and API contract design remain distinct |
| `backend-reviewer` / `frontend-reviewer` / `security-reviewer` / `qa-reviewer` | Keep if `/review` uses each distinctly |
| `critic` vs `review` agents | Keep only if critic remains pre-output verification, not post-code review |

### 3.2 Commands

Review each command for:

- unique user entry point
- clear output artifact
- no overlap with another command
- no references to missing agents

Likely checks:

| Check | Reason |
|---|---|
| `/qa-plan`, `/gen-tests`, `/qa-review`, `/qa` | Ensure planning, generation, review, and live verification stay distinct |
| `/investigate` vs `/debug-fix` | Ensure root-cause investigation and bug-fix execution are distinct |
| `/health` vs `/review` | Ensure diagnostics and review do not overlap |
| `/compact`, `/reflect`, `/lessons` | Ensure memory lifecycle is clear |
| `/ux-create`, `/ux-review`, `/qa` | Ensure UX generation, UX review, and live browser QA stay distinct |

### 3.3 Rules

Review each rule file for:

- authoritative scope
- no repeated hard gates across many files unless cross-referenced
- no contradictions
- clear severity model

Likely checks:

| Check | Reason |
|---|---|
| `governance.md` vs `ai-coding-rules.md` | Governance aggregates; AI coding rules should remain execution-specific |
| `review-rules.md` vs `manual-review-checklist.md` | AI review and human review should not duplicate each other |
| `testing-rules.md` vs QA command docs | Rules define requirements; commands operationalize them |
| `dod-rules.md` vs `definition-of-ready.md` | Entry and exit gates should stay separate |

### 3.4 Skills

Review each skill for:

- distinct knowledge domain
- current references from agents/commands/docs
- no stale product-specific language
- no duplicate behavior

Likely checks:

| Check | Reason |
|---|---|
| `ux-audit` vs `ux-review` | Mark legacy or merge if both review UX artifacts |
| `design-system` vs `ux-system` | Keep if design-system = tokens/components and ux-system = page/workflow UX |
| `frontend-patterns` vs `ux-system` | Keep if frontend-patterns is implementation-focused |
| `backend-api-design` vs `api-standards` | Keep if skill gives implementation patterns and rule gives contract standards |

### 3.5 Docs

Review docs for repeated workflow text.

Recommended ownership:

| File | Purpose |
|---|---|
| `CLAUDE.md` | authoritative rules, command registry, agent registry |
| `HOW-TO-USE.md` | practical usage guide by role |
| `CONTRIBUTING.md` | short contributor checklist |
| `docs/process/*` | detailed process plans/specs |

Delete or reduce repeated stage descriptions where one file can link to another.

### 3.6 Memory and Local Files

Review:

- committed memory files
- local-only JSONL logs
- audit/history files
- `.claude/settings.local.json`

Rule:

```text
Shared template memory may be committed only if it teaches the scaffold.
Per-session telemetry must be gitignored.
```

---

## 4. Cleanup Workflow

1. Inventory all agents, commands, rules, skills, and docs.
2. Map each file to one or more roles.
3. Mark files with no role as suspect.
4. Mark files with duplicate role/purpose pairs as merge candidates.
5. Check all command and agent references resolve.
6. Check all public docs point to existing commands/agents only.
7. Propose changes in a cleanup report.
8. Apply removals/merges only after approval.

---

## 5. Cleanup Report Format

```markdown
# Scaffold Cleanup Review

## Keep
| File | Reason |
|---|---|

## Merge
| Source | Target | Reason |
|---|---|---|

## Mark Legacy
| File | Replacement | Reason |
|---|---|---|

## Remove
| File | Reason | Risk |
|---|---|---|

## Broken References
| Reference | Found In | Fix |
|---|---|---|

## Recommended PRs
1. Safe deletes only
2. Doc dedupe
3. Skill consolidation
4. Command/agent reference cleanup
```

---

## 6. Do Not Do During Cleanup

- Do not delete files only because they are old.
- Do not merge agents if they produce different evidence.
- Do not rewrite the whole workflow.
- Do not remove governance gates for simplicity.
- Do not touch unrelated product code.

---

## 7. First Cleanup Review Scope

Start with:

1. `.Claude` / `.claude` casing verification.
2. Missing command/agent references.
3. `qa-automation-engineer` references.
4. `ux-audit` vs `ux-review`.
5. `design-system` vs `ux-system`.
6. Duplicate workflow text in `CLAUDE.md`, `HOW-TO-USE.md`, `CONTRIBUTING.md`.
7. Committed memory vs local telemetry.

This first review should produce recommendations only. No deletes until the report is approved.
