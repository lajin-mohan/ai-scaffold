# Manual Review Checklist (Stage 7)

What human reviewers look for that AI reviewers can't reliably catch. Used at Stage 7 (Manual Review), after Stage 6 (`/review` AI parallel review) has passed.

> **AI vs human:** AI is excellent at correctness, security checklist application, pattern matching, and naming consistency. AI is **weak** at business intent, UX coherence, team-knowledge transfer, and "does this actually solve the user's problem". Stage 7 covers the latter.

---

## Reviewer Mindset

You are not re-running the AI review. Trust the AI BLOCK findings have been resolved. Your job is to answer the four questions AI cannot answer:

1. **Does this make sense for our product?** (Business judgment)
2. **Does this fit how the user actually thinks?** (UX coherence)
3. **Does this fit where the system is heading?** (Architecture direction)
4. **Will the team understand and own this in 6 months?** (Knowledge transfer)

---

## The Four-Question Checklist

### 1. Does this make sense for our product?

- [ ] The change addresses the real user pain, not a proxy for it
- [ ] The product team agrees the behaviour is desirable (PM informed, sign-off where needed)
- [ ] The interaction matches the product's voice and conventions (not generic SaaS-speak)
- [ ] The error states say what *this product* should say to *this audience*
- [ ] No accidental scope additions ("while we were here we also...")
- [ ] Edge cases match real-world scenarios from this domain (not theoretical)

### 2. Does this fit how the user actually thinks?

- [ ] The flow matches the user's mental model — not the database's schema
- [ ] Labels use the user's vocabulary, not internal/engineering terms
- [ ] The primary action is obvious; secondary actions don't compete
- [ ] Loading and error states are reassuring, not robotic
- [ ] The change doesn't quietly break an existing pattern users rely on
- [ ] Accessibility for the actual users of this product (e.g., field workers on mobile) — not generic WCAG-pass

### 3. Does this fit where the system is heading?

- [ ] Architecture choice aligns with the broader direction (not a one-off)
- [ ] The change doesn't introduce a pattern that contradicts a recent ADR
- [ ] If a new pattern is introduced, an ADR exists for it
- [ ] Coupling stays within accepted boundaries — no module reaching across layers
- [ ] Performance assumption matches the system's actual load profile (not a benchmark in isolation)
- [ ] Data model change makes sense for likely future requirements, not just current ones

### 4. Will the team understand and own this in 6 months?

- [ ] A new team member could read this code without needing the author present
- [ ] Variable / function names match the team's existing vocabulary
- [ ] Surprising decisions have a comment explaining *why*
- [ ] The implementation is not cleverer than necessary
- [ ] If the original author left tomorrow, the team could maintain this
- [ ] Tests document intent, not just verify behaviour
- [ ] Documentation (README, ADR, runbook) is updated where relevant

---

## What to Comment On

| Type | Format | Example |
|---|---|---|
| **Approve** | One line — "LGTM" + optional reason | "LGTM — clean implementation, matches LLD" |
| **Suggest (NIT)** | "Optional: ..." | "Optional: rename `getApps` to `listApplications` to match neighbouring services" |
| **Question** | "Q: ..." | "Q: why did you choose composite index over partial here? Wondering if we'll regret it at scale." |
| **Request change (WARN)** | "Please ..." | "Please add a regression test for the cross-tenant case before merge." |
| **Block (BLOCK)** | "BLOCK: ..." | "BLOCK: this changes the audit log shape — needs an ADR and a migration plan for the existing audit consumer." |

---

## Reviewer Anti-Patterns

Do not:

- **Rubber-stamp.** A drive-by "LGTM" is worse than no review — it transfers responsibility without due diligence.
- **Re-litigate AI findings.** If AI flagged something WARN and the author addressed it, don't re-open unless you genuinely disagree.
- **Bikeshed style.** If the linter passes and the style matches the file, leave it. Style debates belong in `coding-standards.md`, not in a PR.
- **Hold a PR for unrelated work.** "While you're here, can you also..." is a separate ticket.
- **Block on opinion.** "I would have done this differently" is not a BLOCK. Either it's BLOCK because of a rule violation, or it's a NIT.
- **Approve without reading.** Read the diff. All of it.

---

## Time Budget

| PR size | Expected review time | What to focus on |
|---|---|---|
| < 100 lines changed | 10–15 min | Full read; ACs; tests |
| 100–400 lines | 30–45 min | Full read; ACs; tests; architecture fit |
| 400–800 lines | 60–90 min | Full read; flag for split if unrelated changes; architecture fit; team-knowledge transfer |
| > 800 lines | **Reject for split.** No PR over 800 lines should be reviewed as a single unit (per [branching-rules.md](./branching-rules.md)) |

---

## Sign-off Format

```
Manual Review — [PR title]
Reviewer: [Name]
Date: [date]
AI review: [link to /review output]

Q1 (product fit):       ✅ / ⚠ / ❌
Q2 (user fit):          ✅ / ⚠ / ❌
Q3 (architecture fit):  ✅ / ⚠ / ❌
Q4 (team-ownership):    ✅ / ⚠ / ❌

Verdict: APPROVE / REQUEST CHANGES / BLOCK

Notes:
- {{anything important}}
```

---

## Cross-References

- [review-rules.md](./review-rules.md) — pre-review checklist (author), AI review (Stage 6), severity labels, merge rules
- [ai-coding-rules.md](./ai-coding-rules.md) — what AI must do before requesting human review
- [dod-rules.md](./dod-rules.md) — Definition of Done that this review unblocks
- [branching-rules.md](./branching-rules.md) — PR size limits, merge rules
