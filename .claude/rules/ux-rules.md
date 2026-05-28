# UX Rules

Governs all UX work in this scaffold — agents, commands, and AI tools producing or reviewing UX artifacts.

---

## 1. Core Design Rules

### Precision Minimal Identity

Every design decision must justify itself by making the user faster or less confused.

- **Hierarchy first** — users scan, not read. Make the important thing obvious.
- **One primary action per screen** — everything else is secondary or destructive.
- **Content before chrome** — navigation and UI shell should never compete with content.
- **Empty, error, and loading states are part of the design** — never leave them undefined.
- **No orphaned actions** — every button has a consequence the user can predict.

### Color Usage

Use the green/yellow/red palette semantically. Do not make every active, role, avatar, link, and badge green.

- **Green** (`#00C875`) — primary action, focus/selection, success/active status
- **Yellow** (`#FFCB00`) — pending/review/attention
- **Red** (`#FF3B30`) — blocked/error/destructive
- **Role badges** — neutral by default, semantic color only when status is the message
- **Text** — `#172B4D` Ink primary · `#44546F` Slate secondary · `#626F86` muted

### Typography

- **Font:** Inter 400/500/600/700 · Fallbacks: SF Pro, system-ui, sans-serif
- Scale: h1:32px · h2:24px · h3:20px · h4:16px · body:14px · sm:12px · label:12px

### Spacing

8pt grid: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64px

### Key Components

| Component | Spec |
|---|---|
| Input | 40px height, 8px radius, border `#DFE1E6`, focus border `#00C875` |
| Button | primary bg `#00C875` · secondary border only · destructive bg `#FF3B30` |
| Card | bg white, border `#DFE1E6`, 12px radius, shadow-sm, 24px padding |
| Table | header bg `#F4F5F7`, row 52px, hover bg `#F4F5F7` |
| Badge | pill shape, semantic color scale (50 bg / 700 text) |
| Modal | white panel, xl radius, shadow-lg, focus trap, Escape closes |
| Toast | bottom-right, 360px wide, auto-dismiss 4s (success) / manual (error) |
| Top nav | 44px target height, neutral inactive items, one clear active treatment |

### Theme and Responsive

- Every screen supports light and dark mode via CSS tokens — no hardcoded colors
- Desktop is the primary canvas — design enterprise workflows for desktop first, then adapt
- Mobile validation viewport: approximately 390px
- Primary workflows must work on mobile — no hiding create/edit/submit/approve behind desktop-only controls

---

## 2. AI Governance Rules

### UX Workflow Order (non-negotiable)

```
BRD / Feature Spec
  ↓
/ux-analyze        → 01-requirements.md
  ↓
/ux-flow           → 02-flows.md
  ↓
/ux-screen-spec   → 05-screen-specs.md (one screen per invocation)
  ↓
/ux-figma-spec    → 06-figma-spec.md
  ↓
Human review
  ↓
/ux-review        → 07-review.md
  ↓
/ux-handoff       → 08-dev-handoff.md
```

**Skip order is a BLOCK.** Do not produce screen specs without flows. Do not produce flows without requirements.

### Staged Output Rules

- `/ux-analyze` — reads BRD/client notes, outputs UX requirements, screen inventory, user role matrix, flow inventory, risks, open questions
- `/ux-flow` — designs user journeys: happy path, error path, empty state path, permission path, multi-role path, screen-to-screen transition map
- `/ux-screen-spec` — one screen per invocation. Produces layout structure, component hierarchy, CTA placement, form fields, validations, responsive behavior, state matrix
- `/ux-figma-spec` — design token usage, component library mapping, spacing/type/grid rules, table/form/modal/card rules
- `/ux-handoff` — developer-ready checklist: component list, state matrix, token usage, responsive rules, Figma link

### Artifact Structure

