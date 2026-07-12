---
description: Create a complete Figma Make / Claude Design prompt from approved UX analysis.
---

# /ux-design-prompt

Create a complete Figma Make, Claude Design, or similar AI design prompt from approved UX analysis. This command replaces the old split between `/ux-screen-spec` and `/ux-figma-spec`.

---

## Usage

```text
/ux-design-prompt UX-REP-001-main-table
/ux-design-prompt reporting
/ux-design-prompt --task UX-REP-003-combined-figma-package
```

---

## When To Run

- After `/ux-analysis` is complete and approved.
- After blocking open questions are resolved or explicitly defaulted.
- Before manual Figma/Claude design generation.

---

## Inputs

Read:

- `docs/ux/<module>/tasks/<task-id>/01-analysis.md`
- `docs/ux/<module>/tasks/<task-id>/02-open-questions.md`
- `.claude/skills/ux-system/DESIGN_TOKENS.md`
- `.claude/skills/ux-system/COMPONENT_RULES.md`
- `.claude/rules/ux-rules.md`
- relevant reference screens/components

If the task has legacy source material, read only the relevant linked files from its task index.

---

## Process

### Step 1 - Confirm Task Readiness

Before writing the prompt, confirm:

- analysis exists
- open questions are answered, deferred, or have safe defaults
- scope is clear
- target screens/components/states are known
- design tokens are available
- references are listed

If not ready, stop and report what is missing.

### Step 2 - Build The Design Prompt

Write:

```text
docs/ux/<module>/tasks/<task-id>/03-design-prompt.md
```

The prompt must include:

- product/module context
- task goal
- user roles and permissions
- target screens/components
- expected Figma output
- frame naming
- viewports
- light/dark theme expectations
- required states
- component/library expectations
- design token requirements
- responsive behavior
- accessibility requirements
- copy/content requirements
- data examples or fixture expectations
- interactions and state transitions
- explicit exclusions
- acceptance/review checklist

### Step 3 - Add Manual Build Instructions

Write or update:

```text
docs/ux/<module>/tasks/<task-id>/04-figma-build-notes.md
```

Include a blank section for:

- tool used
- prompt version/source
- Figma link
- frames built
- manual adjustments made
- known issues
- UX Lead approval status

### Step 4 - Update State

Update:

```text
docs/ux/<module>/module.json
docs/ux/<module>/state.json
docs/ux/<module>/00-index.md
```

Set status to:

```text
design_prompt_ready
```

Set next action to:

```text
manual_figma_build
```

---

## Output Contract

End every run with:

```text
Task:
Module:
Stage completed: design_prompt_ready
Summary:
- ...

Prompt covers:
- context
- tokens
- states
- responsive rules
- expected output
- review checklist

Before pasting into Figma/Claude:
- ...

Files created or updated:
- ...

Next step:
Paste the prompt into Figma Make, Claude Design, or similar. Human designer adjusts the output, then UX Lead approves before /ux-review.

Proceed? yes/no
```

---

## Rules

- Do not treat this as final dev handoff.
- Do not start implementation from this output.
- Do not skip manual Figma/design review.
- Every token referenced must exist in `DESIGN_TOKENS.md`.
- If a token is missing, stop and flag it instead of inventing a value.
- The prompt must be self-contained enough to paste into Figma/Claude without requiring the designer to infer hidden context.

---

## Related Commands

- `/ux-analysis` - produces requirements, scope, open questions, and flows.
- `/ux-review` - runs after manual design adjustment and UX Lead readiness.
- `/ux-handoff` - final developer handoff after UX review passes.
- `/ux-screen-spec` - legacy alias; screen detail now belongs here.
- `/ux-figma-spec` - legacy alias; Figma prompt generation now belongs here.
