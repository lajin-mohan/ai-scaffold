# AI Scaffold — Backlog

**Purpose:** Value-ordered roadmap for the road to **v1.0.0**. Shipped work lives
in `CHANGELOG.md` (the permanent record); this file tracks what is **left** and
why, grouped into phases by rating lever. Completed items are removed after
verification against npm/git, not kept as history.

## Current state (2026-07-14)

- **v0.9.1 is published** (`latest`, provenance) — T0 token measurement, T1
  `/review --lite`, and the review blockers. **v0.10.0 is in flight**: item 54
  (auto-wired git pre-commit hook, #85), item 56 (`ais export-context`
  reinstall safeguard, #86), item 28 (CLI reference), and the docs audit.
  `main` is an ancestor of `dev`; all gates green on the integrated branches
  (49 tests, lint/typecheck clean, smoke all-pass, 0 vulns at any level).
- **Security posture reviewed 2026-07-13:** 7 mainstream runtime deps, 0 npm-audit
  findings at any level, OIDC trusted publishing (no long-lived token), CI runs
  gitleaks + audit, no secret patterns in tracked code, only shell-out is
  `spawnSync('git', [args])` (array form — no shell interpolation), tarball
  carries no env/secret/local-settings files, generated projects ship hook
  wiring + a `.gitignore` that ignores `.env`.
- Post-release `main→dev` sync is automated but still semi-manual until item
  47's repo settings land. Keep release metadata aligned during promotions so
  `dev` never downgrades the published version on the next `dev→main` PR.
- **2026-07-14 — item 25 (`ais update`) deferred past the pilot handover**, with
  a concrete revisit trigger (see Phase 1). Phase 0 reprioritised around that
  decision: item 56 (safeguard the delete-and-reinstall workaround) is now the
  top handover item, since that workaround is what item 25's absence makes the
  team rely on. Also fixed a numbering collision: two unrelated items each used
  **51** and **52** (Phase 0's hook/pilot items vs. Phase 2's Graphify-pilot
  items, merged from separate branches) — Phase 0's were renumbered 54/55.

### Honest category rating (SaaS-team adoption), post-0.9.0

| Category | Now | Target for v1.0 |
|---|---|---|
| Governance content | 9 | 9 |
| Tool reliability / engineering discipline | 8.5 | 9 |
| Security & compliance fit | 8 | 8.5 |
| Onboarding / day-one UX | 8 | 8.5 |
| Claude / AI-tool integration | 7.5 | 9 |
| Docs & discoverability | 7.5 | 9 |
| **Update / lifecycle** | **4** | **8** |
| **Token efficiency** | **5.5** | **7** |
| **Existing-codebase context retrieval** | **5** | **8.5** |
| **Overall** | **8.0** | **8.5+** |

**Goal: every category ≥ 8.5 before v1.0.0.** The phases below are ordered by
rating lever, not by ease. `Update/lifecycle` (4), `Existing-codebase context
retrieval` (5), and `Claude/AI integration` (7.5) are the categories that cap
the overall score — Phases 1 and 2 target exactly those.

---

## Shipped (done — detail in CHANGELOG)

Removed from the active backlog after verification against npm/git.

| Ver | Delivered (old item #) |
|---|---|
| 0.8.1–0.8.7 | Trusted publishing + provenance, branch protection, CI security gates (npm audit + gitleaks), python/go profiles, `ais list`, `--dry-run --json` (14), `copy.js` refactor (13), `release:check` (20), `.gitignore` packaging fix (11b), automated `main→dev` sync |
| 0.8.8 | Node profile real test (35); genericized shipped `.claude/` content (part of 37); sync tolerance (part of 47) |
| 0.9.0 | **Project constitution (39)**; generated-output genericization finished — no author/org/license leaks (37); **Claude-feature modernization** (per-agent `model`, read-only reviewer `tools`, command `description` frontmatter, honest Agent-Skills list); tarball-based smoke gate that runs `doctor` per profile (36); README flow diagram + zero mermaid; GH Actions on Node 24 (45); worktree-safe `vitest` |

---

## Phase 0 — Team handover (now, alongside the 0.9.1 cut)

The CLI is being handed to a small team (2 pilot projects). These items directly
de-risk that handover and were surfaced by the 0.9.1 readiness/security review.
**Item 25 (`ais update`) is explicitly deferred past handover** — see the note
in Phase 1 for why and the revisit trigger. Priority reordered 2026-07-14 around
that decision: the items below are what actually protects a pilot in its absence.

- **56. Safeguard the delete-and-reinstall workaround — ✅ DONE.** With `ais
  update` deferred, "delete the project and re-run `ais create`" is the
  accepted interim upgrade path — this closes its one real risk. Shipped: a
  "Before You Reinstall" README section naming the non-regenerable files
  (`tasks/lessons.md`, `.claude/MEMORY.md`, `.ai-scaffold/context.md`,
  `.claude/settings-overrides.json`, hand-edited `.claude/rules/*`), and `ais
  export-context [dir]` — copies those paths to
  `~/.ai-scaffold-backups/<project>-<timestamp>/` (**outside** the project, on
  purpose: verified the backup survives the source project being deleted, the
  exact scenario this exists for). `--out <path>` to override the destination.
  Not drift detection (that's item 26, deferred with 25) — a fixed, definite
  file list. 2 e2e tests + 3 smoke gates; ships via the existing `src/cli/`
  package glob (no new dependency — plain `fs-extra` copy). *(done)*
- **54 (was 51). Auto-wire the git `pre-commit` hook on `create` — ✅ DONE
  (#85).** `create` copies `.claude/hooks/pre-commit` into `.git/hooks/`
  (executable) right after the initial scaffold commit, so gates apply to
  commits made *outside* Claude Code too; respects `--no-git`. Wiring it live
  surfaced and fixed 3 previously-silent hook defects (branch regex rejected
  `main`/`dev`/`master`; Node check called a nonexistent `test:unit` script;
  Python check pointed at a nonexistent `tests/unit/` dir) across all 5
  profiles + this repo's own copy. E2E test + 3 smoke gates. *(done)*
- **28 (elevated). Per-command CLI reference — ✅ DONE.** `docs/cli-reference.md`
  covers all 7 commands with every flag, generated from the CLI's actual
  `--help` output (not memory), linked from the README Command Reference
  section. *(done)*
- **55 (was 52 — renumbered, collided with Phase 2 item 52). Pilot feedback
  loop.** Run the workshop, start the 2 pilots (1 new project, 1 existing),
  assign the five roles (owner / dev / QA / reviewer / scribe), and hold a
  20-min retro after the first real task. Pilot lessons re-prioritise Phase 1
  before major work starts. *(process, small)*

## Phase 1 — Living system (lifecycle) · the #1 rating lever *(deferred past handover)*

Moves **Update 4 → 8, Onboarding 8 → 8.5, Overall → ~8.3** — but explicitly
**held back until after the pilot**, decided 2026-07-14. Rationale: the pilot is
2 fresh projects with little accumulated customization yet, so "delete + `ais
create` again" (paired with item 56's safeguard) is a genuinely acceptable
interim upgrade path — building a full migration engine now would be solving a
problem the pilot doesn't have. **Real, non-vague revisit trigger** (per this
project's own `ponytail:` convention — no vague "later"): come back to item 25
when **any** of — (a) a 3rd project onboards, (b) a pilot project accumulates
meaningful hand-edits to `.claude/rules/*` or `settings-overrides.json` that
delete+reinstall would destroy, or (c) a pilot needs to jump more than one `ais`
version. Item 55 (pilot retro) is the mechanism that surfaces (a)/(b)/(c).

- **25. Real `ais update` (managed-file migration).** *deferred — see above.*
  Diff installed vs target version; classify each file (managed / protected /
  app-owned via `.ai-scaffold.json` hashes); preview the change set; apply with
  backup + rollback; version-pinned migrations. Converts the product from "a
  great starter kit" into "a governance platform a team stays current on."
  *(large)*
- **26. Drift-aware `status` / `doctor`.** Detect managed-file drift and surface
  exactly what `update` would change vs. what the user has customised. *(medium —
  pairs with 25)*
- **15. Install/action audit trail.** Append-only record of CLI actions
  (create/init/update): version, files touched, timestamp. Feeds `update` safety
  and aligns with the governance/GDPR framing. *(medium)*
- **27. Repair / uninstall dry-runs.** Complete the lifecycle verbs so `update`
  isn't the only mutating path; both preview before writing. *(medium)*

## Phase 2 — Modern AI surface + repository knowledge

Moves **Claude/AI integration 7.5 → 9, Existing-codebase context retrieval 5 →
8.5, Overall → ~8.6.** This is where the newest leverage lives — connect the
governance to real tools, make large-repo navigation selective instead of
search-heavy, and distribute the operating system the Claude-native way.
Together with Phase 1 this clears **8.5 overall** and is the v1.0 candidate line.

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

## Phase 3 — v1.0 completeness & polish

Moves **Docs 7.5 → 9, Security 8 → 8.5, Tool reliability 8.5 → 9; closes the long
tail. Overall → ~8.8.**

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

- **T0. Token measurement (enabler) — ✅ DONE (0.9.1).** `npm run token-report`
  (`scripts/token-report.js` + unit-tested `src/cli/core/token-report.js`) measures
  the scaffold's own corpus by category, always-loaded vs on-demand, top files, and
  the `/review` fan-out floor. Run before/after every change below.
  - **Baseline 2026-07-13: ~138K est-tokens** (chars/4). Always-loaded (`CLAUDE.md`)
    only **7K / 5%** — confirms leaner-`CLAUDE.md` (T4) is low-value. The fat is
    **commands 47K / 34%** and **rules 39K / 29%** → T5 (prune) + T2 (dedup) are the
    real levers. Largest single files: `ai-coding-rules.md` (~6.1K),
    `design-system.md` (~5.6K), `what-next.md` (~4.5K).
  - Maintainer tool (measures this repo). A user-facing `ais tokens` / `/health`
    view of a *generated* project's corpus is a later optional extension.
    *(done)*
- **T1. Tiered / lite review — ✅ DONE (0.9.1).** `/review --lite` runs one
  consolidated pass (no 5-subagent fan-out) for XS/S changes, with a **hard,
  non-negotiable escalation** back to the full review when the diff touches
  auth/tenant/payments/data/migrations/secrets/new-endpoint or is > S. Same
  BLOCK/WARN/NIT report; security always surfaced. Removes the ~⅘ fan-out cost on
  small work without trimming guardrails on risky work. Shipped in `review.md`
  across all five profiles. *(done)*
- **T2. Rules deduplication.** One canonical statement per concept,
  cross-referenced not restated (e.g. "parameterized queries" lives in 4 files
  today). Compounds across every subagent that loads rules. Content-preserving —
  cut duplication, not guardrails. *(medium, low risk)*
- **T3. Scoped rule loading.** Load only the stack overlays that apply (a Go
  project should not carry the React rules). The overlays already exist; make
  loading conditional on the resolved stack. *(low-medium — high value/effort)*
- **T4. Lean `CLAUDE.md` + progressive disclosure.** `CLAUDE.md` → thin router
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

## Hygiene track (parallel — not a phase gate)

- **47.** Prove the post-release sync is fully hands-off: enable repo
  **Settings → Actions → "Allow GitHub Actions to create and approve pull
  requests"** + **"Allow auto-merge"**, add a **`SYNC_PAT`** fine-grained secret
  (Contents + PRs write), then verify one release auto-opens + auto-merges the
  `main→dev` sync PR with zero manual steps. *(needs repo settings — human)*
- **29. — ✅ DONE (2026-07-14).** Deleted the stray `v1.0` tag (local + remote,
  explicit human confirmation obtained). `v1.0.0` was never published to npm —
  nothing real was at risk. `git fetch --tags` is clean again. Confirmed
  alongside a versioning decision: the next release stays on the `0.x` line
  (e.g. `0.11.0`); `1.0.0` is not cut until the v1.0 completeness criteria in
  "The 8.5+ path" are actually met, not implied by a leftover tag name.
- **44.** Remove stray cruft from source template dirs (`templates/{golang,python}/apps/`,
  `templates/*/.vscode/`).
- **46. — ✅ DONE (0.10.0 docs audit).** Fixed the repo's own
  `.claude/skills/design-system.md` → `DESIGN_TOKENS.md` links (4 occurrences
  had a doubled `.claude/skills/` prefix); the file is now byte-identical to
  the (already-correct) template copies.
- **21.** Docs-honesty pass (stale version/claims). **22.** Publish-workflow input
  cleanup. **18.** Hooks-roadmap doc. **41.** Decide the fate of the example hooks
  (`jira-sync.py`, `notify-review.py`) — pack or remove.
- **57. `main→dev` sync loses CHANGELOG heading-dating every release.** Found
  2026-07-14: the release-branch step dates `[Unreleased]` → `[0.9.x] - date`,
  but `main→dev` sync (`git merge -s ours`) intentionally discards `main`'s
  content, so `dev` never receives the dated heading — the same content sits
  undated under `[Unreleased]` and silently accumulates across releases until
  someone notices (this time: two releases' worth, caught during a docs
  review). One-time catch-up applied 2026-07-14. Needs a process fix: either
  the release-branch step also opens a tiny `dev`-targeted PR that applies
  just the heading rename, or the sync script diffs+applies CHANGELOG heading
  changes specifically (not full content, to avoid re-breaking ancestry).
  **Recurred again after v0.10.0** (caught 2026-07-15 during PR #92): the
  `[0.10.0] - 2026-07-14` heading was missing on `dev` and had to be re-dated
  by hand a third release running. This is now a proven every-release tax, not
  a one-off — **promote out of the "someday" tier and actually fix the process
  next.** *(small fix, but recurs every release until fixed)*
- **58. `pre-commit` hook has no Go/`.NET` detection block.** The hook
  documents 4 stack-detection blocks (Node, PHP, Python, .NET) but golang is
  an officially shipped, first-class profile with zero coverage — only the
  always-on branch-name check applies to a golang project; `go build`/`go
  vet`/`go test` never run locally pre-commit. Not a regression from item 54
  (golang was already uncovered before the hook was wired) but a real content
  gap for a supported profile. Add a `go.mod` detection block mirroring the
  existing pattern (`go build ./...`, `go vet ./...`, `go test ./...`, guarded
  by `command -v go`). *(small — same shape as existing blocks)*
- **59. `pre-commit` hook branch-name regex rejects `docs/*`, but
  `branching-rules.md` lists `docs/*` as a valid branch type.** Found
  2026-07-15 (PR #92): a `docs/windows-powershell-npx-note` branch was blocked
  by the hook (`^(main|dev|master)$|^(feature|fix|chore|hotfix|release)/...`)
  and had to be renamed to `chore/` to commit. The scaffold repo's own
  `.claude/rules/branching-rules.md` allows `docs/*` (and the generated-project
  template's branching rules do too), so the hook is stricter than the
  documented policy — quiet drift that pushes doc work into `chore/`. Fix: add
  `docs` to the hook's allowed-prefix alternation in all five profile hooks +
  this repo's own copy (same one-line change as the item-54 regex fix). Decide
  the canonical set first — `feature|fix|chore|docs|hotfix|release` — and make
  the hook and the rules agree. *(small — one regex, six files)*
- **60. No Windows CI runner — Windows-only bugs ship in every release.**
  Found 2026-07-15 (PR #94): the `path.relative()` backslash bug meant
  `.claude/MEMORY.md` and `.claude/settings-overrides.json` were never
  generated on Windows for **any** profile, surfacing as two HIGH `ais doctor`
  failures. It shipped in every release the CLI has ever cut, invisible to the
  whole test suite, because every dev machine and CI runner is macOS/Linux —
  the buggy path is never exercised on a forward-slash OS. This is the
  highest-leverage prevention item on the list: the CLI's whole job is writing
  files to a user's filesystem, and half the target audience is on Windows.
  Fix: add a `windows-latest` job to the GitHub Actions matrix running at least
  the `buildFilePlan`/create/init/doctor tests (ideally the full suite). Also
  audit remaining `path.relative(`/`path.join(` sites that feed string
  comparisons for the same class of bug (see 2026-07-15 lessons entry).
  *(medium — CI matrix + a path-normalization audit pass)*
- **61. `ais doctor` flags the governance skeleton as missing on `init`, even
  though `init` skips it by design.** Found 2026-07-15 (PR #94): `init` into an
  existing repo deliberately does not create `tasks/lessons.md` / `CHANGELOG.md`
  (file-plan.js:163-166 — existing repos manage their own), but doctor reports
  them as a MED failure ("Missing files the CLAUDE.md workflow references"),
  which reads as a defect to a user who just ran a clean install. The shipped
  `CLAUDE.md` does reference `tasks/lessons.md` at session start, so the
  reference genuinely dangles on init. Decide one: (a) `init` writes empty
  starter `tasks/lessons.md` + `CHANGELOG.md` (harmless, resolves the dangling
  reference), or (b) doctor detects install mode from the manifest and softens
  the message for `init` installs. *(small — one of two clear options)*

---

## The 8.5+ path (honest)

- **Phase 0 first** (now) — de-risks the handover itself; not a rating mover on
  its own, but item 56 specifically prevents the pilot from losing real data
  while item 25 sits deferred.
- **Phase 1 alone** fixes the single worst category (Update 4 → 8) and lifts
  overall to ~8.3 — necessary but not sufficient. **Currently deferred past the
  pilot** (see Phase 1 header for the revisit trigger); it is still the biggest
  single lever, just not the *next* one.
- **Phase 1 + Phase 2** clears **8.5 overall** and makes "modern AI capabilities"
  real (context providers + MCP + plugin + skills). This is the **v1.0 candidate**
  line.
- **Phase 3** polishes to ~8.8–9 and closes the long tail for a confident **v1.0.0**.

---

## Release checklist (enforced, not aspirational)

A release is ready only when **all** of these pass — the first two are automated:

- `npm run release:check` — `origin/main` is an ancestor of the promotion branch,
  and a `release/v*` branch changes only `package.json` / `package-lock.json` /
  `.ai-scaffold.json` / `CHANGELOG.md`.
- `bash scripts/pre-publish-smoke.sh` — currently **105 gates** incl. the
  packed-surface, generated-doc-link, and constitution checks.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`.
- `gh pr view <id>` shows `mergeable` + required checks green.
- **A release is not shipped until `npm view @lajin.m/ai-scaffold version` shows the
  new version** — merging the release PR to `main` is not publishing; the `v*` tag
  push is the trigger. Failed publishes use a new patch tag, never a moved tag.
