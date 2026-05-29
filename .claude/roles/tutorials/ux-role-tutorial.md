# UX Role Tutorial

**Role:** `ux` | **Default command:** `/ux-analyze` | **Purpose:** UX creation, review, accessibility, and responsive behavior verification

---

## When to Use This Role

You are the **ux** when you need to:
- Analyze a feature and design its UX flow
- Create screen specifications with layout and interaction details
- Review UX artifacts (wireframes, mockups, flow diagrams)
- Verify frontend implementation against design spec
- Check accessibility (WCAG 2.1 AA compliance)
- Validate responsive behavior (desktop, tablet, mobile)

**Not the UX role:** writing backend code, database design, architecture decisions.

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "ux"
}
```

### 2. Begin with UX analysis

```bash
/ux-analyze
```

This analyzes a feature's UX requirements, user roles, information architecture, and identifies design decisions needed.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/ux-analyze` | Analyze UX requirements and information architecture | UX analysis report with user flows, data model implications |
| `/ux-create` | Create or improve UX for a feature | Component specs, design decisions, token usage |
| `/ux-flow` | Design user interaction flows | Flow diagram with steps, decisions, edge cases |
| `/ux-screen-spec` | Create detailed screen specifications | Layout, components, states, accessibility notes |
| `/ux-figma-spec` | Generate Figma-ready component specs | Frame layout, token specs, interaction patterns |
| `/ux-handoff` | Handoff completed UX to implementation | Spec document, asset inventory, implementation notes |
| `/ux-review` | Review UX implementation for compliance | Design system compliance, accessibility, state coverage |
| `/qa` | Live browser QA for UI verification | Rendering, interaction, console issue detection |
| `/lessons` | Record a UX decision or mistake | Saved to `tasks/lessons.md` |
| `/reflect` | Review UX session outcome | Saved to memory |

---

## Step-by-Step Workflow

### Full UX Lifecycle

```
1. UX Analysis: /ux-analyze
   → User roles and their tasks
   → Information architecture
   → Design decisions needed
   → Dependencies on backend API

2. UX Flow: /ux-flow
   → Primary user flow (happy path)
   → Alternate flows (error, empty, loading)
   → Decision points and branching
   → Edge cases and error handling

3. Screen Specifications: /ux-screen-spec
   → Per-screen: layout, components, states
   → Token usage: colors, typography, spacing
   → Accessibility notes: focus order, ARIA
   → Responsive behavior: desktop, tablet, mobile

4. Figma Specs: /ux-figma-spec
   → Component frames with exact tokens
   → Interaction patterns
   → State variants

5. Handoff: /ux-handoff
   → Implementation-ready spec document
   → Asset inventory
   → Design system usage confirmation

6. Implementation Review: /ux-review
   → Design system compliance
   → Token usage (no hardcoded colors)
   → State coverage (all 4 states)
   → Accessibility check

7. Live Browser QA: /qa
   → Desktop light + dark
   → Mobile light + dark (~390px)
   → All states: loading, error, empty, populated
```

---

## Required Evidence Gates

Before claiming "UX sign-off":

- [ ] `accessibility_verified` — WCAG 2.1 AA, keyboard nav, screen reader
- [ ] `responsive_verified` — desktop, tablet, mobile layouts
- [ ] `light_theme_verified` — all components render correctly
- [ ] `dark_theme_verified` — all components render correctly
- [ ] `state_coverage_verified` — loading, error, empty, populated states
- [ ] `design_system_consistency_verified` — tokens used, no hardcoded values

---

## Design System Tokens

Use only these tokens — no hardcoded colors:

| Token | Usage |
|---|---|
| `--color-action-primary` | Primary actions, links, focus/selection |
| `--color-action-primary-hover` | Primary hover/pressed |
| `--color-action-primary-soft` | Subtle active backgrounds |
| `--color-bg-surface` | Cards, modals, inputs, header |
| `--color-bg-muted` | Table headers, filter bars, nested areas |
| `--color-text-primary` | Headings, body text |
| `--color-text-secondary` | Labels, captions, muted text |
| `--color-text-muted` | Placeholder, disabled |
| `--color-border` | Borders |
| `--color-border-strong` | Emphasized borders |
| `--color-border-focus` | Focus rings |
| `--color-success` | Success states |
| `--color-warning` | Warning states |
| `--color-danger` | Danger/error states |

