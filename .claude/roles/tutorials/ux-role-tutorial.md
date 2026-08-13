# UX Role Tutorial

**Role:** `ux` | **Default command:** `/ux-analysis` | **Purpose:** UX creation, review, accessibility, and responsive behavior verification

> Workflow update: the canonical UX flow is now `/ux-analysis` → `/ux-design-prompt` → manual Figma/Claude build + UX Lead approval → `/ux-review` → `/ux-handoff`.
> Older references in this tutorial to `/ux-analyze`, `/ux-flow`, `/ux-screen-spec`, and `/ux-figma-spec` are legacy command aliases.

---

## When to Use This Role

You are the **ux** when you need to:
- Analyze a feature and design its UX flow
- Create screen specifications with layout and interaction details
- Review UX artifacts (wireframes, mockups, flow diagrams)
- Verify frontend implementation against design spec
- Check accessibility (WCAG 2.1 AA compliance)
- Validate responsive behavior (desktop, tablet, mobile)

**Not the UX role:** writing backend code, database design, architecture decisions.

---

## Quick Start

### 1. Set your role

```bash
# Edit .claude/settings.local.json
{
  "role": "ux"
}
```

### 2. Begin with UX analysis

```bash
/ux-analyze
```

This analyzes a feature's UX requirements, user roles, information architecture, and identifies design decisions needed.

---

## Core Commands

| Command | When to Use | Output |
|---|---|---|
| `/ux-analysis` | Stage 4 — task-based UX requirements | `tasks/<MODULE>-<NNN>/01-requirements.md` + `02-open-questions.md` |
| `/ux-design-prompt` | Stage 4 — Figma/Claude prompt | `tasks/<MODULE>-<NNN>/03-design-prompt.md` (self-contained) + `04-figma-build-notes.md` |
| `/ux-create` | Stage 4 — quick fixes/spikes | Single-screen UX improvements, color/spacing changes, UX exploration (not the primary path) |
| `/ux-review` | Stage 4/6 — UX verification | 32-item check + 4-viewport browser verification (desktop L/D + mobile L/D at 390px) |
| `/ux-handoff` | Stage 4 — dev handoff | Developer-ready checklist: components, state matrix, tokens, responsive, Figma link (hard gate before Stage 5) |
| `/qa` | Stage 8 — live browser QA | Rendering, interaction, console issue detection |
| `/lessons` | Record a UX decision or mistake | Saved to `tasks/lessons.md` |
| `/reflect` | Review UX session outcome | Saved to memory |

---

## Step-by-Step Workflow

### Full UX Lifecycle (task-based)

The UX workflow is **task-based** — one UX task = one UX deliverable. See `docs/ux/` for the UX module folder structure and task artifact conventions.

```
1. UX Analysis: /ux-analysis <MODULE>-<NNN>
   → Creates tasks/<MODULE>-<NNN>-<slug>/ folder
   → 01-task-index.md (stage tracker for this task)
   → 01-requirements.md (user roles, screen inventory, risks)
   → 02-open-questions.md (OQ list with default-decision proposals)
   → module.json + state.json updated to track the task
   → Ends with summary, unresolved OQs, and the recommended next command

2. Design Prompt: /ux-design-prompt <MODULE>-<NNN>
   → 03-design-prompt.md — self-contained Figma/Claude prompt
       * Inlines all design tokens, states, viewports, exclusions
       * Lists hard rules (token hygiene GH-11, accessibility, responsive)
       * Lists default decisions for OQs (so the build doesn't stall)
       * Lists what NOT to build (out-of-scope screens for this task)
       * Acceptance checklist
   → 04-figma-build-notes.md — empty build-tracking template
   → module.json + state.json updated to design_prompt_ready
   → Ends with summary, pre-Figma checklist, and manual next step

3. Manual Figma Build
   → Designer pastes 03-design-prompt.md into Figma Make / Claude Design
   → Adjusts layout, spacing, density, token use, variants, states, responsive
   → Tracks progress in 04-figma-build-notes.md (Variables → leaves → composites → frames → verify)
   → UX Lead approves
   → Only after approval do /ux-review and /ux-handoff run

4. Implementation Review: /ux-review <MODULE>-<NNN>
   → 32-item check (severity BLOCK | HIGH | MEDIUM | LOW | NIT)
   → 4-viewport browser verification (desktop L/D + mobile L/D at 390px)
   → All 7 states verified per data-rendering screen
   → Token-only colors enforced as BLOCK (GH-11)

5. Handoff: /ux-handoff <MODULE>-<NNN>
   → 05-dev-handoff.md — developer-ready checklist
   → Components, state matrix, token references, responsive rules, Figma link
   → Hard gate before Stage 5 (no coding without this)
```

---

## Required Evidence Gates

Before claiming "UX sign-off":

- [ ] `accessibility_verified` — WCAG 2.1 AA, keyboard nav, screen reader
- [ ] `responsive_verified` — desktop, tablet, mobile layouts
- [ ] `light_theme_verified` — all components render correctly
- [ ] `dark_theme_verified` — all components render correctly
- [ ] `state_coverage_verified` — loading, error, empty, populated states
- [ ] `design_system_consistency_verified` — tokens used, no hardcoded values

---

## Design System Tokens

Use only these tokens — no hardcoded colors:

| Token | Usage |
|---|---|
| `--color-action-primary` | Primary actions, links, focus/selection |
| `--color-action-primary-hover` | Primary hover/pressed |
| `--color-action-primary-soft` | Subtle active backgrounds |
| `--color-bg-surface` | Cards, modals, inputs, header |
| `--color-bg-muted` | Table headers, filter bars, nested areas |
| `--color-text-primary` | Headings, body text |
| `--color-text-secondary` | Labels, captions, muted text |
| `--color-text-muted` | Placeholder, disabled |
| `--color-border` | Borders |
| `--color-border-strong` | Emphasized borders |
| `--color-border-focus` | Focus rings |
| `--color-success` | Success states |
| `--color-warning` | Warning states |
| `--color-danger` | Danger/error states |

