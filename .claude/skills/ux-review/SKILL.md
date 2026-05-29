---
name: ux-review
description: Use when reviewing UI implementation, generated UX artifacts, dashboards, forms, tables, or screens against the centralized Techversant UX system. Validates enterprise UX quality, accessibility, density, hierarchy, responsiveness, and design-system compliance.
---

# UX Review Skill

Review UI and UX artifacts against the centralized UX system.

Use this for:
- generated screen designs
- frontend implementation review
- dashboard review
- accessibility/design-system validation
- pre-DONE frontend quality gates

## Required Checks

Validate:
- typography consistency
- spacing consistency
- accessibility
- information density
- dashboard usability
- responsiveness
- mobile usability at 390px and tablet breakpoints
- light/dark theme support on every page
- visual hierarchy
- component consistency
- interaction consistency
- state coverage
- enterprise workflow quality
- AI-native UX clarity where applicable

Identify:
- clutter
- weak hierarchy
- inconsistent spacing
- poor UX decisions
- accessibility issues
- mobile layout failures
- missing or broken dark/light theme states
- hardcoded colors that prevent theme switching
- hardcoded brand colors that prevent organization branding overrides
- overuse of green or any accent color where neutral hierarchy would be clearer
- missing states
- generic SaaS patterns
- enterprise workflow friction
- AI-generated UI mistakes

## Severity

| Severity | Meaning |
|---|---|
| BLOCK | Must fix before DONE; user cannot complete work, accessibility fails, or design-system violation is severe |
| HIGH | Serious UX risk; likely confusion, slow workflow, or inconsistent enterprise behavior |
| MEDIUM | Pattern, spacing, hierarchy, state, or consistency issue |
| LOW | Polish issue |
| NIT | Optional refinement |

## Output Format

```text
## UX Review — <screen or feature>

### Verdict
PASS / PASS WITH FIXES / BLOCKED

### Summary
<short summary>

### Findings
| Severity | Area | Issue | Recommendation |
|---|---|---|---|

### Corrected Approach
<layout/component/state guidance>

### Implementation Notes
<specific developer guidance>
```

## Dark Mode & Theming Architecture

The project uses **CSS Variables + Tailwind arbitrary value syntax** for theming. This is the PREFERRED pattern:

### Correct Pattern (CSS Variables)
```tsx
// Components should use CSS variable syntax for theming
className="bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]"
```

### Deprecated Pattern (Tailwind dark: variants)
```tsx
// OLD pattern — being phased out
className="bg-surface dark:bg-surface-dark text-ink dark:text-ink-light"
```

### Why This Matters
- CSS variables automatically switch when `.dark` class is added to `<html>`
- No need to add `dark:` variants to every component
- Supports organization branding overrides (single-source change)
- Reduces maintenance burden significantly

### Review Check for Dark Mode
When reviewing a component, check if:
1. **CSS variable pattern is used** — `bg-[var(--color-surface)]` ✓ GOOD
2. **Tailwind dark: variant is used** — `dark:bg-surface-dark` ⚠️ DEPRECATED
3. **No dark mode support** — missing both patterns ✗ BAD

### Severity for Dark Mode Issues
| Pattern Found | Severity |
|---|---|
| New components using `dark:` variants | MEDIUM (technical debt) |
| Components without any dark mode support | HIGH |
| Hardcoded colors that bypass CSS variables (e.g., `#ffffff` inline) | MEDIUM or HIGH |
| Missing dark mode that breaks page readability | BLOCK |

### Token Reference
Available CSS variables (defined in `apps/web/src/index.css`):
- `--color-surface` — cards, modals, inputs, header
- `--color-surface-muted` — subtle nested areas, table headers, filter bars
- `--color-text-primary` — headings, body text
- `--color-text-secondary` — labels, captions, muted text
- `--color-border` — borders
- `--color-primary` / `--color-success` / `--color-warning` / `--color-danger` — semantic colors

## Review Rules

- Treat missing loading, empty, error, disabled, permission-denied, and mobile states as at least MEDIUM.
- Treat missing light/dark theme support on a page as at least HIGH.
- Treat a broken primary mobile workflow at 390px as BLOCK.
- Treat horizontal overflow, clipped controls, or hidden primary actions on mobile as HIGH or BLOCK depending on impact.
- Treat inaccessible controls, unreadable contrast, and keyboard traps as BLOCK.
- Treat dashboard clutter or unclear metric hierarchy as HIGH.
- Treat hardcoded colors/spacing that bypass tokens as MEDIUM or HIGH depending on spread.
- Treat hardcoded brand/theme colors outside centralized token/default-branding definitions as HIGH, or BLOCK if they break organization branding overrides.
- Treat green overuse across navigation, avatars, role badges, action links, and status chips as MEDIUM, or HIGH when it weakens hierarchy on an operational page.
- Treat components using Tailwind `dark:` variants as MEDIUM technical debt (prefer CSS variable pattern).
- Require browser verification for frontend/full-stack tasks.
- Browser verification for UI tasks must include at least one desktop viewport and one mobile viewport, and must check both light and dark themes when the page is theme-aware.
