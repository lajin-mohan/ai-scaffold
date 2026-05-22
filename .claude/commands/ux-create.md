# /ux-create

Create a production-grade enterprise UX solution using the centralized UX system.

## Usage

```text
/ux-create create sprint dashboard
/ux-create create AI governance audit screen
/ux-create create phase 1 timesheet approval flow
```

## Process

1. Read the relevant BRD/spec/task.
2. Use `.codex/skills/ux-system/SKILL.md`.
3. Load `DESIGN_SYSTEM.md`, `DESIGN_TOKENS.md`, `COMPONENT_RULES.md`, or `UX_PATTERNS.md` only as needed.
4. Define role, business goal, workflow, and data density.
5. Produce UX architecture, component hierarchy, interactions, states, responsiveness, mobile behavior, theme behavior, and accessibility guidance.
6. Save artifacts under `docs/ux/<phase-or-feature>/` when creating project documentation.

## Requirements

- Follow the centralized UX system strictly.
- Use Figma-inspired typography and spacing.
- Use Jira-inspired layout efficiency.
- Use Monday-inspired visual energy carefully.
- Use the green/yellow/red palette semantically; avoid overusing green across navigation, avatars, role badges, action links, and status chips on the same screen.
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
