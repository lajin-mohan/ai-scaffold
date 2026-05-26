# Design System — WorkOS Minimal

Brand direction: **WorkOS Minimal** — Jira-like simplicity and density with controlled color energy. The interface should feel structured, fast, and operational: high signal, low clutter, clear actions, and color used as status/meaning rather than decoration. Projects using this scaffold default to green, yellow, and red over common blue SaaS accents.

---

## Color Tokens

### Core Palette
| Token | Hex | Usage |
|---|---|---|
| `--color-engyne-green` | `#00C875` | Primary action, links, active navigation, focus, success |
| `--color-green-hover` | `#00A866` | Primary hover/pressed state |
| `--color-green-soft` | `#E6FAF1` | Primary/action backgrounds, success badge background |
| `--color-deep-green` | `#007A4D` | Green text on light backgrounds |
| `--color-focus-yellow` | `#FFCB00` | Warnings, attention, pending review |
| `--color-alert-red` | `#FF3B30` | Error, destructive, blocked, overdue |
| `--color-ink` | `#172B4D` | Primary text, headings |
| `--color-slate` | `#44546F` | Secondary text, labels, icons |
| `--color-mist` | `#F4F5F7` | App background, table headers, subtle surfaces |
| `--color-surface` | `#FFFFFF` | Cards, panels, inputs |
| `--color-white` | `#FFFFFF` | Alias for surface where needed |
| `--color-primary` | `#00C875` | Alias for primary action |
| `--color-primary-hover` | `#00A866` | Primary hover/pressed state |

### Semantic Colors — Full Scale
| Token | Hex | Usage |
|---|---|---|
| `--color-success-50` | `#E6FCF2` | Success alert/badge background |
| `--color-success-200` | `#9AF0C9` | Success border |
| `--color-success-500` | `#00C875` | Success icon, indicator |
| `--color-success-700` | `#008F56` | Success text on light background |
| `--color-warning-50` | `#FFF7CC` | Warning alert/badge background |
| `--color-warning-200` | `#FFE680` | Warning border |
| `--color-warning-500` | `#FFCB00` | Warning icon, indicator |
| `--color-warning-700` | `#946F00` | Warning text on light background |
| `--color-error-50` | `#FFECEB` | Error alert/badge background |
| `--color-error-200` | `#FFB8B3` | Error border |
| `--color-error-500` | `#FF3B30` | Error icon, indicator, destructive button |
| `--color-error-700` | `#BF1D15` | Error text on light background |
| `--color-info-50` | `#E6FAF1` | Info alert/badge background |
| `--color-info-200` | `#9AF0C9` | Info border |
| `--color-info-500` | `#00C875` | Info icon, indicator |
| `--color-info-700` | `#007A4D` | Info text on light background |
| `--color-insight-50` | `#FFF7CC` | AI/insight badge background |
| `--color-insight-200` | `#FFE680` | AI/insight border |
| `--color-insight-500` | `#FFCB00` | AI/insight icon, indicator |
| `--color-insight-700` | `#946F00` | AI/insight text on light background |

### Text Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#172B4D` | Primary body text, headings |
| `--color-text-secondary` | `#44546F` | Secondary text, labels, captions |
| `--color-text-muted` | `#626F86` | Placeholder text, disabled states |
| `--color-text-inverse` | `#FFFFFF` | Text on dark backgrounds |

### Border Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-border` | `#DFE1E6` | Default borders, dividers |
| `--color-border-strong` | `#C1C7D0` | Emphasized borders |
| `--color-border-focus` | `#00C875` | Focus rings |

---

## Dark Mode Tokens

Activated via `.dark` class on `<html>` or `prefers-color-scheme: dark`.

Every page, component, chart, form, table, modal, drawer, and empty/loading/error state must support both light and dark themes. Use semantic tokens for backgrounds, text, borders, focus rings, status colors, and shadows; do not hardcode page-level colors that break theme switching.

