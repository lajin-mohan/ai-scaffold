# Command: /create-brd

Produces a Business Requirements Document from a feature description or stakeholder brief. Invokes `solution-analyst` to surface gaps before writing, then structures output using `.claude/templates/brd-template.md`.

## Usage

```
/create-brd "Candidate bulk import via CSV with duplicate detection"
/create-brd --from-notes meeting-notes.md     # From meeting notes
/create-brd --update .ai-scaffold/docs/brd/feature-x.md   # Update existing BRD
```

## Process

1. **Surface assumptions** — list every assumption embedded in the request
2. **Identify open questions** — what must be answered before requirements can be locked
3. **Define scope boundary** — what is explicitly in scope and what is explicitly out
4. **Map user roles** — who interacts with this feature and how
5. **Write functional requirements** — what the system must do, not how
6. **Write business rules** — invariants, constraints, workflow rules
7. **Write non-functional requirements** — performance, security, availability
8. **Define acceptance criteria** — testable, binary, unambiguous

## Output Format

Uses `.claude/templates/brd-template.md`. Key sections:

- **Executive Summary** — 3 sentences max
- **Objectives** — 3-5 measurable goals
- **Scope** — In / Out table
- **User Roles & Permissions** — who can do what
- **Functional Requirements** — numbered, unambiguous statements
- **Business Rules** — invariants that must always hold
- **Non-Functional Requirements** — performance, security, availability targets
- **Acceptance Criteria** — checkbox-style, testable
- **Open Questions** — must be resolved before development starts
- **Out of Scope** — explicit exclusions to prevent scope creep

## Feature Flags (Settings)

This command reads `.claude/settings-overrides.json` to determine which sections to include:

| Feature flag | Sections included in BRD |
|---|---|
| `gdpr: true` | Data subject rights, lawful basis, retention periods, DPA requirements |
| `iso27001: true` | Access control matrix, encryption requirements, audit logging, MFA requirements |
| `accessibility: true` | WCAG 2.1 AA requirements, screen reader support, keyboard navigation |
| `auditLog: true` | Audit trail requirements for all state-changing operations |
| `asyncJobs: true` | Background job handling for long-running operations (report gen, bulk export) |

When a feature flag is `false`, its corresponding requirements section is omitted from the BRD. The BRD template adjusts automatically.

## Notes

- BRDs are living documents — update them when requirements change, don't work from stale specs.
- Every requirement gets a unique ID (e.g., `FR-001`, `BR-001`, `NFR-001`) for traceability.
- Save to `.ai-scaffold/docs/brd/[feature-name]-brd.md`.
- A BRD must be approved before architecture work begins.
- Run `/settings --list` to see which features are active for this project.
