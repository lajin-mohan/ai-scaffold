# UX System — Engyne

Engyne uses a WorkOS Minimal product language: Jira-like structure, Figma-like precision, and controlled Monday.com-inspired energy. Its core color language is green, yellow, and red rather than blue-heavy SaaS styling.

## Design Principles

- Operational clarity first.
- One primary action per screen.
- High information density without crowding.
- Color communicates status, category, urgency, or insight.
- Green is the primary brand/action color; yellow carries attention and insight; red carries risk, errors, and destructive actions.
- Navigation should feel predictable and fast.
- Dashboards should support scanning first, drill-down second.
- AI features must show confidence, source, impact, and auditability.

## Layout Strategy

Use a persistent app shell:
- top navigation for primary destinations in the current MVP shell
- icon + label navigation items with a restrained underline active state
- page header for title, summary, filters, search, and page actions
- content area for tables, boards, dashboards, and forms
- right drawer for details, activity, approvals, or AI explanations
- shell-level theme switching that uses organization-overridable tokens

Desktop:
- dense tables and boards are preferred over card-heavy marketing layouts
- keep content width fluid for operational views
- use compact top navigation and sticky filters/table headers where useful

Tablet:
- keep top navigation horizontally scrollable or move it behind a compact menu when space is constrained
- preserve key filters
- reduce secondary metrics before primary content

Mobile:
- use stacked cards instead of wide tables
- top navigation may become a compact drawer, menu, or horizontally scrollable list
- keep primary action fixed or easily reachable
- avoid hiding critical approval/action states

## Enterprise UX Rules

- Prefer table/list + detail drawer for management workflows.
- Prefer board + filters + quick detail for delivery workflows.
- Prefer dashboard summary + drill-down table for analytics workflows.
- Use modals for short tasks only; use full pages or drawers for complex forms.
- Never rely on color alone for status.
- Always define empty, loading, error, permission denied, and offline states.

## AI-Native UX Rules

AI outputs must show:
- confidence indicator
- reason or source summary
- last updated timestamp
- human action required or not
- audit trail link when governance-sensitive

Automation states:
- suggested
- pending approval
- applied
- overridden
- failed

## Dashboard Rules

Dashboards must:
- answer one primary question per section
- group metrics by decision context
- include filters before visualizations
- support department, project, team, sprint, and individual scopes where relevant
- use charts for trends and comparisons, tables for decisions and follow-up actions
- avoid chart decoration that does not improve comprehension

## Visual Tone

Base surfaces are calm and neutral. Accent colors create energy only where they carry meaning: selected state, primary action, success, warning, insight, risk, or destructive action. Do not overuse green as generic decoration; if navigation uses green/primary, cards and badges should usually stay neutral unless they represent real status. Avoid blue as a dominant accent; use it only for external brand requirements or unavoidable third-party conventions.

Brand and theme colors are tenant/organization configurable. Designs must specify token roles and semantic usage, not fixed brand hex values inside screens. Organization branding may override the default palette for primary/action colors, logos, and theme values; the UI must continue to meet contrast and state clarity requirements after overrides.
