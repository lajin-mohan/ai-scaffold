# /ux-handoff

Produce a developer-ready handoff checklist from the approved design package. Formats output as tables — no prose narrative.

---

## Usage

```
/ux-handoff                                  # interactive
/ux-handoff "candidate management feature"
/ux-handoff --feature timesheets
```

---

## When to Run

- After `/ux-review` passes with all BLOCK findings resolved
- After human designer approves the full design package
- Before Stage 5 (implementation) begins on any UX feature

---

## Prerequisites

- `docs/ux/<feature>/05-screen-specs.md` — all screens approved
- `docs/ux/<feature>/04-design-system-notes.md` — design tokens applied
- `docs/ux/<feature>/06-figma-spec.md` — Figma frames defined
- `docs/ux/<feature>/07-review.md` — `/ux-review` passed

---

## Process

### Step 1 — Read the Design Package

Read all completed design artifacts:
- `05-screen-specs.md` — component list, state matrix
- `04-design-system-notes.md` — token usage
- `06-figma-spec.md` — Figma structure

### Step 2 — Check for Unresolved Items

If any open questions remain from `01-requirements.md`:
- Flag them in the handoff
- Do not silently skip them

### Step 3 — Produce Developer Checklist

Save to: `docs/ux/<feature>/08-dev-handoff.md`

Format as tables only:

```markdown
# Developer Handoff — {{Feature Name}}

**Designer:** {{name}}
**Date:** {{YYYY-MM-DD}}
**Figma:** {{link or file name}}
**Status:** READY / CONDITIONAL (see open questions)

---

## Components

| Component | States | Token | Notes |
|---|---|---|---|
| PrimaryButton | default, hover, active, disabled, loading | --color-primary | 40px height |
| TableRow | default, hover, selected | --color-surface | 52px height |
| Badge | success, warning, error, neutral | semantic | pill shape |

## State Matrix

| Screen | Loading | Empty | Empty (Filtered) | Error | Permission | Success | Mobile |
|---|---|---|---|---|---|---|---|
| ScreenA | skeleton rows | illustration + action | clear filters | banner + retry | message | toast | card list |
| ScreenB | | | | | | | |

All cells must be filled or marked N/A. No empty cells.

## Token Usage

| Token | Used On |
|---|---|
| --color-primary | primary buttons, active nav, focus rings |
| --color-surface | cards, modals, inputs, header |
| --color-text-primary | headings, body text |
| --color-text-secondary | labels, captions, muted |
| --color-border | borders, dividers |
| --color-success | success badge bg, active status |
| --color-warning | warning badge bg, pending status |
| --color-danger | error badge bg, destructive button |

## Responsive Behavior

| Viewport | Layout |
|---|---|
| 1280px+ | full sidebar + full table |
| 768px | condensed sidebar (icons only) + table drops lowest-priority column |
| ~390px | bottom sheet + card list; primary workflows must work |

## Form Validation

| Screen | Form | Validation | Feedback |
|---|---|---|---|
| ScreenA | ContactForm | email format, required fields | field-level inline |
| ScreenB | SearchForm | min 2 chars | inline message |

## Figma Link

{{Figma file name or link}}

## Open Questions

| # | Question | Decision Needed | Owner |
|---|---|---|---|
| 1 | {{question}} | {{what decides this}} | {{who}} |

---

## Handoff Checklist

Before marking frontend implementation done:
- [ ] All components built with correct tokens
- [ ] All seven states implemented per screen
- [ ] Form validation feedback inline, field-level
- [ ] Table search/filter/sort/pagination defined or marked N/A
- [ ] Mobile primary workflows complete at ~390px
- [ ] Theme switching works (light/dark) — no hardcoded colors
- [ ] Shared components used (not reinvented)
```

---

## Format Rules

- **Tables only — no prose narratives.** Developers need checklists, not descriptions.
- Every state matrix cell must be filled or marked N/A.
- No empty component rows.
- Open questions must have named owners.

---

## Hard Gate

**No Stage 5 implementation without this file existing.** `/ux-handoff` is a hard gate in `/kickoff` for any feature with UX work.

---

## Related Commands

- `/ux-analyze` — requirements
- `/ux-flow` — flows
- `/ux-screen-spec` — screen specs
- `/ux-figma-spec` — design token application
- `/ux-review` — review (must pass before handoff)
- `/kickoff` — checks for this file before implementation begins