Theme colors are organization-configurable. The values in this document are the project default palette only. Product UI must consume CSS variables/design tokens resolved from organization branding settings, so each organization can override brand colors, logo, and theme choices without code changes. Hardcoded brand hex values are allowed only in the centralized token/default-branding definition, tests for that definition, and documentation examples.

| Light Token | Dark Value | Notes |
|---|---|---|
| `--color-engyne-green` | `#21D789` | Primary action, success, productive on dark surfaces |
| `--color-green-soft` | `#123F2F` | Subtle green background on dark surfaces |
| `--color-deep-green` | `#7BE7B7` | Green text on dark backgrounds |
| `--color-focus-yellow` | `#FFD84D` | Warning/attention on dark surfaces |
| `--color-alert-red` | `#FF6B63` | Error/destructive on dark surfaces |
| `--color-ink` | `#E6EDF7` | Primary text inverts |
| `--color-slate` | `#A9B4C5` | Secondary text |
| `--color-mist` | `#0F1724` | App background |
| `--color-surface` | `#161E2E` | Cards, panels, inputs |
| `--color-white` | `#161E2E` | Alias for dark surface |
| `--color-primary` | `#21D789` | Primary action |
| `--color-primary-hover` | `#57E5A3` | Primary hover/pressed |
| `--color-text-primary` | `#E6EDF7` | |
| `--color-text-secondary` | `#A9B4C5` | |
| `--color-text-muted` | `#7A869A` | |
| `--color-border` | `#2B3445` | Subtle dark border |
| `--color-border-strong` | `#44546F` | |

```css
/* Implementation pattern */
:root { --color-mist: #F4F5F7; --color-surface: #FFFFFF; }
.dark { --color-mist: #0F1724; --color-surface: #161E2E; }
@media (prefers-color-scheme: dark) {
  :root:not(.light) { --color-mist: #0F1724; --color-surface: #161E2E; }
}
```

---

## Typography

### Font Families
| Role | Font | Weights |
|---|---|---|
| Interface / Body / Headings | Inter | 400, 500, 600, 700 |
| Fallbacks | SF Pro, system-ui, sans-serif | Platform defaults |
| Data / Code | ui-monospace, SFMono-Regular, Menlo, monospace | 400, 500 |

### Type Scale
| Name | Size | Weight | Font | Line Height | Usage |
|---|---|---|---|---|---|
| `heading-xl` | 32px | 700 | Inter | 1.2 | Page titles |
| `heading-lg` | 24px | 700 | Inter | 1.3 | Section headings |
| `heading-md` | 20px | 600 | Inter | 1.3 | Card headings |
| `heading-sm` | 16px | 600 | Inter | 1.4 | Sub-section headings |
| `body-lg` | 16px | 400 | Inter | 1.6 | Large body text |
| `body-base` | 14px | 400 | Inter | 1.6 | Default body text |
| `body-sm` | 12px | 400 | Inter | 1.5 | Small labels, captions |
| `label` | 12px | 600 | Inter | 1.4 | Form labels, table headers |
| `data` | 13px | 400 | ui-monospace | 1.5 | Numbers, IDs, code |

---

## Spacing (8pt Grid)

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Micro gaps, icon padding |
| `--space-2` | 8px | Tight spacing, badge padding |
| `--space-3` | 12px | Input internal padding |
| `--space-4` | 16px | Default element spacing |
| `--space-5` | 20px | Section padding |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Large section padding |
| `--space-12` | 48px | Page section spacing |
| `--space-16` | 64px | Major layout gaps |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Chips, small badges |
| `--radius-md` | 8px | Inputs, buttons |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Large cards, modals |
| `--radius-full` | 9999px | Pills, avatars |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)` | Cards |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)` | Modals |
| `--shadow-focus` | `0 0 0 3px rgba(107,124,255,0.25)` | Focus rings |
| `--shadow-focus-error` | `0 0 0 3px rgba(239,68,68,0.25)` | Error focus |

