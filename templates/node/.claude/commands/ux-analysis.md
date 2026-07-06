# /ux-analysis

Analyze a BRD, feature spec, or product request into a complete product/UX analysis package. This command replaces the old split between `/ux-analyze` and `/ux-flow`.

---

## Usage

```text
/ux-analysis
/ux-analysis reporting
/ux-analysis UX-REP-001-main-table
/ux-analysis --spec .ai-scaffold/docs/brd/business-requirements.md --module reporting
```

---

## When To Run

- After the BRD or feature request is available.
- Before `/ux-design-prompt`.
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
.ai-scaffold/docs/ux/<module>/
  00-index.md
  m.ai-scaffold/tasks/json
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
.ai-scaffold/tasks/xt
.ai-scaffold/docs/ux/<module>/tasks/<task-id>/01-analysis.md
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

Writ.ai-scaffold/tasks/pdate:

```text
.ai-scaffold/docs/ux/<module>/tasks/<task-id>/02-open-questions.md
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
.ai-scaffold/docs/ux/<module>/00-index.md
.ai-scaffold/docs/ux/<module>/module.json
.ai-scaffold/docs/ux/<module>/state.json
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
Run /ux-design-prompt {task-id}

Proceed? yes/no
```

If questions block design prompting, say:

```text
Next step:
Resolve the blocking questions before /ux-design-prompt.
```

---

## Rules

- `/ux-analysis` includes the old flow work. Do not tell the user to run `/ux-flow` next.
- Do not create the Figma/Claude prompt in this command.
- Do not invent product decisions. Use explicit assumptions and mark risky assumptions clearly.
- Keep task scope tight. A task can be a screen, modal, flow, component, or combined design package.
- Every analysis must identify what is in scope and what is not in scope.

---

## Related Commands

- `/ux-design-prompt` - creates the complete Figma/Claude design prompt from approved analysis.
- `/ux-review` - reviews approved design artifacts or implementation.
- `/ux-handoff` - creates the final developer handoff after UX approval.
- `/ux-analyze` - compatibility alias for this command.
- `/ux-flow` - legacy alias; flow work now happens here.
