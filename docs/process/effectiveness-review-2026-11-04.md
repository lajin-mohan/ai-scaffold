# Effectiveness review — 2026-11-04

AI-assisted audit run with `/ais-effectiveness`. Not a certification or a
benchmark. Compares against the
[2026-10-26 review](effectiveness-review-2026-10-26.md). The maintainer accepted
its priorities on 2026-11-05; see the authoritative section of
[`pre-npm-publish-todo.md`](pre-npm-publish-todo.md).

## Evidence boundary

| | |
|---|---|
| Date | 2026-11-04, Windows 11, Git Bash, Node 24.20, Claude Code 2.1.314; no `jq`, `python3` is the Microsoft Store stub |
| Revision audited | `origin/dev` @ `31de786` (v0.18.0), extracted with `git archive`; the local checkout was not used |
| npm | `0.18.0` = `latest`; all five profiles created from the published package on 2026-10-30 and inspected |
| Probes | Synthetic hook payloads (Windows `.env` read, destructive command, benign payload) fed to the shipped guards; `token-report`; settings comparison. Nothing destructive executed |
| Not run | Full suite, `init` into an existing repo, Claude Code session traces, Cursor/Codex/Copilot sessions, paid evaluations |
| Scope note | Root `.claude/` of this repository is not an installation and runs with overridden settings; root-vs-template drift is out of scope by maintainer decision |

## External sources (retrieved 2026-11-04 / 2026-11-05)

- [Claude Code hooks](https://code.claude.com/docs/en/hooks): only exit 2
  blocks; on `PreToolUse` a timeout or error does not block unless the hook sets
  `"onFailure": "block"` (v2.1.295+). Default command-hook timeout 600 s.
- [Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing): macOS,
  Linux, WSL2; "On native Windows, Claude Code runs commands unsandboxed." No
  built-in credential deny list; `sandbox.filesystem.denyRead` is explicit. The
  Read tool follows permission rules, not `denyRead`.
- [Claude Code memory](https://code.claude.com/docs/en/memory): "target under
  200 lines per CLAUDE.md file"; rules without `paths` "are loaded at launch
  with the same priority as `.claude/CLAUDE.md`"; imports do not reduce cost.
- [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md):
  root-to-cwd discovery, one file per directory, `project_doc_max_bytes` default
  32 KiB; `CLAUDE.md` is not a documented default.
- [Codex approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)
  and [Codex rules](https://learn.chatgpt.com/docs/agent-configuration/rules):
  `workspace-write` + `on-request` default for version-controlled folders;
  Windows sandbox via MXC; `.codex/rules/*.rules` with `prefix_rule`
  (`allow` / `prompt` / `forbidden`), experimental, trusted projects only.
- [Cursor rules](https://cursor.com/docs/context/rules): `.cursor/rules/*.mdc`;
  plain `.md` there is ignored; reads `AGENTS.md`; keep rules under 500 lines.
- [Cursor hooks](https://cursor.com/docs/agent/hooks): `.cursor/hooks.json`;
  exit 2 blocks; crashes and timeouts fail open unless `failClosed: true`;
  claims Claude Code hook loading (conditions on a separate page, not verified).

## Findings

| Sev | Class | Finding | Evidence | Action |
|---|---|---|---|---|
| P1 | Confirmed defect | M-08 measures the wrong corpus. `token-report` builds from the repo root, so it counts the maintainer `CLAUDE.md` (about 2.4K est-tokens) instead of the template one (about 6.9K). The 2026-08-27 baseline counted 7,116, so snapshot #2 would show a drop of about 4.7K adopters never get. | `scripts/token-report.js:15,26`; 9,704 vs 27,523 bytes | Item 74 extension |
| P1 | Supported | Generated projects load about 37K est-tokens every session: template `CLAUDE.md` is 475 lines and all 16 top-level rules lack `paths:`. About two-thirds is irrelevant to a given task. | memory docs; `templates/node` sizes | Items 84, 105 |
| P1 | Confirmed | Measurement has not started. No commits to items 97/99 or the metrics doc since 2026-10-26. M-02's start condition (released `ais update`) was met at 0.17.0. | `git log origin/dev --since=2026-10-26` | Items 74, 99 |
| P1 | Confirmed | Codex and Cursor get no native support: a 2.3 KB `AGENTS.md` pointer and a `.cursorrules` mirror of the 10-stage flow; no safety control reaches either tool. | template files; Cursor rules docs | Item 104 |
| P1 | Confirmed | Outdated shipped content: model table "Claude Opus 4+ / Sonnet 4+ / Haiku 4+"; four legacy UX alias commands and their mapping; `/compact` operationalization claims; "no step is skippable"; multi-tenant content for single-tenant projects; `ponytail-ladder` loaded while off. | `token-usage-rules.md:58-63`, `ux-rules.md:86-89`, `governance.md:124-126` | Item 105, 69 |
| P2 | Supported | Shipped security hooks use shell form, a 5 s timeout and no `onFailure`; a timeout or crash lets the action through. | template `settings.json`; hooks docs | Item 97 extension |
| P2 | Hypothesis | 5 s may be too short on Windows (Git Bash start plus a `python3` probe). | not measured | Item 97 |
| P2 | Supported | No shell-subprocess protection for secrets: Read deny covers file tools only, no sandbox configured, none exists on native Windows. | sandboxing docs; no `sandbox` block | Item 86 extension |

Probe results with the shipped 0.18.0 guards (no `jq`, Store `python3`): Read
`D:\app\.env` → exit 2 (blocked); benign payload → exit 0; destructive command →
exit 2.

## Ratings (subjective, 2026-11-04)

Judgments, not measurements; no outcome data exists yet.

| Dimension | Rating | Confidence |
|---|---:|---|
| CLI and update engineering | 8 | medium-high |
| Safety controls | 6.5 | medium |
| Weight and day-to-day experience | 4.5 | medium |
| Adoption via `create` | 7.5 | medium-high |
| Adoption via `init` | 5.5 | low-medium |
| Cross-tool (Codex, Cursor, Copilot) | 4 | medium |
| Evidence of effectiveness | 2 | high |

Overall about 7/10 (judgment, not an average), up from 6.5 on 2026-10-13.

## Delta from 2026-10-26

- Resolved: pre-review on every prompt; secret guard fail-open under Store
  `python3`; Windows path gap; `ais update` (0.17.0–0.18.0); git hooks and
  executable bit on `create`; honest E2E gates (102A).
- Unchanged: always-loaded weight; no measurement; 97 still proposed;
  Cursor/Codex untested.
- New: M-08 measures the wrong corpus; native Codex/Cursor adapters and rule
  hygiene identified as gaps (items 104, 105).

## Next review triggers

- the first release after 0.18.0;
- snapshot #2 or the first item 99 result;
- a Claude Code, Codex or Cursor release that changes hook failure handling,
  rule loading or sandbox defaults.
