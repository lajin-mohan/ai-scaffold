# 114 — UX add-on feasibility study

2026-11-13 · Draft · Reconciled against dev `f4cb102` (package 0.19.0).

The first assessment used older local checkout `762a247` (0.16.1). Current dev
was fetched and inspected before this PR. Its update/apply, settings merge,
renamed commands and prerequisite tickets supersede the earlier missing-engine
finding. No published-package verification is implied by this source review.

## Finding

**Conditionally feasible.** An optional UX capability fits the scaffold's
profile/file-plan architecture and existing UX workflow. It is a substantial
product extension, not a documentation-only skill bundle. The largest risks are
safe lifecycle/configuration ownership, migrating hard-coded brand guidance,
and proving equivalent behavior in three coding tools.

Proceed with contracts and small prototypes. Extend item 25's existing safe
update/apply/removal engine and Claude settings merge for pack contributions;
do not implement a second engine. The first release must include all three adapters, as the
maintainer requires; a Claude-only pilot is useful internal work but not v1.

Sources were reviewed on 2026-11-13. External documentation establishes
documented capabilities, not installed-account access or successful integration.
No Figma account, client runtime or token-build prototype was exercised here.

## Compatibility with this repository

Paths/lines below refer to inspected dev `f4cb102`. Rebase and recheck before
implementation; the npm artifact and live integrations were not verified here.

| Area | Observed evidence | Feasibility consequence |
|---|---|---|
| CLI routing | `bin/ai-scaffold.js:70` enumerates known commands and treats other positional input as project creation | Register the proposed `pack` namespace and test bare routing; current `--pack` is not implemented |
| Updates | `src/cli/commands/update.js:35` exposes preview and apply; `src/cli/core/update-plan.js:36` makes managed-file decisions | Reuse the existing engine, including pristine-file removal; pack lifecycle is new work |
| Hashes | `src/cli/core/manifest.js:12`, `:57` and `src/cli/core/hashing.js:54` create install metadata and line-ending-aware file records | Reuse hashes, extend manifest schema/ownership; hashes alone are not an updater |
| Ownership | `src/cli/core/ownership.js:42` declares Claude settings merged; unknown paths default to unowned at `:50` | Extend owned contribution records for multiple packs and MCP/Cursor/Codex config |
| Settings merge | `src/cli/core/settings-merge.js:30`, `:136` track scaffold subsets and make base-aware decisions | Extend the contract; preserve protective rules rather than using generic object merging |
| File placement | `src/cli/core/file-plan.js:53`, `:77`, `:225` exclude/remap files | `.cursor`, `.codex`, `.agents`, `.mcp.json` and pack content require deliberate supported placement |
| Copy path | `src/cli/core/copy.js:71` copies managed files directly | Do not build pack lifecycle by calling the current copier over existing user files |
| Diagnostics | `src/cli/commands/doctor.js:142` evaluates file integrity; `src/cli/commands/list.js:11` enumerates four asset categories | Add pack inventory, contribution drift and adapter status without equating offline with broken installation |
| Packaging | `package.json` allowlists CLI and selected template paths; no `packs/` allowance | Same-repository assets need new packaging entries and packed-generation tests |
| UX process | `templates/node/.claude/commands/ais-ux-analysis.md`, `ais-ux-design-prompt.md`, `ais-ux-handoff.md`; `docs/commands.md` | Keep canonical prefixed commands, manual approval and numbered artifacts |
| Brand duplication | `templates/node/.claude/skills/design-system/SKILL.md:9`; `templates/node/.claude/agents/ux-designer.md:19`, plus its token table | Changing only DESIGN_TOKENS.md leaves conflicting brands in agents/rules/skills |
| Existing checker | `templates/node/.claude/skills/design-system/scripts/check-tokens.sh` | Checker reads Markdown names and scans hex; preserve compatibility but add structured validation |
| Accessibility | `templates/node/.claude/agents/frontend-reviewer.md:40`; `templates/node/.claude/skills/accessibility-check/SKILL.md:12`, `:28` | Upgrade pack guidance to WCAG 2.2 and fix large-text unit assumptions; migration must reconcile core guidance |
| Current hooks | `src/cli/core/settings-merge.js:136` and template `.claude/settings.json` | Hook infrastructure and Claude settings merge exist; general pack contribution uninstall is new |

