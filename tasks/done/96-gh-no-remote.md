# 96 — doctor: "no git remotes found" is no-repository, not "unrecognised"

## Status

**Done — shipped in 0.16.1** (lajin-mohan/ai-scaffold#154, `release: v0.16.1`;
`npm view @lajin.m/ai-scaffold version` showed 0.16.1 on 2026-10-23).

## Why

In a project with no git remote, `gh repo view` exits non-zero with
"no git remotes found". `classify` (`gh-runner.js:110-123`) has no pattern for
it, so it returns `UNKNOWN`. Every local project without a remote then gets
"GitHub CLI failed for an unrecognised reason" for the C-01 to C-03 checks.
`REASONS.NO_REPO` and its remedy already exist (`gh-runner.js:36,49`) and give
the right message: "No GitHub repository is configured here; add a GitHub
remote or pass --repo owner/name".

## Plan

1. In `classify`, map stderr containing `no git remotes found` (and git's
   `not a git repository`) to `REASONS.NO_REPO`, before the generic fallback.
2. Unit tests: both stderr strings give `NO_REPO`; an unrelated stderr still
   gives `UNKNOWN`. A `doctor --json` shape check confirms only the `reason`
   value changes.

## Verification

Real check: a generated project with no remote, then `ais doctor`, shows the
no-repository message (local Windows, real `gh`).

## Plan v2 — after architect review (2026-10-13): APPROVE WITH CHANGES → applied

Reviewer confirmed with gh 2.93.0: outside a repo,
`failed to run git: fatal: not a git repository`; with no remote,
`no git remotes found`. Both exit 1.
- Correct the false comment at `gh-runner.js:222` ("exits 0 with empty
  stdout") and keep the guard.
- Add a comment on the new `classify` branch noting these strings come from
  `repo view`.
- Only `reason` changes; `countsAsFailure` is unaffected. Patch-safe.
