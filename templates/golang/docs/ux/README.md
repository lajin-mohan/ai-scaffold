# UX Design

UX work follows a staged workflow. Each command gates the next — no skipping:

```
BRD approved
  ↓
/ux-analyze     → 01-requirements.md   (user roles, screen inventory, risks, open questions)
  ↓
/ux-flow        → 02-flows.md           (happy path, error/empty/permission paths, screen transitions)
  ↓
/ux-screen-spec → 05-screen-specs.md     (one screen at a time)
  ↓
/ux-figma-spec  → 04-design-system-notes.md + 06-figma-spec.md
  ↓
Human review    → designer approves Figma frames
  ↓
/ux-review      → 07-review.md          (32-item check + 4-viewport browser verification)
  ↓
/ux-handoff     → 08-dev-handoff.md     (hard gate before Stage 5)
  ↓
Stage 5 execution
```

**Quick fixes and spikes:** Use `/ux-create` directly — single screen, color/spacing changes, UX exploration. Bypasses the staged path.

**Rules:** See `.claude/rules/ux-rules.md` for all 10 hard gates (GH-01 through GH-10).

## Folder Structure

```
docs/ux/
├── README.md              ← this file
└── <feature>/
    ├── 01-requirements.md      ← /ux-analyze output
    ├── 02-flows.md             ← /ux-flow output
    ├── 03-screen-inventory.md  ← /ux-analyze output (screen quick-reference)
    ├── 04-design-system-notes.md ← /ux-figma-spec output
    ├── 05-screen-specs.md      ← /ux-screen-spec output (one section per screen)
    ├── 06-figma-spec.md        ← /ux-figma-spec output
    ├── 07-review.md           ← /ux-review output
    └── 08-dev-handoff.md       ← /ux-handoff output (hard gate before coding)
```

## Who Does What

| Command | Who runs it |
|---|---|
| `/ux-analyze` | UX Designer / BA |
| `/ux-flow` | UX Designer |
| `/ux-screen-spec` | UX Designer (one screen at a time) |
| `/ux-figma-spec` | UX Designer |
| `/ux-review` | UX Designer / Tech Lead |
| `/ux-handoff` | UX Designer |

PM and stakeholder approval required at each gate before proceeding.

## Design System

Design tokens, component rules, and typography are in `.claude/skills/ux-system/`. All colors come from CSS tokens — no hardcoded brand hex values. Token names match `.claude/skills/design-system/SKILL.md`.

## Responsive

- Desktop is the primary canvas — enterprise workflows designed for 1280px+
- Tablet: condensed sidebar at 768px
- Mobile: approximately 390px — primary workflows must work, no hiding actions behind desktop-only controls
- Light and dark theme on every page — CSS tokens only, no hardcoded colors