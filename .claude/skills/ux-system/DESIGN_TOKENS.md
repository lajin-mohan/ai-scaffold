# Design Tokens

## Fonts

| Role | Font |
|---|---|
| Product UI | Inter |
| Fallbacks | SF Pro, system-ui, sans-serif |
| Data/code/system states | JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace |

## Core Palette

These are Engyne default fallback tokens. Runtime UI must resolve theme values from organization branding settings when available, then fall back to these defaults. Do not hardcode these hex values in pages, components, charts, or feature code.

| Token | Hex | Usage |
|---|---|---|
| Engyne Green | `#00C875` | Primary actions, focused states, selected states, success |
| Green Hover | `#00A866` | Primary hover and pressed states |
| Green Soft | `#E6FAF1` | Subtle active states, success backgrounds |
| Deep Green | `#007A4D` | Green text on light backgrounds |
| Focus Yellow | `#FFCB00` | Warnings, pending review, attention |
| Alert Red | `#FF3B30` | Error, blocked, destructive, overdue |
| Ink | `#172B4D` | Primary text |
| Slate | `#44546F` | Secondary text |
| Mist | `#F4F5F7` | App background |
| Surface | `#FFFFFF` | Panels, cards, inputs |

## Accent Rules

Use the green/yellow/red system first:
- Green for brand, primary action, productive, approved, completed, healthy.
- Yellow for attention, pending review, AI insight, caution, focus.
- Red for blocked, overdue, destructive, error, critical risk.

Green is not a default decoration color. Avoid using green simultaneously for navigation, avatars, role badges, action links, status chips, and page highlights on the same screen. If a screen already has a green active/status indicator, prefer neutral role badges, neutral avatars, and slate/ink secondary actions.

Role badges are neutral by default unless the role itself communicates risk or approval state. Status badges use semantic colors: green for active/approved, yellow for pending/review, red for inactive/blocked/error.

Avoid common blue SaaS accents as the dominant visual language. Blue may appear only when a third-party integration or external brand requires it.

## Dark Theme

| Token | Dark Value |
|---|---|
| Engyne Green | `#21D789` |
| Green Soft | `#123F2F` |
| Deep Green | `#7BE7B7` |
| Focus Yellow | `#FFD84D` |
| Alert Red | `#FF6B63` |
| Ink | `#E6EDF7` |
| Slate | `#A9B4C5` |
| Mist | `#0F1724` |
| Surface | `#161E2E` |
| Border | `#2B3445` |

## Typography Scale

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| heading-xl | 32px | 700 | Page title |
| heading-lg | 24px | 700 | Section title |
| heading-md | 20px | 600 | Panel/card title |
| heading-sm | 16px | 600 | Subsection |
| body | 14px | 400 | Default UI |
| label | 12px | 600 | Labels, table headers |
| caption | 12px | 400 | Help text, metadata |
| data | 13px | 400 | IDs, numbers, compact metrics |

Do not scale font size with viewport width. Keep letter spacing at `0`.

## Spacing

Use an 8px system:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Rules:
- 8px: tight internal gaps
- 12px: input padding, compact row gaps
- 16px: default component gap
- 24px: panel padding
- 32px+: section separation

## Radius

| Token | Value | Usage |
|---|---:|---|
| sm | 4px | badges, chips |
| md | 8px | inputs, buttons |
| lg | 12px | panels, cards |
| xl | 16px | modals |
| full | 9999px | avatars, pills |

Prefer 8px or less for operational controls. Avoid overly rounded enterprise UI.
