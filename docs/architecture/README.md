# Architecture Documentation

System design documents, diagrams, and Architecture Decision Records.

## Contents

```
architecture/
├── README.md             ← this file
├── adr/                  ← Architecture Decision Records
│   └── 001-template.md   ← ADR template (copy to create new ADRs)
├── hld-<item>-<slug>.md  ← High-Level Designs (see note below)
├── diagrams/             ← System diagrams (draw.io, Mermaid, etc.)
└── overview.md           ← High-level system overview (create when starting)
```

## ADR Process

1. Copy `.claude/templates/adr-template.md` to `adr/NNN-short-title.md`
2. Fill in context, decision, and rationale
3. Get team review
4. Update status to "Accepted"
5. Reference in `CLAUDE.md` memory section

## HLD naming

`hld-<item-number>-<feature-slug>.md`, alongside this file. **There is no HLD
template** — `.claude/templates/` ships an LLD template only, while
`docs/process/task-size-policy.md` requires an HLD at size M. Follow the LLD
template's spirit (module breakdown, specifications, sequence, error paths,
security) and drop the sections that do not apply, recording the adaptation in
the document. Gap noted 2026-08-31 while writing `hld-26-drift-aware-doctor.md`.

## System Overview

> Create `overview.md` when the architecture is stable enough to document.
> Include: component diagram, data flow, key integration points, deployment topology.
