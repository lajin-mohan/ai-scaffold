---
name: ux-system
description: Use when creating or improving enterprise UX for project screens, dashboards, forms, tables, analytics, or frontend implementation guidance. Applies the centralized UX system inspired by Jira information architecture, Figma typography and spacing, and Monday.com color energy.
---

# UX System — Techversant Projects

This skill is the source of truth for:
- UX reasoning and information architecture
- design system application
- layout and dashboard composition
- component governance
- accessibility and responsive behavior
- desktop-first layout with polished tablet/mobile adaptations
- light/dark theme behavior
- enterprise workflow usability
- AI-native UX patterns

## Product Context

Techversant projects combine:
- project management
- sprint workflows
- time tracking and productivity analytics
- AI governance
- delivery intelligence
- operational dashboards

## Visual Inspiration

Blend these references deliberately:
- Jira: information architecture, workflow efficiency, predictable navigation
- Figma: typography, spacing discipline, polished interaction details
- Monday.com: controlled visual energy, vibrant status color, friendly operational tone

## Philosophy

The product must feel premium, modern, enterprise-ready, AI-native, and operationally efficient. It should support high information density without clutter.

Prefer:
- clear hierarchy
- dense but readable layouts
- calm surfaces with meaningful color
- fast scanning and filtering
- drill-down from summary to detail
- desktop workflows as the primary design target, with tablet/mobile layouts that preserve the full workflow
- pages that can switch cleanly between light and dark themes
- strong loading, empty, error, disabled, and permission-denied states

Avoid:
- generic SaaS UI
- Bootstrap-like styling
- random gradients
- excessive glassmorphism
- decorative animation
- cluttered dashboards
- one-off components that bypass the system

## Required References

Load these only when needed:
- `DESIGN_SYSTEM.md` for brand philosophy, page architecture, dashboard rules, and AI-native UX rules.
- `DESIGN_TOKENS.md` for color, typography, spacing, radius, shadow, and dark theme tokens.
- `COMPONENT_RULES.md` for buttons, forms, tables, boards, modals, badges, navigation, and state rules.
- `UX_PATTERNS.md` for dashboard, page, workflow, analytics, and AI-governance patterns.

## Workflow

Before generating UI:
1. Understand the business goal.
2. Identify the primary user role and secondary roles.
3. Identify the workflow complexity and decision points.
4. Define the UX architecture and navigation model.
5. Define the layout strategy.
6. Apply the design tokens and component rules.
7. Generate the component hierarchy.
8. Define interactions and state behavior.
9. Add accessibility, responsive, and theme behavior notes.
10. Produce developer handoff guidance.

## Output Format

Always provide:
- UX reasoning
- layout architecture
- component hierarchy
- spacing decisions
- typography guidance
- interaction guidance
- state coverage
- accessibility notes
- responsive behavior
- tablet/mobile adaptation behavior, including a 390px mobile check
- light/dark theme behavior
- implementation guidance

For feature work, write artifacts under:

```text
docs/ux/<phase-or-feature>/
├── wireframes.md
├── component-spec.md
└── figma-link.md
```

## Non-Negotiables

- Use Inter for product UI.
- Use the 8px spacing system.
- Support light and dark themes.
- Every page must include light and dark theme states with no hardcoded colors outside centralized tokens/default branding.
- Theme colors must come from organization branding settings when configured, falling back to the Techversant default token palette.
- UI pages/components must never hardcode organization brand colors; they consume semantic tokens/CSS variables only.
- Every page is designed for desktop first and must adapt cleanly to tablet and mobile screens, including a 390px mobile check, without losing primary workflows.
- Design for keyboard and screen-reader access.
- Use semantic color, not decoration.
- Dashboards must support filtering, scanning, and drill-down.
- Frontend work must pass `/ux-review` before DONE.
