# /ux-analyze

Extract UX requirements from a BRD or feature description. Produces user role matrix, screen inventory, flow inventory, UX risks, and open questions.

---

## Usage

```
/ux-analyze                    # interactive — prompted for feature/BRD
/ux-analyze "candidate management feature"
/ux-analyze --spec docs/brd/feature-x.md
/ux-analyze --feature HIRE-142
```

---

## When to Run

- Stage 1 — after BRD is approved
- Before any `/ux-flow` or `/ux-screen-spec`
- When a new feature or major UX change is being scoped

---

## Prerequisites

- BRD exists in `docs/brd/` or feature description is provided
- If no BRD, ask the user to provide the feature description

---

## Process

### Step 1 — Read the BRD or Feature Description

Read the linked BRD or feature spec. If none is given, ask the user.

### Step 2 — Invoke ux-requirement-analyst

```
@ux-requirement-analyst Convert the following BRD/feature into UX requirements:
{{paste BRD or describe feature}}
```

The agent produces all six sections of the requirements document.

### Step 3 — Save the Output

Save to: `docs/ux/<feature>/01-requirements.md`

If the directory does not exist, create it.

Also produce `03-screen-inventory.md` as a quick-reference companion file listing all screens in the inventory table.

---

## Output

```
## UX Requirements — {{Feature Name}}

### What's been created
- docs/ux/<feature>/01-requirements.md — full requirements document
- docs/ux/<feature>/03-screen-inventory.md — screen quick-reference

### Before /ux-flow
- [ ] PM approves UX requirements summary
- [ ] All open questions have owners and due dates
- [ ] User roles and goals are confirmed

### Next step
Run /ux-flow to design user journeys from the approved requirements.
```

---

## Rules

- Every requirements document must have all six sections: user role matrix, UX requirement summary, screen inventory, flow inventory, UX risks, open questions.
- Open questions must have named owners — an ownerless question is not tracked.
- Screen inventory may grow during design — list everything currently known.
- Do not design screens or flows in this stage.

---

## Hard Gate

**No `/ux-flow` until this output is approved.** The requirements gate is mandatory.

---

## Related Commands

- `/ux-flow` — design user journeys (after requirements approved)
- `/ux-screen-spec` — produce screen specs (after flows approved)
- `/ux-review` — review UX artifacts
- `/ux-handoff` — developer handoff (after review)
- `@ux-requirement-analyst` — the agent that generates this output