---

## Motion Tokens

| Token | Value | Usage |
|---|---|---|
| `--motion-fast` | `150ms ease-out` | Hover states, toggles |
| `--motion-base` | `220ms ease-in-out` | Standard transitions |
| `--motion-slow` | `320ms ease-in-out` | Modals, drawers |

---

## Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `--z-base` | 0 | Normal flow |
| `--z-raised` | 10 | Sticky elements within content |
| `--z-dropdown` | 100 | Dropdown menus |
| `--z-sticky` | 200 | Sticky header/nav |
| `--z-drawer` | 300 | Side drawers |
| `--z-modal` | 400 | Modals |
| `--z-toast` | 500 | Toast notifications |
| `--z-tooltip` | 600 | Tooltips |

---

## Layout Tokens

| Token | Value | Usage |
|---|---|---|
| `--layout-sidebar` | 256px | Fixed sidebar width |
| `--layout-sidebar-collapsed` | 64px | Icon-only collapsed sidebar |
| `--layout-content-max` | 960px | Max content width |
| `--layout-panel` | 320px | Detail panel / drawer width |
| `--layout-header` | 56px | Fixed header height |

---

## Component Patterns

### Input
- Height: 40px
- Border: 1px solid `--color-border`
- Border radius: `--radius-md` (8px)
- Padding: 0 12px
- Font: Inter 14px
- States:
  - Default: border `--color-border`
  - Focus: border `--color-border-focus` + `--shadow-focus`
  - Error: border `--color-error-500` + `--shadow-focus-error`
  - Disabled: 50% opacity, `cursor: not-allowed`, bg `--color-surface`
  - Read-only: bg `--color-surface`, no focus ring

### Textarea
- Same as Input, min-height: 80px, padding: 8px 12px, resize: vertical
- No resize handle on mobile

### Select / Dropdown
- Same height and border as Input
- Custom chevron icon (Lucide `ChevronDown` 16px, `--color-text-secondary`)
- Dropdown panel: bg `--color-white`, border `--color-border`, `--shadow-md`, `--radius-lg`, `--z-dropdown`
- Option height: 36px, padding: 0 12px
- Option hover: bg `--color-surface`
- Option selected: bg `--color-info-50`, text `--color-info-700`, checkmark icon right-aligned
- Max visible options: 6 (scroll beyond)

### Checkbox
- Size: 16×16px, border-radius: `--radius-sm` (4px)
- Unchecked: border 1.5px `--color-border-strong`
- Checked: bg `--color-primary`, border `--color-primary`, white checkmark icon
- Indeterminate: bg `--color-primary`, horizontal dash
- Focus: `--shadow-focus`
- Disabled: 50% opacity
- Label: Inter 14px, 8px gap from checkbox

### Radio
- Size: 16×16px, border-radius: `--radius-full`
- Unchecked: border 1.5px `--color-border-strong`
- Checked: outer border `--color-primary`, inner fill circle 8px `--color-primary`
- Focus: `--shadow-focus`

### Toggle / Switch
- Track: 36×20px, border-radius: `--radius-full`
- Off: track bg `--color-border-strong`
- On: track bg `--color-primary`
- Thumb: 16px circle, bg `--color-white`, `--shadow-xs`
- Transition: `--motion-fast`
- Size sm: 28×16px, thumb 12px

### Button — Primary
- Background: `--color-primary`
- Text: `--color-white`, Inter 600 14px
- Height: 40px, padding: 0 16px, radius: `--radius-md`
- Hover: bg `--color-primary-hover`
- Active: bg `#0055CC`
- Disabled: 40% opacity, `cursor: not-allowed`
- Loading: spinner replaces or precedes label

### Button — Secondary
- Border: 1px solid `--color-border`, bg transparent, text `--color-text-primary`
- Hover: bg `--color-surface`
- Active: bg `--color-border`

