---
name: ux-workflow
description: Staged UX production workflow — requirements, flows, screen specs, Figma specs, review, and handoff. Use when creating or improving enterprise UX for any feature.
---

# UX Workflow — Staged Production

Staged UX production for enterprise features. Use this skill when creating UX artifacts from a BRD or feature spec. The staged workflow produces better UX than compressed all-in-one generation.

Design identity: **Precision Minimal** — precise, calm, highly scannable, high information density without clutter, professional confidence without coldness.

---

## Staged Workflow

```
BRD / Feature Spec
  ↓ [invoke ux-requirement-analyst]
/ux-analyze → 01-requirements.md + 03-screen-inventory.md
  ↓ [human approves requirements]
/ux-flow → 02-flows.md
  ↓ [human approves flows]
/ux-screen-spec → 05-screen-specs.md (one per screen)
  ↓ [human approves all screens]
/ux-figma-spec → 04-design-system-notes.md + 06-figma-spec.md
  ↓ [human review of full design]
/ux-review → 07-review.md
  ↓ [all BLOCK findings resolved]
/ux-handoff → 08-dev-handoff.md
  ↓ [implementation]
```

---

## Stage Details

### Stage 1 — /ux-analyze

**Input:** BRD or feature description
**Output:** `docs/ux/<feature>/01-requirements.md`, `03-screen-inventory.md`

**What to produce:**
- UX requirement summary (user roles, goals, constraints)
- User role matrix (who does what, when)
- Screen inventory (all screens needed, one-line purpose each)
- Flow inventory (all journeys, happy + exception paths)
- UX risks (patterns that might fail WCAG, be confusing, or need PM decision)
- Open questions (requirements that need confirmation)

**Invoke:** `@ux-requirement-analyst` agent

**Gate:** Human approves requirements before flows begin.

---

### Stage 2 — /ux-flow

**Input:** Approved 01-requirements.md
**Output:** `docs/ux/<feature>/02-flows.md`

**What to produce:**
- Happy path (primary user journey step-by-step)
- Error path (validation, server error, timeout)
- Empty state path (no data, first use)
- Permission path (unauthorized, restricted role)
- Multi-role path (approval flows, handoffs between roles)
- Screen-to-screen transition map

**Invoke:** `@ux-flow-designer` agent

**Gate:** Human approves flows before screen specs begin.

---

### Stage 3 — /ux-screen-spec

**Input:** Approved 02-flows.md
**Output:** `docs/ux/<feature>/05-screen-specs.md` (one screen per invocation)

**Scope rule:** One screen per invocation. For a feature with 10 screens, run this 10 times. This keeps output focused and reviewable.

**What to produce per screen:**
- Layout structure (ASCII wireframe)
- Component hierarchy (what components, what states)
- CTA placement (primary action, secondary actions)
- Form fields and validation behavior
- Responsive behavior (desktop / tablet / ~390px mobile)
- State matrix (all seven states: loading, empty, error, permission denied, success, form validation, mobile)
- Figma notes (frame name, auto-layout, shared components)

**Invoke:** `@ux-designer` agent

**Gate:** Human approves each screen before the next. All screens approved before moving to Stage 4.

---

### Stage 4 — /ux-figma-spec

**Input:** All approved screen specs
**Output:** `docs/ux/<feature>/04-design-system-notes.md`, `06-figma-spec.md`

**What to produce:**
- Design token usage (which tokens, where — all colors from tokens, no arbitrary hex)
- Component library mapping (which shared components to use)
- Spacing/type/grid rules (8pt grid, Inter typography scale)
- Table/form/modal/card rules (standardized patterns)
- Responsive rules (viewport breakpoints and layout changes)
- Figma frame structure

**Note:** Reference `.claude/skills/ux-system/SKILL.md` for the design system source of truth.

**Invoke:** `@ux-designer` agent (design system application phase)

---

### Stage 5 — Human Review

Before any AI review:
- PM/stakeholder reviews full design package
- All open questions from Stage 1 are resolved
- Design decisions are approved or flagged

---

### Stage 6 — /ux-review

**Input:** Implementation or full design package
**Output:** `docs/ux/<feature>/07-review.md`

**What to check:**
- Enterprise UX quality (hierarchy, density, clarity)
- Accessibility (WCAG 2.1 AA — keyboard nav, ARIA, color contrast)
- Responsive behavior (desktop light/dark, mobile light/dark at ~390px)
- Theme switching (no hardcoded colors, tokens used throughout)
- Component consistency (shared components used, not reinvented)
- State coverage (all seven states defined per screen)
- Form validation (field-level and form-level feedback)
- CTA placement (primary action obvious, secondary not competing)
- Token enforcement (no hardcoded brand hex values in implementation)

**Invoke:** `@ux-reviewer` agent + `/ux-review` command

**Gate:** All BLOCK findings resolved before handoff.

---

### Stage 7 — /ux-handoff

**Input:** Approved design package
**Output:** `docs/ux/<feature>/08-dev-handoff.md`

**What to produce (developer checklist, not prose):**
- Component list (name, states, token, notes)
- State matrix (screen × state — all cells filled or marked N/A)
- Token usage table (token → component mapping)
- Responsive behavior table (viewport → layout change)
- Figma link
- Open questions (design decisions not yet finalized)

**Format:** Tables only. Developers need a checklist, not a narrative.

---

## State Matrix Reference

Every screen must define all seven states:

| State | What to show |
|---|---|
| Loading | Skeleton rows at 60%/40%/20% width shimmer |
| Empty (no data) | Illustration + "No {{resource}} yet." + action |
| Empty (filtered) | "No results for '{{search}}'" + clear filters |
| Error | Error banner at top: message + retry |
| Permission denied | Appropriate message (not 404 leak) |
| Success | Clear confirmation with next step |
| Form validation | Field-level errors inline, form-level at top |
| Mobile (~390px) | Primary workflow preserved, actions accessible |

---

## Design System Reference

Reference `.claude/skills/ux-system/SKILL.md` for:
- Color tokens (green/yellow/red semantic usage)
- Typography scale (Inter 400/500/600/700)
- Spacing (8pt grid)
- Key component specs (input, button, card, table, badge, modal, toast, nav)
- Dark/light theme token patterns

Reference `.claude/skills/ux-review/SKILL.md` for the review process and severity model.

---

## Hard Gates

- **No Stage 3 without Stage 2 output.** `/ux-screen-spec` requires `02-flows.md` to exist.
- **No Stage 2 without Stage 1 output.** `/ux-flow` requires `01-requirements.md` to exist.
- **No implementation without Stage 7 handoff.** `/ux-handoff` required before Stage 5 (code) begins.
- **No DONE without Stage 6 review.** `/ux-review` with all BLOCKs resolved is required before marking frontend work done.