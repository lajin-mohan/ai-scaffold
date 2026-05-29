# /ux-create

Create a production-grade enterprise UX solution using the centralized UX system.

## When to use /ux-create vs staged workflow

**Quick fixes and spikes** → `/ux-create` directly. Use when:
- Single screen or component improvement (color, spacing, layout change)
- Exploring a UX concept before committing to a full feature
- Ad-hoc UI feedback or design iteration

**New feature with full UX design** → Use the staged workflow:
```
BRD approved → /ux-analyze → /ux-flow → /ux-screen-spec (one screen at a time)
→ /ux-figma-spec → human designer reviews → /ux-review → /ux-handoff → Stage 5
```
This path produces requirements, flows, screen specs, design tokens, and a developer-ready handoff in sequence — each stage gates the next. See `.claude/rules/ux-rules.md` for all hard gates.

## Usage

```text
/ux-create create sprint dashboard
/ux-create create AI governance audit screen
/ux-create create phase 1 timesheet approval flow
```

## Process

1. Read the relevant BRD/spec/task.
2. Use `.claude/skills/ux-system/SKILL.md`.
3. Load `DESIGN_SYSTEM.md`, `DESIGN_TOKENS.md`, `COMPONENT_RULES.md`, or `UX_PATTERNS.md` only as needed.
4. Define role, business goal, workflow, and data density.
5. Produce UX architecture, component hierarchy, interactions, states, responsiveness, mobile behavior, theme behavior, and accessibility guidance.
6. Save artifacts under `docs/ux/<phase-or-feature>/` when creating project documentation.

## Requirements

- Follow the centralized UX system strictly.
- Use Figma-inspired typography and spacing.
- Use Jira-inspired layout efficiency.
- Use Monday-inspired visual energy carefully.
- Use semantic tokens (action-primary / success / warning / danger) for meaning. Do not use brand colors directly; all colors come from CSS variables. Avoid overusing action-primary across navigation, avatars, role badges, action links, and status chips on the same screen.
- Maintain enterprise readability and operational clarity.
- Support responsive layouts and accessibility.
- Include dark/light theme considerations.
- Design the primary workflow for desktop first.
- Include tablet and mobile adaptation behavior, including a 390px mobile check.
- Include light and dark theme behavior for every page/screen.
- Use organization-overridable tokens for all colors so pages can switch themes and apply branding overrides without visual regressions.
- Treat documented hex values as default fallback tokens only; do not place brand hex values directly in screen/component guidance.

## Output

1. UX reasoning
2. Layout architecture
3. Component hierarchy
4. Dashboard/widget structure where relevant
5. Interaction design
6. State coverage
7. Responsive behavior
8. Tablet/mobile adaptation behavior, including 390px mobile validation
9. Light/dark theme behavior
10. Accessibility guidance
11. Implementation guidance
12. Suggested docs/ux artifact paths
