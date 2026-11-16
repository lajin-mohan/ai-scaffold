# 114 — Draft UX add-on implementation plan

2026-11-13 · Draft, not implementation approval.

Inputs: [requirements v0.3](../brd/114-ux-addon-requirements.md),
[feasibility study](../architecture/114-ux-addon-feasibility.md),
[ticket](../../tasks/todo/114-design-system-pack.md).

## Outcomes and fixed constraints

Ship UX as an optional capability alongside the five stack profiles, with content
in ai-scaffold and working Claude Code, Codex and Cursor adapters in v1.
Preserve existing project data, brands, canonical UX commands and approval gates.

This is maintainer work governed by root CLAUDE.md. The generated-project UX
delivery workflow is a deliverable, not the workflow used to edit this scaffold.

## Phases and estimates

### Scheduling and value review

Maintainer decision (2026-11-16): defer implementation until current waves C/D
meet their exit criteria. This is a P2 candidate with no assigned release.
Completing those waves triggers reassessment, not an automatic implementation
start. The phases and estimates below are retained planning material.

At reassessment, compare 114 with remaining CLI work using:

- **Adopter demand and reach:** named teams/projects needing this, their actual
  React/Tailwind and coding-tool usage, and how often the capability is needed.
- **Incremental CLI value:** setup/update/removal work avoided, safer reusable
  pack lifecycle and measured improvement over existing `ais-ux-*` workflows.
  Separate general CLI infrastructure value from optional component content.
- **Outcome evidence:** a defined pilot/baseline for setup time, manual fixes,
  token/component compliance and accessibility failures; vendor benchmarks alone
  do not establish scaffold value. A pilot needs its own approved scope.
- **Cost and opportunity cost:** refreshed effort after shared pack/adapters land,
  package/context cost, compatibility support and long-term maintenance ownership.

Record evidence gaps and a proceed/smaller-slice/continue-deferral recommendation.
Prefer a smaller shared CLI improvement if it provides more value per effort.
No new weighted score or fixed backlog rank is implied without evidence. Resolve
CLI/Tailwind/component-pilot questions only when this work is selected and its
implementation plan is approved.

### Retained implementation sequence

Engineering days reuse the completed item 25 engine and exclude external waiting.

| Phase | Work and expected source paths | Exit evidence | Days |
|---|---|---|---:|
| 0 — contracts and spikes | Design note/ADR under `docs/architecture/`; extend 110 packs and 104/98 adapters on completed 25; exact CLI/manifest/config contribution contract; token-tool fixtures; tool-version matrix | Approved ADR, round-trip one theme and one component, demonstrated event payloads from three clients | 5–8 |
| 1 — pack lifecycle | `src/cli/core/` pack loader/desired-state composition, `src/cli/commands/` pack namespace, `bin/ai-scaffold.js`, manifest migration, item 25 integration, settings/MCP contribution ownership | Packed install/update/remove; two-pack conflicts; edited data survives; recovery/idempotence | 10–15 |
| 2 — neutral core and content | Shared `templates/*/.claude/` UX references; `packs/ux/content/` tokens/defaults/theme fixtures/components/stories/catalogue; backward-compatible checker; npm allowlist | Legacy theme equivalence, default + client theme build, five component stories, no unresolved shipped references | 6–10 |
| 3 — validation and adapters | Shared JS validators and CLI result protocol; generators for Claude/Codex/Cursor skills/rules/hooks/MCP; discovery/diagnostics; per-client unit fixtures | Required native positive/negative probes on Windows/Linux, shell-edit/CI drift checks, stale evidence invalidation | 10–15 |
| 4 — workflows and evaluation | `packs/ux/skills/`, four proposed `ais-ds-*` entry points, active-system support in existing UX workflows; twenty eval tasks; CI artifacts | Full analysis-to-handoff walkthrough; incremental migration; dimension scores and manual accessibility evidence | 8–12 |
| 5 — pilot and release readiness | One client/workflow pilot, packed upgrades from prior versions, documentation and platform/runtime support matrix | Human review, migration evidence, all declared checks green, rollback/recovery drill | 5–8 |
| **Total** | Complete first release, all three tools | Release decision after evidence | **44–68** |

Add 20% contingency: 53–82 engineering days. Re-estimate after phase 0; full
DTCG conformance, Tailwind 3, additional components or cloud-agent parity expand
scope. Internal phase exits do not constitute a Claude-only public release.

Item 25 has landed on current dev. Phase 1 extends its engine and Claude settings
merge for pack ownership and MCP/client config contributions. Token/content work
may overlap after the contracts settle. Avoid stacked PRs; land/rebase each
independent slice according to repository rules.

## Contract checklist for phase 0

- Define pack manifest schema/version, scaffold compatibility, normalized paths,
  source integrity, dependency constraints and unknown-field policy.
- Define one owner per file and stable IDs/base values for shared config entries;
  no arbitrary array concatenation for hooks or global config takeover.
- Define legacy-manifest migration and unsupported CLI downgrade handling.
- Define dry-run, conflict, interrupted-write recovery, dependency removal and
  residual-file reporting through the item 25 transaction contract.
- Keep executable packs bundled initially; no remote code-fetch/install hooks.
  Reconcile task 110's source/licensing decision and test the real ColdFusion
  consumer alongside synthetic collision fixtures.
