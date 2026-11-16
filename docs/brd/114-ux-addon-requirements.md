# 114 — UX profile/add-on requirements

Revision 0.3 · 2026-11-13 · Draft for implementation approval.

Reconciled with dev `f4cb102`: item 25 update/apply and base-aware Claude
settings merge exist; tasks 110 and 104 are present; canonical UX commands use
`ais-ux-*`. Pack composition, contribution ownership and additional client config
merging remain new work.

This is the current requirements draft for
[ticket 114](../../tasks/todo/114-design-system-pack.md). It supersedes conflicting
requirements in the imported proposal. The maintainer confirmed that content
belongs in this repository and Claude Code, Codex and Cursor must all be
supported in the first release. Remaining choices below are recommendations,
not approved implementation contracts.

Related: [feasibility study](../architecture/114-ux-addon-feasibility.md) and
[implementation plan](../process/114-ux-addon-plan.md).

**Scheduling decision (2026-11-16):** deferred until the current waves complete.
Retain as a P2 candidate, then rank by value to CLI users against other backlog
work; no immediate implementation, release assignment or P1 promotion. Open
technical choices remain draft until that reassessment.

## Product and scope

Provide a selectable UX delivery profile, implemented as a composable add-on to
the existing stack profiles. A Node, Python, Go, Laravel or generic project may
select UX without losing its stack profile. React + Tailwind is the supported UI
target; selecting a backend profile does not imply that its frontend is React.

Keep tokens, themes, reference components, stories, registry metadata, skills,
validation tools and adapter sources inside ai-scaffold. No separate repository
or separate CLI is required. A public hosted registry or separately published
component package is not a prerequisite.

First release delivers a small, working system: default and example client
themes; Button, Input, Select, Dialog and Alert reference components; stories and
keyboard tests; one form/workflow example; safe lifecycle; three working tool
adapters. Expansion to a large component library is separate work.

## Proposed CLI and naming

Pack subcommands and `--pack` selection below are proposed. Update and doctor
already exist and must consume the proposed installed-pack metadata:

```text
ais create client-app --profile node --pack ux
ais init --profile laravel --pack ux
ais pack list
ais pack add ux --dry-run
ais pack add ux
ais pack remove ux --dry-run
ais pack remove ux
ais update --dry-run
ais update --apply
ais doctor --json
```

Use `ux` as the capability ID and “UX profile/add-on” as the product label.
Retain `--profile` for language stacks. Prefer a grouped `ais pack` namespace
over generic top-level `add`/`remove`. Register `pack` in the CLI's bare-command
router so it cannot accidentally create a project named `pack`.

Use kebab-case file and skill names. Retain current canonical UX command names;
new design-system commands use the proposed `ais-ds-*` namespace, consistent
with current shipped `ais-*` commands. Do not introduce retired unprefixed UX
command names into executable guidance or generated output.

## Functional requirements

| ID | Requirement | Evidence required |
|---|---|---|
| UX-01 | UX composes with all five stack profiles; UI activation validates the configured React/Tailwind workspace | Five-profile install matrix plus non-React rejection/configuration guidance |
| UX-02 | One pack definition and one content source; no five copied UX corpora | Deterministic adapter generation and shared-content drift check |
| UX-03 | Record pack ID/version, source integrity, compatible scaffold schema, capabilities and file/contribution ownership | Manifest migration and legacy-manifest fixtures |
| UX-04 | Add/update/remove use item 25's transaction, preview, conflict and recovery contract | Packed create/init/upgrade/removal tests with modified user files |
| UX-05 | Settings, hooks and MCP contributions merge by owned entry; preserve existing unrelated and edited entries | Three-way merge, collision, idempotence and uninstall fixtures |
| UX-06 | Distinct pack file collisions fail before writes, including Windows case-only collisions | Two-pack conflict fixture, including synthetic non-UX consumer |
| UX-07 | Doctor/status/list show pack version, drift and adapter capability availability | Stable JSON and human-readable output; unavailable differs from passing |
| UX-08 | Brand-neutral core guidance resolves the active system; pack supplies defaults and per-client overrides | Existing customized system takes precedence; no forced theme adoption |
| UX-09 | Preserve existing semantic CSS token names and light/dark behavior | Golden default-theme mapping, with explicit accessibility findings |
| UX-10 | DTCG 2025.10 is the interchange target; define and test the initial supported subset | Typed token/alias fixtures, cycle detection, unsupported-feature errors |
| UX-11 | Build CSS variables, Tailwind 4 theme mappings and DESIGN.md from tokens and curated guidance | Deterministic rebuild, provenance/version hashes, no manually duplicated values |
| UX-12 | Theme defaults and overrides resolve deterministically; client theme data is project-owned | Two-theme isolation, missing roles, light/dark and contrast pair tests |
| UX-13 | Component catalogue describes props, states, semantic roles, dependencies, stories and accessibility | Five reference components and working example; registry metadata agrees with source |
| UX-14 | Existing UX commands consume the selected system and retain human approval gates and artifact paths | End-to-end walkthrough through analysis, design prompt, review and handoff |
| UX-15 | Shared validators run directly in CI; adapters invoke the same validators from their native hook events | Positive and negative probes in Claude Code, Codex and Cursor |
| UX-16 | Validate token usage, defined references, scale membership and allowed component imports in documented syntax | CSS/TSX/Tailwind fixtures including arbitrary values, aliases and exceptions |
| UX-17 | WCAG 2.2 AA is the pack target, with automated and manual evidence | Axe results, keyboard/focus checks, contrast pairs and human review |
| UX-18 | Build a representative evaluation set and report dimensions independently | Twenty tasks, fixed fixtures/configuration, baseline and repeat-run results |
| UX-19 | No additional UX pack assets, rules or MCP entries for projects that omit the add-on; existing neutral core UX remains | Packed baseline comparison and actual client loading observations |