All colors are organization-overridable via branding settings.

---

## Blocked Actions (Human Required)

| Action | Why Blocked |
|---|---|
| `merge_main` | Requires human approval + CI green |
| `deploy_production` | Requires deployment review + sign-off |
| `destructive_changes` | Requires explicit human consent |
| `secrets_access` | Out of scope for AI |
| `backend_logic_changes` | UX doesn't own backend implementation |

---

## The Four States

Every data-rendering component must handle all four states:

```
1. Loading   → Skeleton or spinner (not blank space)
2. Error     → Error message with retry action (not blank)
3. Empty     → Meaningful empty state with guidance (not "no data")
4. Populated → The actual data
```

---

## Responsive Breakpoints

| Viewport | Width | Target |
|---|---|---|
| Desktop | ≥1024px | Primary experience |
| Tablet | 768px–1023px | Adapted from desktop |
| Mobile | ~390px | Complete workflow, no hidden actions |

At 390px, primary workflows must remain complete. Create, edit, submit, approve, save, cancel actions must be accessible.

---

## Common Scenarios

### Scenario 1: New feature screen

```
User: "Design the project listing screen"

1. /ux-analyze
   → User roles: admin, manager, member
   → Tasks: view projects, filter, search, create
   → Data model: projects, members, organizations

2. /ux-flow
   → Primary: view projects → select → view details
   → Alternate: filter by status, search by name
   → Edge: empty project list, too many projects (pagination)

3. /ux-screen-spec
   → Layout: table with columns, filters, pagination
   → Components: table row, filter bar, pagination
   → Token usage: surface, text, border, primary
   → States: loading skeleton, error message, empty state, populated

4. /ux-review (after implementation)
   → Design tokens used correctly
   → All 4 states present
   → Responsive at 390px
```

### Scenario 2: Form with validation

```
User: "Design the project creation form"

1. /ux-flow
   → Primary: open form → fill fields → validate → submit → success
   → Alternate: validation errors, cancel, network failure

2. /ux-screen-spec
   → Layout: single column form, stacked fields
   → Components: text input, select, date picker, submit button
   → Token usage
   → States: field default, focus, error, disabled
   → Accessibility: labels, aria-describedby for errors

3. /ux-review (after implementation)
   → Form validation displays inline errors
   → Submit button shows loading state
   → Success redirects to project detail
```

### Scenario 3: Theme verification

```
User: "Verify dark mode on the dashboard"

1. /qa (with role set to ux)
   → Toggle dark mode
   → Verify: surface colors invert, text remains readable
   → Verify: no hardcoded hex values break theme
   → Verify: borders, focus rings, charts all use tokens
   → Verify: state is preserved after theme switch
```

---

## Calling Specialist Agents

Invoke these for deep analysis:

```
@ux-designer          — component specs, design decisions
@ux-flow-designer     — flow diagrams, interaction patterns
@ux-requirement-analyst  — UX requirements from business needs
@frontend-reviewer    — implementation compliance, accessibility
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No spec exists | Create one with `/ux-screen-spec` before implementation |
| Hardcoded colors found | Flag as BLOCK — must use design tokens |
| Missing states | Component must handle loading, error, empty, populated |
| Mobile actions hidden | Ensure primary workflow is complete at 390px |
| "I don't know" response | This is correct. Ask or research — don't guess at UX decisions |

---

## Related Files

- Role config: [ux.yaml](../ux.yaml)
- Design system: [.claude/skills/design-system.md](../../skills/design-system.md)
- UX system skill: [.claude/skills/ux-system/SKILL.md](../../skills/ux-system/SKILL.md)
- UX rules: [.claude/rules/ux-rules.md](../../rules/ux-rules.md)