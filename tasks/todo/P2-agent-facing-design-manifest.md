# P2 — Add an agent-facing design manifest and token governance

## Status

Proposed — rank 11, after lifecycle and reliability priorities. Analysis and
implementation plan require approval before execution.

## Context

The scaffold already documents a strong semantic design system across
`.claude/skills/design-system/`, `.claude/skills/ux-system/`, UX rules, frontend
patterns, and accessibility guidance. Agents must currently assemble those
sources themselves, and the repository has no automated way to prove that token
references, theme mappings, component usage, and contrast remain valid.

Google Labs' [`design.md`](https://github.com/google-labs-code/design.md) project
demonstrates useful patterns: a compact agent-facing manifest, a distinction
between structured values and explanatory prose, linting, token-aware diffs,
explicit omissions, and forward-compatible parsing. Its format is currently
alpha and its flat token model does not encode this scaffold's semantic,
accessibility, tenancy, or UX governance requirements. It must therefore be a
reference, not a dependency or source of truth.

## Goal

Give coding agents one concise entry point for the project's visual identity and
make design-token changes mechanically reviewable, without replacing the
existing design-system and product-UX guidance or adopting an external alpha
schema wholesale.

## Design principles

1. **One authoritative structured source.** Exact token values, dimensions,
   typography, and theme mappings have one owner. The implementation must not
   create manually maintained copies in both `DESIGN.md` and
   `DESIGN_TOKENS.md`.
2. **Prose explains intent.** Human-readable guidance describes rationale,
   correct usage, accessibility, and do/don't examples; it does not override
   structured values.
3. **Existing governance remains in force.** Product-specific interaction,
   responsive, accessibility, tenancy, and workflow rules stay in the existing
   skills, rules, architecture, and compliance documents.
4. **Semantic layers are preserved.** The Base/Brand → Semantic → Component
   model remains intact. Components consume semantic or component tokens, never
   primitive brand tokens directly.
5. **Safe extensibility is explicit.** Unknown content is handled according to a
   documented policy rather than silently discarded or treated as valid.
6. **External compatibility is optional.** No runtime dependency on
   `@google/design.md`; compatibility or export support requires a later,
   separately approved decision.

## Scope

### 1. Canonical agent-facing `DESIGN.md`

Add a concise root template that covers:

- visual identity and design rationale;
- authoritative semantic color roles and Base/Brand → Semantic → Component
  relationships;
- typography, spacing, and radius scales;
- light, dark, and organization-brand override behavior;
- accessibility and contrast constraints;
- component conventions and state usage;
- explicit do/don't guidance;
- links to the detailed existing UX, frontend, and accessibility sources.

The architecture/design decision must name the authoritative structured token
source and the synchronization strategy before implementation. Acceptable
strategies are either:

- structured data in `DESIGN.md`, with existing tables generated or reduced to
  guidance and references; or
- a dedicated canonical token-data file, with `DESIGN.md` generated from it.

Manually duplicating normative values is not acceptable.

### 2. Explicit omissions

Allow projects to declare intentionally unsupported or undefined categories,
for example:

```yaml
omitted:
  - elevation
  - motion
  - componentTokens
```

Validation and agent guidance must distinguish:

- intentionally omitted / not applicable;
- required but missing;
- not designed yet.

Agents must not invent values for explicitly omitted categories.

### 3. Design-token validation

Add a lightweight, dependency-conscious scaffold validator that reports
actionable file paths and token names. It must detect:

- broken token references;
- hardcoded colors in UI components;
- missing required semantic roles;
- brand/primitive colors used as operational status colors;
- missing or incomplete light/dark mappings;
- values outside the defined spacing and typography scales;
- WCAG contrast failures for declared text/background pairs;
- components referencing primitive tokens directly instead of semantic or
  component tokens;
- duplicate authoritative sections.

The validator's discovery rules and supported source-file formats must be
documented. Fixtures must cover valid, invalid, and intentionally omitted
systems, including organization brand overrides where applicable.

### 4. Safe unknown-extension policy

Implement and document these default outcomes:

| Input | Outcome |
|---|---|
| Unknown prose section | Preserve |
| Unknown custom token category | Warn and preserve |
| Broken reference | Fail |
| Duplicate authoritative section | Fail |
| Unknown component property | Warn and require design-system review |

Warnings must remain visible in local and CI output. Unknown data must never be
silently dropped during parsing, validation, or future generation.

### 5. Token-aware PR diff report

When authoritative token data changes, CI must produce a reviewable summary of:

- added, removed, and modified tokens;
- directly affected components, based on resolved references;
- new contrast failures or reductions below configured thresholds;
- incomplete light/dark or organization-brand mappings;
- whether design-system review is required, with the triggering rule stated.

The report should be deterministic and available as a CI step summary or
artifact. It must not require secrets or write comments with elevated GitHub
permissions in the first implementation.

