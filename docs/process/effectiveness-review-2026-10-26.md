# Effectiveness review — 2026-10-26

AI-assisted audit run with `/ais-effectiveness`. It is not a certification or a
benchmark. It re-checks a prior same-day audit pasted into the session and
proposes a priority revision. **Proposed only — the approved order in
`pre-npm-publish-todo.md` stands until the maintainer accepts it.**

## Evidence boundary

| | |
|---|---|
| Date | 2026-10-26, Windows 11, Git Bash |
| Checkout | `feature/25-slice2-foundations` @ `762a247`, dirty (backlog, CLAUDE.md, CHANGELOG, known-issues) |
| `origin/dev` | `09c6727` — item 25 slice 3 read-only preview merged (#158) |
| PR #159 (slice 4 apply) | draft, head `ac2b98a`, all four checks green (not `d544aa4` as the prior audit recorded) |
| npm | `0.16.1` (`npm view`) |
| Backlog hash at start | `169f4e20…2f097` (file already dirty → not edited) |
| Prior report | `effectiveness-baseline-2026-08-27.md` (snapshot #1, 0.14.0). The prior audit said none existed; it searched the wrong name. |
| Not run | full suite, packed create/init, any Claude Code session trace, paid evals |

Probes fed synthetic PreToolUse JSON into the shipped hook scripts; no
destructive command executed. All five profiles' `settings.json`,
`pre-secret-guard.sh` and `pre-dangerous-bash-guard.sh` are byte-identical.

## External sources (retrieved 2026-10-26)

- [Hooks](https://code.claude.com/docs/en/hooks): `UserPromptSubmit` has no
  matcher support; a matcher is "silently ignored". Only exit 2 blocks; exit 1,
  timeouts and errors do not. `onFailure: "block"` exists from v2.1.295.
- [Permissions](https://code.claude.com/docs/en/permissions): order is deny →
  ask → allow; `Read(.env)` matches at any depth; Windows paths are normalised
  to POSIX; `!` negation is valid; Read deny applies to recognised Bash file
  commands (`cat`, `head`…) but not to arbitrary subprocesses; deny/ask apply
  to every subcommand of a compound command, including in auto mode;
  `bypassPermissions` skips prompts.
- [Sandboxing](https://code.claude.com/docs/en/sandboxing): macOS, Linux, WSL2
  only — "On native Windows, Claude Code runs commands unsandboxed."
- [Cursor hooks](https://cursor.com/docs/agent/hooks): claims Claude Code hook
  loading and exit-2 parity; details are on a separate page not verified here.

## Findings

| Sev | Class | Finding | Evidence |
|---|---|---|---|
| P0 | Confirmed defect | `pre-review.sh` is wired to `UserPromptSubmit` with a `/review` matcher that the harness ignores, so it runs on **every prompt** with a 300 s timeout. The script is identical in all profiles and runs `go build/vet/test` whenever `go.mod` exists. Outside Go it does nothing and exits 0 because the bypass variable is set in settings. | `templates/*/.claude/settings.json:91-101`, `hooks/pre-review.sh:51-59,81-87` |
| P0 | Confirmed defect | The secret guard fails open on default Windows: `jq` is absent and `python3` resolves to the Microsoft Store alias, so `command -v` passes, the parse fails silently, and every path comes back empty. Read `.env` and Bash `cat .env` → exit 0. When a working `python3` is shimmed, the same probes → exit 2. The root cause is parser detection, not the regex. | `hooks/pre-secret-guard.sh:11-14,35` |
| P1 | Confirmed defect | Even with a parser, the hook regex misses Windows absolute paths (`D:\app\.env` → 0) and trivial obfuscation. | probe |
| P1 | Confirmed, severity lowered | The dangerous-Bash guard allows `git push origin main --force`, `+main` and `--force-with-lease`. The shipped native `ask` rules (`Bash(git push *--force*)`, `Bash(git push * +*)`) cover all three in default and auto modes. The regex is a misleading duplicate, not an open hole — except in `bypassPermissions`. | `hooks/pre-dangerous-bash-guard.sh:46-53`, `settings.json:72-87` |
| P1 | Supported | Native Read deny rules cover the secret probes the hook misses. The remaining gap is subprocess reads, which only the OS sandbox closes, and the sandbox does not exist on native Windows. No hook regex can close it, so honest support wording is the fix. | permissions + sandboxing docs |
| P1 | Supported | Generated always-loaded instructions: `CLAUDE.md` (481 lines) plus 16 top-level rule files, with no `paths:` scoping. That is 3,334 lines (~149 KB) on disk. Session loading was not traced. Compare with `npm run token-report` and M-08, not with this byte count. | `templates/generic` |
| P2 | Confirmed stale | Backlog line 24 says "`update.js` has no file-update engine", but `origin/dev` has `update-plan/preview/state/...` (#158). Line 860 says every skill is prose-only, but `design-system/scripts/check-tokens.sh` exists. The `tasks/todo/25-ais-update.md` checkpoint on this branch predates slice 3. | backlog `:24`, `:860` |

## Assessment of the prior audit

- **Agree:** the pre-review wiring is misconfigured; the guards are unreliable;
  instruction weight is high; the backlog has stale lines; measurement must
  start early; and there is no productivity claim to make yet.
- **Corrected:**
  - The dangerous-Bash finding is P1, not P0, because native `ask` covers it.
  - The secret-guard root cause is the Windows Store `python3` alias.
  - The pre-review defect is worse than "zero checks": in Go projects it is a
    full build and test run on every prompt.
  - A prior baseline exists (2026-08-27).
  - The PR head has moved.
- **Unverified by both audits:** real session behaviour inside Claude Code, and
  Cursor's actual hook mapping.

## Keep / simplify / replace / defer

- **Keep:**
  - native `deny`/`ask` rules (they work)
  - ownership-aware update and recovery
  - packed-artifact CI
  - the M-01…M-08 metrics
- **Replace:** the regex guards' claimed security role. Either make them fail
  closed (a parser that actually executes, or `onFailure: block` where the
  supported version allows it), or demote them to documented best-effort.
- **Remove:** the `UserPromptSubmit` pre-review wiring for new installs. Removal
  for existing adopters waits for item 25.
- **Simplify:** the always-loaded core (84/69/76-D), measured against the 99
  baseline.
- **Defer:** new packs, context providers and adapters until 98 has exercised
  them.

## Proposed priorities (top five)

| # | Items | Why now | Acceptance check | Confidence |
|---|---|---|---|---|
| 1 | 25 (slices 4–5, S7/S8) | Unchanged top P0; blocks every adopter-side removal. | Packed prior→current upgrade for create and init; write-failure recovery; final-head CI green; `npm view` shows 0.17.0. | Medium |
| 2 | Follow-up B → **0.16.2** + 79/81 guard honesty | Cheapest high-impact fix; does not wait for 25 (new installs only). | Packed generic and Go projects: an ordinary prompt runs no checks. Guard under Store-alias `python3` without `jq` either blocks `.env` or is not shipped as a control. Docs state there is no OS sandbox on native Windows. | High |
| 3 | 97 (+80/87 verify contract) | Test the native layer that actually enforces, not only the scripts. | Allowed and blocked probes for Read, `cat`, a subprocess read, `push --force` variants, in default, auto and bypass modes, on native Windows and WSL2/Linux. One check contract reports fail, skip and unavailable separately. | Medium |
| 4 | 99 / 74B — start design now, in parallel | Every later "simplify" claim needs a baseline. | Fixed tasks, thresholds set before results; native agent vs minimal vs full scaffold; snapshot #2 of M-01…M-08 uses the 2026-08-27 rules. | High (design); outcome unknown |
| 5 | 84/69/88 + 76-D, then 98 | Weight and applicability; cross-tool claims tested before more adapters. | A routine bug fix needs no irrelevant architecture/UX ceremony. Applicability-labelled rules pass applicable and non-applicable fixtures. Cursor hook loading exercised in Cursor. | Medium |

Housekeeping (no ranking): correct backlog lines 24 and 860 and the item 25
checkpoint in the open status PR #160 rather than in new work.

## Next review triggers

- 0.16.2 or 0.17.0 published (confirmed with `npm view`)
- a Claude Code version that changes hook or permission semantics
- the first item 99 pilot results
