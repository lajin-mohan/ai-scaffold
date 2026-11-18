# Wave C row V — talk claims checked against official docs

**Date:** 2026-11-18 · **Row:** V (Wave C amendment, `docs/process/pre-npm-publish-todo.md`)
**Source checked:** Anthropic talk "Rethinking Claude Code Best Practices"
(Lydia Hallie, November 2026). It is one talk, so each claim it makes was
looked up in the official Claude Code docs before any shipped file changes.

All pages were read on 2026-11-18. Quotes are copied exactly from the page.
The "Scaffold today" column comes from reading `templates/node/.claude/`, which
is byte-identical in all five profiles.

## Summary

| # | Claim | Verdict | Consequence |
|---|---|---|---|
| a | Exit 1 from a hook does not block; exit 2 does | **Confirmed** | Already true of every gating path in the shipped hooks. C1c adds tests that pin it |
| b | Deny rules are evaluated before the auto-mode classifier | **Confirmed** | Durable boundaries stay as `permissions.deny`/`ask` in the committed settings |
| c | Auto mode is configured with settings | **Changed** | `autoMode` and `defaultMode: "auto"` have no effect in project settings, so the scaffold must not ship them. Team config goes in managed or user settings |
| d | There is a prompt-audit command | **Confirmed** | It is `/doctor prompt-audit` (v2.1.283+). C5 runs it as an extra check; Claude Code only |
| e | A hook that times out does not block | **Confirmed** | The security guards already set `onFailure: "block"` (C1b). `pre-bash-quality-gate.sh` does not, and runs the whole pre-commit under 60 s. Decision for C1c |

No claim was dropped.

## a. Hook exit codes

