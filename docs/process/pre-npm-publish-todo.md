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
- **T3. — ✅ DONE.** All 8 `.claude/rules/stacks/*.md` overlays now carry
  `paths:` frontmatter (extension + manifest-file globs per stack — e.g.
  `backend-python.md` scopes to `**/*.py`, `**/pyproject.toml`,
  `**/requirements*.txt`), so an overlay only enters context when Claude
  actually reads a matching file, instead of loading unconditionally every
  session regardless of profile. Every profile ships all 8 overlays
  unconditionally (confirmed 2026-08-13 — even a `python`-profile project
  carries `backend-java.md`, `backend-dotnet.md`, `backend-coldfusion.md`,
  etc.), so this was broader than "a Go project carries React rules" — every
  non-matching profile was carrying every other profile's rules, unscoped.
  Verified: byte-identical across the 6 copies (main + 5 templates), same
  pattern as every other cross-profile file in this repo. **Not yet verified
  live**: adding a project-side `InstructionsLoaded` hook to confirm
  empirically that a Go session never actually loads `backend-python.md` —
  worth doing before calling T3 fully proven, not just correctly configured.
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

- **47. — ✅ DONE / superseded (one-button release flow).** The post-release
  `main→dev` sync no longer exists to automate: the new fast-forward release
  flow (`docs/setup/release-flow.md`, `.github/workflows/release.yml`) promotes
  `dev → main` by fast-forward, so `main` is always an ancestor of `dev` and
  there is nothing to sync. Removed `post-release-sync.yml` and
  `scripts/sync-main-into-dev.sh`. Remaining human step is the one-time repo
  setup in `release-flow.md` (a `RELEASE_PAT` secret + a branch-protection
  bypass for that identity). *(superseded — the sync problem is designed out)*
- **29. — ✅ DONE (2026-07-14).** Deleted the stray `v1.0` tag (local + remote,
  explicit human confirmation obtained). `v1.0.0` was never published to npm —
  nothing real was at risk. `git fetch --tags` is clean again. Confirmed
  alongside a versioning decision: the next release stays on the `0.x` line
  (e.g. `0.11.0`); `1.0.0` is not cut until the v1.0 completeness criteria in
  "The 8.5+ path" are actually met, not implied by a leftover tag name.
- **44. — ✅ DONE.** Removed stray cruft from all 5 profile template dirs.
  Broader than originally scoped: `templates/*/apps/` turned out to be a
  byte-identical duplicate of the repo's real, documented reference example
  (root-level `apps/api/src/`, referenced from CLAUDE.md) — present in **all
  five** profiles, not just golang/python, and confirmed excluded from every
  copy plan (`apps/**` in `EXCLUDED_DEFAULT_PATTERNS`), so it never shipped.
  `templates/*/.vscode/` (3 of 5 profiles) had zero documentation anywhere as
  an intentional feature and was likewise excluded/unshipped. Root-level
  `apps/` and `.vscode/` (this repo's own reference example and editor
  config) are untouched. Verified: all 5 profiles still create cleanly with
  0 CRIT/HIGH doctor failures after removal.
- **46. — ✅ DONE (0.10.0 docs audit).** Fixed the repo's own
  `.claude/skills/design-system/SKILL.md` → `DESIGN_TOKENS.md` links (4 occurrences
  had a doubled `.claude/skills/` prefix); the file is now byte-identical to
  the (already-correct) template copies.
- **21.** Docs-honesty pass (stale version/claims). **22.** Publish-workflow input
  cleanup. **18.** Hooks-roadmap doc. **41.** Decide the fate of the example hooks
  (`jira-sync.py`, `notify-review.py`) — pack or remove.
