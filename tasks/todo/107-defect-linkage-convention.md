# 107 — Defect-linkage convention (Engyne D-28)

## Status

Proposed, P1, 2026-11-09. Part of item 106. Unblocks Engyne decision D-28
(CR-001 §9a): without an approved convention linking a fix to the defect it
fixes, Engyne's escaped-defect rate is unavailable in Phase 1.

## Problem

Escaped defects and change failure are the report's speed-versus-stability
check. No tool records them today. Engyne can derive them from Git only if
every repository links a fix to its issue the same way. The scaffold already
sets commit, branch and PR conventions in every adopting repo, so it is the
cheapest place to make the link consistent.

## Scope

1. Agree the convention with Engyne's owners before shipping. Candidate:
   `fix(...)` commits and `fix/*` branches reference the issue they fix,
   and a PR template asks whether the defect reached production. The shipped
   `branching-rules.md` already uses `Closes #123` / `Refs #123`; reuse
   `Closes` (GitHub treats `Fixes` the same) rather than adding a third
   keyword, and use a ticket ID for non-GitHub trackers (item 103).
2. Ship it in the shared governance for all five profiles: branching rules,
   a new PR template (no profile ships one today, so it needs a `files`
   allowlist entry and update tracking), and the commit-msg hook as a
   warning (not a block) when a `fix:` commit carries no reference.
3. Document it in the item 106 contract.

## Done when

- The convention is agreed with Engyne and recorded in D-28.
- It ships in all five profiles, byte-identical, with tests.
- The commit-msg warning has positive and negative tests.
