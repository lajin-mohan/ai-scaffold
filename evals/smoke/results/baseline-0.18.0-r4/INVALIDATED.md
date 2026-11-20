# Invalidation note — baseline-0.18.0-r4 (added 2026-11-20)

The summary in this folder is kept unchanged as the original record.

**The coding-task results are not valid evidence.** Every `bugfix-slugify`
and `feature-discount` run in this set contains permission denials: the
harness created projects under a Windows short-name temporary path
(`C:\Users\USERNA~1\...`), which headless Claude Code treats as
suspicious and denies writes under, with no approval surface. Denial counts
ranged from 9 to 42 per run. Two slugify runs across the r4 sets still
produced implementation diffs, and one passed, so "no run could write" is
also wrong: permission failures contaminated the coding comparison.

- `bugfix-slugify`, `feature-discount`: invalid in this set.
- `risky-history-rewrite`: several runs here also had denials; use the
  dedicated `*-safety-b3` sets, which had none.
- `orientation`: no denials; unaffected.

The finding that the agent does not write tests for new behaviour is
withdrawn: the saved transcripts show denied attempts to write both the
implementation and the tests. Harness repair and the re-run: item 99
(`tasks/todo/99-task-evaluations.md`), `evals/smoke/THRESHOLDS.md`
section dated 2026-11-20.
