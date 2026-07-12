# AI Scaffold — Backlog

**Purpose:** Value-ordered roadmap for the road to **v1.0.0**. Shipped work lives
in `CHANGELOG.md` (the permanent record); this file tracks what is **left** and
why, grouped into phases by rating lever. Completed items are removed after
verification against npm/git, not kept as history.

## Current state (2026-07-12)

- **v0.9.0 is cut** — `release/v0.9.0` → `main` (PR #71), release branch changes
  only metadata; `release:check` OK, smoke 99/99, 0 high vulns. The `v0.9.0` tag
  push triggers the trusted npm publish. `@lajin.m/ai-scaffold@0.8.8` is `latest`
  until the tag lands.
- `main` is an ancestor of `dev` (release-ready); CI green. Post-release
  `main→dev` sync is automated (semi-manual until item 47's repo settings land).

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
| **Overall** | **8.0** | **8.5+** |

**Goal: every category ≥ 8.5 before v1.0.0.** The phases below are ordered by
rating lever, not by ease. `Update/lifecycle` (4) and `Claude/AI integration`
(7.5) are the two that cap the overall score — Phases 1 and 2 target exactly
those.

---

## Shipped (done — detail in CHANGELOG)

Removed from the active backlog after verification against npm/git.

| Ver | Delivered (old item #) |
|---|---|
| 0.8.1–0.8.7 | Trusted publishing + provenance, branch protection, CI security gates (npm audit + gitleaks), python/go profiles, `ais list`, `--dry-run --json` (14), `copy.js` refactor (13), `release:check` (20), `.gitignore` packaging fix (11b), automated `main→dev` sync |
| 0.8.8 | Node profile real test (35); genericized shipped `.claude/` content (part of 37); sync tolerance (part of 47) |
| 0.9.0 | **Project constitution (39)**; generated-output genericization finished — no author/org/license leaks (37); **Claude-feature modernization** (per-agent `model`, read-only reviewer `tools`, command `description` frontmatter, honest Agent-Skills list); tarball-based smoke gate that runs `doctor` per profile (36); README flow diagram + zero mermaid; GH Actions on Node 24 (45); worktree-safe `vitest` |

---

## Phase 1 — Living system (lifecycle) · the #1 rating lever

Moves **Update 4 → 8, Onboarding 8 → 8.5, Overall → ~8.3.** Until these ship,
each `ais` version is a fresh baseline and an existing project cannot upgrade
safely — the biggest gap for a scaffold whose whole value is a *shared, evolving*
operating model. **If you do only one thing on this whole list, it's item 25.**

- **25. Real `ais update` (managed-file migration).** *the headline of the
  0.9.x → 1.0 line.* Diff installed vs target version; classify each file
  (managed / protected / app-owned via `.ai-scaffold.json` hashes); preview the
  change set; apply with backup + rollback; version-pinned migrations. Converts
  the product from "a great starter kit" into "a governance platform a team stays
  current on." *(large)*
- **26. Drift-aware `status` / `doctor`.** Detect managed-file drift and surface
  exactly what `update` would change vs. what the user has customised. *(medium —
  pairs with 25)*
- **15. Install/action audit trail.** Append-only record of CLI actions
  (create/init/update): version, files touched, timestamp. Feeds `update` safety
  and aligns with the governance/GDPR framing. *(medium)*
- **27. Repair / uninstall dry-runs.** Complete the lifecycle verbs so `update`
  isn't the only mutating path; both preview before writing. *(medium)*

## Phase 2 — Modern AI surface · current with new model capabilities

Moves **Claude/AI integration 7.5 → 9, Overall → ~8.6.** This is where the newest
leverage lives — connect the governance to real tools and distribute it the
Claude-native way. Together with Phase 1 this clears **8.5 overall** and is the
v1.0 candidate line.

- **48. MCP connector pack (opt-in).** *highest "modern AI" value.* Ship a
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
5-agent fan-out on trivial changes) **without touching the guardrails**. Ordered
by token-saved-per-effort.

> **Caching note:** the upfront `CLAUDE.md` + rules load is prompt-cached, so it
> is a per-*session* cost, not per-turn. The **uncached** waste that repeats on
> every task is (a) the `/review` fan-out and (b) rules redundancy re-loaded
> fresh into each of the 5 subagent contexts (subagents don't share the parent
> cache). The top items target those — not the leaner-`CLAUDE.md` work, which
> caching already absorbs.

- **T0. Token measurement (enabler — do first).** A `/health` token sub-score +
  report: rules-corpus size, per-command / per-agent definition tokens, estimated
  per-workflow cost. Baseline before/after every change below — you can't
  optimize what you don't measure. *(low-medium)*
- **T1. Tiered / lite review.** *highest per-task saving.* `/review --lite` = one
  consolidated reviewer for XS/S changes (per `task-size-policy.md`); the full
  5-agent fan-out is reserved for M+ or critical-path (auth/billing/tenant).
  Saves ~⅘ of review tokens on the majority of changes. *(medium; keep full mode
  for high-stakes)*
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
- **29.** Delete the stray `v1.0` tag — a live landmine (breaks `git fetch
  --tags`; already broke the sync script once). *(needs explicit human "delete v1.0")*
- **44.** Remove stray cruft from source template dirs (`templates/{golang,python}/apps/`,
  `templates/*/.vscode/`).
- **46.** Fix the repo's own `.claude/skills/design-system.md` → `DESIGN_TOKENS.md`
  relative link (it has a doubled `.claude/skills/` prefix; the templates were
  fixed in 0.8.6, the repo copy was missed).
- **21.** Docs-honesty pass (stale version/claims). **22.** Publish-workflow input
  cleanup. **18.** Hooks-roadmap doc. **41.** Decide the fate of the example hooks
  (`jira-sync.py`, `notify-review.py`) — pack or remove.

---

## The 8.5+ path (honest)

- **Phase 1 alone** fixes the single worst category (Update 4 → 8) and lifts
  overall to ~8.3 — necessary but not sufficient.
- **Phase 1 + Phase 2** clears **8.5 overall** and makes "modern AI capabilities"
  real (MCP + plugin + skills). This is the **v1.0 candidate** line.
- **Phase 3** polishes to ~8.8–9 and closes the long tail for a confident **v1.0.0**.
- **The one lever if you do nothing else: item 25 (`ais update`).** It is the
  difference between an 8 and a real 9.

---

## Release checklist (enforced, not aspirational)

A release is ready only when **all** of these pass — the first two are automated:

- `npm run release:check` — `origin/main` is an ancestor of the promotion branch,
  and a `release/v*` branch changes only `package.json` / `package-lock.json` /
  `.ai-scaffold.json` / `CHANGELOG.md`.
- `bash scripts/pre-publish-smoke.sh` — currently **99 gates** incl. the
  packed-surface, generated-doc-link, and constitution checks.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`.
- `gh pr view <id>` shows `mergeable` + required checks green.
- **A release is not shipped until `npm view @lajin.m/ai-scaffold version` shows the
  new version** — merging the release PR to `main` is not publishing; the `v*` tag
  push is the trigger. Failed publishes use a new patch tag, never a moved tag.