### Ownership and packaging

Recommended source root: `packs/ux/`, with `pack.json`, `content/`, `skills/`,
`commands/`, `rules/`, `hooks/` and adapter metadata. Token builders and adapters
must have explicit package allowlist entries and generated-project placement;
existing file-plan exclusions cannot silently move them to unusable paths.

Install managed catalogue/tool assets below `.ai-scaffold/packs/ux/`; native
adapter entry points go in their clients' documented project locations. File
records identify their contributing pack. Structured config records additionally
identify owned server names, hook IDs and their base values. Conflict handling
must work at entry level, not treat an entire shared config file as pack-owned.

Client-specific theme sources and application components belong to the adopter.
Do not copy confidential client themes into the public scaffold. Reference themes
in this repository are generic examples. Managed default catalogue assets are
distinct from user-authored themes and copied application components.

Installing the pack must not silently rewrite application source, package.json,
lockfiles, existing ESLint/Stylelint config, Tailwind configuration or CI.
Integration produces a preview and explicit instructions or an approved patch.
Component adoption can copy selected catalogue sources into the application's
configured component directory; those copies are user-owned and are never
deleted by pack uninstall. Updates report available migrations rather than
overwriting copied components.

Pack removal deletes only pristine owned assets and unchanged owned config
contributions. Preserve edited/unknown data and report residual files. Shared
dependencies remain until no installed pack needs them. Unsupported legacy
metadata must produce a repair/preview path, never inferred destructive ownership.

### Reuse and callable surfaces

| Proposed operation | First-release surface | Existing capability reused |
|---|---|---|
| Brief, flows, screen design | `/ais-ux-analysis`, `/ais-ux-design-prompt` | Existing commands and UX analysts/designers |
| Design approval and handoff | `/ais-ux-review`, `/ais-ux-handoff` | Existing manual design adjustment and UX Lead approval |
| Apply catalogue components | `ds-apply` skill | `frontend-patterns`, `design-system`, `ux-system` |
| Validate/report | `/ais-ds-audit` and `ds-validate` | `ux-review`, `ux-audit`, `accessibility-check`, frontend reviewer |
| Add component contract | `/ais-ds-component` and `ds-new-component` | Existing frontend guidance plus catalogue/stories/tests |
| Client theme | `/ais-ds-theme` and `ds-client-theme` | Three-layer semantic token model |
| Migrate legacy UI | `/ais-ds-migrate` and `ds-migrate` | Existing approved UX handoff and incremental code review |

Do not add `ds-screen`/`ds-review` wrappers over existing UX commands. Keep the
existing `ux-designer`, `ux-flow-designer`, `ux-requirement-analyst`,
`frontend-reviewer` and `qa-reviewer` identities. Token stewardship, migration
and accessibility auditing are skill/checklist responsibilities initially;
five new specialist agents are not necessary. Use the consolidated `ais-ux-*`
workflow and command guide; do not resurrect removed aliases.

### Adapters and enforcement

All three clients are required in v1. Support means validated instruction/skill
discovery, callable workflow, MCP connection, hook behavior and CI parity on
declared client versions. Equivalent outcomes do not require identical slash
command syntax or Claude agent frontmatter in every client.

| Concern | Contract |
|---|---|
| Before edit | Protect generated output and managed validation assets through native pre-tool hooks; also detect unauthorized changes in CI |
| After edit | Run bounded changed-file validation and return diagnostics; cannot undo an already completed write |
| Shell/MCP edits | Test alternative write paths; agent Edit/Write hooks alone do not cover them |
| Completion | Check evidence tied to current content hashes, pack/theme versions and command config; invalidate stale results |
| Stop recursion | Bounded retries; recognize active stop hook; actionable failure or unavailable result rather than an endless loop |
| Session context | Small version/theme pointer; do not inject the entire catalogue or all MCP tools |
| Configuration | Protect pack-owned validator assets; allow deliberate project config changes through reviewed integration |
| Missing dependency | Explicit unavailable/error state for required validation; never mark a skipped check passed |