[Task 110](../../tasks/todo/110-coe-rule-packs.md) proposes path-scoped COE packs,
starting with ColdFusion, with source/licensing decisions and packed lifecycle
tests. [Task 104](../../tasks/todo/104-native-tool-adapters.md) proposes native
adapters consuming the shared AGENTS.md core. Extend those frameworks rather
than creating parallel implementations. [Item 25](../../tasks/done/25-ais-update.md)
is done; [98](../../tasks/todo/98-cross-tool-conformance.md) supplies cross-tool
verification. ColdFusion is the real second consumer; synthetic collision
fixtures do not require copying the private COE guide or assuming its license.

## External feasibility and requirement corrections

| Topic | Primary-source finding | Required adjustment |
|---|---|---|
| Token format | [DTCG 2025.10](https://www.designtokens.org/TR/2025.10/format/) is stable, but is a Community Group specification, not a W3C Recommendation | State the status accurately and define conformance scope |
| Build tool | [Style Dictionary](https://styledictionary.com/info/dtcg/) documents DTCG support with incomplete 2025.10 coverage | Prototype exact token/alias/theme fixtures; provisional choice, not guaranteed complete support |
| Alternative | [Terrazzo](https://terrazzo.app/docs/) supports DTCG workflows but also describes evolving 2025.10 features | Compare the same fixtures; switching tools is not proof of complete resolver support |
| Tailwind | [Theme variables](https://tailwindcss.com/docs/theme) define Tailwind 4's CSS theme API | Build an explicit semantic CSS mapping; a legacy JS config is not the universal output |
| Figma | [MCP access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) depends on seats, permissions and quotas | Validate the intended account; avoid fixed entitlement assumptions or paid-seat cost estimates here |
| Component mapping | [Code Connect setup](https://developers.figma.com/docs/code-connect/quickstart-guide/) is a separate template/configuration/publication process | MCP setup alone does not populate Code Connect or Figma variables |
| Storybook | [MCP overview](https://storybook.js.org/docs/ai/mcp/overview) describes an addon and local dev endpoint; the reviewed 10.5 page marks AI features preview | Pin and test one stable version/framework; retain local manifest/story fallback |
| Registries | [shadcn MCP](https://ui.shadcn.com/docs/mcp) uses registries configured in components.json | Merge registry configuration explicitly; do not assume a private registry already exists |
| Accessibility | [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) explicitly requires manual testing alongside automation | Treat axe results as partial evidence; retain keyboard/focus/human gates |
| Standard | [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) lists the applicable A/AA criteria | Include 2.2 requirements and correct large-text thresholds; do not equate critical-only findings with AA |
| Axe MCP | [Deque's free-plan release note](https://docs.deque.com/devtools-server/4.0.0/en/axe-mcp-server-1-8-0/) announces a free tier | Remove the proposal's paid-only claim; optional MCP, local axe baseline |
| Portable skills | [Agent Skills specification](https://agentskills.io/specification) defines directory/frontmatter and progressive disclosure | Share skill content; generate tool-specific wrappers rather than treating Claude-only allowed-tools as portable enforcement |

[Atlassian's comparison](https://www.atlassian.com/blog/ai-at-work/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)
supports generating portable summaries from structured content and retrieving
detail as needed. Its authors caution that their results are not conclusive.
Do not convert its benchmark percentages into expected scaffold savings.

## Three-tool support

| Client | Documented project surfaces | Proposed validation |
|---|---|---|
| Claude Code | `.claude/` skills/commands/settings hooks; project `.mcp.json` | Discover/call workflows, pre-edit deny, post-edit diagnostics, Stop invalidation/recursion, trusted MCP |
| Codex | `.agents/skills`; project `.codex/config.toml` MCP; `.codex/hooks.json` or hooks tables | Native skill invocation, trusted project config, mapped tool events, source protection, completion evidence |
| Cursor | Native rules/skills plus `.cursor/mcp.json` and `.cursor/hooks.json` | Native discovery, hook event/payload translation, config preservation, local agent and declared CLI surface |

Sources: [Claude hooks](https://code.claude.com/docs/en/hooks),
[Claude MCP](https://code.claude.com/docs/en/mcp),
[Codex skills](https://learn.chatgpt.com/docs/build-skills),
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli),
[Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Cursor MCP](https://cursor.com/docs/mcp),
[Cursor hooks](https://cursor.com/docs/hooks).

These documented surfaces make three-client support plausible. They do not
establish protocol equivalence. Pin versions, parse native payloads and map
capabilities to one shared validator. Existing `.claude/` agents are not assumed
to run unchanged as native subagents elsewhere. The first release's supported
matrix must name local versus cloud and CLI versus IDE behavior. Do not claim
Copilot parity implicitly; it is outside this first-release commitment.

Hooks are developer workflow controls, not an unbypassable security boundary.
Post-edit hooks cannot prevent a write that already completed; pre-tool hooks
cannot cover every external/manual write. CI must check generated-file drift
and all changed UI regardless of which editor wrote it.

## Proposed architecture

One canonical `packs/ux/` tree stores content and pack-specific workflows.
Adapters render client files from this tree. CLI packing includes the reusable
catalogue and tool assets; projects without UX do not install its files or
activate its rules/MCP connections. Their npm download may still include bundled
pack assets: download size and loaded context are separate measurements.

Use item 25's transaction planner/apply/recovery path. Build the desired file and
config-contribution state from core + installed packs before changing disk.
Maintain one owner per file, stable identities for shared config contributions,
recorded base values and provenance. Preserve conflicting edits on removal and
show actionable residuals. Server name collision is a preflight conflict,
including a user server with the same name; identical bytes do not prove shared
ownership.

Keep generic defaults and example components in this repo; client theme data
stays in the client's project. Figma, remote registries and hosted Storybook are
optional endpoints, not new repositories the feature requires. A bundled local
catalogue is the reproducible baseline. App copies become user-owned; updating
the add-on does not automatically update deployed UI.

Core guidance selects the active project system and supplies neutral principles.
The legacy WorkOS values remain an explicit migration theme. Do not strip values
from Markdown until the legacy checker can read the replacement catalogue and
all command/agent references resolve. A project with its own system needs a
bind/adopt path instead of forced replacement.

## Risk assessment and proof gates

| Risk | Likelihood / impact | Proof before rollout |
|---|---|---|
| User config or files removed by uninstall | High / high until lifecycle exists | Entry ownership, dirty-file preservation, write failure/recovery and repeated removal fixtures |
| Three clients diverge or silently skip hooks | Medium / high | Native allowed/blocked probes and stale evidence tests on pinned versions |
| Incomplete DTCG behavior | Medium / medium | Same conformance fixtures across build-tool candidates; unsupported constructs fail |
| Theme migration changes visuals | Medium / high | Exact legacy mapping plus separate reported a11y debt; opt-in remediation |
| Linter blocks legitimate UI | High / medium | Parser scope, allowed layout primitives, reviewed exceptions and legacy adoption mode |
| Preview MCP unavailable or unauthorized | Medium / medium | Local catalogue/manual handoff and explicit unavailable diagnostics |
| Client theme leaks through public package | Low / high with clear ownership | Generic fixture data only; package-content and secret checks |
| Slow/infinite hook loops | Medium / medium | Changed-file fast path, evidence cache keyed to hashes, timeouts, bounded retries |
| Eval improvements overclaimed | Medium / medium | Fixed task suite, per-dimension results, repeated runs and recorded human corrections |

## Effort and economics

This is a rough planning estimate, not a quote or approved budget. It assumes
one experienced scaffold/frontend engineer, part-time design/a11y and reviewer
support, a five-component baseline and functioning item 25 contracts.

The [plan](../process/114-ux-addon-plan.md) estimates **44–68 engineering days**,
or **53–82 days with 20% contingency**, approximately 11–17 working weeks for
one engineer. Rebuilding item 25 is not required; large component-library growth, enterprise
procurement and client approvals are excluded. Two engineers may overlap token
and adapter work after contracts, but no linear calendar reduction is assumed.

Use existing CI plus pinned local validation first. Figma seats, hosted registry
or visual testing services, model eval usage and review time are operating costs;
their amounts require actual account/vendor choices. No infrastructure purchase
is required to prove the first vertical slice. Record first-run/eval costs during
the pilot rather than inventing a monthly saving.

## Evidence limitations

This study is source-backed analysis, not an integration certification. No add-on
code, client theme, registry, MCP account or component rendering was implemented.
The original working tree contains unrelated maintainer work, preserved by
preparing this PR in an isolated worktree based on current dev.

Earlier verification on `762a247`: unscoped lint/tests discovered nested `.worktrees/` checkouts; those
runs were stopped. Scoped lint excluding those worktrees and typecheck passed.
Sandboxed Vitest could not execute due to temporary-file rename EPERM. The
authorized outside-sandbox rerun completed: 398 passed, 11 skipped, 3 failed.
Failures were a merge-commit hook test timeout and two token-budget hook tests
returning exit 1 instead of 0. Those source/tests were not modified in this
documentation task; causes were not resolved here. Final commands are recorded
in the plan. There is no passing-full-suite claim for that older checkout.
PR-base verification is recorded separately in the plan.

## Recommendation

Approve the contracts/prototype phase first. Retain the same-repository UX
add-on and all-three-client release requirements. Resolve the public CLI,
Tailwind baseline and component pilot, then prove one theme + one component +
one shared validator across all three clients before expanding the catalogue.