```
docs/ux/<feature>/
  01-requirements.md      ← /ux-analyze
  02-flows.md             ← /ux-flow
  03-screen-inventory.md  ← /ux-analyze (screen list)
  04-design-system-notes.md ← /ux-figma-spec
  05-screen-specs.md      ← /ux-screen-spec (one per screen)
  06-figma-spec.md        ← /ux-figma-spec
  07-review.md            ← /ux-review
  08-dev-handoff.md       ← /ux-handoff
```

### State Coverage

Every screen spec must define all states:

| State | Required? |
|---|---|
| Loading | Yes — skeleton screens, not spinners |
| Empty (no data) | Yes — illustration + guidance + action |
| Empty (filtered) | Yes — clear filters option |
| Error | Yes — banner with retry |
| Permission denied | Yes — appropriate message |
| Success confirmation | Yes — clear feedback |
| Form validation | Yes — field-level and form-level |

### Mobile Behavior

Every screen spec must include mobile behavior for approximately 390px viewport.

---

## 3. Figma Rules

- Frame name: `{ScreenName}/Desktop`, `{ScreenName}/Mobile`
- Auto-layout: vertical, 0 gap on main frame
- Shared components: `Sidebar/Default`, `Table/Default`, `Card/Default`, `Modal/Default`
- Data in Figma: use `.json` fixtures, not hardcoded values
- Token-based colors — all colors from design system tokens, no arbitrary hex values
- Component variants: default, hover, active, disabled, loading, error
- Dark mode frames alongside light mode frames

---

## 4. Developer Handoff Rules

### Handoff Checklist

`/ux-handoff` produces a developer checklist. Every item must be addressed:

```
## Developer Handoff — {{Feature}}

### Components
| Component | States | Token | Notes |
|---|---|---|---|

### State Matrix
| Screen | Loading | Empty | Error | Permission | Success |
|---|---|---|---|---|---|
| ScreenName | ✅ | ✅ | ✅ | ✅ | ✅ |

### Token Usage
| Token | Used On |
|---|---|
| `--color-primary` | primary buttons, links |
| `--color-surface` | cards, modals |

### Responsive Behavior
| Viewport | Layout Change |
|---|---|
| 1280px+ | full sidebar + full table |
| 768px | condensed sidebar (icons only) |
| 390px | bottom sheet, card list |

### Figma Link
`[Figma file name]`

### Open Questions
- {{list any unresolved design questions}}
```

### No Implementation Without Handoff

Frontend implementation of a UX feature **requires** `/ux-handoff` to exist before Stage 5 work begins. This is a hard gate in `/kickoff`.

### Token Enforcement

All colors in implementation must come from CSS tokens. No hardcoded page or brand hex values. Violations are BLOCK in `/ux-review`.

---

## Hard Gates Summary

| Gate | Rule | Severity |
|---|---|---|
| GH-01 | No `/ux-screen-spec` before `/ux-flow` output exists | BLOCK |
| GH-02 | No `/ux-flow` before `/ux-analyze` output exists | BLOCK |
| GH-03 | Every screen spec must include all seven states (loading, empty, error, permission denied, success, form validation, mobile) | BLOCK |
| GH-04 | Every form must define validation and feedback behavior | BLOCK |
| GH-05 | Every table/list must define search/filter/sort/pagination/empty behavior or mark N/A | BLOCK |
| GH-06 | Every screen must define mobile behavior at ~390px | BLOCK |
| GH-07 | `/ux-review` required before frontend implementation is marked DONE | BLOCK |
| GH-08 | `/ux-handoff` required before Stage 5 (implementation) on any UX feature | BLOCK |
| GH-09 | All colors in implementation must use CSS tokens — no hardcoded hex values | BLOCK |
| GH-10 | Staged workflow commands must not be skipped — requirements → flows → screens → handoff | BLOCK |

---

## Related

- `/ux-analyze` — requirements extraction
- `/ux-flow` — user journey design
- `/ux-screen-spec` — screen-level specs
- `/ux-figma-spec` — design system application
- `/ux-review` — UX artifact and implementation review
- `/ux-handoff` — developer-ready handoff
- `.claude/skills/ux-workflow/SKILL.md` — staged UX workflow guidance
- `.claude/skills/ux-system/` — design system source of truth