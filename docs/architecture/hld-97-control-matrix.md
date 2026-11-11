# HLD 97 — Safety control matrix and fail-closed design (Wave C, C1a)

| | |
|---|---|
| Item | 97 (with 81 and part of 98) |
| Status | **Approved** 2026-11-11 (answers at the end of section 7). Implementation in C1b. |
| Date | 2026-11-11 |
| Release target | 0.20.0 (Wave C, PR C1b) |

The item 97 ticket requires a design and probe matrix before any
implementation, and says no security guarantee may be inferred from
configuration alone. This document defines what each shipped control claims,
how it fails today, what C1b changes, and how each claim will be tested.

## 1. Evidence boundary

| | |
|---|---|
| Source | `origin/dev` at `f5188f6`, `templates/node` (the hooks are byte-identical in all five profiles) |
| Machine | Windows 11, Git Bash, Node 24, Claude Code 2.1.319 |
| Parsers on this machine | no `jq`; `python3` is the Microsoft Store stub (exit 49); real Python 3.14 is on `PATH` as `python` |
| Linux | WSL has only the `docker-desktop` distribution, with no Claude Code: **no local Linux environment**. Linux evidence comes from the CI Ubuntu runner. |
| Docs | Hooks reference, `https://code.claude.com/docs/en/hooks`, retrieved 2026-11-11 |

**Documented behaviour this design relies on** (hooks reference, 2026-11-11):

- `onFailure` (`"continue"` or `"block"`) exists on `command` and `http` hooks
  and requires Claude Code v2.1.295 or later.
- Without `"block"`, a PreToolUse hook that times out, cannot start (missing
  script), or exits with a code other than 0 or 2 does **not** block the tool
  call.
- With `"block"`, those failures do what exit 2 does: the tool call is blocked.
- Exit 2 blocks even if the hook prints JSON allowing the call.
- Matching hooks run in parallel; each has its own `timeout`.

**Not documented, so tested rather than assumed:** what a Claude Code version
older than 2.1.295 does with an `onFailure` field (ignore it, warn, or reject
the settings file).

## 2. What each control claims

| Control | Runs on | Enforces or warns | Timeout now | Claim |
|---|---|---|---|---|
| `pre-secret-guard.sh` | PreToolUse `Read\|Grep\|Glob\|Edit\|Write\|MultiEdit` | **Enforces** (exit 2) | 5 s | Claude tools cannot read or write secret-bearing files; templates (`.env.example`) stay readable |
| `pre-dangerous-bash-guard.sh` | PreToolUse `Bash` | **Enforces** | 5 s | Destructive shell and git-history commands are blocked |
| `token-budget-guard.sh` | PreToolUse, read/edit tools | Enforces at 500K est-tokens, warns at 300K | 5 s | Very long sessions stop instead of degrading |
| `pre-bash-quality-gate.sh` | PreToolUse `Bash` | Enforces on `git commit` / `git push` | 60 s | Commits made through Claude pass the project pre-commit checks |
| `governance-file-guard.sh` | PreToolUse, read/edit tools | Warns | 5 s | Edits to governance files are flagged |
| `pre-write-fact-check.sh` | PreToolUse `Edit\|Write\|MultiEdit` | Warns (strict mode blocks) | 10 s | Edits to cited-but-unread files are flagged |
| `post-write-console-warn.sh` | PostToolUse | Warns | 10 s | New debug-log lines are flagged |
| `permissions.deny` (28 rules) | Claude tools | Enforces | n/a | `Read(.env)`, keys, cloud credentials and similar are denied to Claude's own tools |
| git `pre-commit`, `pre-commit-secrets`, `commit-msg` | git, every tool | Enforces (bypassable with `--no-verify`) | n/a | Branch rules, secret scan and no AI attribution on every commit, whatever made it |

**What no control here claims:** shell isolation. A Bash command can read any
file the user can. `permissions.deny` and the secret guard cover Claude's file
tools, not `cat`, `cp` or a script run through Bash. That is item 86's opt-in
sandbox (Linux, macOS, WSL2); native Windows has no sandbox.

## 3. Current behaviour, measured

### 3.1 Guard decisions (2026-11-11, payloads from fixture files)