- **Docs** (https://code.claude.com/docs/en/hooks, "Exit code output"):
  - "**Blocking error**: your hook exits 2. On events that can block, Claude Code stops the action."
  - "**Non-blocking error**: your hook exits with any other code, or fails in some other way, such as not starting or printing invalid JSON. The action goes ahead, except for hooks whose failure blocks the action, for example a hook with `onFailure` set to `"block"`."
  - "Exit code 1 without valid JSON output is a non-blocking error unless the hook is one whose failure blocks the action, even though 1 is the conventional Unix failure code. If your hook is meant to enforce a policy, use `exit 2`."
  - For `Stop` hooks, exit 2 "Prevents Claude from stopping, continues the conversation". This matters for item 87's planned Stop hook.
- **Scaffold today:** every path that blocks uses `exit 2`:
  - `pre-secret-guard.sh:111,184`;
  - `pre-dangerous-bash-guard.sh:111,154`;
  - `pre-bash-quality-gate.sh:95`;
  - `token-budget-guard.sh:94`;
  - the strict modes of `pre-write-fact-check.sh:264` and `post-write-console-warn.sh:151`.

  `governance-file-guard.sh` only ever exits 0 (`:93`), so it is advisory. That is not a defect, but the per-tool table in C1d should list it as advisory.
- **Consequence:** nothing needs changing now. The C1c probe tests assert exit 2 on each blocking path, so a later edit to `exit 1` fails CI.

## b. Deny rules and the auto-mode classifier

- **Docs:**
  - https://code.claude.com/docs/en/permissions: "Rules are evaluated in order: deny, then ask, then allow. The first match in that order determines the outcome, and rule specificity doesn't change the order."
  - https://code.claude.com/docs/en/auto-mode-config: "Deny and explicit ask rules are evaluated before the classifier and still block or prompt."
  - Its boundary table says `permissions.deny` "Blocks before the classifier is consulted. Neither the classifier nor user intent can override it."
  - https://code.claude.com/docs/en/permission-modes, "How the classifier evaluates actions": step 1 is "Actions matching your allow, ask, or deny rules resolve immediately", with listed exceptions that route some *allow* matches to the classifier.
  - https://code.claude.com/docs/en/permissions: "PreToolUse hook decisions don't bypass permission rules."
- **Limits the docs state:**
  - Bash rules match the command text, so a deny rule "doesn't match the same program by path or inside `sh -c`".
  - "Read and Edit deny rules apply to Claude's built-in file tools, to file commands Claude Code recognizes in Bash … They don't apply to … arbitrary subprocesses that read or write files indirectly, like a Python or Node script that opens files itself. For OS-level enforcement … enable the sandbox."
- **Consequence:**
  - Irreversible actions stay in `permissions.deny` in the committed `.claude/settings.json`. That is the deny-list review in C1d.
  - The per-tool table must state that deny rules do not stop a subprocess, such as a dependency run by `npm test`, from reading `.env`. Only the sandbox does; item 86 is the opt-in sandbox preset.

## c. Auto-mode settings

- **Docs:**
  - https://code.claude.com/docs/en/auto-mode-config: "The classifier doesn't read `autoMode` from project settings in `.claude/settings.json` or `.claude/settings.local.json`. Both files live in the repo directory, so a checked-in repo or a build step could otherwise inject its own allow rules." It reads `autoMode` from `~/.claude/settings.json`, managed settings, or `--settings`.
  - https://code.claude.com/docs/en/permission-modes: "If you set `"auto"` in `.claude/settings.json` or `.claude/settings.local.json`, the value doesn't take effect". The persistent default goes in `~/.claude/settings.json`. "with Claude Code v2.1.283 or later, auto is the built-in starting mode for interactive terminal and VS Code sessions on every plan and provider."
  - Model support varies by provider. For example: "Older models, including Sonnet 4.5, Opus 4.5, Haiku 4.5, and claude-3 models, are not supported on any provider."
  - `autoMode.classifyAllShell: true` stops narrow Bash allow rules from bypassing the classifier.
  - The classifier "reads the same CLAUDE.md content Claude itself loads".
- **Why "changed":** auto mode is configured with settings, but not with project settings, which are the only ones the scaffold ships.
- **Scaffold today:** no template sets `autoMode` or `defaultMode` (searched `templates/`).
- **Consequence:**
  - The scaffold keeps shipping none.
  - Docs say team auto-mode configuration goes in managed settings, a developer's own `autoMode` in `~/.claude/settings.json`, and durable project boundaries in `permissions.deny`/`ask`.
  - Because auto is now the default starting mode, the deny and ask lists carry more weight. That supports the C1d review.
  - Gateways and local models may not support auto mode at all. The guarantees therefore stay in git hooks, `scripts/verify` and CI.

## d. Prompt-audit command

- **Docs** (https://code.claude.com/docs/en/memory, "Audit your instruction files"):
  - "run `/doctor prompt-audit` in a session. Claude looks for problems such as instructions written for older models, references to files or commands that don't exist, and files that contradict each other. You get a report of findings with proposed edits, and nothing in your files changes until you ask Claude to apply them."
  - It covers CLAUDE.md, CLAUDE.local.md, AGENTS.md, and the rules, skills, commands, subagents and output styles under `.claude/`.
  - "`/doctor prompt-audit` requires Claude Code v2.1.283 or later". It is unavailable when the bundled `/claude-api` skill is turned off.
- **Consequence:**
  - C5 runs it on a packed project before and after the rewording, as evidence alongside the governance checks and `token-report`. It is not a gate: it runs on a model and is Claude only.
  - Adopter docs can mention it as a Claude Code extra, not a guarantee.

## e. Hook timeouts

- **Docs** (https://code.claude.com/docs/en/hooks, "Timeouts"):
  - "On `PreToolUse`, a timed-out `command`, `http`, or `mcp_tool` hook doesn't block the tool call, except for hooks whose failure blocks the action. The call continues through the normal permission flow, so don't count on a stalled hook to act as a gate. To block the call when a `command` or `http` hook times out, set `onFailure: "block"`."
  - `onFailure` takes `"continue"` or `"block"` and "Requires Claude Code v2.1.295 or later".
  - The default command-hook timeout is 600 s.
- **Scaffold today** (`templates/node/.claude/settings.json`):
  - `pre-secret-guard.sh` (15 s) and `pre-dangerous-bash-guard.sh` (15 s) set `onFailure: "block"`, from C1b.
  - `pre-bash-quality-gate.sh` has `timeout: 60` and no `onFailure` (`:132-134`). It runs the whole `.claude/hooks/pre-commit`, including the stack test step or `scripts/verify`, before `git commit`/`git push`. If that takes more than 60 s, Claude Code cancels the hook and the command goes ahead, so the Claude-side gate gives no evidence.
  - When the git hooks are installed, git then runs the same pre-commit itself, with no timeout, so the commit is still gated. The Claude-side run repeats that work.
- **Consequence (decision for C1c, not taken here):**
  - (1) drop the quality gate's pre-commit run and keep a cheap "are the git hooks installed?" check that exits 2 when they are not;
  - (2) keep it, but add `onFailure: "block"` and a shorter step list;
  - (3) keep it for `git push` only.

  Under the cross-tool rule, the guarantee belongs in git's pre-commit and CI, which favours (1). Each option gets a probe test.

## Not checked here

- Live behaviour in a signed-in session, such as a real timeout or `/doctor prompt-audit` output. These are C1c and C5 probes, run in the maintainer's terminal.
- Codex, Cursor and Copilot equivalents. The per-tool table in C1d covers them.
