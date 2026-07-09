# Component Rules

## Buttons

- Primary: one per screen or form section.
- Secondary: neutral outline or subtle surface.
- Destructive: red and separated from primary flow.
- Icon buttons must have accessible labels and tooltips.
- Use loading and disabled states for async actions.

## Forms

- Labels are always visible.
- Help text appears below the field.
- Field errors are inline and specific.
- Group complex forms into logical sections.
- Use drawers/full pages for complex create/edit flows.
- Preserve unsaved-change warnings for long forms.

## Tables

- Header row uses label typography.
- Rows should support hover, selected, loading, empty, and error states.
- Numeric columns align right.
- Status and role values use badges.
- Bulk actions appear only after row selection.
- Filters should be persistent and visible for operational workflows.
- On mobile, tables must convert to cards, stacked rows, or a purpose-built compact view; do not require horizontal scrolling for primary workflows.

## Boards

- Columns show count and WIP/risk indicators where relevant.
- Cards show only decision-critical data.
- Drag-and-drop must support keyboard alternatives or explicit status controls.
- Invalid moves must explain why.
- Optimistic updates need rollback feedback.

## Dashboards

- Metric cards must include label, value, trend, and interpretation when useful.
- Charts need clear axes, labels, empty states, and drill-down path.
- Avoid chart-only dashboards; include action tables for follow-up.
- Filters must support project, team, department, sprint, and date range where relevant.

## Navigation

- Top navigation is the primary app navigation for the current Techversant MVP shell.
- Top navigation should use icon + label items where an established icon exists. Keep icons neutral and 20px unless the active state requires stronger hierarchy.
- Tabs are for peer views inside one page.
- Breadcrumbs appear at depth greater than one.
- Active state must be visually clear and screen-reader accessible.
- Mobile navigation must expose the same primary destinations through a drawer, bottom bar, or compact menu.
- Active top navigation should prefer a clean underline and stronger text color. Avoid stacking a pill background, underline, and strong accent color together.
- Keep inactive navigation neutral. Use green/primary sparingly so the page content does not compete with the app shell.
- Shell-level controls such as theme switching should be icon buttons with accessible labels and must not reset the active route, filters, forms, or selections.

## Theme Support

- All components must work in light and dark themes.
- Use design tokens, CSS variables, or semantic Tailwind classes only; avoid hardcoded page colors.
- Theme tokens must be resolved from organization branding settings when available, with the Techversant default palette only as fallback.
- Components must not hardcode organization brand colors, logo colors, chart colors, or focus colors.
- Icons, borders, focus rings, shadows, chart colors, badges, and empty states must remain readable in both themes.
- Theme switching must not reset page state, filters, form input, or active selection.
- Components with brand or status color must define text/background/border combinations for both themes.

## Responsive Behavior

- Design the primary workflow for desktop first, then review tablet and mobile adaptations including approximately 390px mobile width.
- Mobile layouts must preserve primary actions, filters, status, and approval decisions.
- Touch targets must be at least 44px on mobile.
- Avoid clipped labels, overlapping controls, hidden primary actions, and content that depends on hover.
- Dense dashboards should reduce secondary metrics before hiding primary workflow controls.

## Modals and Drawers

- Modal: confirmation or short focused form.
- Drawer: details, audit trail, approval context, side-by-side review.
- Full page: complex setup, settings, long workflows.
- Escape closes only when it will not lose data.

## Badges and Status

- Use semantic color plus text/icon.
- Status badges should be consistent across the product.
- Do not invent per-screen status names unless domain requires it.
- Role badges default to neutral. Use semantic color tokens (action-primary / success / warning / danger) only when it communicates a meaningful operational state, risk, or approval concept.

## Accessibility

- Minimum 44px touch targets on mobile.
- Visible focus rings.
- Keyboard navigation for all workflows.
- Color contrast must meet WCAG AA.
- Icon-only controls require `aria-label`.
- Loading and async updates should announce state where relevant.
