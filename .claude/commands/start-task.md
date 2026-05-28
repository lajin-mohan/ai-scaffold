# /start-task

The "do real work" command. Bundles the plan-and-confirm protocol from [ai-coding-rules.md](../rules/ai-coding-rules.md) into a single ritual: read the spec, read adjacent code, propose a short numbered plan, **wait for one explicit approval**, then execute autonomously inside that approved scope.

This is the command developers and AI tools should invoke for any non-trivial implementation work. Not for trivial edits (≤3 steps, single file).

---

## Usage

```
/start-task                                           # interactive — ask the user what to build
/start-task "{{ticket-id-and-summary}}"               # task description provided
/start-task --ticket HIRE-142                         # link to a Jira/Linear ticket
/start-task --spec docs/brd/HIRE-142-csv-import.md    # work from a specific spec
/start-task --resume                                  # continue a paused task
```

---

## Why this command exists

AI-driven coding tends to produce one of two failure modes:

1. **Cowboy mode** — AI receives a vague task, guesses, invents APIs, ships subtly wrong code.
2. **Loop mode** — AI asks every two minutes for direction, never gains momentum.

`/start-task` is the cure: one structured plan up front, one explicit approval, then heads-down execution with a verification report at the end. The user should not need to babysit routine implementation choices after approving the plan.

---

## Process

The command runs in 5 phases. Phase 2/3 is the approval gate; after approval, continue without asking again unless a stop condition occurs.

### Phase 1 — Context priming (read, don't write)

1. Read the linked spec / BRD / API contract / LLD if one is given. If not, ask the user for the source.
2. Read adjacent code — the files in the same module, the same layer, neighbouring tests. Goal: understand local conventions before proposing changes.
3. Read [ai-coding-rules.md](../rules/ai-coding-rules.md) hard-rule summary.
4. Verify Definition of Ready criteria are met (see [definition-of-ready.md](../rules/definition-of-ready.md)). If not, **stop** and surface the missing items.
   For frontend/full-stack tasks: also verify UX handoff is complete (`docs/ux/<feature>/08-dev-handoff.md` exists) — this is a **hard gate** before Stage 5 execution. See `.claude/rules/ux-rules.md`.

### Phase 2 — Plan

Produce a plan in the exact format below. **Do not write any code yet.**

```
## Plan — {{TASK_NAME}}
**Linked spec:** {{path or ticket}}
**Estimated time:** {{minutes}}

### Goal
{{One sentence — what the user gets when this is done.}}

### Steps
1. {{Verb-led, concrete}}: {{What changes, in which file}}
2. {{...}}

### Files I will touch
| File | Nature of change | Reason |
|---|---|---|
| `apps/api/src/services/X.service.ts` | new | implements business logic per LLD §3 |
| `apps/api/src/routes/X.route.ts` | edit | wires new endpoint |
| `apps/api/src/services/X.service.test.ts` | new | unit tests covering ACs 1, 2, 3 + tenant isolation |

### Files I will NOT touch (out of scope)
- `apps/web/...` — frontend changes are a separate ticket
- `packages/shared/...` — no shared utility changes needed

### Verification I will run
- `npm run lint` — must pass
- `npm run typecheck` — must pass
- `npm run test apps/api/src/services/X.service.test.ts` — must pass
- `/ux-review` — required for frontend/full-stack tasks; include result or approved exception
- `npm run test:e2e` — required for frontend/full-stack tasks; include screenshots/traces on failure
- Desktop light/dark verification — required for frontend/full-stack tasks
- Mobile light/dark verification at approximately 390px — required for frontend/full-stack tasks
- Walk through each AC and report status

### Risks & open questions
- {{Anything I'm uncertain about — must be resolved before proceeding}}
- {{If none, write "None — proceeding."}}

### Autonomous execution after approval
- I will continue through the approved steps without asking again for routine implementation choices.
- I will stop only for the stop conditions listed below.
- If multiple approved tasks remain, I may use `/loop` semantics to complete them one by one.

### Stop conditions
- Required scope or file changes are outside this plan.
- The spec is missing, contradictory, or materially wrong.
- Verification fails and the next fix would change scope.
- A destructive operation, force push, reset, secret access, or direct `main`/`dev` commit is needed.
- A merge conflict requires product, ownership, or data-loss judgment.

### Acceptance criteria coverage
| AC | How this plan addresses it |
|---|---|
| AC-01 | Step 2 implements; tests in step 4 verify |
| AC-02 | Step 3 implements; tests in step 4 verify |

---

Reply `go` once to proceed. After approval, I will execute the plan autonomously and report progress/results. Silence is not approval.
```

