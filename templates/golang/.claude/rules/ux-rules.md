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

Use semantic tokens (action-primary / success / warning / danger) for meaning. Do not use brand colors directly. All colors come from CSS tokens — never hardcode brand hex values in screens, specs, or components.

| Token | Usage |
|---|---|
| `--color-action-primary` | Primary action, focus/selection, success/active status |
| `--color-warning` | Pending/review/attention |
| `--color-danger` | Blocked/error/destructive |
| `--color-bg-surface` | Cards, panels, inputs, surface backgrounds |
| `--color-bg-muted` | Table headers, subtle areas |
| `--color-text-primary` | Primary text, headings |
| `--color-text-secondary` | Labels, captions, muted text |
| `--color-border` | Borders, dividers |

Role badges are neutral by default — semantic color only when status is the message.

See [.claude/skills/ux-system/DESIGN_TOKENS.md](../skills/ux-system/DESIGN_TOKENS.md) for the complete token system including dark mode values and status color scale.

### Typography

- **Font:** Inter 400/500/600/700 · Fallbacks: SF Pro, system-ui, sans-serif
- Scale: h1:32px · h2:24px · h3:20px · h4:16px · body:14px · sm:12px · label:12px

### Spacing

8pt grid: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64px

### Key Components

| Component | Spec |
|---|---|
| Input | 40px height, 8px radius, border `--color-border`, focus border `--color-border-focus` |
| Button | primary bg `--color-action-primary` · secondary border only · destructive bg `--color-danger` |
| Card | bg `--color-bg-surface`, border `--color-border`, 12px radius, shadow-sm, 24px padding |
| Table | header bg `--color-bg-muted`, row 52px, hover bg `--color-bg-muted` |
| Badge | pill shape, semantic color scale (50 bg / 700 text) |
| Modal | surface panel, xl radius, shadow-lg, focus trap, Escape closes |
| Toast | bottom-right, 360px wide, auto-dismiss 4s (success) / manual (error) |
| Top nav | 44px target height, neutral inactive items, one clear active treatment |

### Theme and Responsive

- Every screen supports light and dark mode via CSS tokens — no hardcoded colors
- Desktop is the primary canvas — design enterprise workflows for desktop first, then adapt
- Mobile validation viewport: approximately 390px
- Primary workflows must work on mobile — no hiding create/edit/submit/approve behind desktop-only controls

---

## 2. Canonical UX Workflow

Use the simplified task-based workflow:

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

Stage outputs:

- `/ux-analysis`: requirements, assumptions, open questions, scope, roles, permissions, flows, task/screen candidates, risks.
- `/ux-design-prompt`: complete Figma/Claude prompt with context, tokens, components, states, responsive behavior, exclusions, and review checklist.
- Manual Figma stage: paste prompt, generate design, human adjust, record build notes, UX Lead approval.
- `/ux-review`: validates design artifacts or implementation.
- `/ux-handoff`: final developer-ready package.

Every UX command must end with:

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

## 3. Artifact Structure

Use module/task folders:

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

Each module has one start-here file: `00-index.md`.

## 4. State Coverage

Every design prompt and handoff must define relevant states:

| State | Required |
|---|---|
| Loading | Yes |
| Empty (no data) | Yes where data can be absent |
| Empty (filtered) | Yes where filters/search exist |
| Error | Yes |
| Permission denied | Yes where roles differ |
| Success confirmation | Yes where actions mutate state |
| Form validation | Yes where forms exist |
| Mobile | Yes for primary workflows |

## 5. Token Hygiene

A UX artifact must not reference a token that is not defined in `.claude/skills/ux-system/DESIGN_TOKENS.md`.

Before writing a design prompt or handoff:

1. Confirm every semantic/component token exists.
2. If a new token is needed, flag it first.
3. Never invent token names, hex values, or raw `rgba(...)` values.

---

## 6. Figma Rules

- Frame name: `{ScreenName}/Desktop`, `{ScreenName}/Mobile`
- Auto-layout: vertical, 0 gap on main frame
- Shared components: `Sidebar/Default`, `Table/Default`, `Card/Default`, `Modal/Default`
- Data in Figma: use `.json` fixtures, not hardcoded values
- Token-based colors — all colors from design system tokens, no arbitrary hex values
- Component variants: default, hover, active, disabled, loading, error
- Dark mode frames alongside light mode frames

---

## 7. Developer Handoff Rules

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
| `--color-action-primary` | primary buttons, links |
| `--color-bg-surface` | cards, modals |

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
| GH-01 | No `/ux-design-prompt` before `/ux-analysis` exists | BLOCK |
| GH-02 | Blocking open questions must be resolved or explicitly defaulted before design prompting | BLOCK |
| GH-03 | Every relevant state must be covered or marked N/A | BLOCK |
| GH-04 | Every form must define validation and feedback behavior | BLOCK |
| GH-05 | Every table/list must define search/filter/sort/pagination/empty behavior or mark N/A | BLOCK |
| GH-06 | Every primary workflow must define mobile behavior at 375/390px | BLOCK |
| GH-07 | Manual Figma/design adjustment and UX Lead approval are required before `/ux-review` | BLOCK |
| GH-08 | `/ux-review` required before `/ux-handoff` | BLOCK |
| GH-09 | `/ux-handoff` required before Stage 5 implementation | BLOCK |
| GH-10 | All colors must use defined CSS/design tokens | BLOCK |
| GH-11 | UX artifacts must not reference undefined tokens | BLOCK |

---

## Related

- `/ux-analysis`
- `/ux-design-prompt`
- `/ux-review`
- `/ux-handoff`
- `.claude/skills/ux-workflow/SKILL.md`
- `.claude/skills/ux-system/`