Core `check-tokens.sh` retains its public invocation and 0/1/2 result contract.
Its definition source must become configurable with a legacy fallback before
brand tables move. Do not claim its current regex scans cover all raw values,
spacing, arbitrary Tailwind classes, import restrictions or DTCG aliases.

### Tokens, components and accessibility

Start with color, dimension, number, font-family and font-weight tokens, plus
simple aliases, nested groups and explicit theme inputs. Confirm exact supported
types during the tool spike; reject unsupported constructs rather than silently
flattening them. Preserve unknown extension data and show warnings; fail broken
references and duplicate authoritative definitions. Component consumers use
semantic or component aliases, never primitive brand tokens directly.

Recommend Style Dictionary provisionally, pending fixture proof of the chosen
subset. Full 2025.10 resolver/$extends support is not assumed. Tailwind 4 output
must map to existing semantic CSS variables without overriding unrelated theme
namespaces. Tailwind 3 support needs a separate exporter and compatibility tests;
do not silently upgrade an adopter.

Allow layout keywords, zero, percentages, transparent/currentColor and documented
third-party/generated assets where appropriate. Validate syntax with parsers;
do not ban every numeric literal. Approved component policy applies to configured
design-system imports/wrappers, not basic semantic HTML. Exceptions need a reason,
owner and review/expiry policy.

Check declared foreground/background pairs, both themes and component states.
Automatic scans must find zero unwaived applicable A/AA violations; severity alone
does not define WCAG conformance. Manual keyboard, focus, accessible-name and
design review remain required. Contrast uses WCAG definitions: large text is
18pt or 14pt bold (approximately 24px or 18.67px at 96dpi), not 18px/14px.

Preserve legacy visuals when mapping defaults; report inherited contrast defects
instead of silently recoloring an existing application or falsely certifying it.

### Integrations and delivery artifacts

Figma remains the design target. The pack generates client-specific MCP config;
authentication, seats, permissions and rate limits are verified during onboarding.
Token-to-Figma variable mapping and Code Connect publication are explicit,
versioned integration steps, not automatic consequences of installing MCP.

Storybook MCP, shadcn MCP and browser MCP are optional discovery/authoring
accelerators. CI uses local token builds, lint, typecheck, Playwright/axe and
screenshots and can run without those MCP servers. No implicit server activation,
OAuth setup, browser install or hosted publication during pack installation.

Reuse `docs/ux/<module>/tasks/<task-id>/01-analysis.md` through
`06-dev-handoff.md`. Add linked DS validation Markdown/JSON reports and screenshot
artifacts; do not introduce a parallel mandatory `spec.md` workflow. Reports name
the checked revision, theme, tool versions, scope, failures, skips and exceptions.

## Acceptance and scope boundaries

- [ ] Pack ADR extends item 25's existing manifest/merge/transaction contracts
  for multi-pack ownership, trust, conflicts and legacy installations.
- [ ] Packed add/update/remove works for all five profiles, preserving user data.
- [ ] All three tool adapters pass real allowed/blocked probes on Windows and Linux;
  other platforms/surfaces are explicitly unverified until tested.
- [ ] Default and example client themes produce CSS, Tailwind and DESIGN.md;
  the five reference components and form demonstrate both light/dark themes.
- [ ] Existing UX artifact paths, gates and agent responsibilities remain coherent.
- [ ] Validation, source protection and stale-evidence tests pass; manual a11y
  evidence accompanies automation.
- [ ] Twenty eval tasks report design-token compliance, component reuse, accessibility and visual
  match separately. Same-suite comparison and hard failures precede a release;
  a noisy aggregate score alone cannot approve or block it.
- [ ] Lint/typecheck, unit/E2E and packed-artifact smoke checks pass on supported
  runtimes; context observations distinguish installed from loaded content.

Not first-release scope: non-React UI, new language stack, custom hosted DS MCP
server, automatic Figma authoring, hosted registry operations, Penpot integration,
full component-library coverage or arbitrary external pack execution. Penpot
requires a separately verified integration if demanded by an adopter.

## Decision record

| Date | Authority | Decision |
|---|---|---|
| 2026-11-13 | Maintainer clarification | Same ai-scaffold repository; UX profile/add-on; no new repository |
| 2026-11-13 | Maintainer clarification | Claude Code, Codex and Cursor required from first release |
| 2026-11-13 | Draft recommendation | Orthogonal `ux` pack, grouped CLI, reuse UX commands and agents |
| 2026-11-13 | Pending | First component set, Tailwind baseline, final CLI/schema and estimates |
| 2026-11-16 | Maintainer clarification | Defer until current waves complete; reassess priority by CLI value, demand, effort and maintenance cost |
