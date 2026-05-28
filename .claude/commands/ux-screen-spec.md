# /ux-screen-spec

Produce a screen-level spec for one screen at a time. Produces layout structure, component hierarchy, CTA placement, form fields, responsive behavior, state matrix, and Figma notes.

---

## Usage

```
/ux-screen-spec                              # interactive
/ux-screen-spec "candidate list screen"
/ux-screen-spec --screen "Application Detail" --flow docs/ux/feature/02-flows.md
```

---

## When to Run

- After `/ux-flow` is approved
- Once per screen in the approved screen inventory
- For a feature with 10 screens, run this 10 times

---

## Prerequisites

- `docs/ux/<feature>/02-flows.md` exists and is approved
- Screen is listed in `03-screen-inventory.md`

---

## Process

### Step 1 — Confirm the Screen

Name the screen to spec. Verify it appears in the screen inventory.

### Step 2 — Read Relevant Flows

Read the section of `02-flows.md` relevant to this screen. Note: triggers, actions, state changes, and transitions.

### Step 3 — Invoke ux-designer

```
@ux-designer Produce a screen spec for: {{ScreenName}}
Source flows: docs/ux/<feature>/02-flows.md
Design system: .claude/skills/ux-system/
```

### Step 4 — Save the Output

Append to: `docs/ux/<feature>/05-screen-specs.md`

If this is the first screen, create the file with a header:

```markdown
# Screen Specs — {{Feature Name}}

**Source:** 02-flows.md
**Designer:** ux-designer agent
```

Add each screen as a new section. Use a horizontal rule to separate screens.

---

## Output Format

Each screen spec section:

```markdown
---

## Screen {{N}}: {{Screen Name}}

**Route:** /{{path}}
**Access:** {{roles}}
**Purpose:** {{one sentence — what the user accomplishes here}}

### Layout
[ASCII wireframe]

### Component Hierarchy
| Component | Variant | States | Notes |
|---|---|---|---|

### CTA Placement
| Action | Location | Behavior |
|---|---|---|
| [Primary] | | |

### Form Fields (if applicable)
| Field | Type | Validation | Error |

### Responsive Behavior
| Viewport | Layout Change |
|---|---|
| 1280px+ | full sidebar + full table |
| 768px | condensed sidebar |
| ~390px | bottom sheet + card list |

### State Matrix
| State | What to Show |
|---|---|
| Loading | |
| Empty | |
| Error | |
| Permission denied | |
| Success | |
| Form validation | |
| Mobile | |

### Figma Notes
- Frame: `{{ScreenName}}/Desktop`, `{{ScreenName}}/Mobile`
- Auto-layout: vertical, 0 gap
- Shared components: {{list}}
```

---

## Scope Rule

**One screen per invocation.** Do not try to spec all screens of a feature in one run. Run once per screen, review each, then move to the next.

---

## Rules

- Every screen spec must include all seven states: loading, empty, error, permission denied, success, form validation, mobile.
- All colors must reference CSS tokens — no hardcoded brand hex values.
- All interactive elements must have defined behavior (click → consequence).
- CTA placement must show primary action clearly; secondary actions must not compete.

---

## Hard Gate

**No `/ux-figma-spec` until all screens in the inventory are approved.** All screens gate the design system application phase.

---

## Related Commands

- `/ux-analyze` — produces requirements
- `/ux-flow` — produces flows
- `/ux-figma-spec` — design token application (after all screens approved)
- `/ux-review` — review UX artifacts
- `/ux-handoff` — developer handoff
- `@ux-designer` — the agent that generates this output