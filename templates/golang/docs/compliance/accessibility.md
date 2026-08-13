# Accessibility Compliance — WCAG 2.1 AA

This document defines accessibility requirements for all user-facing interfaces in this project.

## When This Applies

Apply these requirements when:
- Project serves government or public sector users
- Project is subject to Section 508 (US) or EN 301 549 (EU)
- Client contractually requires WCAG 2.1 AA conformance
- Project handles accessibility as a product requirement

## Target Level

**WCAG 2.1 Level AA** — minimum standard for enterprise clients.
**Level AAA** may be required for specific regulations (e.g., European EAA 2025).

## Core Requirements

### Perceivable

- [ ] All non-text content has a text alternative (`alt` text, `aria-label`)
- [ ] Captions provided for pre-recorded audio content
- [ ] Content can be presented in different ways without losing meaning
- [ ] Contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (18pt+ or 14pt bold)
- [ ] Text can be resized up to 200% without loss of functionality

### Operable

- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Skip navigation link as the first focusable element
- [ ] Focus indicator is visible on all interactive elements
- [ ] Timing is adjustable or can be turned off
- [ ] No content flashes more than 3 times per second

### Understandable

- [ ] Page language is declared (`<html lang="en">`)
- [ ] Navigation is consistent across pages
- [ ] Form errors are identified and described with suggestions
- [ ] Labels and instructions are provided for all inputs

### Robust

- [ ] Valid HTML (no missing closing tags, correct nesting)
- [ ] Status messages are announced via ARIA live regions (`aria-live`, `role="status"`)
- [ ] Interactive elements use semantic HTML (`<button>`, not `<div onclick>`)

## Automated Testing

Automated tools catch approximately 30% of accessibility issues. They must pass on every frontend PR.

### axe-core (recommended)

```bash
# Install axe-core CLI
npm install --save-dev @axe-core/cli

# Run against running dev server — 0 violations required for merge
axe http://localhost:5173 --exit

# Run with reporter
axe http://localhost:5173 --exit --stdout
```

### Lighthouse CI

```bash
# Run with accessibility category only
npx lighthouse http://localhost:5173 \
  --only-categories=accessibility \
  --output=json \
  --output-path=./lighthouse-a11y.json
```

### Adding to CI

Add to `.github/workflows/ci.yml` as a separate job (requires frontend to be running):

```yaml
accessibility:
  name: Accessibility (axe-core)
  needs: [build]
  if: success()
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
    - run: npm ci
    - run: npm run build
    - name: Start server
      run: npm run start &
    - name: Wait for server
      run: sleep 5
    - name: Run axe-core
      run: npx axe http://localhost:3000 --exit
```

## Manual Testing

Automated tests are insufficient alone. Manual testing required for every major release:

| Test | Tool | Frequency |
|---|---|---|
| Screen reader (NVDA + Firefox) | Free, Windows | Every major release |
| Screen reader (VoiceOver + Safari) | Built-in, macOS | Every major release |
| Keyboard-only navigation | Manual | Every PR that touches UI |
| Zoom to 200% | Browser built-in | Every major release |
| Colour contrast (specific values) | Colour Contrast Analyser | Every PR with new colours |

### Keyboard Navigation Checklist

1. Tab through all interactive elements — natural order, no traps
2. Enter/Space activates buttons and links
3. Escape closes modals and dropdowns
4. Arrow keys navigate within radio groups and menus
5. Skip link appears as first focusable element

## Design System Enforcement

All components must use design tokens from the design system. Hardcoded colours are a
WCAG violation and a coding standards violation. See `.claude/skills/design-system/SKILL.md`.

## Files to Update When Requirements Apply

| File | Action |
|---|---|
| `.github/workflows/ci.yml` | Add axe-core accessibility scan job |
| `apps/web/package.json` | Add `@axe-core/cli` devDependency |
| `CONTRIBUTING.md` | Add accessibility testing to pre-PR checklist |
| `.claude/rules/testing-rules.md` | Document mandatory a11y tests |

## Reference

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [OWASP Web Accessibility Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_clobbering_Cheat_Sheet.html) *(note: link to general a11y guidance)*
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
