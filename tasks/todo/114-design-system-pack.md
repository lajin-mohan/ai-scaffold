# 114 — Design-system pack: opt-in AI UX design system for client delivery

## Current scope — revision 0.3, 2026-11-13

The maintainer requested research, revised requirements, feasibility assessment
and a draft implementation plan. The current artifacts are:

- [Requirements v0.3](../../docs/brd/114-ux-addon-requirements.md)
- [Feasibility study](../../docs/architecture/114-ux-addon-feasibility.md)
- [Draft implementation plan](../../docs/process/114-ux-addon-plan.md)

**Confirmed changes:** the UX profile/add-on and design-system content belong
inside this ai-scaffold repository; no separate repository. Claude Code, Codex
and Cursor are all required in the first release. Recommended implementation:
an orthogonal `ux` pack alongside language profiles, reusing existing UX commands
and agents. Current dev `f4cb102` already includes item 25's update/apply and
Claude settings merge. Extend those for pack lifecycle. Tasks 110 (COE packs)
and 104 (native adapters) are present and supply the shared implementation
contracts. CLI/schema, estimates and implementation remain draft.

Requirements v0.3 take precedence over conflicting material below. The imported
proposal is retained below as historical input, including its original
separate-repository decision, priority, research assumptions and decision log.
Do not treat those superseded statements as current authorization.

## Imported proposal — historical input

## Status

Proposed, P1, 2026-11-13. Decision recorded below; analysis, design and
estimate required before implementation, per the plan-and-confirm gate.

### Repository intake — 2026-11-13

Imported as a proposal from the supplied `114-design-system-pack.md`.
Adding this ticket does not approve implementation or resolve its open decisions.
Research claims and external tool/version/licensing details below are supplied
context, not independently verified during intake; revalidate them during design.

- **Priority:** P1 is the proposal's requested priority. The authoritative
  [backlog](../../docs/process/pre-npm-publish-todo.md) still places optional
  design extensions in P2; promotion needs a maintainer priority decision.
- **Missing prerequisite:** `tasks/todo/110-coe-rule-packs.md` is not present in
  this checkout. Obtain that specification before widening it; Slice 1 remains
  blocked on reconciling the prerequisite and the item 25 ownership/update
  contract. No replacement task 110 has been invented.
- **Adapter reference:** item 104 is referenced below but has no ticket in this
  checkout. Reconcile with
  [98 — cross-tool conformance](98-cross-tool-conformance.md) during design.
- **Existing design work:**
  [the design-manifest proposal](P2-agent-facing-design-manifest.md) links back
  here. Its validation requirements remain useful; the distribution and export
  changes below are proposed replacements, pending design approval.

Depends on: **extending the COE rule-pack mechanism into full packs**
(`tasks/todo/110-coe-rule-packs.md`). Supersedes the "deferred exports" and
"every profile" parts of the **agent-facing design manifest task**
(`tasks/todo/P2-agent-facing-design-manifest.md`); see "Interaction with
existing tasks".

## Context

Techversant wants an AI-assisted UX design system that delivery teams reuse
across client projects: one core system, re-themed per client, that coding
agents (Claude Code, Cursor, Copilot) apply correctly and that automated
checks can verify.

Research (November 2026) on Atlassian, Salesforce, IBM Carbon, Vercel and
Google Labs shows the same four-part pattern:

1. **Structured knowledge** — tokens, components and usage guidance as data,
   not only prose.
2. **On-demand delivery** to agents through skills and MCP servers, not one
   large instruction file. Atlassian measured a single DESIGN.md at about 30%
   of needed context and roughly twice the tokens of its MCP server or skills.
3. **Deterministic enforcement** — linters and hooks for anything checkable.
   Salesforce reports agents skip steps a skill marks mandatory.
4. **Evals and review loops** that measure output and feed fixes back.

Scope decision already made: **React + Tailwind only**; **Figma (paid seats,
Dev Mode MCP + Code Connect)** is the design tool. Penpot is a fallback only
for clients with data-residency rules.

