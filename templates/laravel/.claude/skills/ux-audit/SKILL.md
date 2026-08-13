---
name: ux-audit
description: Legacy compatibility entrypoint for UX audits. Use ux-review for all new UI and UX implementation reviews.
disable-model-invocation: true
---

# LEGACY — ux-audit

> **Use `ux-review` instead.** This file is kept for reference only.

Legacy framework for auditing existing UI screens against WorkOS Minimal design principles. Prefer `ux-review` for all new work.

---

## When to Use

- Reviewing existing screens before a redesign sprint
- Validating developer output against approved UX spec
- Identifying UX debt in a live product
- Pre-release UX gate check

---

## Audit Dimensions

### 1. Visual Hierarchy
- Is the primary action on this screen immediately obvious?
- Is there a clear reading order (F-pattern or Z-pattern)?
- Are heading levels used correctly and consistently?
- Is there too much visual weight competing at the same level?

### 2. Information Density
- Is information grouped logically?
- Are there orphaned elements with no clear relationship to content near them?
- Is whitespace used to separate logical groups, not just as decoration?
- Is any section overloaded — can it be split or progressively disclosed?

### 3. Component Consistency
- Are design system tokens used (not hardcoded values)?
- Are the same UI patterns used for the same interactions across screens?
- Are there one-off components that should be standardised?
- Do buttons, inputs, badges match the design system spec?

### 4. States Coverage
- Does every interactive element have hover, focus, active, disabled states?
- Is there an empty state for every list or data container?
- Is there a loading state for every async operation?
- Are all error states defined at both field level and form/page level?

### 5. Mobile Responsiveness
- Does the layout reflow correctly at 390px?
- Are touch targets ≥ 44×44px?
- Does the navigation adapt to mobile (bottom nav or drawer)?
- Do tables/grids collapse gracefully?

### 6. Accessibility (Quick Check)
- Is colour the only indicator for any state? (Must have secondary indicator)
- Are focus states visible?
- Are form labels visible and associated — not just placeholders?
- Are icon-only buttons labelled?
Full audit: use `accessibility-check` skill.

### 7. Copy & Content
- Are button labels specific verbs (not "Submit" / "OK")?
- Are error messages actionable (explain what to do, not just what broke)?
- Is empty state copy helpful and accompanied by a CTA?
- Is tone consistent across the screen?

### 8. Design Principles Compliance
- One primary action per screen?
- Hierarchy first — is the most important thing most prominent?
- No orphaned actions (buttons with unclear consequences)?
- Desktop-first, with polished tablet/mobile adaptations and a verified 390px mobile view?

---

## Severity Levels

| Label | Meaning |
|---|---|
| `CRITICAL` | Blocks usability — user cannot complete their goal |
| `HIGH` | Significantly degrades experience — confusing or inconsistent |
| `MEDIUM` | Design system violation or pattern inconsistency |
| `LOW` | Minor polish — worth fixing but not urgent |
| `NIT` | Micro-improvement — discretionary |

---

## Output Format

```
## UX Audit — {{SCREEN NAME or FEATURE}}
**Audited by:** UX Audit Skill
**Date:** {{DATE}}
**Scope:** {{Describe what was reviewed}}

---

### Summary
| Dimension | Rating | Issues Found |
|---|---|---|
| Visual Hierarchy | ✅ / ⚠️ / ❌ | N |
| Information Density | ✅ / ⚠️ / ❌ | N |
| Component Consistency | ✅ / ⚠️ / ❌ | N |
| States Coverage | ✅ / ⚠️ / ❌ | N |
| Mobile Responsiveness | ✅ / ⚠️ / ❌ | N |
| Accessibility (quick) | ✅ / ⚠️ / ❌ | N |
| Copy & Content | ✅ / ⚠️ / ❌ | N |
| Design Principles | ✅ / ⚠️ / ❌ | N |

**Overall:** ✅ PASS / ⚠️ PASS WITH FIXES / ❌ NEEDS REDESIGN

---

### Findings

#### CRITICAL
- **[Component / Area]:** {{What is wrong, why it matters, what to do.}}

#### HIGH
- **[Component / Area]:** {{Finding.}}

#### MEDIUM
- **[Component / Area]:** {{Finding.}}

#### LOW / NIT
- **[Component / Area]:** {{Finding.}}

---

### Recommended Actions
| Priority | Action | Owner |
|---|---|---|
| 1 | | |
| 2 | | |
```
