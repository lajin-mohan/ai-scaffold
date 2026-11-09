# 105 — Rule hygiene: provenance manifest, stale-content check, outdated removals

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

1. Every shipped rule has a provenance entry: **Prevents** (the failure),
   **Enforced by** (an executable hook/CI check, a human review gate, or
   instruction only) and **Applies when** (always, or a scope expressed in each
   tool's native format: `paths:`, `.mdc` `globs`, `applyTo`). *Amended
   2026-11-06:* entries live in a manifest outside auto-loaded folders, not in
   rule headers, so they cost no context. HTML-comment stripping in rule files
   is unverified and not relied on. A rule that cannot fill its entry is
   removed or moved to docs.
2. A CI check fails on: a shipped rule without a manifest entry; a reference
   to a command, agent, hook or skill that does not ship; a model name; and a
   live project placeholder in an always-loaded file after create. Placeholder
   and model-name checks cover shipped artifacts only, so research, history
   (`CHANGELOG.md`, `tasks/done/`) and authoring slots (`{{FEATURE_NAME}}`)
   stay valid.
2a. **Mechanical vs human enforcement.** An entry claiming "Enforced by hook"
   or "CI" names the check and ships allowed and blocked probes that prove it.
   Judgement gates (business correctness, UX fit, architecture direction) are
   recorded as human-reviewed and never counted as automatic. A `BLOCK` label
   alone is not an enforcement claim.
3. Remove or rewrite the outdated content above. Make multi-tenant and
   compliance content conditional on the bootstrap answers (item 84 / 90).
4. Ship removals to existing adopters through `ais update` retirements, with a
   CHANGELOG `Removed` entry naming each replacement.

## Acceptance and validation

- [ ] The CI check fails on a fixture rule missing its manifest entry, on a
  fixture reference to a non-shipping command, and on an automatic-enforcement
  claim with no probe; it passes on the cleaned templates and ignores
  research/history files and authoring slots.
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

## Progress (Wave B, PR 5)

- `docs/governance/rule-manifest.json`: every shipped rule records what it
  prevents, when it applies, and the hooks that back it, each with a probe
  test or a stated gap.
- `scripts/check-governance.js`, run by `npm run typecheck`, generates all five
  profiles and fails on:
  - a tool's startup context over 5K est-tokens, or Codex bytes over 32 KiB;
  - broken links or unresolved placeholders;
  - a missing `/ais-*` command or `.claude/hooks/` path;
  - retired command names or pinned model names outside history files;
  - manifest drift.

  Tests: `tests/check-governance.test.js`.
- Outdated content listed above is resolved:
  - `token-usage-rules.md` removed and the tenant wording made conditional
    (PR 4);
  - UX alias block, ponytail ladder and the "no step is skippable" claim
    (PR 5).
- **Open:** three hook claims in `ai-coding-rules.md`
  (`pre-write-fact-check.sh`, `post-write-console-warn.sh`,
  `pre-bash-quality-gate.sh`) have no test. They are recorded as gaps (item 98)
  and reported as warnings. Close this ticket when PR 5 merges, leaving those
  gaps to item 98.