## Decision

Build the design system as an **opt-in pack inside ai-scaffold**, not as a
separate CLI and not as a new profile. Keep the design-system **content** in
its own repository.

| Option | Verdict | Why |
|---|---|---|
| Separate tool/CLI | Rejected | Would rebuild what `ais` already has: file ownership and hashing, `ais update` with `.ais-new` merges, `doctor`, migrations, settings merge, packed-tarball tests. It would also fight core over the same `.claude/` files, which already hold design-system, ux-system, ux-review, ux-audit and accessibility-check skills, three UX agents, nine `ux-*` commands and `check-tokens.sh`. |
| New profile | Rejected | Profiles are language stacks (generic, node, python, golang, laravel), each carrying a full, identical `.claude/` copy. Profiles don't compose, so "design" would compete with "node" instead of adding to it, and add a sixth copy to maintain. |
| **Opt-in pack** | **Chosen** | Reuses the pack mechanism already planned for COE rule packs. Composes with any profile. Backend-only projects don't load its context. Tracked and updated like any managed file. |
| Design-system content (tokens, themes, components, Storybook) | Separate repo | It is a product artifact with its own release cycle and consumers outside AI tooling. The pack points to it; it does not vendor it. |

## Goal

A project can run `ais create --pack design-system` or
`ais init --pack design-system` (exact flag name decided in slice 1), get
the skills, agents, commands, hooks, rules and MCP configuration needed to
build on-brand, accessible client UI, and keep them current with
`ais update`. Removing the pack removes its files cleanly.

## Scope

### Slice 1 — Full pack mechanism (prerequisite; widens task 110)

Extend the planned rule-pack mechanism so a pack can carry:

- path-scoped rules (as task 110 already plans);
- skills, agents and commands;
- hook scripts **and** their `settings.json` entries, merged through the
  existing settings-merge code and removed on uninstall;
- an `.mcp.json` fragment (new; nothing in the scaffold ships MCP config today);
- a source reference and version, recorded in `.ai-scaffold.json`.

Requirements:

- Packs compose with every profile and with each other; conflicts between two
  packs on the same file fail with a clear message.
- `ais update` tracks pack files with the same ownership and `.ais-new` rules
  as core files.
- `ais doctor` reports installed packs, their versions and drift.
- Add, update and remove are tested through the packed npm tarball.
- The ColdFusion pack from task 110 must work on the same mechanism, so it is
  the second consumer and proves the design is general.

### Slice 2 — Split core UX from brand

The current design-system skill hard-codes one brand ("WorkOS Minimal",
green/yellow/red, fixed hex values in `SKILL.md` and `DESIGN_TOKENS.md`).
A service company needs per-client themes.

- Core keeps brand-neutral UX: principles, patterns, accessibility, the
  three-layer token model (Base/Brand → Semantic → Component), and the
  existing semantic token *names*.
- Values (hex, fonts, radii) move out of core prose into the pack's token
  source and client theme.
- `check-tokens.sh` keeps working in core; the pack extends it.
- Migration: projects already using the WorkOS defaults keep them as a
  "default" theme; no silent visual change on `ais update`.

### Slice 3 — Design-system pack contents

**Token source.** W3C Design Tokens format (DTCG 2025.10, stable) as the one
authoritative structured source, built with Style Dictionary or Terrazzo into
CSS variables and a Tailwind theme. One base theme plus one theme file per
client. A `DESIGN.md` is **generated** from it for portability — never
hand-edited.

**Skills** (Agent Skills format):

| Skill | Purpose |
|---|---|
| `ds-apply` | Choose component, token and layout pattern; check the registry and Storybook before writing new UI |
| `ds-validate` | Run lint, accessibility and visual checks; produce a scored compliance report |
| `ds-new-component` | Component contract: props, states, keyboard/ARIA, stories, tests, registry entry |
| `ds-client-theme` | Turn brand guidelines into a theme token file with contrast-checked pairs |
| `ds-migrate` | Move legacy UI onto system components (useful for legacy modernization work) |

