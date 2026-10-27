# AI Scaffold — Backlog

## Authoritative priority review — 2026-10-13

The maintainer requested this reorder following a repository and primary-source
review. **This section supersedes every historical ordering, priority label and
rating forecast below.** Existing ticket IDs remain stable. This changes the
backlog, not shipped governance or approved implementation specifications. New
work is proposed and requires the normal design/implementation gates.

### Evidence and status boundaries

- The checkout advanced to 0.16.1 during this review (`e49847a`); npm version
  and dist.integrity were verified on 2026-10-13. Tag/Release Action/provenance
  and per-feature packed-output checks were not reverified in this doc task.
- Item 94 is complete: the maintainer verified decoy probes against installed
  npm 0.16.0 and 0.16.1, with a positive control in Windows CI. Preserve this
  evidence; do not schedule verification already performed as new P0 work.
- Item 25 is the top remaining P0, targeting **0.17.0**. *(Status 2026-10-27.)*
  Slices 1–4 are merged: design (#149, #156), foundations (#157), the
  read-only preview (#158) and `ais update --apply` (#159). Slice 5 (the
  real-install compatibility matrix) is in #164. The 0.17.0 release is not
  approved; the registry shows 0.16.1.
- Items 60 and 66's first slice have recorded merge evidence. Windows CI and
  Ubuntu packed-artifact golden paths exist; `init` hooks/rest of 66 remain open.
- Items 77 D1/D2/D4, 85, 95 (with basic 86 guidance) and 96 **shipped in
  0.16.1** (#154; registry showed 0.16.1 on 2026-10-23); 85, 95 and 96 are in
  `tasks/done/`. Item 77 D3 and item 86 network/domain protections remain open.
- The maintainer reports full-suite CI green on Ubuntu and Windows for this
  session's PRs. That is distinct from this review's local test-run limitation.
- Review checks: lint and typecheck passed (37 JS files, 4 gitleaks configs).
  Syntax checks passed when run with permission to spawn child processes.
  Tests could not
  start under local Node 21.2 (`node:util.styleText` missing); the syntax wrapper
  initially hit child-process `EPERM`. These are not passing-suite claims.

### Priority definitions

- **P0:** security/enforcement defects, safe updates, truthful verification and
  support claims; exit before broad rollout.
- **P1:** dependable team adoption, context, maintainability, cross-tool support,
  measurable outcomes and minimal deterministic state.
- **P2:** optional extensions with demonstrated task benefit.
- **P3:** demand-led expansion; no automatic v1.0 requirement.

### Execution order

Rows are ordered within tiers. Independent additive fixes and measurement can
start early; migration dependencies govern rollout to existing installations.

| Order | Tier | Items | Outcome | Dependency / required validation |
|---:|---|---|---|---|
| 1 | P0 | 25; 15 transaction-evidence slice | Ownership-aware update for 0.17.0: preview, conflicts, deletion, base-aware settings merge and recovery | Resolve pending decisions/approved design first; packed prior-to-current upgrades for create AND init; unknown paths untouched, user data preserved, write failure/recovery and idempotence tested |
| 2 | P0 | 79/81/86 security slice; **97 new** | Native permissions/isolation and adversarial control tests | Additive protections need not wait for 25. Windows/Linux allowed and blocked probes without optional parsers; shell access, injection, timeouts and missing controls covered |
| 3 | P0 | 80/82/83/87/89; 79/81 removals; 88 core defaults; **102A new** | Remove inert/duplicate hooks and command collisions; one verify contract; honest runtime support; respect existing design system | 25 before adopter removals. All packed profiles execute checks; no per-prompt verification; failures/skips distinct; oldest/current supported runtime tested; imposed branding removed; no shipped `test:e2e`/gstack instruction a generated project cannot run (102A) |
| 4 | P1 | remaining 21/22 | Release documentation/workflow hygiene | Reconciled status is not open work; retain only remaining checks/input validation and use the Release Action contract |
| 5 | P1 | 76 → 67; **98 new** | Maintainer/adopter separation and actual cross-tool conformance | Preserve root CLAUDE.md authority; test declared tool versions; root placeholders removed; unsupported commands/hooks explicit |
| 6 | P1 | 85 → 84; 69/T2/T5; 95 | Accurate context measurement and concise default core | Verify existing 85/95 work; compare actual session loading and task quality before/after; required guidance retrievable; no disk-size-as-context assumption |
| 7 | P1 | 77/78/96; remaining 66; 92; 16 | Reliable init/onboarding, composed hooks and diagnostics | Existing README/hooks/config/custom commands survive; missing skeleton installed; repeated init safe; hooksPath/worktrees covered; unavailable checks remain distinct |
| 8 | P1 | 34; 68 | Shared base/stack overlays and reusable mechanical skill scripts | 25 ownership contract + 76 separation; all five packed outputs preserve intentional differences; shared-file drift checked; script invocation/location verified |
| 9 | P1 | 74B/55; **99 new** | Representative task evaluations and repeatable adopter measurement | Define baseline/tasks early, compare after changes; report correctness/rework/review time/cost/nulls; no causal claim from two pilots |
| 10 | P1 | 75; 70/71 remaining server controls; 19 minimal CI slice | Effective rulesets/check enforcement beyond bypassable local hooks | Doctor read-side evidence; sandbox repo proves denied direct push, failed required check and permitted release path; least-privilege bypass identity |
| 11 | P1 | 73 → 72; 93; **100 new** | Minimal schemas, computed state/health and consistent roadmap | Begin with status/dependencies/blockers/next action; identical input yields identical state; cycles/missing evidence explicit; score weights/checks documented |
| 12 | P1 | remaining 15; 27; 17; 28 | Local lifecycle audit, repair/uninstall previews and current CLI docs | After 25 ownership model; no telemetry by default; redacted records; preview writes nothing; user edits survive; help/docs agree |
| 13 | P2 | 90; 19 optional pack; 91 + **102B** (first in row); design manifest/88 extension | Optional process/compliance/API/UX/E2E packs | 34 + 25 + 87; core 88 fixes stay P0. Reversible pack lifecycle; preserve existing tokens; execute E2E/accessibility when installed; E2E pack = Playwright + Playwright Test Agents, deterministic CI, no model needed to run (102) |
| 14 | P2 | 51 → 52 → 53; T6 | Optional context provider after successful retrieval pilot | 99 task baseline; no accuracy regression; stale/missing index falls back; verify source; exclusions/privacy tested |
| 15 | P2 | 48/49/50 | MCP/plugin distribution and capability maintenance | Declared versions, least privilege, credential redaction, unavailable-service behavior and safe lifecycle verified; no governance overwrite |
| 16 | P3 | 30; 23; 31/32/33 beyond packs; 42/43 extensions | Additional stacks and specialist research/handoff/approval flows | Promote only for adopter demand and measurable benefit; no new profile without packed golden path and maintenance owner |

**Approval boundary:** remaining item 66 validates objective approval evidence;
AI assertions/transcript keywords are not human authorization. **Risk boundary:**
extend 76/87 guidance for security, data loss, external effects and uncertainty,
not just line/step counts. Existing approval rules remain until changed normally.

### Delivery waves

1. **P0-A:** row 1, safe updates as the top remaining P0. Independently safe
   additive protections and probes in row 2 can proceed without blocking 25.
2. **P0-B:** row 3, corrective migrations after update safety. No known blocking
   control defect remains on a platform claimed as supported. A new-install
   patch alone cannot remove hooks/commands from existing installations.
3. **P1-A:** rows 4–8, release hygiene, governance/context/init reliability and shared templates.
4. **P1-B:** rows 9–12, outcome proof, server controls, minimal state and lifecycle.
   Evaluation design starts earlier; results follow implementation under test.
5. **P2:** rows 13–15, each extension passes its own benefit gate.
6. **P3:** row 16, demand-led; not an automatic v1.0 gate.

### Validation required before tier closure

- [ ] Lint, actual syntax/config checks and tests pass on a recorded runtime;
  skipped/unavailable checks are disclosed rather than counted as success.
- [ ] All five profiles generate from npm pack and execute documented first
  commands; declare tested and unsupported platform/profile combinations.
- [ ] Windows/Linux checks run; macOS is verified or marked unverified. Separate
  consumer CLI support from maintainer/test-tool runtime requirements.
- [ ] Cover create/init/repeated init/upgrades, dirty and user-edited fixtures,
  non-default hooks paths and worktrees.
- [ ] Security probes include allowed/blocked cases and positive controls;
  shell-based access, injection, missing parsers, denied execution and timeouts
  do not silently bypass claimed controls.
- [ ] Update covers conflict, managed deletion, unknown ownership, base-aware
  settings merge, traversal/symlink escape, interruption, recovery and no-op rerun.
- [ ] Record artifact commit/version, tool/runtime, command, exit status and
  relevant output; exclude credentials and personal data from evidence.
- [ ] Exercise claimed AI-tool integrations in those tools; a pointer file alone
  proves neither instruction loading nor enforcement parity.
- [ ] Measure loaded/invoked/scoped context; optimization preserves required
  security and verification guidance and does not worsen task correctness.
- [ ] Pilot reports include failures, human corrections, review burden and
  sample limits; missing observations stay null; code volume is not productivity.
- [ ] Release Action/tag/package/npm version/provenance agree; CHANGELOG explains
  removals, incompatibilities and existing-adopter migration steps.

### Projected rating after validated implementation

Cumulative expert forecasts, not benchmarks or promised scores. Baseline is the
2026-10-13 checkout review, replacing the historic post-0.9.0 ratings.

| Milestone | Overall forecast | Evidence needed |
|---|---|---|
| Current | **6.5/10** | Strong principles/artifact CI; update/enforcement/context/tool gaps remain |
| P0 complete | **7.5–8.0**, central **7.8/10** | Safe updates, working controls, honest verification/support |
| P0 + P1 | **8.3–8.7**, central **8.5/10** | Maintainable multi-tool team adoption and repeatable pilot evidence |
| P0 + P1 + value-validated P2 | **8.7–9.0**, central **8.9/10** | Extensions improve real tasks without accuracy/maintenance regressions |
| Demand-justified P3 | **No automatic increase** | Sustained independent adopter evidence could justify **9.0+** |

A v1.0 candidate requires P0/P1 exit evidence, explicit support/ownership policy
and representative adopter validation. Graphify, MCP, marketplace and every pack
are not prerequisites. Critical security/data-loss defects block broad adoption
regardless of an average score.

### Research basis (reviewed 2026-10-13)

- [Claude memory](https://code.claude.com/docs/en/memory) and
  [hooks](https://code.claude.com/docs/en/hooks): actual context-loading and
  enforcement semantics, concise core and scoped guidance (76/79–87/97).
- [OpenAI security](https://learn.chatgpt.com/docs/agent-approvals-security) and
  [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md):
  native discovery, sandbox and approval boundaries (67/98).
- [Anthropic effective agents](https://www.anthropic.com/engineering/building-effective-agents)
  and [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):
  simple workflows and selective context; provider expansion follows evaluation.
- [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final) and
  [OWASP ASVS](https://owasp.org/projects/asvs): verifiable security objectives,
  release integrity and applicable controls rather than universal architecture.
- [DORA AI-assisted development](https://dora.dev/research/2025/dora-report/):
  organizational/delivery outcomes inform 74B/99.

Ordering and forecasts are this review's inference from sources and repository
evidence. These sources do not rate AI Scaffold.

**Context-cost boundary:** NIST SSDF, OWASP ASVS and DORA stay cited references
in docs/ADRs. Do not copy their full guidance into always-loaded rules. Only
concise, applicable project requirements belong in the core; details load on demand.

### Maintainer follow-up A–E

- **A + E (this reconciliation):** release/status cleanup and acceptance areas
  attached to 67 (98), 81/87 (97) and 74B (99); completed entries archived at
  [completed history](roadmap-completed-history-2026-10-13.md). CHANGELOG remains
  the shipped record; partial/open scopes stay here.
- **B (optional, proposed 0.16.2):** remove pre-review UserPromptSubmit wiring
  for new projects; add best-effort ask rules for common shell secret reads with
  explicit sandbox guidance. Requires a separate approved implementation.
  Validate packed new installs, benign commands and prohibited probes; do not
  describe Bash pattern rules as a security boundary or an existing-adopter fix.
  Existing-project removals still need 25 (or explicit documented manual steps).
- **C (planned with 84, or a separate small rules change):** proportional approval
  for security/data/schema/irreversible actions and scope changes; already
  authorized routine work does not require repeated approval. AI architecture
  review is advisory; a human remains accountable for approval/merge. Test a
  routine authorized task and a high-risk task; update conflicting rules together.
- **D (76/84):** label architecture-specific security rules with applicability,
  such as multi-tenancy, authentication design and framework-specific paths.
  Validate both applicable and non-applicable fixtures without weakening
  universal secret-handling, authorization and input-validation requirements.

### Newly added work

- **97 — Adversarial controls (P0):** `tasks/todo/97-adversarial-controls.md`.
- **98 — Cross-tool conformance (P1):** `tasks/todo/98-cross-tool-conformance.md`.
- **99 — Task evaluations (P1):** `tasks/todo/99-task-evaluations.md`.
- **100 — Roadmap consistency (P1):** `tasks/todo/100-roadmap-consistency.md`.

### Proposed revision — 2026-10-26 (pending maintainer acceptance)

Evidence: [effectiveness review 2026-10-26](effectiveness-review-2026-10-26.md).
The approved order above stands until accepted; ticket status is unchanged.

1. **25** — unchanged top P0 (slice 3 merged in #158; slice 4 draft #159).
2. **Follow-up B promoted to 0.16.2, with 79/81 guard honesty.**
   `UserPromptSubmit` ignores matchers, so pre-review runs on every prompt;
   in Go projects that is a full build/vet/test per prompt. The secret guard
   fails open under the Windows Store `python3` alias without `jq`. New
   installs only; existing-adopter removal still needs 25.
3. **97 + 80/87** — test native deny/ask, the layer that actually enforces,
   across default/auto/bypass modes on native Windows and WSL2. State that
   native Windows has no OS sandbox. Dangerous-Bash regex gaps are P1:
   native `ask` rules already cover them outside `bypassPermissions`.
4. **99/74B** — start the evaluation design now, in parallel with 2–3;
   snapshot #2 follows the 2026-08-27 baseline rules.
5. **84/69/88 + 76-D, then 98** — concise core measured against the 99
   baseline; exercise Cursor hook loading before adding adapters.

Stale, to correct with #160: line 24 (an update engine exists on `dev`,
#158) and line 860 (`design-system/scripts/check-tokens.sh` exists).

## Historical scope catalogue (scheduling superseded)

The following sections retain item definitions and investigation/decision
history. Their obsolete schedules and rating forecasts are not active plans;
the table above governs execution. Closure still needs artifact evidence.


### New work definitions

- **72. Deterministic project-state engine.** Compute lifecycle stage, accepted
  and proposed decisions, approvals, dependencies, requirement/test coverage,
  estimate validity, blockers, and next permitted action from validated
  structured artifacts. Item 73 is a prerequisite. Repeated runs over the same
  commit must return identical state. *(P1, medium–large)*
- **73. Structured artifact schemas.** Define minimal machine-readable metadata
  for BRDs, ADRs, tasks, and handoffs: identity, status, phase, owner, approval,
  dependency, supersession, evidence, and requirement/test references. Preserve
  readable Markdown bodies and operational checklist restatement. *(P1, medium)*
- **78. `init` overwrites the generated scaffold README with the namespaced
  project README template.** Found 2026-09-01 while closing item 26's
  distribution gap. `file-plan.js` lists `.ai-scaffold/README.md` in
  `alwaysGenerate`, and `resolveGeneratedTargetRel` ALSO namespaces the
  profile's `README.template.md` to `.ai-scaffold/README.md` when
  `existingTarget` is true. In `copy.js:generateFile` the
  `relPath.endsWith('README.md') && src` branch is tested first, so on `init`
  the template copy wins and `buildScaffoldReadme` never runs. Every
  init-installed project therefore has a `.ai-scaffold/README.md` that is a
  generic project README — profile, lifecycle stage, data sensitivity,
  compliance scope and the requirements link are all silently absent, and
  `doctor` does not catch it because its scaffold-context check reads
  `context.md`. Not fixed in item 26's closure slice: the fix is either a
  rename (which moves a file adopters may already have edited) or a precedence
  change in `generateFile`, and both deserve their own change. Item 26's CLI
  reference was given its own path to route around this rather than inherit it.
  **Size: S.** Sequence after item 25.

- **77. 🟡 D1, D2, D4 fixed for 0.16.1 (`tasks/todo/77-placeholder-gaps.md`).**
  - The fix also covered a worse defect found in review: substitution rewrote
    `what-next.md`'s own Stage 0 table in every generated project.
  - **Open:** D3 (eight hardcoded `N/A` tech-stack rows, a product decision).
  - **Open:** other files that *describe* project tokens rather than use them
    (`bootstrap.md`; template-state only).

  Original finding:
  **Placeholder-substitution gaps in generated projects.** Audited 2026-08-27
  by generating real projects (`ais create --profile node --yes`, 159 files) and
  inspecting the output, not by reading the templates. **The mechanism is sound**
  — identity, stack, commands and every generated file (`MEMORY.md`,
  `constitution.md`, `README.md`, `CHANGELOG.md`, `lessons.md`,
  `.ai-scaffold/context.md`) come out clean. 49 of 159 files contain `{{…}}`, and
  all but one are **authoring slots** in agent output formats and doc templates
  (`{{DATE}}`, `{{ScreenName}}`, `{{FEATURE_NAME}}`) or GitHub Actions
  `${{ github.* }}` syntax. Three real gaps, all in the token map rather than the
  machinery:

  **D1 — `.claude/memory/project-context.md` ships with live `{{CURRENT_EPIC}}`
  and `{{SPRINT_NUMBER}}`.** It is a state file, not an output template, and
  `what-next.md:61` names exactly those two as a **Stage 0 bootstrap-detection
  signal that halts before every other stage**. So `/what-next` in a
  freshly-created project reports *"🔴 BLOCKED — run `/bootstrap`"* while
  `.ai-scaffold.json` says `bootstrapped: true`. Root cause is token-name drift:
  the map wires `{{EPIC_NAME}}` (present in 15 template files, substitutes
  correctly) while the memory file uses the unmapped `{{CURRENT_EPIC}}`. **The
  value already exists** — `settings-overrides.json` carries
  `project.firstEpic`. One-line fix.

  **D2 — `lifecycleStage` is collected, computed, stored, and then overridden.**
  `content-templates.js:28` maps
  `'{{Active Development / MVP / Production}}'` to the **literal string**
  `'Active Development'`. Verified: `create --lifecycle-stage production` yields
  `.ai-scaffold/context.md` → `production` and `settings-overrides.json` →
  `"status": "Production"`, while `CLAUDE.md` → `**Status** | Active
  Development`. Two shipped files state different facts about the same project,
  and the correct value is two files away.

  **D3 — 8 tech-stack rows are hardcoded `N/A` and never asked**: `CACHE_QUEUE`,
  `AUTH_STRATEGY`, `EMAIL_PROVIDER`, `STORAGE`, `CLOUD_PROVIDER`, `IAC_TOOL`,
  `REPO_URL`, `SEED_COMMAND`. Three more are hardcoded to opinions with no flag
  to change them: `CICD_PLATFORM` = GitHub Actions, `PM_TOOL` = GitHub Projects,
  `LICENSE` = UNLICENSED. Of 34 tokens, **21 are sourced from user input and 13
  are constants**. A team on GitLab CI and Jira gets a `CLAUDE.md` Tech Stack
  table that is confidently wrong, and every agent prompt reads it as truth.

  **D4 (trivial) — `{{RUNTIME}}` is a dead token**: in the map, absent from all
  templates.

  **Fix order:** D1 (one token, removes a day-one "your new project is broken"
  message), D2 (one line, removes a contradiction between two shipped files),
  then D3 — which is a product decision, not a bug: either ask for the 8 values,
  or stop printing a table that implies they were chosen. D4 with either.
  *(P1, small for D1+D2+D4; medium for D3)*
- **75. The shipped branch-protection script writes only the legacy surface and
  is blind to rulesets.** Found 2026-08-27 while running item 26's API spike
  against this repository. `scripts/setup-branch-protection.sh` — which ships to
  **all 5 profiles** at `.ai-scaffold/setup/` — writes exclusively to
  `PUT /repos/{o}/{r}/branches/{b}/protection`, the legacy API. Its only two
  references to rulesets are `echo` lines telling the operator to configure them
  by hand. GitHub applies **both** mechanisms where both exist, so on a
  ruleset-governed repository the script's settings coexist with ruleset rules
  rather than replacing them, and the script prints `OK` either way.

  **Demonstrated on this repository, which is the specimen and not the problem**
  (the scaffold repo is deliberately not a governed project): ruleset
  `protected-main` sets `require_last_push_approval: false` and
  `dismiss_stale_reviews_on_push: false`, while the script's payload sets
  `require_last_push_approval: true` and `dismiss_stale_reviews: true`. The same
  two controls carry different values on two surfaces simultaneously, and the
  script reports neither. The defect is that **a shipped tool configures
  governance it cannot observe** — harmless here, load-bearing in an adopting
  team's repo where the governance is real.

  This is the write-side twin of item 26. Item 26 makes the state *readable*;
  this item makes it *manageable*. Rulesets are increasingly the default for new
  GitHub organisations, so a generated project's protection may be governed
  entirely by a surface the shipped script cannot see or set. **Sequence after
  item 26** — the read side establishes what "effective" means before the write
  side tries to converge on it. *(P1, medium)*
- **76. Give the scaffold repository its own governance.** Raised 2026-08-27.
  **The problem is not duplication, it is two identities in one file set.** Root
  `CLAUDE.md`, `.claude/`, `AGENTS.md` and `.cursorrules` are filled-in copies of
  the project template, so an agent working here reads rules written for a team
  building a SaaS application. It cannot tell whether it is editing the tool or a
  project built with the tool, and it inherits a 10-stage BRD → architecture →
  UX → code workflow for work that is actually "edit a Markdown rule, bump a
  version, cut an npm release."

  **The directory layout is already correct.** `/.claude` is the scaffold's;
  `/templates/*/.claude` is what ships. Nothing needs restructuring. Root's
  *contents* were seeded from the template and never rewritten. This is an
  authoring job, not surgery — which makes it far smaller than it first looks.

  **Evidence.** Root `CLAUDE.md` is a hand-maintained fork of the template at 69
  changed lines. Root `.claude/` is a 6th copy: agents **17/17 identical**,
  commands **33/35**, templates **13/13**, rules **9/17**. Root's Tech Stack
  table is 11 rows of `N/A — CLI tool`, present only because the template has a
  Tech Stack table. Root loads 10 `/ux-*` commands and 4 UX agents that have no
  meaning when the deliverable is a CLI. `.cursorrules` (**8**),
  `.github/copilot-instructions.md` (**6**) and
  `.claude/memory/project-context.md` (**6**) still carry live project
  placeholders, and `/bootstrap` correctly never runs here, so they stay
  un-substituted forever.

  **Mechanism constraint.** Claude Code loads `CLAUDE.md` **by filename**, so the
  `README.md` / `README.scaffold.md` naming cannot be mirrored: a sibling
  `CLAUDE.scaffold.md` would never be read. Scaffold-owned content goes *in* root
  `CLAUDE.md`; the project template lives only under `templates/`.

  **Shape.** Root files are rewritten for the work actually done here — verify
  the packed tarball not the working tree; a release is not shipped until
  `npm view` confirms it; change all 5 profiles or none; a root placeholder is a
  defect; when a flow is designed out, its docs go in the same change. A draft
  scaffold-owned `CLAUDE.md` exists on `docs/scaffold-self-governance`:
  **144 lines / ~1,600 est-tokens against 486 lines / ~7,170 today**, a ~78%
  reduction in what loads every session. Same treatment for `AGENTS.md`,
  `.cursorrules`, `.github/copilot-instructions.md` and `.claude/memory/*`, whose
  files should hold real scaffold state rather than template stubs.

  **The real cost, recorded.** Today the root copy is read by agents daily, so
  defects in the shipped corpus surface through use. Stop dogfooding and nothing
  exercises it. The mitigation is item **65's follow-up** — CI that generates a
  project and runs its documented commands. **This item makes 65's follow-up more
  important, not less.**

  **Guard against silent re-merge.** Add an assertion to
  `scripts/pre-publish-smoke.sh` — product QA, not a governance gate on this repo
  — that root governance files contain no project placeholders and are not
  byte-identical to their `templates/generic/` equivalents. Without it, the next
  file copied up to root quietly recreates the problem.

  **Decision 2026-10-09 (maintainer): two memories that never interfere.** This
  repository's memory, used to develop ai-scaffold, and a generated project's
  memory, owned by that project's team, are separate things. Neither may read,
  copy or overwrite the other.
  - **Root `.claude/memory/` becomes this repo's real development memory.**
    Delete the template copies it does not use; fill `project-context.md` with
    real ai-scaffold facts and no placeholders. Verified 2026-10-09: **6 of 7**
    root memory files are byte-identical to `templates/node/.claude/memory/`.
    Only `known-issues.md` and `audit-log.jsonl` hold real development content.
  - **No copying in either direction** between root memory and
    `templates/*/.claude/memory/`. Shipped memory files stay blank templates.
  - **Guard both directions** in `scripts/pre-publish-smoke.sh`:
    - (a) fail if a root memory file is byte-identical to its template
      counterpart (the re-merge guard above, extended to memory);
    - (b) fail if any `templates/*/.claude/memory/**` or
      `MEMORY.template.md` contains development markers (backlog item
      references, scaffold version numbers, maintainer identity).

    (b) is new: (a) alone would not catch this repo's development notes being
    shipped to adopters.
  - **Already true, recorded for completeness:** the npm package ships no root
    `.claude/` or `tasks/` (verified against the packed 0.15.0 tarball). Item
    25's update never reads or writes a generated project's memory (BRD v1.1
    OC-01 user-data class). No command copies project content back into this
    repo.

  **Sequence before item 34.** Doing 76 first removes root from the equation, so
  34 designs base-plus-overlays for 5 uniform copies instead of 5 plus one
  special case. (This revises an earlier note that said either order worked.)

  **Affects M-08.** `token-report` measures the root corpus (94 files, 140,531
  est-tokens at 2026-08-27). Shrinking root changes what the metric counts;
  `docs/process/effectiveness-metrics.md` needs a note so snapshot #2 does not
  read the drop as governance being pruned. *(P1, medium)*

- **74. Scaffold-effectiveness baseline and metrics.** Acceptance extension:
  item 99 feeds Phase B with fixed starting states, independent correctness
  checks and reported failures. Scope: record install and
  golden-path success, upgrade conflicts, maintenance effort, bypass frequency,
  rework, escaped defects, and false completion claims. Capture the baseline
  before Wave 1 and publish metric definitions before interpreting improvement.
  *(P1, medium)*

---


---

## Team handover — historical Phase 0 scope

The CLI is being handed to a small team (2 pilot projects). These items directly
de-risk that handover and were surfaced by the 0.9.1 readiness/security review.
Item 25 is now P0. The completed safeguards below remain useful during its
incremental delivery and as recovery controls after it ships.

- **55 (was 52 — renumbered, collided with Phase 2 item 52). Pilot feedback
  loop.** Run the workshop, start the 2 pilots (1 new project, 1 existing),
  assign the five roles (owner / dev / QA / reviewer / scribe), and hold a
  20-min retro after the first real task. Pilot lessons re-prioritise Phase 1
  before major work starts. *(process, small)*

## Lifecycle — historical Phase 1 scope

The 2026-07-14 deferral is closed: two pilot projects make lifecycle support a handover
requirement. Implement in safe slices—ownership manifest, dry-run/conflict
report, backup/rollback, one real version migration, then broader automation.
The delete-and-reinstall safeguard remains a fallback, not the update strategy.

- **25. Real `ais update` (managed-file migration).** **P0 — next lifecycle
  programme.**
  Diff installed vs target version; classify each file (managed / protected /
  app-owned via `.ai-scaffold.json` hashes); preview the change set; apply with
  backup + rollback; version-pinned migrations. Converts the product from "a
  great starter kit" into "a governance platform a team stays current on."
  **Dependency added 2026-10-09:** the Corrective phase (items 79–89) runs after
  this item and deletes shipped files (hooks, commands, `roles/`). Item 25's
  migration format must support **removing** managed files, not only
  overwriting them, or adopters keep the defective hooks after updating.
  *(large)*
- **26. Drift-aware `status` / `doctor`.** **P0 first slice:** query and report
  effective branch/ruleset coverage, required checks, administrator bypass,
  and repository-hook installation—configured intent is not a pass. Then add
  managed-file drift and the exact `update` change/customisation boundary.
  GitHub checks degrade honestly when no authenticated remote is available.
  **Re-sized S → M (2026-08-27).** The "small" estimate priced the checks and
  omitted the `gh` query module, the five degradation paths, the mocked API
  fixtures and the `--json` backward-compatibility guarantee; the formal estimate
  is 7.8 / **15.4** / 28.8 days (corrected 2026-08-31 by `/review`, which
  also priced the missing Stage 3). Size selects the gate set, so this is recorded
  rather than assumed — `task-size-policy.md`: *"Escalation is not failure. It
  means the initial sizing was imprecise."* The lifecycle slice that follows is
  unchanged and still pairs with 25.
  *(M enforcement slice, then medium lifecycle slice; pairs with 25)*
- **15. Install/action audit trail.** Append-only record of CLI actions
  (create/init/update): version, files touched, timestamp. Feeds `update` safety
  and aligns with the governance/GDPR framing. *(medium)*
- **27. Repair / uninstall dry-runs.** Complete the lifecycle verbs so `update`
  isn't the only mutating path; both preview before writing. *(medium)*

## Corrective phase — scope and original decisions

The 2026-10-13 priority review above governs sequencing: independently safe
additive protections and probes can precede 25; adopter removal migrations
remain dependent on 25. Old decisions below are retained as history.

Raised 2026-10-09 by a repository-wide audit. It checked current Claude Code
documentation against a project generated from the packed 0.15.0 tarball, with
the hooks probed under Git Bash on Windows. The phase fixes controls that are
**configured but inert, or actively harmful**. It adds no new governance
surface. Full evidence, decisions (D1–D5), acceptance criteria and open
questions: `tasks/todo/79-corrective-phase.md`.

**Decisions (maintainer, 2026-10-09):**
- runs after item 25;
- removals are deleted in the next minor, not deprecated;
- the process corpus stops auto-loading now, with opt-in packs later;
- security moves to native permission rules and the regex guard hooks are
  deleted;
- the deny/ask rules ship early as a patch, ahead of item 25 (slice C0);
- `/review` is renamed `/ais-review`, because `/review` is the native
  alias of `/code-review` and a project command never replaces an alias;
- `pre-bash-quality-gate` is removed, console-log detection moves to lint, and
  governance edits become an `ask` rule;
- `/health` is kept without its self-graded sub-score.

**C0 — Interim security patch — ✅ SHIPPED in 0.15.1 (2026-10-09, #141), verified from the npm registry**
- **79a. Ship #79's deny/ask rules early.** Additive only, so it needs no update
  migration. Existing adopters get a paste-ready block in the release notes and
  `SECURITY.md`. *(S)*

Slices C1–C4 run in order after item 25. Each one ships to all five profiles and is verified against
the packed tarball.

**C1 — Broken enforcement**
- **79. Native security controls replace the regex guards.**
  - `permissions.deny` for secret reads, `permissions.ask` for destructive git
    and `rm`, and sandbox guidance.
  - Delete `pre-secret-guard.sh` and `pre-dangerous-bash-guard.sh`; drop
    `Bash(composer*)` and `Read(**)`.
  - Evidence: on Windows without `jq`, the Store `python3` stub makes the secret
    guard exit 0 for `.env` and `id_rsa`. The bash guard misses
    `git push origin main --force`, `rm -fr` and `curl | bash`, and blocks
    `rm -rf node_modules`.
  - *(S–M)*
- **80. Remove the per-prompt `pre-review` hook.**
  - `UserPromptSubmit` ignores matchers, so it fires on every prompt, and its
    `exit 1` is non-blocking.
  - The checks move to item 87, and the Stop-hook gate stays item 66.
  - *(XS)*
- **81. Make the remaining hooks portable.**
  - Acceptance extension: item 97 supplies allowed/blocked, positive-control and
    missing-dependency/timeout probes; share evidence with item 87.
  - Exec form with `${CLAUDE_PROJECT_DIR}`; no `jq` or `python3` dependency;
    hooks that enforce policy fail closed.
  - Pairs with item 60.
  - *(S)*

**C2 — Native collisions and dead weight**
- **82. Remove the commands that shadow native ones** (`/compact`, `/loop`).
  - Repoint about 16 referencing files per profile first.
  - Rename `/review` to `/ais-review` and repoint every reference.
  - *(S)*
- **83. Remove dead components, repointing references first** (item 69's
  ordering).
  - The 4 UX aliases, `roles/`, unwired `jira-sync.py` and `notify-review.py`,
    `token-budget-guard.sh` (it measures transcript size, then blocks Read and
    Edit) and `pre-write-fact-check.sh`.
  - Also `pre-bash-quality-gate.sh` (repeats the installed git pre-commit
    hook); `post-write-console-warn.sh` becomes a lint rule;
    `governance-file-guard.sh` becomes `permissions.ask` on governance edits.
  - Remove `/health`'s self-graded "hallucination guard" sub-score.
  - *(S)*

**C3 — Context load**
- **84. Stop auto-loading the process corpus.**
  - Path-scope or relocate the 16 unscoped rules, condense the core four, and
    get `CLAUDE.md` to 200 lines or fewer.
  - Supersedes T4. Packs are item 90.
  - *(M)*
- **86. Remaining WebFetch domain limits.** Basic prompt-injection guidance
  shipped with item 95 in 0.16.1. Configure/document the remaining network/domain
  controls and validate allowed, disallowed and unavailable cases. *(XS)*

**C4 — Verification and UX honesty**
- **87. Single `verify` contract and honest UI gates.**
  - Acceptance extension: item 97 proves failure/skip and enforcement behavior;
    an AI reviewer approval alone is not verification evidence.
  - One real `verify` script per profile, shared by the git hook, CI and the
    agent.
  - Playwright, mobile and theme DoD gates apply only when an E2E harness
    exists; otherwise the agent records an explicit "not verified" disclosure.
  - *(S)*
- **88. Respect the project's design system.**
  - Detect the project's own tokens first, with a neutral fallback.
  - Remove "WorkOS Minimal" and other real-company names from shipped skills.
  - *(S)*
- **89. Honest Node support range.** `engines` says `>=16`, but CI tests one
  version on ubuntu. *(XS)*

**Exit criteria:**
- The probe cases from the audit behave correctly in a tarball-generated project
  on Windows with no `jq`.
- No hook runs on every prompt.
- No project command shadows a native one.
- Always-loaded tokens are at or below the target set at estimate time
  (proposed ≤5k).
- `npm view` shows the release, which goes out through the Release Action with a
  CHANGELOG `Removed` section naming each native replacement.

**Follow-ups, not in this phase:**
- **90. Opt-in packs** (`ais add process|ux|compliance|api`) on item 34's shared
  base. Restores the full gated workflow as a choice, not a default. *(L)*
- **91. E2E pack**: Playwright config, one smoke journey,
  `@axe-core/playwright` and a 390px project, so item 87's UI gates can be
  satisfied. *(M)* Tool decision, `/qa` gstack replacement and the
  tester-army/e2e pilot (P3): `tasks/todo/102-e2e-testing-approach.md`.
- **92. Pre-commit review.** Two layers after the corrections land:
  - the git pre-commit hook as the automatic gate for every tool (lint,
    typecheck, fast tests, gitleaks, and item 66's commit-identity check);
  - `/ais-review --lite` as the judgement checklist (security and
    quality), which already escalates to the full review for auth, data and
    migration changes.

  This repositions existing pieces; it adds no new command. *(S)*
- **93. Deterministic `/health`.** Move the scoring into a script
  (`ais health` or `npm run health`) so the same code gets the same score; the
  command only runs the script and presents the result. *(M)*
- **95. Adopt the Karpathy-derived principles (ships in 0.16.1).**
  - Six operating principles in `ai-coding-rules.md`, with "Boil the Lake"
    narrowed to "Completeness within Scope" (maintainer, 2026-10-13).
  - Fixes root-only drift: PR #110's scope discipline and R9/R10 never reached
    adopters.
  - Ticket: `tasks/todo/95-karpathy-principles.md`.
  - **Follow-ups:** `.github/copilot-instructions.md` and `.cursorrules` still
    paraphrase the old five principles. They are excluded from the default
    install, so this is low impact.
  - *(S)*
- **96. `doctor`: "no git remotes found" reads as no-repository (ships in
  0.16.1).**
  - Found while verifying item 94: every local project without a remote saw
    "GitHub CLI failed for an unrecognised reason".
  - `classify` now maps it, and gh's "not a git repository", to `NO_REPO`.
  - Ticket: `tasks/todo/96-gh-no-remote.md`.
  - *(XS)*

## Optional integrations — historical Phase 2 scope

These are optional P2 capabilities under the authoritative table. They are not
v1.0 prerequisites or automatic rating increases; provider pilots precede
productization. Cross-tool conformance is P1 and does not wait for these packs.

- **51. Context-provider architecture + Graphify pilot (opt-in).** *highest
  large-existing-codebase value.* Add a provider abstraction where `filesystem`
  remains the default and `graphify` can be configured as an optional navigation
  provider, never a mandatory Python dependency. Pilot first on one real complex
  project before productizing: compare AI Scaffold alone vs. AI Scaffold +
  Graphify on 10 representative tasks (feature impact, bug investigation, review,
  architecture, onboarding, requirements-to-code trace). Measure input tokens,
  cache-write tokens, file reads/searches, time to useful plan, relevant files
  found, missed affected files, incorrect graph assumptions, review quality, and
  total task cost. Adopt only if the pilot shows a reproducible 25-30% median
  reduction in total input-token consumption for debug/architecture/review
  without increasing missed dependencies or false conclusions. *(medium pilot,
  medium/large productization)*
- **52. Thin context-provider CLI.** After a successful pilot, add provider-level
  commands without naming Graphify as the top-level product surface:
  `ais context status`, `ais context setup graphify`, `ais context build`,
  `ais context refresh`, `ais context query`, and `ais doctor --context`. Store
  provider state in `.ai-scaffold.json`; report provider version, graph path,
  graph source commit, freshness, exclusions, inferred-vs-extracted edge policy,
  and fallback mode. Filesystem fallback is required. *(medium)*
- **53. Governed Graphify adapter.** Integrate graph context only into
  `/start-task`, `/debug-fix`, `/review`, and architecture analysis at first.
  The graph is navigation evidence, not truth: agents must still read source
  files and verify with tests. AI Scaffold owns hook composition through its hook
  dispatcher; do not let provider installers overwrite `CLAUDE.md`, `AGENTS.md`,
  `.claude/settings.json`, or managed hooks. Generate conservative
  `.graphifyignore` defaults and ensure `graphify-out/` is excluded from
  `.claudeignore` so generated graph output does not invalidate prompt cache.
  Respect data classification: local AST-only mode by default for sensitive
  client repos; semantic document extraction must be explicit. *(medium/large)*
- **48. MCP connector pack (opt-in).** *highest external-tooling value.* Ship a
  `.mcp.json` scaffold + at least one connector (GitHub / issue-tracker) so
  `/start-task`, `/review`, and the reviewer agents can reach codebase-adjacent
  tools instead of only reading files. *(medium/large)*
- **49. Claude Code plugin packaging + marketplace.** `.claude-plugin/plugin.json`
  + a marketplace entry so a team installs the whole operating system (commands +
  agents + hooks + skills) once and gets versioned updates the Claude-native way —
  complements the npm CLI, which stays for `create`/`init`. *(medium)*
- **40 + skills. Humility + real Agent Skills.** Prune commands/agents that merely
  restate native Claude Code behaviour (smaller, sharper surface); migrate the
  reference-doc "skills" that should be model-invocable to real `<name>/SKILL.md`,
  or keep calling them reference docs. *(medium)*
- **50. Model-capability refresh (recurring).** Re-verify per-agent `model`
  routing, tool scopes, and prompts against the current Claude model line each
  release; record the review in the release checklist. *(small, recurring)*

## Lifecycle polish and expansion — historical Phase 3 scope

Items here span P1 through P3. Follow the authoritative table: shared templates
and onboarding precede optional integrations; new stacks require demand.

- **28. Per-command CLI reference** (docs). *(medium)*
- **38. Laravel first-class** — ship a minimal `composer.json` so the configured
  `composer install` / `composer test` work, or make laravel `init`-only and
  adjust its defaults. *(medium)*
- **19. Optional CI pack (opt-in)** — a real CI gate for generated projects. *(medium)*
- **34. De-duplicate the 5 profile templates** (shared base + overlays) — do this
  before the surface grows further. *(medium/high)*
- **16. Context auto-detection on `init`** (stack/framework sniffing). *(medium/high)*
- **17. Move lessons capture into `.ai-scaffold/`** (generator, templates,
  `/lessons`/`/reflect`, doctor, tests). *(medium)*
- **30. More stack profiles** (Next.js, Java, .NET, Flutter). *(medium)*
- **Strategic / optional:** 23 deep-research command, 31/32/33 QA-browser /
  UI-UX / enterprise-safe-hook packs, 42 agent-handoff chains, 43 change-approval
  audit trail.

## Token-efficiency workstream · cross-cutting

The scaffold spends tokens to buy correctness — a deliberate trade. This
workstream trims **waste** (redundancy, always-on-that-should-be-on-demand, the
5-agent fan-out on trivial changes) **without touching the guardrails**.
Graph/context providers may reduce repository-discovery tokens, but they do not
solve baseline prompt bloat. Ordered by token-saved-per-effort.

> **Caching note:** the upfront `CLAUDE.md` + rules load is prompt-cached, so it
> is a per-*session* cost, not per-turn. The **uncached** waste that repeats on
> every task is (a) the `/review` fan-out and (b) rules redundancy re-loaded
> fresh into each of the 5 subagent contexts (subagents don't share the parent
> cache). The top items target those — not the leaner-`CLAUDE.md` work, which
> caching already absorbs.

- **T2. Rules deduplication.** One canonical statement per concept,
  cross-referenced not restated (e.g. "parameterized queries" lives in 4 files
  today). Compounds across every subagent that loads rules. Content-preserving —
  cut duplication, not guardrails. *(medium, low risk)*

  **INVESTIGATED 2026-08-13 — the premise needs qualifying before this runs.**
  Measured duplication is worse than the estimate above: "parameterized
  queries" appears in **7** rules files (not 4), `tenant_id` in **10**, "PII in
  logs" in 5. Corpus is 24 files / 4,235 lines, ×6 profile copies.

  But most of that is **not redundancy**. The same concept serves four
  different jobs:

  | File | Form | Purpose |
  |---|---|---|
  | `coding-standards.md` | one-line hard gate | scannable summary |
  | `security-rules.md` | detailed rule + rationale | the canonical statement |
  | `dod-rules.md` | `- [ ]` checkbox | tickable Definition of Done |
  | `review-rules.md` | `- [ ]` checkbox | tickable review checklist |

  **The two checkbox forms must keep restating it.** A checklist item reading
  "[ ] see security-rules.md" is a worse checklist — a reviewer cannot tick a
  cross-reference, and pointer-chasing mid-review is exactly when a gate gets
  skipped. Applying "cross-reference, don't restate" uniformly would degrade
  the DoD and review checklists while saving a trivial number of tokens.

  **Corrected scope for T2 — where the real waste actually is:**
  1. **Stack overlays** — 8 files repeat near-identical layer-separation,
     validation, and testing prose in language-specific wording. Highest
     real duplication; genuine consolidation candidate. (Note: T3 already
     made these load conditionally, so the per-session cost is largely gone —
     the remaining win is maintenance, not tokens.)
  2. **Long explanatory prose** restated across `governance.md`,
     `ai-coding-rules.md`, and `coding-standards.md` — safe to make one
     canonical + cross-reference, since none of it is a checklist.
  3. **Explicitly out of scope:** any `- [ ]` checklist item, in any file.

  **Revised value:** lower than originally ranked. T3 already removed the
  per-session cost of the overlays, and the checklist restatement — the
  largest visible duplication — turns out to be load-bearing. Remaining
  benefit is maintainability, not token efficiency. Recommend re-ranking
  below items 66/67 rather than executing as originally written.
- **T4. — superseded by item 84 (2026-10-09).** Its "low-value" ranking rested
  on the T0 measurement error above. Original text kept for context.
  **Lean `CLAUDE.md` + progressive disclosure.** `CLAUDE.md` → thin router
  (identity, stack, "read `constitution.md` first", pointers); detail loaded on
  demand. Extends the constitution's on-ramp and reduces what each subagent pulls.
  *(medium; caching absorbs part of the main-session benefit)*
- **T5. Prune command/agent surface** — the token-cost half of item **40**. Remove
  definitions that restate native Claude Code behaviour; fewer definition tokens
  to load and maintain. *(medium)*
- **T6. Graph cache hygiene.** If a graph provider is enabled, generated graph
  output must not become prompt context by accident. Add/verify `.claudeignore`
  coverage for `graphify-out/`, keep graph artifacts out of normal file-search
  paths, and access them explicitly through CLI/MCP queries. *(small but
  critical)*

**Target: token-efficiency 5.5 → 7 with zero guardrails dropped.** `T0` first
(measure), then `T1 + T2 + T3` are the near-term high-value set — they can ride as
`0.9.x` / `0.10.0` alongside Phase 1. Stop optimizing where the marginal token
saving starts costing correctness.

> **External cross-check (2026-07-30):** an outside design-pattern review
> (Hyperautomation Labs' "Agent System Design Blueprint," a compressed
> restatement of Anthropic's published agent-engineering posts) independently
> named "always-loaded context instead of just-in-time" as the classic failure
> mode this workstream targets. It corroborates T2/T3/T5's priority
> (deduplicate → scope-load → prune) — the order above is unchanged, this is
> confirmation from an independent source, not new instruction. See items 64
> and 65 in the hygiene track for the two gaps that review surfaced *outside*
> this workstream (breaker enforcement, standing eval tracking).

## Hygiene track (parallel — not a phase gate)

- **21.** Docs-honesty pass (stale version/claims). **22.** Publish-workflow input
  cleanup. **18.** Hooks-roadmap doc. **41.** Decide the fate of the example hooks
  (`jira-sync.py`, `notify-review.py`) — pack or remove.

- **66. 🟡 First slice DONE (2026-10-12, #146; ships in 0.16.0): the shipped `commit-msg` hook and `doctor` C-05.** Open: this repo’s own gate (exception not granted), `ais init` hook wiring, and the CHANGELOG/approval-artifact controls (`tasks/todo/66-objective-controls.md`). Original finding:
  **Plan-and-confirm has no deterministic backing — prompted rule only.**
  Found 2026-08-13 cross-checking current Claude Code docs
  (`code.claude.com/docs/en/best-practices`, `.../memory`) against this
  project's own governance. Both docs state the same thing in different
  words: *"Settings rules are enforced by the client regardless of what
  Claude decides to do. CLAUDE.md instructions shape Claude's behavior but
  are not a hard enforcement layer."* Verified: `.claude/settings.json` has
  no `Stop` hook (only `UserPromptSubmit`/`PreToolUse`/`PostToolUse`), and
  `governance.md`'s own enforcement table listed `Plan-and-confirm skipped`
  with no hook named, unlike the H1-H8 row directly above it — now corrected
  to say so explicitly (see `governance.md`). Anthropic's docs confirm the
  real mechanism exists: a Stop hook *"runs your check as a script and
  blocks the turn from ending until it passes... Claude Code overrides the
  hook and ends the turn after 8 consecutive blocks."* Fix: a Stop hook that
  checks for a lightweight approval marker (e.g. a file written only after
  genuine "go" text is observed) before letting a turn end on a non-trivial
  diff. **Claude-Code-only** — Codex/Cursor have no equivalent mechanism to
  gate this; the tool-agnostic backstop stays `pre-commit` + CI, which catch
  bad output after the fact regardless of which agent produced it, but can't
  verify "was a plan actually approved" as a concept. *(medium — needs a
  real design for what "approval" means as a checkable artifact, not just a
  hook wiring exercise)*
  **Commit-identity enforcement (added 2026-08-27).** AI attribution recurred on
  22 commits despite `branching-rules.md:79`, because the `~/.gitmessage`
  template that closed the `2026-05-10` lesson does not cover `git commit -m`
  or `-F`. A `commit-msg` hook is the mechanical control. It belongs here rather
  than in a docs branch: it changes executable behaviour, needs tests and
  installation semantics, and raises a scope question. **Specify separately:**
  - **generated-project enforcement** — the default, shipped;
  - **scaffold-maintainer enforcement** — optional, and requiring an **explicit
    exception** to the 2026-08-27 directive that excluded commit gates from this
    repository. Do not assume the exception; ask for it;
  - **installation and packed-artifact behaviour** — the hook must survive
    `npm pack` and be wired on `create`, per the 2026-07-10 tarball lesson;
  - **exact `^Co-Authored-By:` matching** — with the colon, not the bare phrase.
    Prose discussing the rule can legitimately begin a wrapped line with those
    words;
  - **tests** for `git commit -m`, `-F`, editor/template commits, casing
    variants, multiple trailers, and legitimate prose that must not be rejected.

  **P1 scope rule:** mechanically enforce objective signals first—CHANGELOG
  policy, branch/PR path, required checks, and approval artifacts where their
  semantics are explicit. Do not claim that a superficial marker proves human
  plan approval across Claude Code, Codex, and Cursor.

  **First slice — commit-identity hook, 2026-10-10** (`tasks/todo/66-objective-controls.md`).
  - **Shipped:** the generated-project `commit-msg` hook, installed by `create`,
    and `doctor` check C-05. C-04 and C-05 now resolve `core.hooksPath`
    through git.
  - **Deliberately not done**, each still open:
    - (a) **enforcement in this repository.** The 2026-08-27 exception was
      not granted, so it is not assumed;
    - (b) **`ais init` hook wiring.** `init` installs no git hooks at all, not
      even `pre-commit`, and existing repositories need a design that will not
      clobber existing `.git/hooks/*` or hook managers (husky, lefthook);
    - (c) the CHANGELOG-entry and approval-artifact controls.
  - **Correction recorded:** the plan review assumed generated projects ship
    `scripts/install-hooks.sh`. They do not (`scripts/**` is excluded from the
    default install), so remedies point to copying `.claude/hooks/*` into
    `git rev-parse --git-path hooks`.
- **67. `AGENTS.md` points non-Claude agents at a document written for
  Claude.** Acceptance extension: item 98 exercises discovery and runnable
  verification in Codex, Cursor and Copilot and publishes the capability matrix.
  Original finding (2026-08-13, same cross-check), prompted by an explicit
  design constraint: this scaffold must work for Codex/Cursor/other agents,
  not just Claude Code. `AGENTS.md` (56 lines) is a well-designed thin
  pointer — *"CLAUDE.md is the authority for every decision, convention, and
  constraint in this project. Read it before doing anything else."* But
  `CLAUDE.md` itself (477 lines) is written throughout in Claude-Code-specific
  vocabulary — `/slash-commands`, `.claude/hooks/` paths, "Claude Code" named
  directly in workflow tables — none of which a Codex or Cursor session can
  act on. A non-Claude agent following `AGENTS.md`'s own instruction lands on
  a document half-written for a tool it isn't. Fix: audit `CLAUDE.md` for a
  lightweight marker on sections that are Claude Code-specific (Custom
  Commands, Custom Skills auto-discovery, Custom Hooks) versus sections that
  are genuinely tool-agnostic (coding standards, security rules, git
  workflow), so `AGENTS.md`'s pointer doesn't silently hand other agents
  instructions they structurally cannot follow. *(small-medium — audit +
  annotate, not a rewrite; the only item here that's actually about
  cross-agent parity rather than Claude-Code-specific enforcement)*

---

- **68. Skills should bundle their own scripts instead of re-deriving them.**
  Raised 2026-08-13; **fact-checked and confirmed** against
  `code.claude.com/docs/en/skills`. A skill is a *directory*, and the docs'
  own canonical layout includes `scripts/` alongside `SKILL.md`:
  *"scripts/validate.sh — Script Claude can execute."* Two mechanics make this
  work properly and neither is currently used anywhere in this scaffold:
  `${CLAUDE_SKILL_DIR}` (resolves to the skill's own directory regardless of
  cwd) and `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/x.sh *)` — the
  docs state that pairing the two *"lets a skill run a bundled script without
  a permission prompt."* Today every scaffold skill is prose-only, so any
  repeatable mechanical step (parse, validate, extract, render) gets
  re-written as throwaway code per invocation: non-deterministic, unreviewed,
  untested, and re-tokenised each time. Bundling makes it deterministic,
  diffable, and unit-testable — the same instruction-vs-guardrail split this
  scaffold already applies to hooks, applied to skills. Start with the skills
  that already describe mechanical procedures rather than judgement.
  **Portability caveat:** `${CLAUDE_SKILL_DIR}` and `allowed-tools` are Claude
  Code extensions to the Agent Skills standard — for Codex/Cursor the scripts
  still exist and are runnable, just without the no-prompt wiring. *(medium —
  per-skill; do not convert judgement-based skills into scripts)*
- **69. Command/agent surface is unaudited and partly redundant** — the
  concrete, evidence-backed half of **T5**. Measured 2026-08-13: **35
  commands (252K) + 17 agents (96K)**. Three distinct problems, in confidence
  order:
  1. **4 self-declared dead aliases** — `ux-analyze`, `ux-flow`,
     `ux-figma-spec`, `ux-screen-spec` each say *"Legacy alias"* /
     *"Compatibility alias"* in their own description. ~104 lines of pure
     redirect. Safe deletion; only question is the deprecation window.
  2. **Overlap with now-bundled Claude Code skills.** Claude Code ships
     `/debug`, `/code-review`, `/loop`, `/doctor` as bundled skills. This
     scaffold ships `debug-fix` (127), `investigate` (208), `loop` (126),
     `health` (274), `review` (170). Some of that is genuine
     governance-specific value (`review`'s 5-agent fan-out, `health`'s
     weighted composite) — but it has never been checked line-by-line against
     what's now native, and the docs are explicit that *"custom commands have
     been merged into skills."*
  3. **Commands should be skills.** Same doc: *"Skills are recommended since
     they support additional features like supporting files."* `.claude/commands/`
     still works and is not deprecated, but new capability (item 68's bundled
     scripts) only lands in the skills format.
  Deliberately **not** a blanket cull: this scaffold's value *is* its
  governance surface, and cutting a real gate to save tokens is the failure
  mode `T5` already warns about. Audit output should be per-item
  keep/merge/delete with a reason, not a percentage target. A "minimal
  profile" variant is a plausible outcome but should follow the audit, not
  precede it. *(medium — audit first, then act)*

  **AUDIT RESULT (2026-08-13) — the aliases are load-bearing; do NOT delete
  them first.** The "4 safe deletions" framing was wrong. Verified: three
  agents actively route users to superseded commands — `ux-designer` and
  `ux-requirement-analyst` → `/ux-flow`; `ux-flow-designer` → `/ux-analyze`
  and `/ux-screen-spec`. `.claude/roles/`, the role tutorial, and
  `.claude/memory/` reference them too. The alias files are currently the
  *only* reason those references resolve. Deleting them would silently break
  the UX workflow for anyone following an agent's own instructions.

  **The real finding is not token waste — it is that agents instruct users
  toward a superseded workflow.** Correct order: (1) repoint the 3 agents +
  roles/tutorial/memory docs at the canonical commands (`/ux-analysis`,
  `/ux-design-prompt`); (2) confirm zero live references remain; (3) *then*
  alias deletion is trivially safe. Doing (3) first inverts the risk.

  **Second finding — name collisions with bundled Claude Code skills.**
  Claude Code now ships `/debug`, `/code-review`, `/loop`, `/doctor`,
  `/batch` as bundled skills. This scaffold ships its own `/loop` (126
  lines), `/debug-fix` (127), `/investigate` (208) — colliding or
  near-colliding with native behaviour that did not exist when they were
  written. Not automatically redundant: the scaffold's `/loop` carries a
  one-approval contract and explicit stop conditions native `/loop` lacks.
  But the overlap has never been diffed and users cannot tell which they are
  invoking. Needs a per-command decision: keep (and document the difference),
  rename to avoid collision, or drop in favour of native.

  **Third finding — `review` and `health` are genuinely differentiated; keep.**
  `/review`'s 5-agent parallel fan-out and `/health`'s weighted composite +
  trend history have no native equivalent (`/code-review` is a single-pass
  diff review; `/doctor` is a setup checkup — different jobs). Recorded so a
  future token-driven cull does not remove them by headcount.

  **Nothing was deleted in this pass.** Deleting less than approved is the
  safe direction; the sequencing above must land first.

  **Update 2026-10-09 — executed by the Corrective phase.** Item 83 performs
  the repoint-then-delete sequence above for the 4 aliases. Item 82 removes
  `/compact` and `/loop`: the commands docs confirm a project command
  *replaces* the built-in or bundled one in local sessions, so these were
  shadowing native behaviour, not running alongside it. Losing `/loop`'s
  one-approval contract was accepted by the maintainer. The "keep" findings
  for `/review` and `/health` were re-checked:
  - `/review` stays, renamed `/ais-review`, because `/review` is the
    native alias of `/code-review`;
  - `/health` stays, because `/doctor prompt-audit` audits instructions, not
    code; only its self-graded sub-score is removed.

## Reprioritised by value delivered (2026-08-13 — superseded)

Historical ordering retained for decision context. It is superseded by the
2026-08-21 priority reset near the top of this file.

| # | Item | Why now | Effort |
|---|---|---|---|
| 1 | **Land the parked bug fixes** (python `pip install` crash, laravel missing `composer.json`) | Both **verified reproducible against the published 0.12.0 package** — real users of 2 of 5 profiles hit these on day one. Fixes exist and are tested but are sitting in a stash, unlanded. Highest value/effort ratio on the board. | small |
| 2 | **69. Command/agent surface audit** | 348K across 52 definitions, never audited. 4 items self-declare as dead aliases. Directly unblocks T5, and every removal compounds across all 5 subagent contexts on every `/review`. | medium |
| 3 | **68. Bundled scripts in skills** | Turns repeatable mechanical steps from re-derived throwaway code into deterministic, testable artifacts — same reasoning that made hooks worth having. Confirmed supported. | medium |
| 4 | **66. Stop-hook for plan-and-confirm** | The scaffold's highest-stakes rule has zero deterministic backing. Ranked below 68/69 only because the *design* question (what is a checkable "approval"?) is genuinely unsolved, not because it matters less. | medium |
| 5 | **`shellcheck` in CI** | 69 `.sh` files carry this scaffold's entire enforcement layer with **zero static analysis**. `/health` can't even score the category. Cheap, and it guards the guardrails. | small |
| 6 | **60. Windows CI runner** | Unchanged from prior ranking — still the largest untested-platform risk. | medium |
| 7 | **67. Cross-agent `CLAUDE.md` audit** | `AGENTS.md` points Codex/Cursor at a Claude-specific document. Real, but affects fewer users than 1–5. | small-medium |

**Deliberately not raised:** `T4` (lean `CLAUDE.md`) — the project's own `T0`
measurement shows always-loaded content is only 7K/5% of the corpus, so the
generic "keep CLAUDE.md under 200 lines" advice does not apply here as
strongly as it looks. Measurement beats convention.

- **70. "No self-merge" is unenforceable on this repo as configured.** Found
  2026-08-14 after 13 consecutive self-merges via `gh pr merge --admin` in one
  session, which `review-rules.md` explicitly forbids.

  **Not a missing rule.** Both branches already require 1 approval, and GitHub
  natively refuses to let a PR author approve their own PR. The hole is
  `enforce_admins: false` on both branches. A pre-commit hook cannot close it:
  hooks run locally before a commit exists; merges happen server-side after.

  **Plan is NOT the blocker.** The repo is public, so protection, rulesets and
  required approvals are all free. The blocker is ownership type: user-level
  bypass allowances are rejected on personal repos (HTTP 422, "Only
  organization repositories can have users and team restrictions"). Because
  `release.yml` pushes directly to both `dev` and `main`, any setting strict
  enough to stop admin self-merge also locks the release workflow out.

  **Done 2026-08-14 (interim):** repaired the `protected-main` ruleset, which
  was **inert** — `enforcement: active` but `ref_name.include: []`, so it
  matched no branches while looking protected in the UI. It now targets
  `refs/heads/main`, making `deletion`, `non_fast_forward` and `pull_request`
  real for non-admins. Admins keep `bypass_mode: always`, which is what keeps
  releases working — that is the remaining gap, not an oversight.

  **Real fixes, in preference order:** (1) release identity becomes a GitHub
  App — rulesets accept `Integration` bypass actors on personal repos, so the
  App is the sole bypass while admins are enforced; (2) move the repo to an
  org; (3) process-only, labelled as detection not prevention
  (`gh pr list --state merged --json author,mergedBy` makes self-merges
  visible after the fact). *(small once the identity question is decided)*


- **71 (original).** Enforce the linear `feature → dev → main` workflow end-to-end.**
  Requested 2026-08-14. Every change starts from `dev` on a
  `feature/*` / `fix/*` / `chore/*` branch; commits and pushes happen only on
  work branches; work merges to `dev` by PR; production promotion is a
  separate PR from `dev` to `main`; direct commits and pushes to `dev` and
  `main` are blocked. Deliverables: local hooks, CI validation, and updated
  repository documentation, with existing `release/*` / `hotfix/*` rules
  removed or reconciled.

  **Blocking conflict to resolve first — this contradicts the current release
  design.** `release.yml` promotes `dev → main` by **fast-forward push**, not
  by PR. That was deliberate (item 47): every PR merge method creates a commit
  on `main` that is not on `dev`, and that divergence is exactly what forced
  the old `main→dev` sync-back and caused the v0.12.0 incident. Requiring a
  `dev → main` PR reintroduces it unless the PR is merged with a fast-forward,
  which GitHub's UI does not offer. Decide one of:
  a. Keep fast-forward promotion and treat `main` as bot-only (no human PR) —
     enforcement then belongs on `dev`, where 19 of the last 20 PRs actually
     land;
  b. Switch to PR-based promotion and accept a scheduled sync-back, restoring
     the machinery item 47 deleted;
  c. PR-based promotion with a merge queue or an automated fast-forward merge,
     which keeps ancestry linear but needs setup.

  Also note the local half is already partly built: `pre-commit` validates
  branch names (it rejected `feat/` during this very session) and
  `pre-bash-quality-gate.sh` runs it before `git commit` / `git push`. What is
  missing is a hook that refuses commits made *while on* `dev` or `main`, plus
  the CI check. The server-side half depends on item **70** — without the
  identity fix, blocking direct pushes also blocks releases.
  *(medium — mostly a decision, then a small implementation)*


## Release checklist — current maintainer flow

Use `docs/setup/release-flow.md` and `CLAUDE.md`: the Release Action stamps dev,
fast-forwards main, then pushes the tag that triggers npm publishing. No release
branch, promotion PR or post-release sync is part of this flow.

- [ ] Normal PR review and effective required checks are green.
- [ ] Release Action runs configured readiness/security gates, lint, typecheck,
  tests and `bash scripts/pre-publish-smoke.sh`; packed golden paths pass for
  supported profiles. Record results rather than stale gate counts.
- [ ] Runtime audit passes (`npm audit --omit=dev --audit-level=high`); track
  dev-tooling advisories separately under the security policy.
- [ ] Packed changes, generated output and applicable upgrade/control probes
  pass on the declared platform/runtime/tool matrix.
- [ ] Version, dated CHANGELOG and migration notes agree; dry-run the Release
  Action after release/protection configuration changes.
- [ ] Tag identifies the exact promoted commit; Publish succeeds; npm version
  and provenance match. Follow recovery policy; never move an existing tag.
