# AI Scaffold — Backlog

**Purpose:** Prioritised backlog for the `v0.8.x` / `0.9` line. Shipped work lives
in `CHANGELOG.md` (the permanent record); this file tracks what is **left** and
why. Completed items are removed after verification against npm/git, not kept as
history.

## Current state (2026-07-12)

- **`@lajin.m/ai-scaffold@0.8.8` is live on npm** (`latest`, with provenance).
- **v0.9.0 is in review (PR #68), not yet merged:** project constitution (39),
  generated-output genericization (finishes 37), and Claude-feature
  modernization (per-agent model/tools, command descriptions, honest skills list).
- `main` and `dev` are protected; `main` is an ancestor of `dev` (release-ready);
  CI is green on `dev`.
- Post-release `main→dev` sync is automated (`npm run sync:main-dev` +
  `.github/workflows/post-release-sync.yml`).
- A review of the **published 0.8.6 artifact** (installed from npm, all 5 profiles
  generated and tested) rated the product **7/10** — "solid late beta / early
  production." **Tier 1 below is the set that moves it to 8+.**

---

## Shipped (done — detail in CHANGELOG)

Removed from the active backlog after verification:

| Ver | Delivered (old item #) |
|---|---|
| 0.8.1 | Trusted publishing + provenance, branch protection, CI security gates (npm audit + gitleaks), managed-file ADR, downstream-CI decision, flag/metadata validation, real ESLint gate (1–10) |
| 0.8.2 | Trimmed published package surface (12) |
| 0.8.3 | Live Claude Code hooks (packaging fix), posix manifest, governance skeleton, git-init default, real `doctor` gate |
| 0.8.5 | Python + Go profiles, `ais list`, README on-ramp |
| 0.8.6 | Per-profile command defaults (11), `copy.js` refactor (13), `--dry-run --json` (14), generated doc-link fix, `release:check` gate (20) |
| 0.8.7 | **`.gitignore` packaging fix** (11b) + packaging-aware smoke gate; **automated post-release `main→dev` sync** — completes 20; small review cleanup (24) |
| 0.8.8 | **Node profile ships a real test** (35); genericized shipped `.claude/` content — removed fictional org + `HIRE-###` tickets (part of 37); post-release sync made tolerant (part of 47) |

---

## Pending — reprioritised

### 🎯 Tier 1 — Rating movers (7 → 8+)

The four things the artifact review named as what caps the rating. Ship these and
the product is honestly an 8.

> **Tier 1 status (2026-07-12):** **35** shipped in 0.8.8. **37** finished across
> 0.8.8 + PR #68. **39** delivered in PR #68 (pending merge). **36** is largely
> covered by the tarball-based `pre-publish-smoke.sh` (packs → installs → `create`
> per profile). This tier is effectively closed once PR #68 merges.

**39. Project constitution + progressive disclosure** — *the #1 adoption risk.*
A generated project drops 152 files / 35 commands / 17 agents / 17 rules on day
one, with no in-project ramp and no supremacy order across the 17 rule files.
Generate a single small `constitution.md` (non-negotiables, à la Spec Kit) + an
in-project "start here". Biggest lever for team adoption and the clearest
differentiation. **Effort: large (0.9 theme).**

**35. Node profile: a real test, not a stub** — *user-facing, quick.*
Node ships `"test": "echo \"Configure...\""` — a stub that "passes" while testing
nothing (violates the scaffold's own no-stubs rule; makes node second-class vs.
python/golang, which ship runnable starters). Ship a zero-dep `node --test` smoke
file + a smoke assertion that `npm test` actually runs a test. **Effort: small.**

**37. Remove fictional inheritance from shipped rules/agents** — *content honesty.*
Shipped `.claude/` rules cite `HIRE-142` tickets, Techversant multi-tenant SaaS,
and `apps/api/src` layers that don't exist in a generated CLI/library/single-tenant
project — an AI reading them is taught from the wrong codebase (a mild H1/H3
violation baked into the product). Neutralise or gate behind profile. **Effort: medium.**

**36. Generation gate that runs against the packed tarball** — *reliability; the class bit twice.*
`settings.json` (0.8.3) and `.gitignore` (0.8.6) were both silently stripped by
npm and invisible to source-run gates. Add a gate that `npm pack` → installs the
tarball → `ais create` per profile → runs `doctor` + link + structural checks. The
only gate that proves the *published* artifact. **Effort: medium.**

### Tier 2 — Real product depth

- **38.** Laravel fresh-create ships no `composer.json`, so its configured
  `composer install` / `composer test` fail — ship a minimal one or make laravel
  `init`-only and adjust its defaults. *(medium)*
- **17.** Move lessons capture into `.ai-scaffold/` (touches generator, templates,
  `/lessons`/`/reflect`, doctor, tests). *(medium)*
- **16.** Automatic context detection for existing projects on `init`
  (stack/framework sniffing). *(medium/high)*
- **25.** Real `ais update` file-migration flow (currently a safe placeholder). *(high effort)*
- **26.** Deepen `status`/`doctor` (drift detection, richer health). *(medium)*
- **30.** More stack profiles (Next.js, Java, .NET, Flutter). *(medium)*
- **40.** Prune commands/agents that restate native Claude Code behaviour
  (Agent OS v3 humility — a smaller, sharper surface). *(medium, 0.9)*

### Tier 3 — Backlog / strategic

- **15.** Install operation records (audit trail of CLI actions).
- **19.** Per-profile CI pack (optional, opt-in).
- **23.** Deep-research command/agent.
- **27.** Repair / uninstall dry-runs.
- **28.** Missing CLI docs (per-command reference).
- **31 / 32 / 33.** Optional QA-browser / UI-UX / enterprise-safe-hooks packs.
- **34.** De-duplicate the 5 profile templates (shared base + overlays).
- **42.** Artifact-handoff chains between agents (borrow from BMAD).
- **43.** Change-approval audit trail (borrow from OpenSpec; aligns with GDPR/ISO framing).

### Tier 4 — Hygiene (quick, non-shipping)

- **47.** **Prove the post-release sync is fully hands-off** *(release-flow
  reliability; do in the next release cycle).* The `post-release-sync` workflow
  works but is **not yet proven end-to-end**: on the 0.8.8 run it did the
  `-s ours` merge and pushed the branch, but could not open the PR —
  *"GitHub Actions is not permitted to create or approve pull requests"*. To
  close it: (1) enable repo **Settings → Actions → General → "Allow GitHub
  Actions to create and approve pull requests"** and **"Allow auto-merge"**;
  (2) add a **`SYNC_PAT`** fine-grained secret (Contents + PRs write) so the
  bot PR triggers CI; (3) verify **one** release produces a clean auto-opened +
  auto-merged (merge-commit) sync PR with zero manual steps. Until then the sync
  is semi-manual (the script now warns instead of failing when PR-create is
  blocked, and leaves the branch pushed).
- **29.** Delete the stray `v1.0` tag — it's a **live landmine** (breaks
  `git fetch --tags`; already broke the sync script once). Needs an explicit
  human "delete v1.0".
- **44.** Remove stray cruft from source template dirs
  (`templates/{golang,python}/apps/api/migrations/`, `.vscode/`).
- **45.** Bump GitHub Actions off Node 20 (checkout/setup-node/gitleaks
  deprecation annotation).
- **46.** Fix the repo's own `.claude` `DESIGN_TOKENS.md` link (same typo fixed in
  templates in 0.8.6).
