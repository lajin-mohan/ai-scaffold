# UX Patterns

## Page Layout Pattern

Use this for operational CRUD pages:

1. Page header: title, scope, primary action.
2. Filter/search bar.
3. Primary content: table, board, or list.
4. Detail drawer for selected item.
5. Empty/error/loading states.

## Analytics Pattern

Use this for dashboards and reports:

1. Scope selector: organization, department, project, team, sprint, date range.
2. Executive summary strip: 3-5 metrics max.
3. Trend/comparison section.
4. Exception/action table.
5. Export or drill-down actions.

## Approval Pattern

Use this for timesheets, governance, and workflow approvals:

1. Queue grouped by urgency/status.
2. Detail panel with evidence.
3. Approve/reject actions with clear consequences.
4. Rejection requires reason.
5. Audit trail visible before action when high stakes.

## AI Governance Pattern

Use this for AI-native features:

1. Recommendation or signal.
2. Confidence and source.
3. Impact summary.
4. Human decision action.
5. Audit log.
6. Override and feedback path.

## Board Pattern

Use this for delivery execution:

1. Sprint/project context at top.
2. Filters and assignee quick filters.
3. Columns by workflow state.
4. Compact cards with type, priority, assignee, age, status risk.
5. Detail drawer for editing, comments, time logging, history.

## Time Tracking Pattern

Use this for timesheets:

1. My week/month summary.
2. Entry table grouped by day/project/issue.
3. Actual/productive/billable values clearly separated.
4. Submission and approval states visible.
5. Approval queue for leads/PMs with budget context.

## Responsive Pattern

Desktop:
- table/board first
- detail drawer available
- dense filters allowed

Tablet:
- collapse sidebar
- convert secondary panels to drawers

Mobile:
- convert tables to cards
- pin primary action when useful
- avoid hidden critical filters
- keep approval, save, submit, and destructive actions reachable without relying on hover
- preserve status, ownership, due date, and next action in compact cards

## Theme Pattern

Every page must define both light and dark behavior:

1. Use neutral page backgrounds and semantic surface tokens.
2. Use green for primary action/healthy state, yellow for attention/insight, red for risk/destructive.
3. Ensure badges, charts, tables, forms, focus rings, empty states, and skeletons remain readable.
4. Avoid hardcoded colors that bypass tokens.
5. Theme switching must not reset filters, form data, selected rows/cards, or active tab.
