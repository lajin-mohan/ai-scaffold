# /what-next

Tells the team exactly what to do next in the project workflow. Reads the current project state, identifies which stage you're in, validates what's complete, and outputs a clear next step with any missing pieces that must be resolved first.

Nobody needs to remember the workflow. Nobody skips a gate. Run this at any point to get oriented.

---

## Usage

```
/what-next
/what-next "{{feature or sprint name}}"
```

---

## How It Works

1. Read `CLAUDE.md` current state section, `tasks/todo.md`, `docs/` folder structure, and `.claude/memory/project-context.md`
2. **Run Stage 0 — Bootstrap detection first.** If the scaffold is uninitialized, output the bootstrap instruction and stop. No other stage is meaningful until Stage 0 is complete.
3. Otherwise, determine which stage the project or feature is currently in
4. Validate that all required artifacts for that stage exist and are complete
5. Identify what is blocking progress to the next stage
6. Output a single, unambiguous next action

---

## Stage 0 — Bootstrap Detection (runs before everything else)

A fresh copy of this scaffold has no project identity, no chosen stack, and no real artifacts. Until that's resolved, every later stage is meaningless.

**Bootstrap detection signals — if ANY of these are true, the project is at Stage 0:**

| Signal | Where to check |
|---|---|
| `{{PROJECT_NAME}}` placeholder still present | `CLAUDE.md` Project Identity table |
| `{{ONE_LINE_PURPOSE}}` placeholder still present | `CLAUDE.md` Project Identity table |
| `{{BACKEND_STACK}}`, `{{FRONTEND_STACK}}`, `{{DATABASE}}` etc. still placeholders | `CLAUDE.md` Tech Stack table |
| `{{IS_MULTI_TENANT}}` or `{{COMPLIANCE_SCOPE}}` not set to a concrete value | `CLAUDE.md` Project Identity table |
| `{{CURRENT_EPIC}}` / `{{SPRINT_NUMBER}}` placeholders still present | `.claude/memory/project-context.md` |
| Repository is not a git repo (no `.git/`) | Repo root |
| `apps/` and `packages/` are empty (no real source) | Repo root |

If Stage 0 fires, output the **Stage 0 instruction** below and stop. Do not evaluate fast lanes or Stage 1+.

### Stage 0 Output Format

```
## What's Next — {{REPO PATH or scaffold name}}
**Current Stage:** Stage 0 — Bootstrap (uninitialized scaffold)
**Status:** 🔴 BLOCKED — project identity not declared

---

### What's missing
- ❌ Project name, purpose, type still placeholders in CLAUDE.md
- ❌ Tech stack rows still {{...}} placeholders
- ❌ Multi-tenancy and compliance scope not declared
- ❌ Memory files (project-context.md) still scaffold defaults
- ❌ Not a git repository
- ❌ apps/ and packages/ are empty

### 🔴 Blockers
1. **No project identity** — every stage gate (BRD, architecture, estimation, code review) needs a declared project. The scaffold cannot reason about what is or isn't ready until the identity is filled in.
2. **No git repository** — branching rules, PR workflow, commit conventions are inert without `git init`.

### ⚡ Next Action
Run the interactive bootstrap command. It walks you through naming, stack, tenancy, compliance, and initial memory state — one decision at a time — and writes the answers into CLAUDE.md, .cursorrules, .github/copilot-instructions.md, README.md, and the memory files.

**Command to run:**
`/bootstrap`

After bootstrap completes, run `/what-next` again — it will then evaluate Stage 1.
```

### Rules for Stage 0

- Never skip Stage 0 by guessing values. The bootstrap command must be run, or the placeholders must be filled in by hand and verified before Stage 1 detection runs.
- If only some placeholders are filled (partial bootstrap), output Stage 0 with the specific missing rows listed.
- A `git init` alone does not satisfy Stage 0 — the identity placeholders must also be filled.
- Stage 0 has no fast lane.

---

## Fast Lane Detection

**Before evaluating the full 10-stage workflow**, determine if the work qualifies for the fast lane. Check the branch name, ticket description, or user-provided context.

