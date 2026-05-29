# /ux-figma-spec

Apply design tokens and component rules to approved screen specs. Produces design token usage, component library mapping, spacing/type/grid rules, and Figma frame structure.

---

## Usage

```
/ux-figma-spec                              # interactive
/ux-figma-spec "candidate management feature"
/ux-figma-spec --feature timesheets
```

---

## When to Run

- After all screen specs in `05-screen-specs.md` are approved
- Before human review of the full design package
- Before `/ux-handoff`

---

## Prerequisites

- `docs/ux/<feature>/05-screen-specs.md` — all screens approved
- `docs/ux/<feature>/02-flows.md` — for flow context

---

## Process

### Step 1 — Read All Approved Screen Specs

Read `docs/ux/<feature>/05-screen-specs.md` in full.

### Step 2 — Read Design System

Reference `.claude/skills/ux-system/SKILL.md` for:
- Semantic color tokens (action-primary / success / warning / danger)
- Typography scale (Inter 400/500/600/700)
- Spacing (8pt grid)
- Key component specs
- Dark/light theme token patterns

### Step 3 — Produce Design System Notes

Create `docs/ux/<feature>/04-design-system-notes.md`:

```markdown
# Design System Notes — {{Feature Name}}

## Token Usage
| Token | Used On | Reason |
|---|---|---|
| `--color-action-primary` | primary buttons, links | semantic |
| `--color-bg-surface` | cards, modals, inputs | base surface |

## Component Library Mapping
| Screen Component | Library Component | Token Override |
|---|---|---|
| Table row | Table/Default | — |
| Badge | Badge/Semantic | --color-success |

## Spacing Rules
- Container padding: 24px
- Card padding: 24px
- Element gap: 16px
- Form field gap: 12px

## Typography Rules
- h1: 32px Inter 600
- h2: 24px Inter 600
- body: 14px Inter 400
- label: 12px Inter 600

## Responsive Rules
| Viewport | Change |
|---|---|
| 1280px+ | full layout |
| 768px | condensed sidebar (icons only) |
| ~390px | bottom sheet, card list |
```

### Step 4 — Produce Figma Spec

Create `docs/ux/<feature>/06-figma-spec.md`:

```markdown
# Figma Spec — {{Feature Name}}

## Frame Structure
| Screen | Desktop Frame | Mobile Frame | Shared Components |
|---|---|---|---|
| Screen A | ScreenA/Desktop | ScreenA/Mobile | Sidebar/Default, Table/Default |
| Screen B | ScreenB/Desktop | ScreenB/Mobile | Card/Default |

## Auto-Layout Rules
- Main frame: vertical, 0 gap
- Sidebar: shared component Sidebar/Default
- Table: shared component Table/Default with .json fixture data

## Token Colors (no arbitrary hex)
All colors from design tokens only:
- Primary: --color-primary
- Surface: --color-surface
- Border: --color-border
- Ink: --color-text-primary
- Slate: --color-text-secondary

## Dark Mode
Produce dark mode frames alongside light mode frames for every screen.
```

---

## Rules

- All colors must come from CSS tokens — no hardcoded hex values anywhere.
- Every shared component used must be named (Sidebar/Default, Table/Default, etc.).
- Figma frames must follow naming: `{ScreenName}/Desktop`, `{ScreenName}/Mobile`.
- Dark mode frames must be produced alongside light mode frames.
- Auto-layout: vertical, 0 gap on main frame.

---

## Hard Gate

All Figma specs must be reviewed by a human designer before `/ux-handoff`. Designer approval is required before moving to developer handoff.

---

## Related Commands

- `/ux-analyze` — requirements
- `/ux-flow` — flows
- `/ux-screen-spec` — screen specs
- `/ux-review` — review (after human approval)
- `/ux-handoff` — developer handoff
- `.claude/skills/ux-system/SKILL.md` — design system source of truth