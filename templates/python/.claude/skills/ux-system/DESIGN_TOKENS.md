# Design Tokens — Semantic Token System

The 3-layer token model: **Base/Brand → Semantic → Component**.

Screens, specs, agents, and rules consume **semantic tokens only** — never brand names or hardcoded hex values.

---

## Token Layers

### Layer 1 — Brand / Base Tokens

Used only in the centralized default-theme definition. Teams can override their brand palette here without touching semantic tokens or component rules.

```
--brand-primary:        #00C875   ← primary action color
--brand-primary-hover:  #00A866   ← hover/pressed state
--brand-primary-soft:  #E6FAF1   ← subtle active backgrounds
--brand-accent:         #FFCB00   ← attention, pending, AI insight
--brand-danger:         #FF3B30   ← error, blocked, destructive
```

### Layer 2 — Semantic Tokens (use these)

Used by all screens, specs, agents, UX rules, and handoff documents. Never use brand names or hex literals in this layer.

| Semantic Token | Default | Usage |
|---|---|---|
| `--color-action-primary` | `#00C875` | Primary action, links, focus/selection |
| `--color-action-primary-hover` | `#00A866` | Primary hover/pressed |
| `--color-action-primary-soft` | `#E6FAF1` | Subtle active backgrounds |
| `--color-success` | `#00C875` | Active/approved status |
| `--color-warning` | `#FFCB00` | Pending/review/attention |
| `--color-danger` | `#FF3B30` | Error/blocked/destructive |
| `--color-bg-app` | `#F4F5F7` | App background (light) |
| `--color-bg-surface` | `#FFFFFF` | Cards, panels, inputs |
| `--color-bg-muted` | `#F4F5F7` | Table headers, subtle areas |
| `--color-text-primary` | `#172B4D` | Headings, primary body text |
| `--color-text-secondary` | `#44546F` | Labels, captions, muted text |
| `--color-text-muted` | `#626F86` | Placeholder, disabled |
| `--color-border` | `#DFE1E6` | Borders, dividers |
| `--color-border-strong` | `#C1C7D0` | Emphasized borders |
| `--color-border-focus` | `#00C875` | Focus ring color |

### Layer 3 — Component Tokens (optional)

Used when a component needs stable internal behavior independent of semantic token overrides.

| Token | Default | Usage |
|---|---|---|
| `--button-primary-bg` | `--color-action-primary` | Primary button background |
| `--button-primary-hover-bg` | `--color-action-primary-hover` | Button hover |
| `--input-border` | `--color-border` | Input default border |
| `--input-focus-border` | `--color-border-focus` | Input focus |
| `--badge-success-bg` | `#E6FCF2` | Success badge background |
| `--badge-success-text` | `#008F56` | Success badge text |

---

## Light Theme (default)

All semantic tokens map to their default values above.

---

## Dark Theme

Every semantic token has a dark-theme counterpart. Semantic token names stay the same — values change via CSS variable override.

| Token | Light | Dark |
|---|---|---|
| `--color-action-primary` | `#00C875` | `#21D789` |
| `--color-action-primary-hover` | `#00A866` | `#57E5A3` |
| `--color-action-primary-soft` | `#E6FAF1` | `#123F2F` |
| `--color-success` | `#00C875` | `#21D789` |
| `--color-warning` | `#FFCB00` | `#FFD84D` |
| `--color-danger` | `#FF3B30` | `#FF6B63` |
| `--color-bg-app` | `#F4F5F7` | `#0F1724` |
| `--color-bg-surface` | `#FFFFFF` | `#161E2E` |
| `--color-bg-muted` | `#F4F5F7` | `#0F1724` |
| `--color-text-primary` | `#172B4D` | `#E6EDF7` |
| `--color-text-secondary` | `#44546F` | `#A9B4C5` |
| `--color-text-muted` | `#626F86` | `#7A869A` |
| `--color-border` | `#DFE1E6` | `#2B3445` |
| `--color-border-strong` | `#C1C7D0` | `#44546F` |
| `--color-border-focus` | `#00C875` | `#21D789` |

Implementation:
```css
:root { /* light defaults */ }
.dark { --color-action-primary: #21D789; --color-bg-app: #0F1724; /* etc */ }
@media (prefers-color-scheme: dark) {
  :root:not(.light) { /* same dark overrides */ }
}
```

---

## Status Color Scale (for badges, alerts)

| Token | 50 bg | 200 border | 500 icon | 700 text |
|---|---|---|---|---|
| `--color-success-50` | `#E6FCF2` | `#9AF0C9` | `#00C875` | `#008F56` |
| `--color-warning-50` | `#FFF7CC` | `#FFE680` | `#FFCB00` | `#946F00` |
| `--color-danger-50` | `#FFECEB` | `#FFB8B3` | `#FF3B30` | `#BF1D15` |

---

## Typography

| Token | Font | Weights |
|---|---|---|
| Inter | SF Pro, system-ui, sans-serif | 400, 500, 600, 700 |
| JetBrains Mono | ui-monospace, SFMono | 400, 500 |

| Name | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `heading-xl` | 32px | 700 | 1.2 | Page titles |
| `heading-lg` | 24px | 700 | 1.3 | Section headings |
| `heading-md` | 20px | 600 | 1.3 | Card headings |
| `heading-sm` | 16px | 600 | 1.4 | Sub-section headings |
| `body` | 14px | 400 | 1.6 | Default body |
| `label` | 12px | 600 | 1.4 | Form labels, table headers |
| `caption` | 12px | 400 | 1.5 | Help text, metadata |
| `data` | 13px | 400 | 1.5 | IDs, numbers, compact metrics |

Do not scale font size with viewport width. Keep letter spacing at `0`.

---

## Spacing (8pt Grid)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

- 8px: tight internal gaps
- 12px: input padding, compact row gaps
- 16px: default component gap
- 24px: panel padding
- 32px+: section separation

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | badges, chips |
| `md` | 8px | inputs, buttons |
| `lg` | 12px | panels, cards |
| `xl` | 16px | modals |
| `full` | 9999px | avatars, pills |

---

## Rules for Using Tokens

1. **Never use hardcoded hex values in screens, specs, or UX docs.** Use semantic token names.
2. **Never use brand names** (Techversant Green, Deep Green, etc.) in any UX artifact or rule.
3. **Status badges use semantic scale** (success/warning/danger), not raw colors.
4. **Role badges are neutral by default** — semantic color only when status is the message.
5. **All colors resolve from CSS variables** — theme switching and brand overrides work without code changes.
6. **Default values are scaffold defaults** — teams can override brand tokens in their own theme file without touching semantic token references.