### Button — Ghost
- No border, no background, text `--color-text-primary`
- Hover: bg `--color-surface`
- Use for: tertiary actions, icon buttons in toolbars

### Button — Destructive
- Background: `--color-error-500`, text `--color-white`
- Hover: bg `--color-error-700`

### Button Sizes
| Size | Height | Padding | Font |
|---|---|---|---|
| sm | 32px | 0 12px | 12px |
| md (default) | 40px | 0 16px | 14px |
| lg | 48px | 0 20px | 16px |

### Button Group
- Buttons share a border, inner borders collapse
- Border radius only on first and last button
- Use for: toggle groups, segmented controls

### Card
- Background: `--color-white`
- Border: 1px solid `--color-border`
- Radius: `--radius-lg` (12px)
- Shadow: `--shadow-sm`
- Padding: 24px
- Variants:
  - Default: as above
  - Flat: no shadow, border only
  - Raised: `--shadow-md`
  - Interactive (clickable): hover `--shadow-md`, `cursor: pointer`, transition `--motion-fast`

### Table
- Header: bg `--color-mist`, text `--color-text-secondary`, Inter 600 12px, letter-spacing 0
- Row height: 52px
- Row hover: bg `--color-mist`
- Border: 1px solid `--color-border` between rows
- Selected row: bg `--color-info-50`
- Sticky header: `position: sticky; top: 0; z-index: --z-raised`
- Empty state: centered illustration + message, full table height

### Badge / Chip
- Radius: `--radius-full`
- Font: Inter 600 12px
- Padding: 2px 8px
- Variants (background / text):
  - Default: `--color-surface` / `--color-text-secondary`
  - Success: `--color-success-50` / `--color-success-700`
  - Warning: `--color-warning-50` / `--color-warning-700`
  - Error: `--color-error-50` / `--color-error-700`
  - Info: `--color-info-50` / `--color-info-700`
  - Insight: `--color-purple-50` / `--color-purple-700`
- With dot: 6px filled circle, same color as text, 6px left of label
- Dismissible: ×icon 12px, 4px left margin

### Avatar
- Shape: circle (`--radius-full`)
- Sizes: 24px (xs) · 32px (sm) · 40px (md) · 48px (lg) · 64px (xl)
- Image: `object-fit: cover`
- Fallback — initials: bg `--color-info-50`, text `--color-info-700`, Inter 600
- Fallback — icon: `User` icon from Lucide, `--color-text-secondary`
- Avatar group: -8px overlap, white ring 2px

### Tabs
- Tab height: 40px
- Active indicator: 2px bottom border `--color-primary`
- Active text: `--color-text-primary`, Inter 600 14px
- Inactive text: `--color-text-secondary`
- Hover: text `--color-text-primary`
- Container border-bottom: 1px solid `--color-border`
- Variant — Pill tabs: active bg `--color-primary`, text white, radius `--radius-md`, no bottom border

### Pagination
- Page button: 32×32px, radius `--radius-md`
- Active: bg `--color-primary`, text white
- Inactive: text `--color-text-secondary`, hover bg `--color-surface`
- Prev/Next arrows: Lucide `ChevronLeft` / `ChevronRight`, 20px
- Disabled arrows: 40% opacity
- Show: current page, total pages, items per page select

### Breadcrumb
- Separator: `/` or Lucide `ChevronRight` 16px, `--color-text-muted`
- Items: Inter 14px, `--color-text-secondary`
- Current page: `--color-text-primary`, not a link
- Overflow: truncate middle items with `…` when > 4 levels

### Tooltip
- Background: `#0F1724` (dark) or `--color-white` with border (light variant)
- Text: Inter 12px, `--color-text-inverse` (dark) or `--color-text-primary` (light)
- Padding: 6px 10px, radius: `--radius-sm`
- Arrow: 6px triangle
- Max width: 240px
- Delay: 300ms show, 0ms hide
- Z-index: `--z-tooltip`
- Never use for essential information — tooltip content must be supplemental only