All colors are organization-overridable via branding settings.

---

## Blocked Actions (Human Required)

| Action | Why Blocked |
|---|---|
| `merge_main` | Requires human approval + CI green |
| `deploy_production` | Requires deployment review + sign-off |
| `destructive_changes` | Requires explicit human consent |
| `secrets_access` | Out of scope for AI |
| `backend_logic_changes` | UX doesn't own backend implementation |

---

## The Seven States (per data-rendering screen)

Every data-rendering component must handle all **seven** states (per `.claude/rules/ux-rules.md`):

```
1. Loading               → Skeleton or spinner (not blank space)
2. Empty                 → Meaningful empty state with guidance (not "no data")
3. Error                 → Error message with retry action (not blank)
4. Permission Denied     → Explicit "you don't have access" with the role required
5. Success               → Confirmation / completion state
6. Form Validation       → Inline field-level errors + summary (where applicable)
7. Mobile                → Adapted layout at 390px (not desktop squished)
```

The legacy "4 states" (loading, error, empty, populated) is **insufficient** and is now a BLOCK finding in `/ux-review`.

---

## Responsive Breakpoints

| Viewport | Width | Target |
|---|---|---|
| Desktop | ≥1024px | Primary experience |
| Tablet | 768px–1023px | Adapted from desktop |
| Mobile | ~390px | Complete workflow, no hidden actions |

At 390px, primary workflows must remain complete. Create, edit, submit, approve, save, cancel actions must be accessible.

---

## Common Scenarios

### Scenario 1: New UX task (task-based workflow)

```
User: "Design the Reporting Main Table"

1. /ux-analysis UX-REP-001-main-table
   → Creates tasks/UX-REP-001-main-table/ with 01-task-index.md
   → 01-requirements.md: user roles (Convener/Admin/Hotel Partner),
     screen inventory (Main Table + More Filters Modal),
     14 OQs (6 original + 8 surfaced by /ux-flow)
   → state.json: status = requirements_ready

2. /ux-design-prompt UX-REP-001-main-table
   → 03-design-prompt.md: self-contained Figma prompt with all tokens,
     all 7 states, 4 viewports, 2 themes, hard rules, OQ defaults
   → 04-figma-build-notes.md: blank build tracker
   → state.json: status = design_prompt_ready

3. Manual Figma build
   → Designer pastes prompt into Figma Make
   → Adjusts based on 03-design-prompt.md guidance
   → Tracks progress in 04-figma-build-notes.md
   → UX Lead approves

4. /ux-review UX-REP-001-main-table
   → 32-item check + 4-viewport browser verification
   → Token hygiene (GH-11) enforced as BLOCK
   → All 7 states verified

5. /ux-handoff UX-REP-001-main-table
   → 05-dev-handoff.md generated
   → Hard gate before Stage 5 begins
```

### Scenario 2: Form with validation

```
User: "Design the project creation form"

1. /ux-analysis UX-FORM-001-create-project
   → 01-requirements.md: form fields, validation rules, success/error
   → 02-open-questions.md: max file size? draft autosave? cancellation policy?

2. /ux-design-prompt UX-FORM-001-create-project
   → 03-design-prompt.md includes:
     - Per-field: label, helper text, placeholder, validation rules, error messages
     - All 7 states including form-validation state (field default, focus, error, disabled)
     - Accessibility: labels, aria-describedby for errors, focus order

3. /ux-review (after implementation)
   → Form validation displays inline errors
   → Submit button shows loading state
   → Success redirects to project detail
   → Permission denied state for unauthorized roles
```

### Scenario 3: Theme verification

```
User: "Verify dark mode on the dashboard"

1. /qa (with role set to ux)
   → Toggle dark mode
   → Verify: surface colors invert, text remains readable
   → Verify: no hardcoded hex values break theme
   → Verify: borders, focus rings, charts all use tokens
   → Verify: state is preserved after theme switch
```

---

## Calling Specialist Agents

Invoke these for deep analysis:

```
@ux-designer          — component specs, design decisions
@ux-flow-designer     — flow diagrams, interaction patterns
@ux-requirement-analyst  — UX requirements from business needs
@frontend-reviewer    — implementation compliance, accessibility
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No spec exists | Run `/ux-analysis <MODULE>-<NNN>` to create `01-requirements.md` before implementation |
| Hardcoded colors found | Flag as BLOCK (GH-11 — Token Hygiene Reference-Only Rule) — must use design tokens only |
| Missing states | Component must handle all **7** states: loading, empty, error, permission-denied, success, form-validation, mobile |
| Mobile actions hidden | Ensure primary workflow is complete at 390px |
| Build references the wrong token | The design prompt inlines all tokens at §9 — do not consult the design-system file mid-build |
| "I don't know" response | This is correct. Ask or research — don't guess at UX decisions |

---

## Related Files

- Role config: [ux.yaml](../ux.yaml)
- UX workflow skill (canonical): [.claude/skills/ux-workflow/SKILL.md](../../skills/ux-workflow/SKILL.md)
- UX system skill (design tokens, components): [.claude/skills/ux-system/SKILL.md](../../skills/ux-system/SKILL.md)
- Design system: [.claude/skills/design-system/SKILL.md](../../skills/design-system/SKILL.md)
- UX rules: [.claude/rules/ux-rules.md](../../rules/ux-rules.md)
- Live reference implementation: see `docs/ux/` for the UX module structure and task artifact conventions.