- Specify token subset, theme overlay order, semantic variable names, generated
  output provenance and deterministic build; compare Style Dictionary/Terrazzo
  with the same fixtures before choosing.
- Declare React/Tailwind 4 and client versions only after checking their engines,
  manifests/lockfiles and compatibility; keep pack runtime needs separate from
  the core CLI's current Node >=16 declaration.
- Map native events/tool names/trust behavior for all three clients; define
  skipped/unavailable/error semantics and completion-evidence invalidation.
- Decide starter component adoption paths and user ownership; no application
  source edits or dependency installs during ordinary pack installation.

## Verification matrix

| Layer | Required cases |
|---|---|
| CLI | New namespace recognized before bare project routing; invalid/repeated flags; dry-run no writes; install compatibility errors |
| Ownership | Legacy/unknown manifests, modified/deleted/new files, case-only collisions, symlink/path escape, stale hashes, CRLF/LF |
| Config | User + core + two pack entries; shared server name collision; edited hook/server contribution; missing/malformed JSON/TOML; remove one pack only |
| Transactions | Full preview/apply, partial failure/recovery, interruption, rerun, dependency conflict, uninstall residuals |
| Tokens | Valid aliases, cycles, missing semantics, light/dark pairs, omissions, unknown extensions, unsupported types, deterministic output |
| Components | Five component states, props/stories consistency, keyboard/focus, client-theme isolation, form workflow |
| Validation | CSS/JSX/TSX and Tailwind syntax, arbitrary raw values, approved imports, legitimate layout literals, exceptions, stale results |
| Adapters | Skill discovery/invocation and allowed/blocked hook probes for each client; trusted/untrusted project; unavailable MCP; recursion/timeouts |
| Distribution | All five profiles from tarball with/without UX; create/init/repeated init; upgrade/removal with user edits; local catalogue remains usable offline |
| Evals | Twenty representative tasks; token/component/a11y/visual dimensions; baseline and repeated runs; reject hard violations regardless of aggregate score |
| Context | Without UX, no new UX entry points/rules/MCP activation; with UX, compare actual client loading as well as token-report estimates |

Run repository lint/typecheck/unit/E2E checks and extend packed smoke tests for
the new contracts. Run declared runtime/platform combinations, explicitly naming
unverified macOS/cloud/Copilot surfaces. Include the real Storybook and React
build, not just schema tests. Hosted credentials are not necessary for offline
CI; account integration probes run separately with authorized test accounts.

## Decisions still needed

| Decision | Recommended draft default | When required |
|---|---|---|
| User-facing selection | UX capability via `--pack ux`, alongside `--profile node` etc. | Before CLI ADR acceptance |
| Initial UI compatibility | React + Tailwind 4; detect v3 and explain unsupported migration | Before token exporter implementation |
| Component pilot | Button/Input/Select/Dialog/Alert plus one form/workflow | Before content implementation |
| First client surface | Local Claude Code, Codex and Cursor; pin exact versions after spike | Before adapter acceptance |
| Priority | Deferred P2 candidate after current waves; rank by CLI value, demand, effort and maintenance cost | Post-wave reassessment; no immediate decision needed |
| Ownership/review | Maintainer for pack lifecycle; named design/a11y reviewer for theme/component changes | Before pilot rollout |

The maintainer already settled repository location and all-three-tool v1 support;
do not ask those questions again. Recommended defaults can guide prototypes;
the approved ADR must make the final contracts explicit before implementation.

## Verification of this documentation change

### Earlier local checkout `762a247` (historical)

Checked on Node 24.20.0 / npm 11.19.0 before reconciliation with current dev:

- `git diff --check`: passed.
- Local Markdown file links and fenced-code block balance: passed for the six
  ticket/requirements/study/plan/backlog documents.
- `npm run lint -- --ignore-pattern '.worktrees/**'`: passed. Initial unscoped
  lint/tests traversed unrelated nested checkouts and were stopped.
- `npm run typecheck`: passed, 47 JavaScript files and four gitleaks configs.
- `npm test -- src tests --exclude '**/.worktrees/**' --maxWorkers 2`:
  sandbox temp-file rename EPERM prevented collection. Authorized outside-sandbox
  rerun: 398 passed, 11 skipped, three failed (412 total, 12/14 suites passed).
  Failures: merge-commit hook test exceeded 5s; two token-budget-guard tests
  returned exit 1 rather than 0. Existing source and tests were not changed;
  no claim that the full suite passes or that failure causes are established.

No product source or generated template changes are part of this documentation
task. No new pack exists to smoke-test yet; packed lifecycle, browser, native
client and external-account probes remain implementation exit gates above.

### PR base `f4cb102`

- `git diff --check` and local Markdown link checks passed.
- `npm run lint`: passed in the isolated worktree.
- `npm run typecheck`: passed (115 JavaScript files, four gitleaks configs,
  generated governance checks for all five profiles). Existing warnings identify
  three hook probes still tracked by item 98.
- Focused tests passed: `npm test -- src/__tests__/markdown-links.test.js
  tests/check-governance.test.js --maxWorkers 2 --reporter verbose` — 21/21.
- Full `npm test -- --maxWorkers 2` was started with Git for Windows Bash on
  PATH, but stopped after it ceased producing results. No full-suite pass is
  claimed; historical counts above are not current dev's results. PR CI remains
  the full-suite verification gate.