### Toast / Notification
- Width: 360px (fixed), radius: `--radius-lg`
- Shadow: `--shadow-lg`
- Z-index: `--z-toast`
- Position: bottom-right (default), 24px from edges
- Auto-dismiss: 4s (success/info), 6s (warning), no auto-dismiss (error)
- Variants: same color system as Badge
- Structure: icon + title + optional description + optional action button
- Stack: up to 3 visible, oldest slides out

### Modal / Dialog
- Backdrop: `rgba(0,0,0,0.5)`, `--z-modal`
- Panel: bg `--color-white`, radius `--radius-xl`, `--shadow-lg`
- Sizes: sm 400px · md 560px · lg 720px · full-screen
- Header: title Inter 600 16px + optional close button (×)
- Footer: right-aligned buttons — cancel (secondary) left, confirm (primary or destructive) right
- Animation: fade + scale from 95% → 100%, `--motion-base`
- Focus trap: on open; restore focus to trigger on close
- Close: Escape key, backdrop click (unless `persistent` prop), × button

### Drawer / Sheet
- Width: `--layout-panel` (320px) · lg: 480px · full-screen
- Slides in from right (default) or left
- Same backdrop as modal
- Z-index: `--z-drawer`
- Header: title + close ×
- Footer: sticky, actions
- Animation: translate from 100% → 0, `--motion-slow`

### Sidebar Navigation
- Width: `--layout-sidebar` (256px), collapsed: `--layout-sidebar-collapsed` (64px)
- Background: `--color-surface` (light) or `#0F1724` (dark variant)
- Nav item height: 40px, padding: 0 12px, radius: `--radius-md`
- Active: bg `--color-primary`, text white, icon white
- Hover: bg `--color-border`
- Icon: Lucide 20px, 12px gap to label
- Group label: Inter 600 11px, `--color-text-muted`, 16px top margin
- Collapsed: icon only, tooltip on hover showing label
- Collapse toggle: at bottom or top of sidebar

### Stepper / Progress
- Step indicator: circle 32px, Inter 600 14px
- Complete: filled `--color-primary`, white checkmark
- Active: border 2px `--color-primary`, `--color-primary` number
- Inactive: border 1px `--color-border`, `--color-text-muted` number
- Connector: 1px line `--color-border`, filled `--color-primary` when step complete
- Label below: Inter 12px
- Vertical variant: for sidebars and complex flows

---

## Form Layout Patterns

### Label Placement
- **Top-aligned (default):** Label above input, 6px gap. Best for clarity, fast scanning.
- **Inline:** Label left, input right (min 120px label width). Use for dense settings forms only.
- Never use placeholder text as the only label — placeholder disappears on input.

### Required Fields
- Mark required fields with `*` after the label: `Email *`
- If most fields are required, mark optional fields with `(optional)` instead
- Never rely on colour alone to indicate required

### Helper Text
- Placed below the input, 4px gap, `body-sm` 12px, `--color-text-secondary`
- Error text: replaces helper text, `--color-error-700`, with error icon 14px
- Always associate with input via `aria-describedby`

### Field Grouping
- Related fields share a section heading (`heading-sm`) + 24px top margin
- Section divider: 1px `--color-border`, `--space-8` margin above and below
- Inline pairs (e.g. First / Last name): equal-width columns, 16px gap, stack to single column on mobile

### Form Layout Options
```
Single column (default — most forms):
┌─────────────────────┐
│ Label               │
│ [Input            ] │
│                     │
│ Label               │
│ [Input            ] │
└─────────────────────┘

Two column (settings / dense forms only):
┌──────────────┬──────────────┐
│ Label        │ Label        │
│ [Input     ] │ [Input     ] │
└──────────────┴──────────────┘

Form footer (always):
┌─────────────────────────────┐
│            [Cancel] [Save]  │
└─────────────────────────────┘
```

