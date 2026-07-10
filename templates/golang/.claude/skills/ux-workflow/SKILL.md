---
name: ux-workflow
description: Simplified UX production workflow - analysis, AI design prompt, manual Figma approval, review, and handoff. Use when creating or improving UX artifacts from a BRD or feature spec.
---

# UX Workflow

Use this skill when creating UX artifacts from a BRD, feature spec, or product request.

The canonical workflow is task-based:

```text
BRD / Feature Spec
  -> /ux-analysis
  -> /ux-design-prompt
  -> manual Figma/Claude build + human adjustment + UX Lead approval
  -> /ux-review
  -> /ux-handoff
  -> implementation
```

Legacy command mapping:

```text
/ux-analyze      -> /ux-analysis
/ux-flow         -> included in /ux-analysis
/ux-screen-spec  -> included in /ux-design-prompt
/ux-figma-spec   -> included in /ux-design-prompt
```

## Folder Model

```text
docs/ux/<module>/
  00-index.md
  module.json
  state.json
  tasks/
    UX-<MODULE>-001-<slug>/
      00-task-index.md
      01-analysis.md
      02-open-questions.md
      03-design-prompt.md
      04-figma-build-notes.md
      05-ux-review.md
      06-dev-handoff.md
  archive/
```

## Stage 1 - /ux-analysis

Output:

```text
docs/ux/<module>/tasks/<task-id>/01-analysis.md
docs/ux/<module>/tasks/<task-id>/02-open-questions.md
```

Produce:

- BRD summary
- roles and permissions
- confirmed requirements
- assumptions
- open questions
- scope and out-of-scope items
- user journeys and flows
- screen/task candidates
- UX risks and ambiguity
- recommended next command

This stage includes the old flow work. Do not route the user to `/ux-flow`.

## Stage 2 - /ux-design-prompt

Output:

```text
docs/ux/<module>/tasks/<task-id>/03-design-prompt.md
docs/ux/<module>/tasks/<task-id>/04-figma-build-notes.md
```

Produce a self-contained Figma Make / Claude Design prompt with:

- product context
- expected Figma output
- target screens/components
- frame naming
- required states
- viewports and responsive behavior
- light/dark theme expectations
- design tokens and component references
- accessibility requirements
- explicit exclusions
- acceptance/review checklist

This stage includes the old screen-spec and Figma-spec work. Do not route the user to `/ux-screen-spec` or `/ux-figma-spec`.

## Manual Figma Stage

1. Paste `03-design-prompt.md` into Figma Make, Claude Design, or similar.
2. Generate the first design.
3. Human designer adjusts layout, spacing, density, tokens, components, states, and responsive behavior.
4. Record the Figma link and manual changes in `04-figma-build-notes.md`.
5. UX Lead approves before `/ux-review`.

## Stage 3 - /ux-review

Output:

```text
docs/ux/<module>/tasks/<task-id>/05-ux-review.md
```

Check hierarchy, accessibility, responsive behavior, mobile behavior, light/dark theme support, state coverage, token usage, component consistency, and interaction clarity.

All BLOCK findings must be resolved before `/ux-handoff`.

## Stage 4 - /ux-handoff

Output:

```text
docs/ux/<module>/tasks/<task-id>/06-dev-handoff.md
```

Produce the final developer package:

- implementation checklist
- screen/component list
- state matrix
- responsive behavior
- token usage summary
- accessibility requirements
- interaction behavior
- Figma links and frame names
- API/data expectations, if known
- open questions that still affect dev
- explicit out-of-scope items

`/ux-handoff` is not a Figma prompt command.

## End-Of-Stage Contract

Every UX command should end with:

```text
Task:
Module:
Stage completed:
Summary:
Open questions:
Files created or updated:
Next step:
Proceed? yes/no
```

## Hard Gates

- No `/ux-design-prompt` until `/ux-analysis` exists and blocking questions are resolved or defaulted.
- No `/ux-review` until manual Figma/design adjustment is done and UX Lead is ready for review.
- No `/ux-handoff` until `/ux-review` passes with all BLOCK findings resolved.
- No frontend implementation without `/ux-handoff`.
