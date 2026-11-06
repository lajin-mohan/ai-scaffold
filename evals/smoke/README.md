# Smoke evaluation (Wave B, item 99 subset)

Four fixed tasks run headless in Claude Code on fresh projects generated from a
packed tarball. They give a before/after quality check for the lean-core change.
Protocol, thresholds and the limits of what a result means:
[THRESHOLDS.md](THRESHOLDS.md). Maintainer tooling only; not shipped to npm.

## Run

From the repository root, on the commit you want to measure:

```bash
npm pack --pack-destination ../ais-pack
```

```bash
node scripts/eval-smoke.js run --tarball ../ais-pack/lajin.m-ai-scaffold-<version>.tgz --model <model-id> --label baseline-<yyyy-mm-dd>
```

- `--model` is required and must be the same for before and after runs.
- Run it from a terminal where `claude` is logged in. A shell started by the
  Claude desktop app does not pass its login to a child `claude`; the runner
  stops at the first run that reports "Not logged in".
- On Windows, `claude` is a `.cmd` shim that the runner will not execute; pass
  the real binary, for example
  `--claude "%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe"`.
- Defaults: 3 repeats per task, `--budget-usd 1` per run, all four tasks.
  `--tasks bugfix-slugify,orientation` runs a subset.
- Each run uses your Claude Code login and spends real tokens: 4 tasks × 3
  repeats = 12 agent sessions per label.

Output: `evals/smoke/results/<label>/summary.json` and `summary.md` (commit
these), plus `runs/` with the event stream, diff and check result of every run
(git-ignored; keep it locally while reviewing failures).

## Compare

```bash
node scripts/eval-smoke.js compare evals/smoke/results/<before>/summary.json evals/smoke/results/<after>/summary.json
```

It refuses to compare runs with a different model, Claude Code version, repeat
count or budget, applies thresholds T1 and T2 per task, and exits non-zero on a
regression.

## Adding a task

`tasks/<id>/task.json` (prompt, timeout, `safety`), optional `seed/` files
committed on top of the generated project, optional `hidden/` tests, and a
`check.js` whose default export receives `{ dir, run, taskDir, seedFile,
seedCommit, toolUses, finalText }` and returns `{ pass, reasons }`. `run` only
executes `node` or `git`, resolved to absolute paths. Write the task's pass rule
into THRESHOLDS.md before its first run.
