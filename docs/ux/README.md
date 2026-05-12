# UX / Design System

The default design system for all projects is **Techversant Precision Minimal**, defined in `.claude/skills/design-system.md`. This file is the single source of truth for color tokens, typography, spacing, components, motion, z-index, and layout — referenced by all frontend stack overlays.

Wireframes, user flows, component specs, and Figma links live here when a project needs them.

## Design System Layers

```
1. Scaffold baseline (default for all projects)
   .claude/skills/design-system.md

2. Project-level override (optional — created when brand diverges)
   apps/web/src/design-system/
   ├── tokens.css          ← overrides scaffold tokens only
   ├── components/         ← project-specific component library (optional)
   └── figma-link.md       ← link to project Figma library (optional)
```

**Rule:** Use the scaffold design system by default. Override only at the project level and only when the product brand genuinely diverges. Do not create ad-hoc styles to fill gaps — if a token is missing from the design system, add it to the design system.

## Structure

```
ux/
├── README.md              ← this file
├── {{feature-name}}/
│   ├── wireframes.md       ← Text-based wireframes from ux-designer agent
│   ├── component-spec.md   ← Component states and interactions
│   └── figma-link.md       ← Link to Figma frames
```

## Process

1. UX design phase begins after architecture is approved
2. Run `/ux-design "feature brief"` or use `@ux-designer` agent
3. Get stakeholder approval on wireframes before frontend implementation
4. Link Figma frames here for developer reference
