# /ux-flow

Design user journeys and flow diagrams from approved UX requirements. Produces happy path, error path, empty state path, permission path, multi-role flows, and screen-to-screen transition map.

---

## Usage

```
/ux-flow                          # interactive
/ux-flow "candidate management feature"
/ux-flow --requirements docs/ux/candidate-mgmt/01-requirements.md
```

---

## When to Run

- After `/ux-analyze` is complete and approved
- Before any `/ux-screen-spec`
- When all open questions from requirements have owners and dates

---

## Prerequisites

- `docs/ux/<feature>/01-requirements.md` exists and is approved
- All open questions from Stage 1 are resolved or have documented assumptions

---

## Process

### Step 1 — Read Approved Requirements

Read `docs/ux/<feature>/01-requirements.md`.

### Step 2 — Invoke ux-flow-designer

```
@ux-flow-designer Design user flows for the approved requirements at:
docs/ux/<feature>/01-requirements.md
```

The agent produces all sections of the flow document.

### Step 3 — Save the Output

Save to: `docs/ux/<feature>/02-flows.md`

---

## Output

```
## User Flows — {{Feature Name}}

### What's been created
- docs/ux/<feature>/02-flows.md — full flow document

### Before /ux-screen-spec
- [ ] PM approves all happy paths
- [ ] All exception paths (error, empty, permission) defined
- [ ] Multi-role flows (approval, handoff) defined
- [ ] State transitions consistent with backend state machine
- [ ] Screen transition map complete

### Next step
Run /ux-screen-spec for each screen in the inventory.
```

---

## Scope Rule

**One screen per invocation for `/ux-screen-spec`.** The flow document may list 10-20 screens. Run `/ux-screen-spec` once per screen. This keeps output focused and reviewable.

---

## Rules

- Every flow must have a trigger, primary role, goal, and exit condition.
- Error paths must show recovery, not just failure.
- Empty state paths must guide the user to a first action.
- Multi-role flows must show notification and state changes for each transition.
- Do not design screens in this stage.

---

## Hard Gate

**No `/ux-screen-spec` until this output is approved.** The flow gate is mandatory.

---

## Related Commands

- `/ux-analyze` — produces requirements (must come first)
- `/ux-screen-spec` — produce screen specs (after flows approved)
- `/ux-review` — review UX artifacts
- `/ux-handoff` — developer handoff (after review)
- `@ux-flow-designer` — the agent that generates this output