| Signal | Lane | Reduced Path |
|---|---|---|
| Branch starts with `fix/*` or ticket is a defect in existing behaviour | **Bug Fix** | Stages 5 → 6 → 7 → 8 → 9 → 10 |
| Branch starts with `hotfix/*` or production incident | **Hotfix** | Stages 5 → 6 (AI review only) → 10 |
| Change is copy / colour / spacing / < 10 lines, no logic | **UI Micro-change** | Stages 5 → 6 → 7 |
| Branch starts with `spike/*` or task is exploratory | **Spike / PoC** | No gates — never merges to `dev` or `main` |
| Non-production script, internal admin utility | **Internal Tooling** | Stages 5 → 6 → 7 |

**Fast lane rules that always apply:**
- If a "bug fix" requires a new endpoint or schema change, escalate to the full workflow
- Hotfixes still require `/review` (Stage 6) before deploy
- Any fast-lane change touching auth, payments, or data access escalates to full security review
- Spikes produce a written summary or PoC — never shippable code

If the work qualifies for a fast lane, output the fast lane path instead of the full stage evaluation below.

---

## Stage Detection Logic

Evaluate each stage in order. The **current stage** is the earliest stage with incomplete required artifacts. Once you identify it, stop — don't evaluate later stages.

> **Stage 0 must already be complete before any of these are evaluated.** If Stage 0 detection fires, return the Stage 0 instruction without touching this section.

### Stage 1 — Analysis
**Required artifacts:**
- Solution analysis completed (`@solution-analyst` output exists or open questions resolved)
- BRD exists in `docs/brd/` and is marked approved

**Blocked by:** Unresolved assumptions or ambiguities from solution analysis

---

### Stage 2 — Plan
**Required artifacts:**
- Estimation exists in `docs/estimates/` and is signed off
- Sprint plan / phasing defined
- Scope statement produced (via `@pm`)

**Blocked by:** Missing or unapproved BRD from Stage 1

---

### Stage 3 — Architecture Design
**Required artifacts:**
- HLD exists in `docs/architecture/`
- API contract exists in `docs/api/` for all new endpoints
- API contract includes async operation pattern for any long-running operations (report gen, bulk export, large file upload)
- All list endpoints in the contract define pagination, sorting, and filtering
- LLD exists in `docs/architecture/` for each module
- Architecture review run (`/architecture-review`) with no unresolved BLOCK findings
- ADRs written for all significant decisions

**Blocked by:** Missing or unapproved estimation from Stage 2

---

### Stage 4 — UX Design
**Required artifacts:**
- Wireframes / screens exist in `docs/ux/`
- Component specs documented
- All states defined: loading, empty, error, populated
- Mobile layout specified
- UX approved by PM and stakeholder

**Blocked by:** Unapproved architecture from Stage 3

---

### Gate — /kickoff
**Required before Stage 5:**
- All 6 gates of `/kickoff` return PASS
- No outstanding BLOCKER items from the readiness check

---

### Stage 5 — Execution
**Required artifacts:**
- Feature branch created from `dev`
- Code implemented against approved spec and LLD
- Self-review checklist in `review-rules.md` completed by the author

**Blocked by:** Any unresolved /kickoff blocker

---

### Stage 6 — AI Review
**Required artifacts:**
- `/review` has been run on the feature branch
- All BLOCK findings resolved
- WARN findings acknowledged in PR description

**Blocked by:** Self-review checklist not completed

---

### Stage 7 — Manual Review
**Required artifacts:**
- PR opened with description referencing ticket and test plan
- At least one human reviewer has approved
- All review comments resolved or acknowledged

**Blocked by:** Unresolved BLOCK findings from Stage 6 AI review

---

### Stage 8 — QA
**Required artifacts:**
- `/gen-tests` run — complete test files written (unit, integration, component, snapshot as applicable)
- All P0 test cases passing
- QA sign-off from `@qa-reviewer` or QA team
- UAT completed with client sign-off (see `docs/qa/uat-*.md`)
- For async operations (report generation, bulk export, large file processing): job polling and failure paths tested

**Blocked by:** Open PR review comments from Stage 7

