# Architecture Documentation

System design documents, diagrams, and Architecture Decision Records.

## Contents

```
architecture/
├── README.md             ← this file
├── adr/                  ← Architecture Decision Records
│   └── 001-template.md   ← ADR template (copy to create new ADRs)
├── diagrams/             ← System diagrams (draw.io, Mermaid, etc.)
└── overview.md           ← High-level system overview (create when starting)
```

## ADR Process

1. Copy `.claude/templates/adr-template.md` to `adr/NNN-short-title.md`
2. Fill in context, decision, and rationale
3. Get team review
4. Update status to "Accepted"
5. Reference in `CLAUDE.md` memory section

## System Overview

> Create `overview.md` when the architecture is stable enough to document.
> Include: component diagram, data flow, key integration points, deployment topology.
