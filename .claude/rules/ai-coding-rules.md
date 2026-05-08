# AI Coding Rules

These rules govern how every AI tool (Claude, Codex, Cursor, Copilot, etc.) writes code in this project. They sit on top of [coding-standards.md](./coding-standards.md) and apply to every line of AI-assisted work.

> **Why this file exists:** Speed without correctness, verifiability, or maintainability is a debt — it shows up at code review, in QA, in production incidents, and in the next sprint that has to clean up the previous one. This file makes the speed/quality contract explicit.

---

## Five Operating Principles

1. **Don't hallucinate.** Verify before claiming. Cite the source.
2. **Don't guess.** When uncertain, ask. "I don't know" is a valid and required answer.
3. **Plan, then execute.** Multi-step work is gated by a written plan + explicit human approval.
4. **Production-grade only.** No MVP shortcuts, no half-implementations, no stubs that ship.
5. **Verify before "done".** Lint and tests must run successfully — not be assumed to.

---

## 1. Hallucination Guards

These are the single most important rules in this file. AI systems hallucinate. The defence is verification, not optimism.

| # | Rule | Enforcement |
|---|---|---|
| H1 | **Verify before claim.** Any statement about code (a function exists, a file is at path X, a flag has value Y) must be backed by reading the file in this session. No claims from training data alone. | BLOCK in review |
| H2 | **Cite `file:line`.** Recommendations, fixes, and explanations must reference the source file and line number. "The `applicationService.create` function at `apps/api/src/services/applications.service.ts:34`" — not "the create function in the application service." | WARN in review |
| H3 | **Memory is stale, code is fresh.** When `.claude/memory/*` or `tasks/lessons.md` contradicts the current code, **the code wins.** Update the stale memory; don't act on it. | Required behaviour |
| H4 | **"I don't know" is mandatory.** When you're not sure, say so explicitly. Don't fill the gap with a confident-sounding guess. Ask the user, or run a search/read to find out. | Required behaviour |
| H5 | **No invented APIs, packages, flags, or signatures.** Every external reference (function name, npm package, CLI flag, env var, GitHub Action) must be verified by reading the relevant file, package's lockfile, or running `--help`. | BLOCK in review |
| H6 | **Snippet rule.** Before outputting code, mentally execute it: imports resolve, types match, error paths handled. If you can't, output a flagged draft labelled `// UNVERIFIED — needs human review` instead of a confident answer. | WARN in review |
| H7 | **Past != present.** A memory note saying "function X handles Y" is a claim about the past. Verify it still does before acting on it. | Required behaviour |
| H8 | **No phantom dependencies.** Don't import a package without confirming it's in `package.json` / `composer.json` / `requirements.txt` and locked. If a new dep is genuinely needed, propose adding it — don't silently `import` it. | BLOCK in review |

### What to do when you don't know

```
"I haven't verified X yet. I see two paths:
 1. {{Concrete option A based on what I've read so far}}
 2. {{Concrete option B}}
What does the current codebase actually do here? I can grep [pattern] to find out, or you can tell me."
```

This is the correct response. Not silence, not invention.

---

## 2. Plan-and-Confirm Protocol

The plan-and-confirm gate exists because mid-task pivots are 10× more expensive than pre-task corrections.

### When the plan-and-confirm gate is **mandatory**

- The task involves **more than 3 logical steps**
- The task is **long-running** (multi-file edit, schema migration, infra change, data backfill)
- The task **spans more than one architectural layer** (route + service + repository, or backend + frontend)
- The task **touches a critical path** (auth, payments, tenant isolation, audit, billing)
- The task is **destructive or hard to reverse** (delete files, drop columns, change schema)

### When the plan-and-confirm gate is **NOT required**

- Single-file, single-concept edits (rename one variable, add one missing import, fix a typo)
- Trivial reads (answering "what does this function do?")
- Tasks of ≤3 logical steps that don't touch any of the bullets above

If unsure: assume mandatory. The cost of an extra plan turn is negligible. The cost of an unwanted refactor is hours.

### Plan format (when required)

```
## Plan — {{TASK_NAME}}

**Goal:** {{One sentence — what the user gets when this is done.}}

**Steps:**
1. {{Verb-led, concrete}}: {{What changes, in which file}}
2. {{...}}
3. {{...}}

**Files I will touch:**
- `path/to/file.ts` — {{nature of change}}
- `path/to/test.ts` — {{nature of change}}

**Files I will NOT touch (out of scope):**
- {{list, if relevant}}

**Verification:**
- {{lint command}} — must pass
- {{test command}} — must pass
- {{manual check, if any}}

**Risks / open questions:**
- {{anything I'm uncertain about — must be resolved before proceeding}}

**Time estimate:** {{minutes}} (drop this for trivial tasks)

Reply 'go' to proceed. Reply with corrections to revise. Silence is not approval.
```

### Confirmation rules

- Wait for **explicit** approval. "ok", "go", "yes", "approved", "proceed" are valid. Ambiguous responses ("hmm", "fine", "sure if you think so") require clarification.
- **Silence is not approval.** Do not start work after sending a plan and getting no response.
- A user saying "go" approves **the plan as written** — no scope expansion. New work needs a new plan.