---

### Stage 9 — CI/CD
**Required artifacts:**
- CI pipeline green: lint, typecheck, unit tests, integration tests, build, audit all pass
- No coverage regression below baseline

**Blocked by:** Failing test cases or open QA defects from Stage 8

---

### Stage 10 — Deploy
**Required artifacts:**
- `/deployment-review` run with GO decision
- Release notes produced in `docs/deployment/`
- Rollback plan documented
- Smoke test plan ready

**Blocked by:** CI not green from Stage 9

---

## Output Format

```
## What's Next — {{FEATURE or PROJECT}}
**Current Stage:** Stage {{N}} — {{Stage Name}}
**Status:** 🟢 READY TO PROCEED / 🟡 IN PROGRESS / 🔴 BLOCKED

---

### ✅ Completed Stages
- Stage 1 — Analysis: BRD approved ✓
- Stage 2 — Plan: Estimation signed off ✓
- (list all fully completed stages)

### 📍 Current Stage: Stage {{N}} — {{Name}}
**Progress:**
- ✅ {{Artifact}} — exists and approved
- ✅ {{Artifact}} — exists and approved
- ❌ {{Artifact}} — missing or incomplete
- ❌ {{Artifact}} — missing or incomplete

### 🔴 Blockers (Must resolve before proceeding)
1. **{{Blocker}}** — {{What is missing, where it should be, which command or agent produces it}}
2. **{{Blocker}}** — {{Detail}}

### ⚡ Next Action
{{ONE clear instruction. Who does what, using which command or agent, producing which artifact.}}

**Command to run:**
\`{{/command or @agent instruction}}\`

**Output goes to:** `{{docs/folder/filename.md}}`

---

### ⏭ After That
Once the blockers above are resolved, Stage {{N}} is complete.
The next stage will be: **Stage {{N+1}} — {{Name}}**
Which requires: {{brief preview of what Stage N+1 needs}}
```

---

## Example Outputs

### Example 1 — BRD missing

```
## What's Next — User Onboarding Feature
Current Stage: Stage 1 — Analysis
Status: 🔴 BLOCKED

✅ Completed Stages
(none yet)

📍 Current Stage: Stage 1 — Analysis
- ❌ Solution analysis — not run
- ❌ BRD — not found in docs/brd/

🔴 Blockers
1. Solution analysis not completed — run @solution-analyst before writing requirements
2. BRD not created — required before architecture or estimation can begin

⚡ Next Action
Run solution analysis on the feature request, then generate the BRD.

Command to run:
@solution-analyst Analyse this feature: [describe the onboarding feature]
Then: /create-brd

Output goes to: docs/brd/brd-user-onboarding.md
```

### Example 2 — Ready to start coding

```
## What's Next — Billing Module
Current Stage: Stage 5 — Execution
Status: 🟢 READY TO PROCEED

✅ Completed Stages
- Stage 1 — Analysis: BRD approved ✓
- Stage 2 — Plan: Estimation signed off ✓
- Stage 3 — Architecture: HLD + API contract + LLD approved ✓
- Stage 4 — UX Design: Wireframes approved ✓
- /kickoff: All 6 gates passed ✓

📍 Current Stage: Stage 5 — Execution
- ✅ Feature branch created: feature/PROJ-42-billing-module
- ❌ Implementation not started

🔴 Blockers
(none)

⚡ Next Action
Begin implementation. Code against the approved LLD at docs/architecture/lld-billing.md
and the API contract at docs/api/billing-api-contract.md.

When complete, run the self-review checklist in .claude/rules/review-rules.md
before proceeding to Stage 6.
```

---

## Rules

- Always read the actual project files — never guess the current stage from conversation context alone
- If the current stage cannot be determined (no artifacts found anywhere), output Stage 1 as the starting point
- Never suggest skipping a stage in the full workflow — even if the team says a stage is "done verbally"
- Fast lane paths are the only valid exception to stage skipping — and only when the work genuinely qualifies
- If an artifact exists but appears incomplete or has open questions, mark it ⚠️ not ✅
- The "Next Action" must be a single, concrete instruction — not a list of options