| Case | Guard | Exit | Verdict |
|---|---|---|---|
| Read `config/.env.production` | secret | 2 | correct block |
| Grep in `config/secrets` | secret | 2 | correct block |
| Read `~/.ssh/id_ed25519` | secret | 2 | correct block |
| Read `.env.example` | secret | 0 | correct allow |
| `git push --force origin main` | dangerous | 2 | correct block |
| `cat .env` through Bash | dangerous | 0 | **gap**: shell read, not claimed (see above) |
| `cp .env /tmp/x` through Bash | dangerous | 0 | **gap**: same |
| `git push origin +main` | dangerous | 0 | **bypass**: force push by refspec (open since the 2026-10-09 audit, item 81) |
| `curl … \| bash` | dangerous | 0 | **bypass**: remote script execution (same audit) |
| `rm -rf node_modules` | dangerous | 2 | **false block** (same audit) |
| Malformed JSON | both | 0 | **fails open** (see 3.3) |
| Empty input | secret | 0 | **fails open** |

The probe itself was blocked by the live session's dangerous-command guard
because its command line contained `git push --force` as test data. Probes must
keep payloads in fixture files, never in the command line.

### 3.2 Latency on Windows (idle machine, 5 runs)

| Measurement | Range |
|---|---|
| Secret guard alone, harmless Read | 3,110 – 4,777 ms |
| Secret + governance + token guards in parallel (as Claude Code runs them) | 3,459 – 4,785 ms |
| Dangerous guard, harmless command | about 1,700 ms |

The worst case was **4.8 s against a 5 s timeout** on an idle machine.

**Root cause (confirmed):** `json_value` detects the parser on every call,
running `jq --version` (about 180 ms when missing) and `python3 -c ''` (440 –
640 ms for the Store stub). It is called about five times per tool call, so
detection alone accounts for the 3–5 s. It never tries `python`, so on a
machine like this one the guard runs on its weakest path, the `grep` fallback.

**Why it matters for C1b:** today a timeout silently allows the tool call. With
`onFailure: "block"` the same timeout blocks it. Adding `"block"` before fixing
the latency would turn slow machines into constant false blocks on every Read.

### 3.3 Parse failures

The secret guard's fail-closed branch (`pre-secret-guard.sh:46-50`) blocks only
when the input contains `"tool_name"` but cannot be parsed. Input with no
`"tool_name"` at all, malformed or empty, is allowed. Claude Code always sends
valid JSON, so this is not a practical attack path, but the item 97 acceptance
says malformed input must never become a successful enforcement result.

## 4. Design

### D1. `onFailure: "block"` only on the security guards

| Control | `onFailure` | Why |
|---|---|---|
| `pre-secret-guard.sh` | **block** | Security boundary; failing open leaks secrets |
| `pre-dangerous-bash-guard.sh` | **block** | Security boundary; failing open allows destructive commands |
| `token-budget-guard.sh` | continue | A broken budget guard should not lock every read and edit; worst case is a long session |
| `pre-bash-quality-gate.sh` | continue | git's own `pre-commit` hook runs the same checks at commit time for every tool |
| warn-only hooks | continue | A crashed warning must not become a block |

### D2. Fix latency before adding `"block"`

1. Detect the parser **once** per run: `jq`, then a working `python3`, then a
   working `python`, then the `grep` fallback, and cache the choice.
2. Parse the payload **once** and extract every field from that one parse.
3. Raise the two security guards' timeout from 5 s to **15 s** as headroom for
   loaded machines, while targeting well under 1 s.

**Acceptance:** on the Windows CI runner and this machine, p95 of a harmless
call is under 1.5 s (10% of the timeout), measured over 20 runs and recorded in
the PR.

### D3. Fail closed on unreadable input (security guards)

A security guard blocks (exit 2) when stdin is empty, is not valid JSON, or
has no `tool_name`. This holds with or without `onFailure`, so it also protects
Claude Code versions older than 2.1.295, where only the script's own exit code
counts.

### D4. Close the open bypasses in the dangerous guard (item 81)

- Block force push by refspec (`git push … +branch`) and `--force-with-lease`
  to protected branches.
- Block piping a download into a shell (`curl|wget … | sh|bash`).
- Stop blocking `rm -rf` of build output that is regenerated (`node_modules`,
  `dist`, `build`, `.next`, `coverage`, `target`, `vendor`).
- Match on the parsed command, never on the raw JSON payload.

The exact allow and block lists are fixed in C1b with a test for every entry.

### D5. Minimum Claude Code version

- Minimum stated as **2.1.295**, the version that honours `onFailure`.
- `ais doctor` reports the installed `claude --version`: a warning below the
  minimum, "unavailable" (never "passed") when `claude` is not on `PATH`.
- What older versions do with the field is answered by probe L3 before C1b
  merges. If an older version **rejects** the settings file, the CHANGELOG
  upgrade note says so prominently. A second, field-free settings variant is
  not shipped (maintainer decision 2026-11-10).

### D6. Shell reads stay a documented gap