- **21.** Docs-honesty pass (stale version/claims). **22.** Publish-workflow input
  cleanup. **18.** Hooks-roadmap doc. **41.** Decide the fate of the example hooks
  (`jira-sync.py`, `notify-review.py`) — pack or remove.

---

## The 8+ path (honest)

**No single item takes 7 → 8.** The rating is capped by three weaknesses the
review named: (a) volume with no on-ramp, (b) node/laravel not first-class,
(c) content that teaches from a fictional codebase.

- **The realistic 8+ bundle is Tier 1** (39 + 35 + 37 + 36).
- **If you do only one: 39** — it's the named #1 adoption risk and the clearest
  differentiation, but it's a 0.9-sized theme.
- **Cheapest visible wins first: 35 + 37 + 45** — ~a day, each removes a named
  weakness, and 35/37 are shipped-content changes (worth a real 0.8.8).

---

## Release checklist (enforced, not aspirational)

A release is ready only when **all** of these pass — the first two are automated:

- `npm run release:check` — `origin/main` is an ancestor of the promotion branch,
  and a `release/v*` branch changes only `package.json` / `package-lock.json` /
  `.ai-scaffold.json` / `CHANGELOG.md`.
- `bash scripts/pre-publish-smoke.sh` — currently 94 gates incl. the packed-surface
  and generated-doc-link checks.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`.
- `gh pr view <id>` shows `mergeable` + required checks green.
- **A release is not shipped until `npm view @lajin.m/ai-scaffold version` shows the
  new version** — merging the release PR to `main` is not publishing; the `v*` tag
  push is the trigger. Failed publishes use a new patch tag, never a moved tag.
