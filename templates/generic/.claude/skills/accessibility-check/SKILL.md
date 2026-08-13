---
name: accessibility-check
description: Validate UI components and screens for WCAG 2.1 AA accessibility. Use when implementing or reviewing interfaces, forms, navigation, keyboard behavior, focus management, semantic markup, or assistive-technology support.
---

# Skill: accessibility-check

WCAG 2.1 AA compliance validation for UI components and screens. Used by `frontend-reviewer` and `ux-designer` agents, and callable directly.

---

## Standard: WCAG 2.1 Level AA

All your organization products must meet WCAG 2.1 AA as a minimum. AA is the legal baseline in most jurisdictions and covers the majority of users with disabilities.

---

## Checklist

### 1. Perceivable

#### 1.1 Text Alternatives
- [ ] All `<img>` elements have descriptive `alt` text
- [ ] Decorative images have `alt=""` (empty, not missing)
- [ ] Icon-only buttons have `aria-label` or `aria-labelledby`
- [ ] Complex images (charts, diagrams) have extended description via `aria-describedby` or visible caption

#### 1.2 Colour Contrast
- [ ] Normal text (< 18px, non-bold): contrast ratio ≥ **4.5:1**
- [ ] Large text (≥ 18px, or ≥ 14px bold): contrast ratio ≥ **3:1**
- [ ] UI components and graphical objects (icons, borders, chart lines): ≥ **3:1** against adjacent colour
- [ ] Disabled elements are exempt — but should still be reasonably legible

**Quick reference — default palette contrast:**
| Combination | Ratio | Pass? |
|---|---|---|
| `#172B4D` text on `#FFFFFF` | 12.4:1 | ✅ AA + AAA |
| `#172B4D` text on `#F4F5F7` | 11.3:1 | ✅ AA + AAA |
| `#44546F` text on `#FFFFFF` | 7.4:1 | ✅ AA + AAA |
| `#626F86` text on `#FFFFFF` | 5.0:1 | ✅ AA |
| `#172B4D` on `#00C875` | 7.4:1 | ✅ AA + AAA |
| `#FFFFFF` on `#00C875` | 2.0:1 | ❌ Use dark text on light green, or darken green |
| `#172B4D` on `#FFCB00` | 8.4:1 | ✅ AA + AAA |
| `#FFFFFF` on `#FF3B30` | 3.6:1 | ✅ AA (large text only); use dark text for small text |

#### 1.3 Colour Not Sole Indicator
- [ ] Errors indicated by colour AND icon AND text (not colour alone)
- [ ] Required fields marked by `*` label (not colour alone)
- [ ] Status badges use colour AND text label
- [ ] Links distinguishable from body text by underline or icon (not colour alone in body copy)

#### 1.4 Reflow
- [ ] Content reflows at 320px viewport width without horizontal scroll
- [ ] No content or functionality lost at any viewport width

---

### 2. Operable

#### 2.1 Keyboard Navigation
- [ ] All interactive elements reachable by `Tab` key
- [ ] Tab order follows visual reading order (left-to-right, top-to-bottom)
- [ ] No keyboard traps — focus can always move away from any component
- [ ] Modals and drawers trap focus internally while open
- [ ] `Escape` closes modals, drawers, dropdowns, tooltips
- [ ] Custom dropdowns/selects operable with `Arrow Up/Down`, `Enter` to select, `Escape` to close
- [ ] Data tables: column headers sortable by keyboard; row selection by `Space`

#### 2.2 Focus Visible
- [ ] All focusable elements have a visible focus indicator
- [ ] `outline: none` is NEVER used without a custom visible replacement
- [ ] Focus ring uses `--shadow-focus`: `0 0 0 3px rgba(107,124,255,0.25)`
- [ ] Focus ring contrast: 3:1 against adjacent colours

#### 2.3 Skip Navigation
- [ ] "Skip to main content" link as first focusable element on page
- [ ] Landmark regions use correct HTML semantics (`<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`)

#### 2.4 No Seizure Risk
- [ ] No content flashes more than 3 times per second
- [ ] Animations respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 3. Understandable

#### 3.1 Language
- [ ] `<html lang="en">` (or appropriate language code) set on every page
- [ ] Language changes within content use `lang` attribute on the element

#### 3.2 Forms
- [ ] All form inputs have a visible `<label>` (not just placeholder)
- [ ] Labels are programmatically associated: `<label for="id">` or `aria-label`
- [ ] Required fields marked: `aria-required="true"` and visible asterisk
- [ ] Error messages:
  - [ ] Displayed on the page (not just colour change)
  - [ ] Associated with the field via `aria-describedby`
  - [ ] Explain what is wrong and how to fix it
- [ ] Success confirmation confirmed to the user (not silent)
- [ ] Auto-complete enabled for personal data fields (`autocomplete` attribute)

#### 3.3 Consistent Navigation
- [ ] Navigation in the same location across all pages
- [ ] Components with the same function have the same label everywhere

---

### 4. Robust

#### 4.1 Valid HTML
- [ ] No duplicate `id` attributes
- [ ] Buttons use `<button>` (not `<div onclick>`)
- [ ] Links use `<a href>` (not `<span onclick>`)
- [ ] Interactive `<div>` or `<span>` elements have `role`, `tabindex`, and keyboard handlers

#### 4.2 ARIA Usage
- [ ] `aria-expanded` on accordion triggers, dropdowns, nav toggles
- [ ] `aria-selected` on tabs, listbox options
- [ ] `aria-checked` on checkboxes and radio buttons if custom-styled
- [ ] `aria-live="polite"` on regions that update dynamically (notifications, search results, counters)
- [ ] `aria-busy="true"` during loading, removed when complete
- [ ] `role="dialog"` and `aria-modal="true"` on modals; `aria-labelledby` pointing to dialog title
- [ ] No redundant ARIA (`<button role="button">` adds nothing)

#### 4.3 Status Messages
- [ ] Toast notifications announced via `aria-live="polite"` (success/info) or `aria-live="assertive"` (errors)
- [ ] Form submission results (success or error) announced to screen readers
- [ ] Loading indicators paired with `aria-live` region or `aria-busy`

---

## Severity Levels

| Severity | Meaning |
|---|---|
| `BLOCKER` | WCAG AA violation — must fix before release |
| `HIGH` | Significant barrier for users with disabilities |
| `MEDIUM` | Partial compliance or best-practice gap |
| `LOW` | Enhancement that improves experience beyond AA |

---

## Output Format

```
## Accessibility Check — {{COMPONENT or SCREEN}}
**Standard:** WCAG 2.1 AA
**Date:** {{DATE}}

### Result: PASS / FAIL / PASS WITH WARNINGS

### Violations (BLOCKER — must fix)
- **[Criterion]:** {{What is wrong, where it is, how to fix it.}}

### Issues (HIGH)
- **[Criterion]:** {{Issue and fix.}}

### Warnings (MEDIUM / LOW)
- **[Criterion]:** {{Recommendation.}}

### Passed Checks
- ✅ Colour contrast meets 4.5:1 for all body text
- ✅ All form inputs have visible labels
- ✅ Focus states visible
- (list all passing checks for evidence)
```
