# 105 — Rule hygiene: provenance headers, stale-content check, outdated removals

## Status

Proposed, P1, 2026-11-05. Added by the maintainer-requested reprioritization
after the 2026-11-04 effectiveness review
(`docs/process/effectiveness-review-2026-11-04.md`). Companion to item 84
(context load) and item 69 (command surface); it supplies the removal rule and
the check that keeps them from regrowing.

## Problem

Shipped rules only ever grow. Nothing requires a rule to say what failure it
prevents, so nothing qualifies for removal. Outdated content found on `dev` at
0.18.0 (`templates/node`):

- `token-usage-rules.md:58-63` recommends "Claude Opus 4+ / Sonnet 4+ /
  Haiku 4+": stale model names and Claude-only advice.
- `ux-rules.md:86-89` maps four legacy UX alias commands that still ship
  (`ux-analyze`, `ux-flow`, `ux-screen-spec`, `ux-figma-spec`; item 69).
- `governance.md:124-126` claims `/what-next` and `/health` operationalize
  compaction; unverified and tied to the removed custom `/compact` command.
- `governance.md` says no step of the 5-reviewer → `/gen-tests` → `/qa`
  pipeline is skippable, contradicting the fast lanes.
- Multi-tenant defaults in `CLAUDE.md` and 15 `tenant_id` lines in rules load
  for single-tenant projects.
- `ponytail-ladder.md` is off by default but loads every session.

## Scope

1. Every shipped rule file gets three header lines: **Prevents** (the failure),
   **Enforced by** (hook / CI / instruction only), **Applies when** (always, a
   file pattern, or a pack). A rule that cannot fill them in is removed or
   moved to docs.
2. A CI check over `templates/*` fails on: a rule without the header; a
   reference to a command, agent, hook or skill that does not ship; a model
   name; and a live project placeholder in an always-loaded file after create.
3. Remove or rewrite the outdated content above. Make multi-tenant and
   compliance content conditional on the bootstrap answers (item 84 / 90).
4. Ship removals to existing adopters through `ais update` retirements, with a
   CHANGELOG `Removed` entry naming each replacement.

## Acceptance and validation

- [ ] The CI check fails on a fixture rule missing its header and on a fixture
  reference to a non-shipping command; it passes on the cleaned templates.
- [ ] All five profiles carry the same shared rule set (shared change, item 34
  rule), with stack-specific files untouched.
- [ ] A packed-artifact project generated after the change contains none of the
  listed outdated content; `ais update` from 0.18.0 removes unmodified copies
  and leaves user-edited ones with a conflict notice.
- [ ] `npm run token-report` (item 74 M-08 fix) shows the always-loaded change.

## Dependencies

25 (update retirements, done). Coordinates with 84 (relocation), 69 (aliases),
90 (packs).

## Exit

No shipped rule lacks a stated purpose, and CI prevents stale references and
model names from shipping again.