`cat .env` through Bash is not claimed as blocked, and the docs (setup guide,
`security-rules.md` guidance) say plainly that the guards cover Claude's file
tools, not shell commands. The real control is item 86's sandbox. Pattern
matching shell commands for secret paths is not added: it is easy to bypass
and would give a false sense of safety.

## 5. Test design

Three layers. Every negative check has a positive control showing the case
would be observable without the protection, so no test passes vacuously.

### L1 — script probes (CI, no Claude Code needed)

Each guard is run with fixture payloads on stdin; the exit code is the result.

| Group | Cases |
|---|---|
| Correct blocks | secret paths (nested, `secrets/`, keys, cloud dirs, tfstate); force push (flag, refspec, lease); history rewrite; `curl\|bash` |
| Correct allows | `.env.example`, normal source files, `rm -rf node_modules`, normal git commands |
| Unreadable input | empty, malformed JSON, JSON without `tool_name`, wrong types: all block |
| Parser paths | jq present; only working `python3`; only `python`; Store-stub `python3` plus no jq (existing `guard-portability.test.js` stubs); none: each decides the same as jq |
| Latency | 20 runs per guard, p95 recorded; fails above 1.5 s |

**Platforms:** Ubuntu and Windows CI runners, every PR. Payloads live in
`tests/fixtures/guards/*.json`.

### L2 — Claude Code harness probes (maintainer's signed-in terminal)

These prove what only Claude Code can show: that a failing hook blocks the tool
call. They need a signed-in `claude`, so they run from the maintainer's own
terminal, not an agent session (lesson 2026-11-09). Cost is bounded with
`--max-budget-usd`.

Setup: a project generated from the packed tarball, plus a fixture hook wired
with `onFailure: "block"` that misbehaves on purpose:

| Probe | Fixture hook | Expected with `"block"` | Positive control (same probe, no `onFailure`) |
|---|---|---|---|
| Timeout | sleeps past a 2 s timeout | Read of a sentinel file is blocked | Read succeeds |
| Crash | exits 1 | blocked | succeeds |
| Missing script | path does not exist | blocked | succeeds |
| Real guard | shipped secret guard, Read `.env` | blocked by exit 2 | n/a |

**Observation is by sentinel, not by the model's words:** the prompt asks the
agent to copy a sentinel value from the target file into an output file. The
output file existing with the value means the read happened. The harness
reports the tool result too.

**Platforms:** Windows (this machine). **Linux: unverified** unless a Linux
machine or a WSL Ubuntu distribution with a signed-in Claude Code is available;
it is reported as unverified, not as passed.

### L3 — older Claude Code versions

The same Timeout probe, run with Claude Code 2.1.294 (the last release before
2.1.295 on npm, checked 2026-11-11) from `npx`, in a disposable directory:

- Does it start with the field present?
- Does it ignore the field (a timeout allows the read)?
- Does D3 still block unreadable input there?

The result decides the wording of the D5 upgrade note.

## 6. C1b scope and acceptance

**In scope:** D1–D5 across all five profiles (byte-identical), L1 tests in the
repository, L2/L3 scripts with instructions, results recorded in this document,
`rule-manifest.json` probes for the guards, CHANGELOG with upgrade note, and
`ais update` carrying the settings change to existing projects (the settings
merge must add `onFailure` and the new timeouts to scaffold hooks the adopter
did not modify).

**Acceptance:**

- [ ] L1 passes on the Ubuntu and Windows CI runners, including the latency check. *(Passes locally on Windows on all three parser paths; CI pending on the PR.)*
- [x] Every L1 negative case has a passing positive control.
- [x] L2 passes on Windows from the packed tarball; Linux recorded as unverified.
- [x] L3 result recorded, with versions.
- [x] `ais update --apply` from 0.19.0 adds `onFailure` and the new timeouts; a second run changes nothing.
- [x] `ais doctor` reports the Claude Code version against the minimum.
- [x] Docs say what is and is not protected, including shell reads (D6).

**Out of scope:** Cursor `failClosed` and Codex rules (item 104), the sandbox
preset (item 86), tests for the three warn-only hooks beyond D1 (item 98).

## 7. Decisions for the maintainer

1. Approve D1: `"block"` on the secret and dangerous guards only, not the token
   budget or quality gate.
2. Approve D2: fix latency first and raise the security timeouts to 15 s.
3. Approve D4's direction (exact lists are reviewed in C1b).
4. Linux L2: accept "unverified" for 0.20.0, or install a WSL Ubuntu
   distribution with Claude Code so L2 can run there.
5. L2/L3 cost: up to about $2 of maintainer-run probes, from your terminal.

### Maintainer answers (2026-11-11)

