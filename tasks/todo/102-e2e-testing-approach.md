# 102 — E2E testing approach: tool choice, honest gates, and the item 91 pack

## Status

**Proposed, 2026-10-15.** Research complete; design not started. Extends
**item 91** (E2E pack) with a tool decision and adds two honesty gaps to
**item 87**. No implementation is approved by this ticket.

| Part | What | Tier | Size | Depends on |
|---|---|---|---|---|
| **A** | Honest E2E claims in shipped governance | **P0**, folds into item 87 (roadmap row 3) | XS | none |
| **B** | Optional E2E pack on Playwright + Playwright Test Agents | **P2**, first within roadmap row 13 (item 91) | M | 25, 87, 90 (or a create-time opt-in, see Q2) |
| **C** | Pilot `tester-army/e2e` as an alternative engine | **P3**, demand-led | S | B shipped; item 99 task evaluations; its 1.0 release |

## Why

Verified on `dev` 2026-10-15:
- Shipped guidance tells projects to run `npm run test:e2e  # Playwright`
  (`templates/node/.claude/rules/stacks/frontend-react.md:134,151`,
  `commands/qa-review.md:86`, and `commands/what-next.md:257` in all five
  profiles). No profile ships Playwright or a `test:e2e` script; node's
  `package.json` has only `"test": "node --test"`. The command fails in a
  fresh project.
- `/qa` (`templates/*/.claude/commands/qa.md`) requires gstack's browse
  daemon, which the scaffold does not install or detect. It is not tracked by
  any open item.
- Item 87 already makes Playwright/mobile/theme gates conditional on an E2E
  harness being present; it does not cover `/qa` or the dead command
  references.

## Research summary (2026-10-15)

| Tool | Approach | Verdict |
|---|---|---|
| Playwright | Deterministic code, no model calls | **Baseline engine.** Already the tool the docs name |
| Playwright Test Agents (1.56+) | `npx playwright init-agents --loop=claude`: planner (explores, writes a Markdown plan), generator (writes Playwright tests), healer (repairs failures) | **Chosen for authoring.** Same vendor, Claude Code native, output is plain Playwright with no runtime AI dependency. Replaces `/qa`'s gstack need |
| tester-army/e2e | TS tests mixing `agent.act/assert` with locators; verified agent steps are recorded and replayed without model calls | **Pilot later (C).** Apache-2.0, ~10.7k stars, but pre-1.0 (APIs may change between minors), telemetry on by default, page content goes to the configured model |
| Stagehand | `act/observe/extract/agent` inside code | Not chosen: model cost on every run |
| Midscene.js | Vision-based navigation | Niche (canvas/dynamic UIs) |
| Shortest | Natural-language-only tests | Not chosen: reported Claude-only and costly; weak for regression |
| Passmark, Expect, Vercel agent-browser | Cached AI actions / diff-driven / agent browser control | Young; watch |

Third-party comparison sources were used for Stagehand, Midscene and Shortest;
re-verify against their own docs before any decision that depends on them.

**Principle:** CI runs deterministic tests only. AI writes and repairs tests;
it is never required to run them.

## Part A — honest claims (P0, with item 87)

- [ ] Every shipped `test:e2e` reference is conditional on a harness being
  present, or names the pack that provides it. No command is presented as
  runnable when the generated project cannot run it.
- [ ] `/qa` detects gstack; when absent it says so and points at Part B (or
  the Playwright MCP), instead of failing mid-run. Item 87's
  "not verified: no E2E harness" disclosure applies.
- [ ] Applied byte-identically to all five profiles (shared governance).
- [ ] Packed-tarball check: a generated project contains no unconditional
  instruction to run a script it lacks.

## Part B — the E2E pack (P2, item 91)

Scope is item 91 plus the authoring layer:
- [ ] `ais add e2e` (item 90 lifecycle) installs: `@playwright/test`, a
  `playwright.config` with desktop and 390px projects, one smoke journey,
  `@axe-core/playwright`, and `test:e2e` / `test:e2e:ui` scripts.
- [ ] Runs `npx playwright init-agents --loop=claude` and records the
  Playwright version; the agent definitions are regenerated on Playwright
  upgrade (vendor requirement).
- [ ] `/qa` is rewritten on Playwright (agents or MCP) with no gstack
  dependency; gstack becomes an optional backend.
- [ ] CI: `test:e2e` runs from the packed tarball against the golden-path
  project on Ubuntu and Windows, with traces/screenshots retained on failure.
- [ ] Scoped to profiles with a web frontend (node; others only when a
  frontend is declared). Stack-specific, so never copied sideways (CLAUDE.md
  rule 3); intentional differences proven by tests.
- [ ] Removal is reversible; existing Playwright config or tests in an `init`
  target are detected and preserved, never overwritten.
- [ ] No model credentials are required to run the suite.

## Part C — tester-army/e2e pilot (P3)

Entry criteria: its 1.0 release, Part B shipped, item 99 task set available.
Compare against Part B on the same journeys: authoring time, flake rate over
repeated runs, model cost after the first run, and maintenance after a UI
change. Telemetry disabled (`E2E_TELEMETRY_DISABLED=1`) for the pilot. Adopt
only as an optional engine, never the default.

## Open questions

- **Q1.** Part B on `ais add` (needs item 90 and item 25) or also a
  create-time opt-in (`ais create --with e2e`) that new projects get earlier?
  Recommendation: create-time opt-in first, `ais add` with item 90.
- **Q2.** Does `/qa` keep gstack as an optional backend, or is it dropped?
  Recommendation: keep as optional, detected.
- **Q3.** Which profiles count as "has a web frontend"? Needs the declared
  frontend stack from the manifest, not a guess.

## Verification

- Part A: grep of the packed tarball for unconditional `test:e2e`/gstack
  instructions; `/qa` behaviour with and without gstack.
- Part B: generate from the packed tarball, `ais add e2e`, run `test:e2e` in
  CI on Ubuntu and Windows; uninstall leaves the project as before.

## Sources

- https://github.com/tester-army/e2e
- https://playwright.dev/docs/test-agents
- https://bug0.com/blog/expect-vs-agent-browser-vs-stagehand-vs-passmark
- https://lilting.ch/en/articles/ai-e2e-testing-tools-comparison