### Phase 3 — Wait for explicit approval

- "go", "yes", "approved", "proceed" = approved
- Anything ambiguous = ask for clarification
- No response = no work; do not start

### Phase 4 — Execute

Follow the plan as written. Before writing **any** code, configuration, or test — run the self-critique check:

**Self-Critique Check (mandatory before every code output)**
1. **Imports resolve?** — Every import/extern is in package.json/composer.json/requirements.txt, no phantom deps.
2. **Types match?** — Function signatures, return types, generic parameters — all consistent with adjacent code.
3. **Error paths handled?** — Every throw/catch/reject has a counterpart; no naked `throw new Error()` without typed error.
4. **"I don't know" respected?** — If this step involves something I'm uncertain about, I state it before acting — not after.
5. **H1-H8 guards applied?** — No unverified claim about code; every reference is file:line; no invented APIs.

If any check fails: state the failure, fix it, re-check. Do not present broken code as done.

If during execution any of these happen:

- A file isn't where the plan said it would be
- An assumption proves wrong
- A side effect surfaces that wasn't in the plan
- Scope creeps (you spot something else that "should" be fixed)

→ **Stop immediately.** Use the mid-flight ambiguity protocol from [ai-coding-rules.md §2](../rules/ai-coding-rules.md). State the discovery, propose options, wait for the user. Do not stop for work that is already covered by the approved plan.

### Phase 5 — Verify and report

When the implementation is done, run the verification suite and produce the report:

```
## Verification — {{TASK_NAME}}

✅ Lint: `npm run lint` — passing (0 errors, 0 warnings)
✅ Typecheck: `npm run typecheck` — passing
✅ Tests: `npm run test [target]` — N/N passing (added M new tests)
✅ UX: `/ux-review` — passing (required for frontend/full-stack tasks)
✅ UX Handoff: `/ux-handoff` file exists `docs/ux/<feature>/08-dev-handoff.md` — hard gate before Stage 5
✅ Browser: `npm run test:e2e` — passing (required for frontend/full-stack tasks)
✅ Desktop themes: light + dark verified (required for frontend/full-stack tasks)
✅ Mobile themes: light + dark verified at ~390px (required for frontend/full-stack tasks)
✅ Acceptance criteria:
   - AC-01: {{description}} — verified, returns 201
   - AC-02: {{description}} — verified, returns 409 CONFLICT
   - AC-03: {{description}} — verified, returns 404 cross-tenant
⚠ Skipped: {{anything that couldn't be verified, with reason}}

## Files changed
- `path/to/file.ts` — {{summary}}
- `path/to/file.test.ts` — {{summary}}

## Next steps
- Run `/review` for AI review (Stage 6)
- Open PR when BLOCK findings are resolved
```

If verification fails: do not claim done. Report what failed, propose the fix, await direction.

---

## State management

If the user interrupts mid-task, save state to `tasks/start-task-state.json` (gitignored). Includes:

- Which phase the task was in
- The approved plan (if past Phase 3)
- Files edited so far
- Verification status

`/start-task --resume` reads this state and continues from the saved phase.

---

## When NOT to use /start-task

- Trivial edits (≤3 steps, single concept, single file): just do the work
- Reading questions ("what does this function do?"): just answer
- Bug fixes, failed tests, runtime errors, API defects, UI defects, Docker failures, and incident-style work: use `/debug-fix` so the original failure is reproduced or simulated, root-caused, corrected, tested, and verified with evidence
- Refactors: those are their own task — don't bundle them into a feature
- Spike/exploration: use `_ai/experiments/` directly, no plan gate needed

---

## Rules

- This command **never** skips Phase 2 (plan) or Phase 3 (wait for approval) for tasks that meet the plan-and-confirm threshold.
- One approval covers the plan as written; after approval, execute autonomously until done or blocked.
- The plan must list **every file** that will be touched. Discovering an unlisted file mid-execution = stop and ask.
- Verification is **mandatory** for the report. If a verification step can't run (e.g., test framework not configured), say so explicitly.
- UX review is **mandatory** before marking frontend or full-stack tasks `DONE`. Run `/ux-review` and include the result in the verification report. If UX review cannot run, the task remains not done unless the exception is explicitly approved and documented.
- Browser verification is **mandatory** before marking frontend or full-stack tasks `DONE`. Run `npm run test:e2e` and include the result in the verification report. If browser verification cannot run, the task remains not done unless the exception is explicitly approved and documented.
- A "go" approves the plan **as written**. New scope = new plan.
- The command leaves the working tree clean OR clearly explains why it doesn't (e.g., "left WIP on branch X for human review").