- **57. — ✅ DONE (bump + date on dev, via the one-button release flow).** The
  `main→dev` `-s ours` sync discarded main's content, so the release-branch
  version bump + CHANGELOG dating never reached `dev` — dev's `package.json`
  and CHANGELOG drifted every release (hand-fixed three times: 0.10.0, 0.10.1,
  0.10.2, plus the 0.9.0→0.10.2 catch-up in PR #102). Designed out: the new
  release flow (`docs/setup/release-flow.md`) stamps the version and dates the
  CHANGELOG **on `dev`** and then fast-forwards `main` to that commit, so both
  branches always agree and there is no content to lose. `prepare-release.sh`
  does the stamping; `release.yml` drives it. *(done — root cause removed, not
  patched)*
- **58. — ✅ DONE (Go-aware shared profile wiring).** Added `go.mod` detection
  to the shared profile pre-commit hook and wired `go build ./...`,
  `go vet ./...`, and `go test ./...` behind `command -v go`. The shared
  Claude permissions, pre-review hook, `/start-task`, `/review`, and source CI
  template are now stack-aware and byte-identical across all five profiles, so
  generated Go projects no longer inherit Node-only verification prompts.
  Covered by unit tests in `src/__tests__/core.test.js` and a pre-publish smoke
  gate that runs the generated Go pre-commit hook.
- **59. — ✅ DONE.** `pre-commit` hook branch-name regex now allows `docs/*`,
  matching `branching-rules.md`'s documented set
  (`feature|fix|chore|docs|hotfix|release`). Fixed the regex and the header's
  human-readable pattern list in all five profile hooks + this repo's own
  copy (byte-identical). No more forced rename to `chore/` for doc-only work.
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
- **61. — ✅ DONE (option a: init fills the skeleton in when absent).**
  `init` now generates `tasks/lessons.md` and `CHANGELOG.md` at project root
  exactly when they're genuinely absent — closing the dangling `CLAUDE.md`
  reference — and leaves them completely untouched when a repo already has
  its own (both added to `PROTECTED_PATHS` first, verified in both
  directions: an existing `CHANGELOG.md` survives byte-for-byte; an absent
  one gets created). One subtlety found during implementation:
  `resolveGeneratedTargetRel` was routing generated files into the
  `.ai-scaffold/` namespace on `init` by default — the naive fix would have
  silently generated these at `.ai-scaffold/CHANGELOG.md` instead of project
  root, where neither `doctor` nor a human would ever find them. Fixed by
  treating the governance-skeleton paths as root-forced, like
  `constitution.md`.
- **62. — ✅ DONE (gitleaks `git --staged`).** The shipped `pre-commit` and
  `pre-commit-secrets` hooks ran `gitleaks detect --staged --exit-code`, which
  errors (`unknown flag: --staged`) on gitleaks v8.19+ — the `detect` scan form
  was replaced by the `git` subcommand. Verified against a real install
  (gitleaks 8.30.1): `gitleaks git --staged --exit-code 1` passes on a clean
  staged tree and blocks a real (non-allowlisted) secret. Fixed both hooks
  across all five profiles + the repo copies (byte-identical). Regression
  coverage: a unit test asserts the hooks use `git --staged` and never
  `detect --staged`, and a smoke gate (active when gitleaks is installed)
  asserts the hook's gitleaks command runs cleanly rather than erroring on a
  usage flag. Was pre-existing on every release and latent because dev machines
  usually lack gitleaks while CI installs it (same environment-parity blind
  spot as item 60). *(done)*
- **63. — ✅ DONE (php→laravel alias + fail-fast profile validation).** Found
  2026-07-19 (PR #107): `ais init --profile php` ran the entire ~18-question
  interview, then crashed with a raw `Template profile not found` stack trace
  — `php` wasn't aliased to `laravel` (the PHP profile) and nothing validated
  the profile before prompting. Added `php`/`laravel8` → `laravel` aliases; both
  `create` and `init` now validate the profile before any prompt, exiting
  cleanly with the valid set + aliases on an unknown value. Same PR also scoped
  the CI dependency-audit gate to `--omit=dev` (shipped CLI has 0
  vulnerabilities; the full-tree audit was failing releases on dev-only tooling
  advisories with no user-facing exposure — see `security-rules.md`). *(done)*
- **64. — ✅ DONE.** New `.claude/hooks/token-budget-guard.sh`
  (`PreToolUse`, same matcher as `governance-file-guard.sh`: `Read|Grep|Glob|
  Edit|Write|MultiEdit`) estimates session tokens from the live transcript
  file size (chars/4, matching `scripts/token-report.js`'s own
  `CHARS_PER_TOKEN`) and makes the two thresholds `governance.md` already
  documents actually real: 300K stays a WARN (suggests `/compact`, never
  blocks), 500K now exits 2 and blocks the tool call — configurable via
  `ECC_TOKEN_BUDGET_WARN_TOKENS`/`ECC_TOKEN_BUDGET_BLOCK_TOKENS`, escapable
  via `ECC_TOKEN_BUDGET_WARN_ONLY=1` (same spirit as `git commit --no-verify`
  — an override, not a bypass), and fully fail-open on any missing transcript
  or parse error. Shipped identically in all 5 profile templates and wired
  into all 6 `settings.json` copies. Verified live and unplanned: this exact
  hook blocked a real `Read` call mid-session once this project's own
  transcript passed 500K est-tokens — confirming both the detection and the
  block path work against a real, not synthetic, transcript, in addition to
  9 scripted bash-level test cases and 4 Vitest cases covering byte-identity,
  wiring, warn/block/override behaviour, and fail-open on a missing
  transcript.
- **65. — ✅ DONE.** `scripts/pre-publish-smoke.sh` gained an explicitly
  labeled "Gate 4b-2: Profile Smoke (laravel + generic)" section, following
  the same pattern already used for python/golang: `create`, a README
  real-commands check (laravel: `composer install`/`composer test`; generic:
  README.md + constitution.md existence, since generic is stack-agnostic), a
  `.gitignore`-renamed-correctly check, and a `doctor` CRIT/HIGH-clean check
  — closing the gap where only 3 of 5 profiles had named smoke coverage.
  Along the way, found and fixed 2 gates left stale by item 61's behaviour
  change (both asserted `tasks/` and `CHANGELOG.md` must never exist after
  `init`, which item 61 correctly makes false) — replaced with positive
  assertions that both are generated when absent. Baseline was 107 gates;
  the full suite is now 113/113 passing (all 5 profiles have named smoke
  coverage; the aggregate pass rate is the trackable signal this item asked
  for).
- **66. Plan-and-confirm has no deterministic backing — prompted rule only.**
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
- **67. `AGENTS.md` points non-Claude agents at a document written for
  Claude.** Found 2026-08-13, same cross-check, prompted by an explicit
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
