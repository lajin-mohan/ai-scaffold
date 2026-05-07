# UX Documentation

Wireframes, user flows, component specifications, and Figma links.

## Structure

```
ux/
├── README.md
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

## Design System Reference

`.claude/skills/design-system.md` — color tokens, typography, spacing, components