### Form Action Placement
- Inline forms (search, filters): submit button beside input
- Modal forms: buttons in modal footer, right-aligned
- Full-page forms: sticky footer bar OR end of form, right-aligned
- Destructive actions: always rightmost and red

---

## Content / Copy Guidelines

### Tone
- **Direct, not robotic.** "Invite member" not "Submit invitation request."
- **Calm, not alarming.** Errors explain what happened and what to do — not just what broke.
- **Concise.** If it takes more than 12 words, it's probably two sentences.

### Button Labels
- Use verb + noun: "Save changes", "Delete user", "Send invite"
- No "Submit" or "OK" — be specific about what happens
- Loading state: present continuous — "Saving…", "Deleting…"
- Confirmation dialogs: repeat the action — "Yes, delete user" not "Confirm"

### Error Messages
| Type | Pattern | Example |
|---|---|---|
| Validation | What's wrong + how to fix | "Email must be a valid address (e.g. name@company.com)" |
| Permission | What can't be done + why | "You don't have permission to delete members. Contact your admin." |
| Not found | What's missing + next step | "This record no longer exists. It may have been deleted." |
| Server error | Neutral + retry option | "Something went wrong on our end. Try again or contact support." |
| Network | Honest + actionable | "Can't connect. Check your internet connection and try again." |

### Empty State Copy
- **No data yet:** Explain what goes here + CTA to create first item
  - "No members yet. Invite your team to get started." + [Invite member]
- **No results (filtered):** Tell them what they searched + suggest next step
  - "No results for 'design'. Try a different search or clear filters."
- **No permission:** Don't expose that data exists — show generic empty
  - "Nothing to show here."

### Confirmation Dialogs (Destructive)
- Title: short verb phrase — "Delete project?"
- Body: consequence, not question — "This will permanently delete the project and all its data. This cannot be undone."
- Confirm button: red, mirrors the title action — "Delete project"
- Cancel: always present, leftmost

---

## Responsive Breakpoints

| Name | Min Width | Layout |
|---|---|---|
| Mobile | 0 | Single column, bottom nav; validate at 390px |
| Tablet | 768px | Two columns, condensed sidebar |
| Desktop | 1280px | Full sidebar + content |
| Desktop XL | 1440px | Wider content area |

### Mobile-Specific Patterns
- Bottom navigation bar: max 5 items, icon + label, 56px height
- Sidebar becomes bottom sheet or hamburger drawer on mobile
- Tables collapse to card list on mobile — each row becomes a card
- Touch targets: minimum 44×44px for all interactive elements
- Modals become bottom sheets on mobile, full-width with rounded top corners
- Primary workflows must remain complete at 390px: search/filter, create/edit, submit/approve, save/cancel, and destructive confirmation.
- Do not hide critical status, ownership, due date, or next action on mobile.
- Avoid horizontal scrolling except for intentionally scrollable data visualizations with visible affordance.

---

## Accessibility Requirements (WCAG 2.1 AA)

- Normal text (< 18px): contrast ratio ≥ 4.5:1
- Large text (≥ 18px or bold ≥ 14px): contrast ratio ≥ 3:1
- Focus visible on all interactive elements — never `outline: none` without a custom replacement
- Touch targets: minimum 44×44px
- Error messages associated with inputs via `aria-describedby`
- Modals: focus trap on open + restore focus to trigger on close
- Colour is never the only indicator of state — pair with icon or text
- Loading states announced via `aria-live="polite"` for screen readers
- Icon-only buttons must have `aria-label`

---

## Iconography

- Library: **Lucide React** (or Lucide for other frameworks)
- Sizes: 16px (inline, dense UI) · 20px (standard UI controls) · 24px (standalone, feature icons)
- Stroke width: 1.5px
- Colour inherits from parent text colour
- Never use icons without accessible labels on interactive elements
