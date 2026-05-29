# /ux-review

Review a UI implementation or UX artifact against the centralized UX system.

## Usage

```text
/ux-review review dashboard.tsx
/ux-review review docs/ux/phase-1/timesheets/wireframes.md
/ux-review review apps/web/src/pages/DashboardPage.tsx
```

## Process

1. Read the target implementation/artifact.
2. Use `.claude/skills/ux-review/SKILL.md`.
3. Reference `.claude/skills/ux-system/` for design-system rules.
4. Validate enterprise UX quality, accessibility, responsiveness, mobile behavior, theme behavior, density, hierarchy, and component consistency.
5. For frontend implementation, require browser verification evidence before DONE.

## Validate

- design consistency
- spacing system
- typography hierarchy
- accessibility
- responsiveness
- mobile behavior at 390px
- dashboard usability
- enterprise UX quality
- state coverage
- interaction clarity
- dark/light theme support
- token-based colors for theme switching
- organization branding override compatibility
- semantic color tokens (action-primary / success / warning / danger) without overusing action-primary as decoration
- top navigation icon + label clarity, restrained active underline, and neutral inactive states
- shell theme toggle accessibility and state preservation

## Browser Verification Requirement

For frontend pages, review evidence must include:
- desktop light theme
- desktop dark theme
- mobile light theme at approximately 390px width
- mobile dark theme at approximately 390px width

Any page that cannot switch between light and dark themes, or fails primary workflows on mobile, must not be marked DONE.
Any page/component that hardcodes brand colors instead of using organization-overridable tokens must not be marked DONE.
Any page that uses green for most navigation, badges, avatars, and actions at once must be revised to restore neutral hierarchy.
Any app-shell change that hides labels, removes accessible names, or resets page state during theme switching must be revised.

## Output

- verdict
- issues found
- severity
- corrected recommendation
- implementation guidance