Reuse and extend the existing `ux-*`, accessibility and frontend-patterns
skills rather than duplicating them.

**Agents:** `ui-builder`, `design-reviewer`, `a11y-auditor`,
`token-steward`, `ds-migrator`. Check overlap with the existing
`frontend-reviewer`, `ux-designer` and `ux-flow-designer` agents first;
extend rather than duplicate where they fit.

**Commands** (prefixed per the scaffold's `ais-` convention, confirm naming):
`ds-screen`, `ds-review`, `ds-component`, `ds-theme`, `ds-migrate`,
`ds-audit`.

**Rules:** registry components before new ones; tokens only, no raw values;
WCAG 2.2 AA; generated token output and lint configs are read-only; a task
is not done until validation passes.

**Hooks:**

| Hook | Event | Does |
|---|---|---|
| Token lint | After Write/Edit | Stylelint + ESLint design-system rules on the changed file; violations go back to the agent |
| Protect sources | Before Write/Edit | Blocks edits to generated token output and lint configs |
| Done gate | Stop | Blocks completion until lint, type-check and an accessibility smoke test pass on changed UI |
| Context load | Session start | Injects design-system version and active client theme |

**MCP configuration** (`.mcp.json` fragment): Figma Dev Mode MCP, Storybook
MCP addon, shadcn registry MCP (pointing at the private registry), Playwright
MCP, axe (axe-core in CI; Deque's paid axe MCP optional).

**Lint rules:** custom Stylelint/ESLint rules — no hard-coded colors or
spacing, token names only, approved components only. Model on the SLDS Linter.

### Slice 4 — Delivery flow and evals

Encode the six-stage flow in the pack's commands and docs. Each stage hands
the next a file in an open format:

| Stage | Input | Output | Gate |
|---|---|---|---|
| 1 Brief | BRD, stories | `spec.md` | Scope sign-off |
| 2 Client theme | Brand guidelines, logo | theme `.tokens.json`, generated CSS/Tailwind, `DESIGN.md` | Contrast pairs pass; token build passes |
| 3 Design | `spec.md` + tokens as Figma variables | Figma frames bound to variables | No detached components or raw colors |
| 4 Build | Figma frames via MCP, Storybook, registry | `.tsx` components, `.stories.tsx`, PR | Hooks clean |
| 5 Verify | Running app or Storybook build | `report.md`, axe JSON, visual-diff results | Zero critical a11y violations; diffs approved |
| 6 Release | Merged PR, reports, eval results | Versioned registry and token release, changelog, eval scores | Eval score not lower than last release |

Evals: about 20 reference tasks scored on token use, component reuse,
accessibility and visual match, run in CI on every skill change.

### Out of scope here (separate design-system repo)

- The component library itself (shadcn/ui + Radix, private shadcn registry).
- Storybook site and component manifest.
- Base token values and client theme files.
- A Techversant design-system MCP server — build later, generated from the
  same structured content, only once usage justifies it.
- Non-React stacks.

## Interaction with existing tasks

- **COE rule packs (110):** widen from "rules only" to full packs (Slice 1).
  ColdFusion becomes the second pack on the same mechanism.
- **Agent-facing design manifest (P2):** its validator, omissions,
  unknown-extension policy and token diff report remain valid and move into
  this pack. Two decisions change:
  - DTCG export was deferred "until a real consumer is identified"; this pack
    is that consumer, so DTCG becomes the canonical source and `DESIGN.md` is
    generated from it.
  - "Ship to every profile" becomes "ship in the opt-in pack".
- **Always-loaded context size (84, 85):** the pack must stay out of
  always-loaded context; skills and MCP load on demand. Measure the token
  report with and without the pack.
- **Native Codex and Cursor adapters (104):** pack rules and hooks must
  generate through the same adapters once they exist.

## Acceptance criteria

- [ ] Approved design note for the pack mechanism: manifest format, ownership,
      settings and `.mcp.json` merge, uninstall, conflict handling.
- [ ] A generated project can add, update and remove the design-system pack;
      tested through the packed tarball.
- [ ] The ColdFusion pack works on the same mechanism.
- [ ] Core UX guidance is brand-neutral; existing projects keep their current
      visuals through a "default" theme after `ais update`.
- [ ] DTCG token source builds to CSS variables and a Tailwind theme;
      `DESIGN.md` is generated and passes its own lint.
- [ ] Hooks block raw values, protect generated files, and gate completion;
      covered by tests.
- [ ] Always-loaded context does not grow for projects without the pack.
- [ ] Eval set runs in CI and reports a score per skill change.
- [ ] Lint, typecheck, unit, end-to-end and package smoke checks pass.

## Risks

- **Fast-moving tools:** Storybook's AI features are in preview; DESIGN.md is
  alpha. Pin versions; DTCG stays the source of truth.
- **Agents skip guidance:** enforcement must live in hooks and CI, not prompts.
- **Supply chain:** hooks and local MCP servers run with developer
  permissions. Approve sources and pin versions.
- **Client data:** Figma's hosted MCP sees design files; check client
  contracts and use self-hosted Penpot where required.
- **Licensing:** Figma MCP needs paid Dev or Full seats; Deque axe MCP needs a
  paid subscription (axe-core in CI is the free fallback).
- **Migration:** splitting brand from core can change visuals for existing
  projects if the default theme mapping is wrong.

## Open decisions

| Decision | Why it matters | Default until decided |
|---|---|---|
| Pack CLI surface (`--pack` on create/init, or `ais add`/`ais remove`) | User-facing contract | `--pack` on create/init plus `ais add`/`ais remove` |
| Pack source: bundled in npm package or fetched from a pinned repo commit | Licensing, release cadence | Bundled |
| Token build tool: Style Dictionary or Terrazzo | Build dependency | Style Dictionary |
| Command naming (`ais-ds-*` or `ds-*`) | Consistency with core commands | `ais-ds-*` |
| Where client themes live (per project or in the design-system repo) | Reuse across a client's projects | Design-system repo, one file per client |

## Suggested implementation order

1. Pack mechanism design note and estimate (Slice 1) — approval gate.
2. Pack mechanism + ColdFusion pack as first proof.
3. Core/brand split with default-theme migration (Slice 2).
4. Design-system pack: tokens, rules, hooks, lint, then skills and agents
   (Slice 3).
5. Delivery-flow commands and evals (Slice 4), piloted on one live client
   project.

## Source references

- Atlassian — structured content and ADS MCP:
  https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language
- Atlassian — DESIGN.md test results:
  https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice
- Salesforce — Design Intelligence and SLDS AI skills:
  https://www.salesforce.com/blog/coding-agents-product-design/ ,
  https://developer.salesforce.com/docs/platform/slds-linter/guide/get-started-linter-AI-skills.html
- IBM Carbon MCP:
  https://www.carbondesignsystem.com/getting-started/carbon-mcp/onboarding-and-setup
- Vercel — product-design skill:
  https://vercel.com/blog/teaching-agents-product-design-at-vercel
- Google Labs DESIGN.md: https://github.com/google-labs-code/design.md
- W3C Design Tokens 2025.10:
  https://w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Storybook MCP: https://storybook.js.org/docs/ai/mcp/overview
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- Deque axe MCP: https://github.com/dequelabs/axe-mcp-server-public

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-11-13 | Opt-in pack inside ai-scaffold; content in a separate repo | Reuses `ais` lifecycle machinery; avoids conflicting `.claude/` owners; composes with profiles; keeps backend-only context small |
| 2026-11-13 | React + Tailwind only; Figma with paid seats | Confirmed scope |
| 2026-11-13 | DTCG as canonical token source; DESIGN.md generated | This pack is the consumer the design-manifest task was waiting for |