1. D1 approved: `"block"` on the secret and dangerous guards only.
2. D2 approved: latency first, timeout 15 s.
3. D4 direction approved; the exact lists are the fixtures in
   `tests/fixtures/guards/`, one test per entry. D3 stands as designed.
4. Linux L2: accepted as **unverified** for 0.20.0.
5. L2/L3: up to about $2 of maintainer-run probes is approved.
6. D5 explained and accepted.

## 8. C1b results (Windows, this machine, 2026-11-11)

| Measure | Before | After |
|---|---|---|
| Secret guard, harmless call, p95 of 20 | 3.1–4.8 s | 0.53 s with Python, 0.83 s with no parser |
| Dangerous guard, harmless call, p95 of 20 | not measured | 0.74 s with Python, 0.73 s with no parser |
| Empty, non-JSON or tool-less input | allowed | blocked by both guards |
| `git push origin +main`, a download piped into `bash` | allowed | blocked |
| Recursive forced delete of `node_modules` | blocked | allowed |

**How the latency was fixed.** Each process start costs about 0.2 s in Git
Bash. The guards now pick an interpreter with `command -v` (no process), try
`python` before `python3` on Windows (where `python3` is often the Store stub),
parse once in that same process, and use bash builtins for matching. With no
parser at all they read values with `[[ =~ ]]` alone. Found during the work:
Windows Python prints CRLF, so every parsed tool name carried a `\r` and
matched nothing; the shared reader strips it.

**D6, found in C1b.** The secret guard had a Bash branch, and its tests and
smoke check asserted that `cat .env` was blocked, but `settings.json` has never
run the guard on Bash calls, so the branch never ran in a real session. The
maintainer chose to keep D6 (2026-11-11): the branch is removed; a test pins
that the guard does not check Bash; the smoke check now tests D3 instead; and
the setup guide, `claude-permissions.md` and the shipped `security-rules.md`
say shell reads are not covered.

**D1 and D5.** All five `settings.json` files set `"timeout": 15` and
`"onFailure": "block"` on the two security guards only. `ais update --apply`
replaces an unmodified guard entry with the new one, reports a locally modified
entry instead, and a second run changes nothing
(`src/__tests__/settings-apply.test.js`). `ais doctor` reports the Claude Code
version: medium failure below 2.1.295. Changed from the D5 wording at the
maintainer's request (2026-11-11): when `claude` is not installed doctor shows
no line, because the scaffold must not depend on one agent; `claude` found but
reporting no version is `unavailable`.

**L2 and L3.** `scripts/probe-hook-failure.sh` runs the probes in section 5
from the maintainer's own terminal.

L2, 2026-11-11 11:20 UTC, Claude Code 2.1.319, Windows 11, Git Bash,
`--with-user-settings`, tarball packed from this branch:

| Probe | With `onFailure: "block"` | Control (no `onFailure`) |
|---|---|---|
| Hook times out (2 s) | not read: "hook timed out and blocked execution" | read |
| Hook exits 1 | not read: "blocked by the pre-tool hook" | read |
| Hook script missing | not read: "blocking hook error (`no-such-hook.sh` not found)" | read |
| Shipped secret guard, Read `.env` | not read: "secret-path guard blocked access to `.env`" | n/a |

The reasons are quoted from each run's `agent.log`, so every block is shown
to come from the intended cause, not from a user-level rule. A first run
without `--with-user-settings` was not logged in: every probe reported "not
read" and the three controls failed, which is how it was caught. The script
now stops with ERROR on a run that is not logged in.

**Linux L2: unverified** (maintainer decision 4).

L3, 2026-11-11 11:23 UTC, Claude Code 2.1.294 via `npx`, same machine, timeout
probe only: 2.1.294 **starts normally with the field present and ignores it**.
With `onFailure: "block"` the hook timed out and the read still happened (the
sentinel reached `out.txt`), the same as the control. So on versions before
2.1.295 the guards still block by their own exit code 2, including D3's
unreadable input (script logic, L1), but a guard that times out, crashes or
is missing does not block. The CHANGELOG upgrade note and `ais doctor`'s
version warning say this. (The script's first `--version` call through `npx`
printed an npm `ENOENT` while downloading; the summary line from the same
command reports 2.1.294.)

**Known limits.**
- The dangerous guard drops quote marks before splitting a command, so a
  blocked pattern quoted as data (for example in a commit message) is still
  blocked. That keeps `bash -c "…"` covered.
- `--force-with-lease` is allowed: without a refspec the guard cannot tell
  which branch is pushed.
- With no JSON parser installed, input that names a tool and is shaped like
  an object is read by pattern, not validated as JSON.
- The fixtures are tested on Windows here; the Ubuntu run (with `jq`) happens
  in CI.
