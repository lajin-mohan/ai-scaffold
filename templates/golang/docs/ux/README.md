# UX Design

UX work follows a staged workflow. Each command gates the next — no skipping:

```
BRD approved
  ↓
/ais-ux-analysis     → 01-requirements.md   (user roles, screen inventory, risks, open questions)
  ↓
/ais-ux-analysis        → 02-flows.md           (happy path, error/empty/permission paths, screen transitions)
  ↓
/ais-ux-design-prompt → 05-screen-specs.md     (one screen at a time)
  ↓
/ais-ux-design-prompt  → 04-design-system-notes.md + 06-figma-spec.md
  ↓
Human review    → designer approves Figma frames
  ↓
/ais-ux-review      → 07-review.md          (32-item check + 4-viewport browser verification)
  ↓
/ais-ux-handoff     → 08-dev-handoff.md     (hard gate before Stage 5)
  ↓
Stage 5 execution
```

**Quick fixes and spikes:** Use `/ais-ux-analysis --quick` directly — single screen, color/spacing changes, UX exploration. Bypasses the staged path.

**Rules:** See `.claude/rules/ux-rules.md` for all 10 hard gates (GH-01 through GH-10).

## Folder Structure

```
docs/ux/
├── README.md              ← this file
└── <feature>/
    ├── 01-requirements.md      ← /ais-ux-analysis output
    ├── 02-flows.md             ← /ais-ux-analysis output
    ├── 03-screen-inventory.md  ← /ais-ux-analysis output (screen quick-reference)
    ├── 04-design-system-notes.md ← /ais-ux-design-prompt output
    ├── 05-screen-specs.md      ← /ais-ux-design-prompt output (one section per screen)
    ├── 06-figma-spec.md        ← /ais-ux-design-prompt output
    ├── 07-review.md           ← /ais-ux-review output
    └── 08-dev-handoff.md       ← /ais-ux-handoff output (hard gate before coding)
```

## Who Does What

| Command | Who runs it |
|---|---|
| `/ais-ux-analysis` | UX Designer / BA |
| `/ais-ux-analysis` | UX Designer |
| `/ais-ux-design-prompt` | UX Designer (one screen at a time) |
| `/ais-ux-design-prompt` | UX Designer |
| `/ais-ux-review` | UX Designer / Tech Lead |
| `/ais-ux-handoff` | UX Designer |

PM and stakeholder approval required at each gate before proceeding.

## Design System

Design tokens, component rules, and typography are in `.claude/skills/ux-system/`. All colors come from CSS tokens — no hardcoded brand hex values. Token names match `.claude/skills/design-system/SKILL.md`.

## Responsive

- Desktop is the primary canvas — enterprise workflows designed for 1280px+
- Tablet: condensed sidebar at 768px
- Mobile: approximately 390px — primary workflows must work, no hiding actions behind desktop-only controls
- Light and dark theme on every page — CSS tokens only, no hardcoded colors