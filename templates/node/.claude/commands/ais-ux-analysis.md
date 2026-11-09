---
description: Analyze a BRD or feature spec into a complete product/UX analysis package (roles, flows, states, risks); --quick takes the lightweight route for a single screen, component or spike.
---

# /ais-ux-analysis

Analyze a BRD, feature spec, or product request into a complete product/UX analysis package. This command replaces the old split between `/ais-ux-analysis` and `/ais-ux-analysis`.

**Route first.** If the request is a single screen or component change, a design iteration, or a spike, or `--quick` is given, go straight to [Quick route (small UX changes)](#quick-route-small-ux-changes) and skip the staged analysis below. Use the staged analysis for a new feature that needs requirements, flows and a developer handoff.

---

## Usage

```text
/ais-ux-analysis
/ais-ux-analysis reporting
/ais-ux-analysis UX-REP-001-main-table
/ais-ux-analysis --spec docs/brd/business-requirements.md --module reporting
/ais-ux-analysis --quick "improve the sprint dashboard filters"
```

---

## When To Run

- After the BRD or feature request is available.
- Before `/ais-ux-design-prompt`.
- When the team needs requirements, assumptions, open questions, scope, roles, and flows in one reviewed package.

---

## Inputs

- BRD or feature description.
- Existing module docs, if any.
- Role matrix, business rules, permissions, or data constraints.
- Relevant UX/design system rules when already known.

If the module or task is unclear, ask the user to confirm the module/task ID before creating files.

---

## Process

### Step 1 - Identify Module And Task

Confirm:

- module name and module code, e.g. `reporting` / `REP`
- task ID if this is task-specific, e.g. `UX-REP-001-main-table`
- whether the output is module-level or task-level

Use the task model:

```text
docs/ux/<module>/
  00-index.md
  module.json
  state.json
  tasks/<task-id>/
```

### Step 2 - Read Source Material

Read the BRD and any existing docs needed to understand:

- user roles and permissions
- business goals
- user goals
- constraints
- data rules
- compliance/security concerns
- current design references

### Step 3 - Produce Analysis

Write the analysis to:

```text
docs/ux/<module>/tasks/<task-id>/01-analysis.md
```

If the work is module-level, write a module analysis and create/update task candidates in `module.json`.

The analysis must include:

- BRD summary
- roles and permissions
- confirmed requirements
- assumptions
- open questions
- scope and out-of-scope items
- user journeys and flows, including happy, error, empty, permission, and multi-role paths where relevant
- screen/task candidates
- UX risks and ambiguity
- recommended next task(s)

### Step 4 - Track Open Questions

Write or update:

```text
docs/ux/<module>/tasks/<task-id>/02-open-questions.md
```

Every question must have:

- ID
- status: `open`, `answered`, `deferred`, or `blocked`
- owner
- impact
- default assumption, if safe

### Step 5 - Update Module State

Update:

```text
docs/ux/<module>/00-index.md
docs/ux/<module>/module.json
docs/ux/<module>/state.json
```

Set status to one of:

```text
analysis_ready
questions_open
blocked
```

---

## Output Contract

End every run with:

```text
Task:
Module:
Stage completed:
Summary:
- ...

Open questions:
- ...

Files created or updated:
- ...

Next step:
Run /ais-ux-design-prompt {task-id}

Proceed? yes/no
```

If questions block design prompting, say:

```text
Next step:
Resolve the blocking questions before /ais-ux-design-prompt.
```

---

## Rules

- `/ais-ux-analysis` includes the old flow work. Do not tell the user to run `/ais-ux-analysis` next.
- Do not create the Figma/Claude prompt in this command.
- Do not invent product decisions. Use explicit assumptions and mark risky assumptions clearly.
- Keep task scope tight. A task can be a screen, modal, flow, component, or combined design package.
- Every analysis must identify what is in scope and what is not in scope.

---

## Related Commands

- `/ais-ux-design-prompt` - creates the complete Figma/Claude design prompt from approved analysis.
- `/ais-ux-review` - reviews approved design artifacts or implementation.
- `/ais-ux-handoff` - creates the final developer handoff after UX approval.
- `/ais-ux-analysis` - compatibility alias for this command.
- `/ais-ux-analysis` - legacy alias; flow work now happens here.

---

## Quick route (small UX changes)

For a single screen or component change, or a spike, skip the staged workflow.

Create a production-grade enterprise UX solution using the centralized UX system.

### When to use the quick route vs staged workflow

**Quick fixes and spikes** → `/ais-ux-analysis --quick`. Use when:
- Single screen or component improvement (color, spacing, layout change)
- Exploring a UX concept before committing to a full feature
- Ad-hoc UI feedback or design iteration

**New feature with full UX design** → Use the staged workflow:
```
BRD approved -> /ais-ux-analysis -> /ais-ux-design-prompt
-> manual Figma/Claude build + UX Lead approval -> /ais-ux-review -> /ais-ux-handoff -> Stage 5
```
This path produces requirements, flows, screen specs, design tokens, and a developer-ready handoff in sequence — each stage gates the next. See `.claude/rules/ux-rules.md` for all hard gates.

### Usage

```text
/ais-ux-analysis --quick create sprint dashboard
/ais-ux-analysis --quick create AI governance audit screen
/ais-ux-analysis --quick create phase 1 timesheet approval flow
```

### Process

1. Read the relevant BRD/spec/task.
2. Use `.claude/skills/ux-system/SKILL.md`.
3. Load `DESIGN_SYSTEM.md`, `DESIGN_TOKENS.md`, `COMPONENT_RULES.md`, or `UX_PATTERNS.md` only as needed.
4. Define role, business goal, workflow, and data density.
5. Produce UX architecture, component hierarchy, interactions, states, responsiveness, mobile behavior, theme behavior, and accessibility guidance.
6. Save artifacts under `docs/ux/<phase-or-feature>/` when creating project documentation.

### Requirements

- Follow the centralized UX system strictly.
- Use Figma-inspired typography and spacing.
- Use Jira-inspired layout efficiency.
- Use Monday-inspired visual energy carefully.
- Use semantic tokens (action-primary / success / warning / danger) for meaning. Do not use brand colors directly; all colors come from CSS variables. Avoid overusing action-primary across navigation, avatars, role badges, action links, and status chips on the same screen.
- Maintain enterprise readability and operational clarity.
- Support responsive layouts and accessibility.
- Include dark/light theme considerations.
- Design the primary workflow for desktop first.
- Include tablet and mobile adaptation behavior, including a 390px mobile check.
- Include light and dark theme behavior for every page/screen.
- Use organization-overridable tokens for all colors so pages can switch themes and apply branding overrides without visual regressions.
- Treat documented hex values as default fallback tokens only; do not place brand hex values directly in screen/component guidance.

### Output

1. UX reasoning
2. Layout architecture
3. Component hierarchy
4. Dashboard/widget structure where relevant
5. Interaction design
6. State coverage
7. Responsive behavior
8. Tablet/mobile adaptation behavior, including 390px mobile validation
9. Light/dark theme behavior
10. Accessibility guidance
11. Implementation guidance
12. Suggested docs/ux artifact paths
