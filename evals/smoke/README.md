# Smoke evaluation (item 99)

Four fixed tasks run headless in Claude Code on fresh projects generated from a
packed tarball. They give a before/after quality check for the lean-core change.
Protocol, thresholds and the limits of what a result means:
[THRESHOLDS.md](THRESHOLDS.md). Maintainer tooling only; not shipped to npm.

## Run

From the repository root, on the commit you want to measure:

```bash
npm pack --pack-destination ../ais-pack
```

First, a preflight in the same terminal and environment the batch will use.
It checks that the agent can write, read and run `npm test` in each setup
without an unexpected permission denial; do not run a batch until it passes.
A failure prints how the agent ended (exit code, result, tool calls, login,
last stderr lines) and keeps each setup's stream and stderr under
`evals/smoke/results/preflight-<time>/runs/` (git-ignored):

```bash
node scripts/eval-smoke.js preflight --tarball ../ais-pack/lajin.m-ai-scaffold-<version>.tgz --model <model-id> --setups native,minimal,full
```

Then the batch:

```bash
node scripts/eval-smoke.js run --tarball ../ais-pack/lajin.m-ai-scaffold-<version>.tgz --model <model-id> --label baseline-<yyyy-mm-dd> --setups native,minimal,full --repeats 2 --tasks bugfix-slugify,feature-discount
```

- `--setups` picks what the agent sees: `native` (no scaffold), `minimal`
  (short guidance only) or `full` (`ais create`); default `full`. See
  [setups/README.md](setups/README.md).
- A run with an unexpected permission denial is **invalid**: its evidence is
  kept, and the batch stops. Fix the cause and rerun under a new label.
- `--model` is required and must be the same for before and after runs.
- Run it from a terminal where `claude` is logged in. Runs read project
  settings only (`--setting-sources project`, so your own hooks and settings
  cannot change the result), which means a login kept in the `env` block of
  `~/.claude/settings.json` never reaches them. If that is where yours is,
  export it into the terminal first; the values stay in that shell only. In
  PowerShell:

  ```powershell
  $s = Get-Content "$env:USERPROFILE\.claude\settings.json" -Raw | ConvertFrom-Json; foreach ($n in 'ANTHROPIC_AUTH_TOKEN','ANTHROPIC_BASE_URL','CLAUDE_CODE_OAUTH_TOKEN') { if ($s.env.$n) { Set-Item "env:$n" $s.env.$n } }
  ```

  The runner stops at the first run that reports "Not logged in".
- On Windows, `claude` is a `.cmd` shim that the runner will not execute; pass
  the real binary, for example
  `--claude "%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe"`.
- Defaults: 3 repeats per task, `--budget-usd 1` per run, all four tasks.
  `--tasks bugfix-slugify,orientation` runs a subset.
- Each run uses your Claude Code login and spends real tokens: tasks ×
  setups × repeats agent sessions per label (the pilot: 2 × 3 × 2 = 12).

Output: `evals/smoke/results/<label>/summary.json` and `summary.md` (commit
these), plus `runs/<task>-<setup>-r<n>/` with the event stream, diff, check result and classified denials of every run
(git-ignored; keep it locally while reviewing failures).

## Compare

```bash
node scripts/eval-smoke.js compare evals/smoke/results/<before>/summary.json evals/smoke/results/<after>/summary.json
```

It refuses to compare runs with a different model, Claude Code version, repeat
count or budget, applies thresholds T1 and T2 per task and setup, and exits
non-zero on a regression. It gives no verdict at all when either set has an
invalid run or stopped early.

## Adding a task

`tasks/<id>/task.json` (prompt, timeout, `safety`), optional `seed/` files
committed on top of the generated project, optional `hidden/` tests, and a
`check.js` whose default export receives `{ dir, run, taskDir, seedFile,
seedCommit, toolUses, finalText }` and returns `{ pass, reasons }`. `run` only
executes `node` or `git`, resolved to absolute paths. Write the task's pass rule
into THRESHOLDS.md before its first run.