### Mid-flight ambiguity protocol

If during execution you discover an assumption was wrong, a file isn't where you expected, or a side-effect you didn't anticipate:

1. **Stop work immediately.** Don't push through with a guess.
2. **Restate the discovery.** "Found that `X` actually does `Y`, not `Z` as the plan assumed."
3. **Propose options.** "Options: (a) revise the approach to do `W`, (b) abandon the plan and design from scratch, (c) park this task and return after clarification."
4. **Wait for the user.** No silent re-planning.

This is not optional. Silent course-correction is how AI-driven work drifts away from intent.

---

## 3. Production-Grade Mandate

This codebase is not MVP. Code that lands in `apps/` or `packages/` runs in production for real users.

| # | Rule | Severity |
|---|---|---|
| P1 | **No half-implementations.** A function with a `throw new Error('TODO')` body cannot be committed. Either finish it or don't add it. | BLOCK |
| P2 | **No stubs that ship.** A handler that returns `{ ok: true }` without doing the work cannot be committed even temporarily. Use a feature flag if the work is staged. | BLOCK |
| P3 | **No `TODO` without a ticket.** Every `// TODO` must reference a real ticket: `// TODO(HIRE-142): handle CSV with BOM`. Bare TODOs are lint failures. | BLOCK |
| P4 | **No "good enough for demo".** Demos run on production builds. There is no demo branch. | Required behaviour |
| P5 | **Edge cases handled, not deferred.** Empty input, max input, null, network failure, concurrent write, permission denied — these are part of the implementation, not a follow-up ticket. | BLOCK |
| P6 | **Errors are observable.** Every catch block either re-throws, logs with context, or maps to a user-facing error. No silent `catch (e) {}`. | BLOCK |
| P7 | **`_ai/` is the only sandbox.** Experimental, unverified, or "let's see if this works" code lives in `_ai/drafts/` or `_ai/experiments/` — never in `apps/`, `packages/`, or `infra/`. | BLOCK |
| P8 | **Performance budgets are real.** If the spec says p99 < 500ms, the implementation must measure and meet it before "done". Not "I think it's fast enough." | WARN→BLOCK at QA |

### What "production-grade" means concretely

- Input validated at boundaries (see [security-rules.md](./security-rules.md))
- Tenant isolation enforced (where applicable, see CLAUDE.md `IS_MULTI_TENANT`)
- Audit log entries for state changes
- Idempotency keys for write retries
- Background jobs for >200ms operations
- Tests cover happy path + ≥2 edge/failure cases (see [testing-rules.md](./testing-rules.md))
- No hardcoded values that should be config (see [coding-standards.md](./coding-standards.md))

---

## 4. AI-Readability Rules

Code that AI generates is read by humans, by other AIs, and most often by **future-you in three months**. These rules keep AI-generated code legible and maintainable across iterations.

### Hard limits

| Constraint | Limit | Action if exceeded |
|---|---|---|
| Function length | ≤ 50 lines (excluding signature, blank lines, comments) | Split. WARN at 50, BLOCK at 75. |
| File length | ≤ 300 lines (target), 500 lines (hard limit) | Refactor into modules. WARN at 300, BLOCK at 500. |
| Function parameters | ≤ 5 positional | Convert to a single options object. BLOCK at 6+. |
| Cyclomatic complexity | ≤ 10 per function | Extract sub-functions. WARN at 10, BLOCK at 15. |
| Indentation depth | ≤ 4 levels | Early return, extract function. WARN at 4, BLOCK at 5. |

### Style rules specific to AI-generated code

| # | Rule | Why |
|---|---|---|
| R1 | **No clever one-liners.** No chained ternaries, no nested optional chaining beyond 2 levels, no regex without a comment explaining intent. | AI loves cleverness; humans hate debugging it |
| R2 | **Match adjacent style.** When editing a file, match the patterns already there — naming, async style, error handling. Don't refactor opportunistically inside an unrelated change. | Iterative AI edits cause silent style drift |
| R3 | **Comment density is low by default.** Explain *why*, never *what*. The code shows the what. | AI tends to over-comment generated code |
| R4 | **No multi-paragraph docstrings.** One-line summary, max. Detail belongs in `docs/` or the type signature. | AI generates verbose JSDoc that no one reads |
| R5 | **No decorative comments.** No `// =====`, no ASCII banners, no `// Initialize variables`. | Visual noise, no signal |
| R6 | **No "AI signature" patterns.** Avoid tells: extra blank lines for "spacing", over-explanatory variable names like `userInputThatCameFromForm`, redundant `as Type` casts. | Generated code should be indistinguishable from human-written |
| R7 | **Naming describes IS, not DOES.** `userRepository` not `getUserStuff`. `pendingApplications` not `apps`. | Already in coding-standards; reinforced here |
| R8 | **One concept per function.** If you can't name it without "and", split it. | Already in coding-standards; reinforced here |

### Comment density check

