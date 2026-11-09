---
description: Produce the final developer-ready handoff package from approved UX artifacts.
---

# /ais-ux-handoff

Produce the final developer-ready handoff package from approved UX artifacts. This command runs after manual Figma/design approval and after `/ais-ux-review` passes.

It does not create a Figma prompt. Use `/ais-ux-design-prompt` for that.

---

## Usage

```text
/ais-ux-handoff
/ais-ux-handoff UX-REP-001-main-table
/ais-ux-handoff --task UX-REP-003-combined-figma-package
```

---

## When To Run

- After manual Figma/Claude output has been adjusted by a human designer.
- After UX Lead approval is recorded.
- After `/ais-ux-review` passes with all BLOCK findings resolved.
- Before Stage 5 implementation begins.

---

## Prerequisites

For task-based UX work, verify:

```text
docs/ux/<module>/tasks/<task-id>/01-analysis.md
docs/ux/<module>/tasks/<task-id>/03-design-prompt.md
docs/ux/<module>/tasks/<task-id>/04-figma-build-notes.md
docs/ux/<module>/tasks/<task-id>/05-ux-review.md
```

Also verify:

- `04-figma-build-notes.md` includes a Figma link or approved artifact reference.
- UX Lead approval is recorded.
- `05-ux-review.md` has no unresolved BLOCK findings.

If any prerequisite is missing, stop and list what needs to be completed first.

---

## Process

### Step 1 - Read Approved UX Package

Read:

- `01-analysis.md`
- `02-open-questions.md`
- `03-design-prompt.md`
- `04-figma-build-notes.md`
- `05-ux-review.md`
- Figma link/frame notes

### Step 2 - Check For Dev-Affecting Gaps

Flag:

- unresolved open questions that affect implementation
- missing states
- missing responsive behavior
- missing accessibility requirements
- missing token/component references
- out-of-scope items that developers might otherwise assume are included

### Step 3 - Produce Developer Handoff

Write:

```text
docs/ux/<module>/tasks/<task-id>/06-dev-handoff.md
```

Include:

- implementation summary
- Figma link and frame names
- screen/component list
- state matrix
- interaction behavior
- responsive behavior
- token usage
- accessibility requirements
- form validation rules
- data/API expectations, if known
- open questions that still affect dev
- explicit out-of-scope items
- developer checklist

### Step 4 - Update State

Update:

```text
docs/ux/<module>/module.json
docs/ux/<module>/state.json
docs/ux/<module>/00-index.md
```

Set status to:

```text
dev_handoff_ready
```

---

## Output Contract

End with:

```text
Task:
Module:
Stage completed: dev_handoff_ready
Summary:
- ...

Dev handoff includes:
- ...

Open questions affecting dev:
- ...

Files created or updated:
- ...

Next step:
Implementation may start after normal project kickoff/readiness gates pass.
```

---

## Rules

- Do not reinterpret the BRD.
- Do not invent missing UX decisions.
- Do not generate a new Figma prompt.
- Do not skip UX Lead approval.
- Do not mark handoff ready if `/ais-ux-review` has unresolved BLOCK findings.

---

## Related Commands

- `/ais-ux-analysis` - requirements, scope, open questions, flows.
- `/ais-ux-design-prompt` - Figma/Claude prompt.
- `/ais-ux-review` - required before handoff.
- `/ais-kickoff` - checks handoff before implementation.
