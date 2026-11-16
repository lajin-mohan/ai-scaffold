# 110 — COE rule packs, starting with ColdFusion

## Status

Proposed, P2, 2026-11-09. From the research report gap review.

**Related proposal (2026-11-13):**
[114 — UX add-on](114-design-system-pack.md) proposes extending this mechanism
to skills, commands, hooks and owned MCP/settings contributions. ColdFusion
remains the second consumer proving general composition. The source/licensing
decision and scoped-rule requirements below still apply; the expansion requires
the pack design/estimate, not a separate lifecycle engine.

## Problem

The report recommends turning Techversant COE standards into AI context and
review criteria, starting with the ColdFusion Style Guide (v1.0, November
2025, `techversant-infos/coe`). The scaffold ships five profiles (generic,
node, python, golang, laravel) and has no way to add an organization's own
standards to a generated project. Engyne's technology slice (CR-001 §3.7) is
expected to show where AI performs worst, such as ColdFusion, which is where
better context should help most.

## Scope

1. A rule-pack mechanism: a pack is a set of path-scoped rules plus a source
   reference, added at `ais create` / `ais init` and tracked by `ais update`
   like any managed file.
2. A ColdFusion pack built from the COE guide, scoped to `*.cfc` / `*.cfm`.
   Reference the guide; do not copy it wholesale.
3. Decide pack source and licensing (bundled, or fetched from a pinned COE
   commit) before building.
4. Use Engyne's technology-slice results, once available, to choose the next
   pack.

## Done when

- A generated project can add the ColdFusion pack, update it, and remove it,
  with tests through the packed tarball.
- The pack loads only for ColdFusion files.