```typescript
// BAD — explains what, not why
// Loop through users and check if email is valid
for (const user of users) {
  if (validateEmail(user.email)) { ... }
}

// BAD — decorative
// =================================
// USER VALIDATION
// =================================

// GOOD — explains why (non-obvious constraint)
// Skip soft-deleted users — listing endpoint excludes them but bulk-import receives raw rows
for (const user of users) {
  if (user.deleted_at) continue
  if (validateEmail(user.email)) { ... }
}
```

---

## 5. Verification Mandate

A claim of "done" is a claim that the work has been verified. AI cannot claim done without evidence.

| # | Rule | Enforcement |
|---|---|---|
| V1 | **Lint must run before "done"** — and pass. If the project's lint command isn't configured yet, say so explicitly: "Lint not configured; manually verified naming and formatting." | BLOCK |
| V2 | **Tests must run before "done"** — and pass. Including the new tests added in this task. "Tests should pass" is not the same as "tests pass". | BLOCK |
| V3 | **Bug-fix verification.** Before fixing a bug, reproduce it. After fixing, confirm the original repro no longer triggers and the regression test catches a re-introduction. | BLOCK |
| V4 | **Feature verification.** Acceptance criteria are explicit pass/fail tests. Walk through each one and report status. | BLOCK |
| V5 | **If verification can't run** (no test framework yet, no environment, dependency missing), **say so explicitly.** Don't claim done; claim "implemented but not verified — blockers: [list]". | Required behaviour |
| V6 | **No retroactive verification.** "I'll run tests after merge" is not allowed. | BLOCK |
| V7 | **Type-checker, where applicable.** TypeScript / PHPStan / Pyright must be green. | BLOCK |

### Verification report format (end of task)

```
## Verification

✅ Lint: `npm run lint` — passing (0 errors, 0 warnings)
✅ Typecheck: `npm run typecheck` — passing
✅ Tests: `npm run test` — 47/47 passing (added 4 new tests)
✅ Acceptance criteria:
   - AC-01: Users can submit application — verified, returns 201
   - AC-02: Duplicate detection — verified, returns 409 CONFLICT
   - AC-03: Tenant isolation — verified, returns 404 cross-tenant
⚠ Skipped: snapshot regression — Storybook not configured yet
```

---

## 6. Code Provenance & Drift Prevention

When AI iterates on a file, naming, error patterns, and style tend to drift. These rules contain that.

| # | Rule |
|---|---|
| D1 | **Refactors are their own task.** Don't bundle a refactor into a feature commit. If you spot something to clean up, propose it as a separate task. |
| D2 | **Mid-task scope creep = stop.** New work discovered mid-implementation gets a new ticket, not extended into the current PR. |
| D3 | **Match existing patterns first.** If the codebase uses one auth pattern, two error-handling styles, and one repository pattern — use those, even if you'd write it differently from scratch. |
| D4 | **AI-touched files don't get auto-renamed.** If an AI edit makes you want to rename a variable for clarity, that's a separate refactor task — don't slip it into a feature change. |

---

## 7. Severity for AI Rule Violations

| Severity | Examples | Action |
|---|---|---|
| **CRITICAL** | Hallucinated function call shipped to prod, fabricated security claim, "done" reported without running tests | Roll back the change. Lessons entry mandatory. |
| **BLOCK** | Plan-and-confirm skipped on multi-step task, half-implementation, stub committed, missing verification | Cannot merge. Fix and re-review. |
| **WARN** | Comment density too high, function close to length limit, missing file:line citation | Acknowledge in PR description; fix or justify. |
| **NIT** | Decorative comment, slightly verbose docstring | Discretionary. |

A pattern of `BLOCK` violations from AI tools is itself a meta-issue — log to [tasks/lessons.md](../../tasks/lessons.md) and adjust prompts/context until the pattern stops.

---

## 8. Quick-Reference Card (for prompt priming)

When invoking AI for code work in this project, paste this as a header:

```
You are writing production code in this project. Follow .claude/rules/ai-coding-rules.md.

Hard rules:
- Verify before claiming. Cite file:line. Don't guess — ask.
- For tasks > 3 steps: write a plan, wait for explicit "go" before coding.
- No half-implementations, no stubs, no TODOs without tickets.
- Functions ≤ 50 lines, files ≤ 300 lines, ≤ 5 params, complexity ≤ 10.
- Run lint + tests before claiming "done". If you can't, say so.
- Match adjacent code style. Don't bundle refactors into feature work.

Restate the rules above in one sentence to confirm context, then ask me what to build.
```

---

## Cross-References

- [coding-standards.md](./coding-standards.md) — universal correctness, structure, SOLID
- [review-rules.md](./review-rules.md) — pre-review checklist, severity labels
- [testing-rules.md](./testing-rules.md) — coverage expectations, test pyramid
- [security-rules.md](./security-rules.md) — non-negotiable security rules
- [dod-rules.md](./dod-rules.md) — Definition of Done at story/sprint/release level
- [token-usage-rules.md](./token-usage-rules.md) — when to use AI, model selection