### 6. Scaffold distribution

Ship the manifest, validator configuration, and applicable guidance through the
CLI for every supported profile (`generic`, `node`, `python`, `golang`, and
`laravel`). Generated-project tests and packed-artifact checks must prove that
the files are present and usable after installation, not only in the source
tree.

## Deferred — not part of this task

Design the canonical data model so later work can generate the following, but do
not implement these exports now:

- CSS custom properties;
- Tailwind theme configuration;
- TypeScript token types;
- DTCG-compatible JSON;
- documentation tables.

Do not add placeholders, partial exporters, or dependencies for deferred work.
Record any future export contract as a follow-up decision or ticket only after a
real consumer is identified.

## Acceptance criteria

- [ ] An approved design/architecture decision identifies the canonical
      structured token source, schema ownership, and migration strategy.
- [ ] A concise agent-facing `DESIGN.md` is available in the scaffold and every
      generated profile, and links to rather than displacing detailed UX rules.
- [ ] Structured values are explicitly authoritative; prose and product-specific
      UX guidance have documented, non-conflicting roles.
- [ ] The manifest preserves the Base/Brand → Semantic → Component token model,
      light/dark mappings, brand overrides, and accessibility requirements.
- [ ] Explicit omissions are parsed and prevent agents/validation from treating
      intentionally absent categories as accidental gaps.
- [ ] The validator detects every issue listed in Scope §3 with focused automated
      fixtures and actionable output.
- [ ] Unknown extensions follow the preserve/warn/fail policy in Scope §4 and
      are covered by tests.
- [ ] Token changes produce a deterministic diff report containing token,
      component-impact, contrast, mapping, and review-trigger results.
- [ ] CI fails on validation errors and contrast regressions; warnings remain
      review-visible without being silently discarded.
- [ ] Root and generated-project documentation explain how to validate and
      review design-token changes locally.
- [ ] All supported profiles contain the required files after `ais create`.
- [ ] The npm packed-artifact smoke test proves the new scaffold assets ship.
- [ ] Lint, typecheck, unit tests, end-to-end tests, and package smoke checks pass.
- [ ] CSS, Tailwind, TypeScript, DTCG, and documentation exports remain explicitly
      deferred and are not partially implemented.

## Suggested implementation slices

1. **Decision and schema:** inventory existing token authorities, resolve
   duplication, define omissions and extension behavior, and approve the ADR.
2. **Manifest and distribution:** add the canonical manifest/template, update
   agent entry points, and mirror it through supported generated profiles.
3. **Validation:** implement parsing, reference resolution, semantic-layer,
   scale, theme, and contrast checks with fixtures.
4. **Diff and CI:** resolve component impact, produce deterministic before/after
   reports, and add CI/package verification.

Each slice must satisfy the repository's plan-and-confirm and verification gates.

## Risks and decisions to resolve

- **Authority migration:** moving values without a generation strategy can leave
  `DESIGN.md` and `DESIGN_TOKENS.md` inconsistent.
- **False positives:** hardcoded-color and scale checks need explicit file and
  syntax boundaries for CSS, utility classes, SVG, tests, and third-party code.
- **Contrast coverage:** contrast can only be proven for known foreground/
  background pairs; the schema must declare those relationships rather than
  infer every runtime combination.
- **Component impact:** indirect references and aliases require cycle-safe
  resolution and a documented definition of "affected."
- **Generated profiles:** source-only validation is insufficient because npm can
  omit or transform packaged files.
- **Review ownership:** define which changes require design-system review and how
  that requirement maps to the scaffold's existing review workflow.

## Source references

- [Google Labs `design.md`](https://github.com/google-labs-code/design.md) —
  inspiration for the two-layer manifest, lint/diff behavior, omissions, and
  extension handling; currently alpha and not adopted as the source of truth.
- `.claude/skills/ux-system/DESIGN_TOKENS.md` — current semantic token model.
- `.claude/skills/ux-system/COMPONENT_RULES.md` — current component guidance.
- `.claude/skills/design-system/SKILL.md` — current visual-language entry point.
- `.claude/rules/ux-rules.md` — existing normative UX governance.
- `docs/compliance/accessibility.md` — accessibility requirements and design
  system enforcement context.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-21 | Create this as a design-governance task. | The manifest is valuable, but validator semantics and authority migration must be designed before implementation. |
| 2026-08-21 | Reclassify from P1 to P2 / rank 11. | Lifecycle, golden-path execution, maintainability, and deterministic state have higher scaffold-wide value; UI-heavy pilot evidence may raise it. |
| 2026-08-21 | Borrow concepts, not Google's flat alpha schema. | The scaffold already has stronger semantic layers, themes, accessibility, and product-governance boundaries. |
| 2026-08-21 | Defer exports. | Validation and reviewability provide immediate value; generators add synchronization and compatibility scope without a current consumer. |
