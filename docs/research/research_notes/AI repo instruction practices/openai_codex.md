# OpenAI Codex and the AGENTS.md open format: official instruction and harness guidance

All sources were retrieved on 2026-11-06. None of the fetched pages showed a "last updated" date unless one is noted. **Redirects:** `developers.openai.com/codex/*` doc URLs now return 308 Permanent Redirect to `learn.chatgpt.com/docs/*`, for example `/codex/guides/agents-md` → `learn.chatgpt.com/docs/agent-configuration/agents-md`. `cookbook.openai.com/examples/*` returns 308 to `developers.openai.com/cookbook/examples/*`. Citations below use the final URL.

Method caveat: pages were read with a summarising fetch tool. Exact quotes are marked with quotation marks. Anything else is a close paraphrase of the page.

## 1. AGENTS.md in Codex: content, size, nesting, precedence, overrides, fallbacks, global file

### Takeaway
Codex builds one instruction chain per run. It reads a global file from `~/.codex` (or `CODEX_HOME`), then one file per directory from the project root down to the cwd. Each directory is checked in the order `AGENTS.override.md` → `AGENTS.md` → fallback names. Files are concatenated root-first, so files nearer the cwd win. Adding stops once the combined size reaches `project_doc_max_bytes`, which defaults to 32 KiB (re-confirmed). Content guidance is short and practical: commands, conventions and concise review rules. Formatting and lint checks belong in CI.

### Cited Findings
- **When it runs:** Codex builds the instruction chain once per run. In the TUI this is usually once per launched session. Changes need a restart or a new command. The page says "no cache to clear". — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (retrieved 2026-11-06)
- **Global scope:** Codex looks in `~/.codex` (or `CODEX_HOME`). It reads `AGENTS.override.md` if present, otherwise `AGENTS.md`. Only the first non-empty file at this level is used. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Project scope:** Codex starts at the project root, typically the Git root, and walks down to the cwd. With no project root it checks only the cwd. In each directory it checks `AGENTS.override.md`, then `AGENTS.md`, then names listed in `project_doc_fallback_filenames`. It includes "at most one file per directory". Empty files are skipped. Discovery stops at the cwd, so overrides belong "as close to specialized work as possible". — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Merge and precedence:** Files are concatenated from the root downward, joined with blank lines. "Files closer to the current directory take precedence because they appear later in the prompt." — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Injection order:** "Codex-cli automatically enumerates these files and injects them into the conversation". They are injected "before the user prompt, in root-to-leaf order." — [Codex prompting guide (cookbook)](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- **Size limit:** `project_doc_max_bytes` "defaults to 32 KiB". Once the combined size reaches it, Codex stops adding files. The example config sets `project_doc_max_bytes = 65536`. To avoid truncation, raise the limit or split instructions across nested directories. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). The config reference describes the key as "maximum bytes read from `AGENTS.md`", type `number`. The fetched excerpt did not show a default. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **Fallback filenames:** Example `project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]`, which gives the effective order `AGENTS.override.md`, `AGENTS.md`, `TEAM_GUIDE.md`, `.agents.md`. Codex ignores filenames not on the list. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). The config reference defines the key as an `array<string>` of "additional filenames to try when `AGENTS.md` is missing". — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **Recommended content by layer:**
  - Global: e.g. run `npm test` after changing JavaScript, prefer `pnpm`, confirm before adding production dependencies.
  - Repository root: setup expectations, e.g. `npm run lint` before a PR.
  - Nested overrides: team-specific rules, e.g. `make test-payments` in `services/payments/`.
  - Source: [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Code review rules:** Add a `## Code Review Rules` section to the `AGENTS.md` nearest the governed code. Keep the rules concise, state the behavior to flag, and give any safe path or exception. The page also says to reserve formatting and lint checks for CI. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Checking what loaded:** Run `codex --ask-for-approval never "Summarize the current instructions."`, use `codex --cd subdir` for nested overrides, or set `codex -c log_dir=./.codex-log` and read `codex-tui.log` / `session-*.jsonl`. Troubleshooting points: a stray `AGENTS.override.md` higher in the tree or under the Codex home causes "wrong guidance", and `echo $CODEX_HOME` resolves profile confusion. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

### Inferences
- Because "at most one file per directory" applies, an `AGENTS.override.md` hides the `AGENTS.md` beside it completely. It replaces that file rather than adding to it.
- The 32 KiB cap applies to the combined chain, global file included. A large root file can therefore push out deeper, more specific files. That matters because deeper files are the ones that take precedence.

### Gaps
- No official recommended line or word count for AGENTS.md. The only stated bound is the byte cap.
- The docs do not say whether the 32 KiB budget truncates mid-file or drops the whole file that crosses it. The wording is only "stops adding files".
- There is no explicit "anti-patterns" section.

## 2. agents.md spec site: purpose, structure, tool support, governance

### Takeaway
The site calls AGENTS.md "a README for agents". It is plain Markdown with no required fields, and the nearest file wins. The site says the format is now stewarded by the Agentic AI Foundation under the Linux Foundation. Size limits are not addressed.

### Cited Findings
- **Purpose:** A simple, open format for giving coding agents project context and instructions, described as "a README for agents". It complements the human-facing README. — [agents.md](https://agents.md) (retrieved 2026-11-06)
- **Example structure:** Headings and bullets covering setup commands, code style, dev environment tips, testing instructions and PR instructions (title format, run lint and tests before committing). Suggested sections are project overview, build and test commands, code style, testing instructions and security considerations. Commit/PR guidelines, security gotchas, large datasets and deployment steps are also listed as useful. — [agents.md](https://agents.md)
- **Required fields:** None. It is standard Markdown with any headings. — [agents.md](https://agents.md)
- **Precedence:** "the closest one takes precedence". The closest AGENTS.md to the edited file wins, and explicit user chat prompts override everything. — [agents.md](https://agents.md)
- **Nesting:** For monorepos, put a file in each subproject. The main OpenAI repo had "88" AGENTS.md files "at time of writing". — [agents.md](https://agents.md). This figure is undated. See section 6 for the current state of the public `openai/codex` repo.
- **Agent behaviour:** Agents run the listed test commands and try to fix failures before finishing. The file is described as living documentation. — [agents.md](https://agents.md)
- **Migration:** Rename the file and symlink the old name, e.g. `mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md`. Aider uses `read: AGENTS.md` in `.aider.conf.yml`. Gemini CLI uses `context.fileName` in `.gemini/settings.json`. — [agents.md](https://agents.md)
- **Supporting tools listed:** Codex (OpenAI), Jules (Google), Gemini CLI, Factory, Aider, goose, opencode, Zed, Warp, VS Code, Devin and Windsurf (Cognition), UiPath Autopilot & Coded Agents, Junie (JetBrains), Amp, Cursor, RooCode, Kilo Code, Phoenix, Semgrep, GitHub Copilot coding agent, Ona, and Augment Code. — [agents.md](https://agents.md)
- **Governance:** The site says AGENTS.md is "stewarded by the Agentic AI Foundation under the Linux Foundation". It emerged from collaboration among OpenAI Codex, Amp, Jules, Cursor and Factory. The footer reads "AGENTS.md a Series of LF Projects, LLC." — [agents.md](https://agents.md). **Verified only from agents.md itself.** No Linux Foundation press release was fetched.
- **Size limits:** Not addressed on the site. — [agents.md](https://agents.md)

### Gaps
- No dates on the page.
- A Linux Foundation or AAIF announcement was not independently checked. **Unverified beyond the agents.md footer.**

## 3. Codex skills; custom prompts and slash commands status

### Takeaway
Skills exist and are the official replacement for custom prompts, which are deprecated. A skill is a directory with a `SKILL.md` that has `name` and `description` frontmatter. Skills are discovered from `.agents/skills` (repo and parents), `$HOME/.agents/skills`, `/etc/codex/skills` and bundled system skills. Loading is progressive: only names and descriptions are loaded up front, within a capped budget.

### Cited Findings
- **Format:** A directory with `SKILL.md` and optional `scripts/`, `references/`, `assets/`, `agents/openai.yaml`. "The `SKILL.md` file must include `name` and `description`." The description should "Explain exactly when this skill should and should not trigger." `agents/openai.yaml` sets UI metadata and invocation policy. `allow_implicit_invocation` defaults to `true`. — [Build skills](https://learn.chatgpt.com/docs/build-skills) (retrieved 2026-11-06)
- **Locations:**
  - Repo: `$CWD/.agents/skills` plus `.agents/skills` in each parent up to the repo root.
  - User: `$HOME/.agents/skills`.
  - Admin: `/etc/codex/skills`.
  - System: bundled, e.g. `skill-creator` and `skill-installer`.
  - Skills with the same `name` are not merged.
  - Source: [Build skills](https://learn.chatgpt.com/docs/build-skills)
- **Progressive disclosure:** "Skills use **progressive disclosure** to manage context efficiently." The model first sees only names and descriptions, and loads the full `SKILL.md` only when it chooses the skill. — [Build skills](https://learn.chatgpt.com/docs/build-skills)
- **Budget:** The initial list is capped at 2% of the context window, or 8,000 characters if the window is unknown. When too many skills are installed, descriptions are shortened first, then some skills may be omitted with a warning. `skills.max_context_tokens` can change the budget, up to 10,000 tokens. The budget does not cover the full `SKILL.md` read after selection. — [Build skills](https://learn.chatgpt.com/docs/build-skills)
- **Invocation:** Explicit via `/skills` or `$` in the CLI/IDE (`@` in ChatGPT). Implicit when the task matches the `description`. — [Build skills](https://learn.chatgpt.com/docs/build-skills)
- **Config keys:** `skills.config` is an array of `{name|path, enabled}` entries, and the last match wins. Also `skills.bundled.enabled` (default `true`) and `skills.include_instructions` (default `true`). — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **Custom prompts:** "Custom prompts are deprecated." Use skills instead. Custom prompts are top-level `.md` files in `~/.codex/prompts/`, invoked as `/prompts:<name>`. They are local only and not shared via the repo. — [Custom prompts](https://learn.chatgpt.com/docs/custom-prompts.md)
- **Saved-prompt alternative:** `tui.presets.<0-9>.input/label` shown via `/presets`. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)

### Gaps
- A third-party blog says `/prompts:` disappeared in v0.117.0. This is **unverified** against an official changelog and is not relied on.
- No official guidance on skill body length was found.

## 4. config.toml: profiles, approvals, sandbox, project config and trust, rules, hooks, MCP

### Takeaway
- `approval_policy` is now `on-request | never | {granular = …}`. `untrusted` is no longer supported and `on-failure` is deprecated.
- `sandbox_mode` is `read-only | workspace-write | danger-full-access`.
- Project `.codex/config.toml`, hooks and rules load only for trusted projects.
- Codex now has a full hooks system (14 events). It is enabled by `features.hooks`.
- Rules (Starlark `prefix_rule`) are still labelled "experimental and may change".

### Cited Findings
- **approval_policy:** `on-request | never | { granular = { sandbox_approval, rules, mcp_elicitations, request_permissions, skill_approval } }`. `untrusted` is unsupported. "`on-failure` is deprecated; use `on-request` for interactive runs or `never` for non-interactive runs." — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference). The sandboxing page confirms: "Codex and ChatGPT Work no longer support `untrusted` as a selectable approval policy." — [Sandboxing](https://learn.chatgpt.com/docs/sandboxing.md)
- **Approval reviewer:** "`auto_review`: eligible approval prompts go to a reviewer agent". "Automatic review, when available, doesn't change the sandbox boundary." — [Sandboxing](https://learn.chatgpt.com/docs/sandboxing.md)
- **sandbox_mode:** `read-only | workspace-write | danger-full-access`. Don't combine it with `default_permissions`. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference). The sandboxing page says workspace-write lets the agent "read files, edit within the workspace, and run routine local commands inside that boundary". "The default permissions mode applies sandboxing automatically." — [Sandboxing](https://learn.chatgpt.com/docs/sandboxing.md)
- **Windows:** "Codex uses the native Windows sandbox when you run in PowerShell" and the Linux implementation under WSL2. — [Sandboxing](https://learn.chatgpt.com/docs/sandboxing.md)
- **Profiles (two kinds):**
  - Permission profiles: `default_permissions = "<name>"` with `[permissions.<name>]`, supporting `extends`, `filesystem`, `network` and `workspace_roots`. Built-ins are `:read-only`, `:workspace` and `:danger-full-access`.
  - Config profile files: `$CODEX_HOME/<name>.config.toml`, selected with `--profile <name>`. Project-local `.codex/config.toml` cannot set `profile`/`profiles`.
  - Source: [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference). **Note:** this differs from the older `[profiles.<name>]` table form. The fetched excerpt did not say whether that form is still accepted, so treat it as unverified.
- **Project config and trust:**
  - `.codex/config.toml` loads only for trusted projects.
  - `projects.<path>.trust_level` is `"trusted"` or `"untrusted"`.
  - Untrusted projects skip project-scoped `.codex/` layers, "including config, hooks, and rules".
  - Source: [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
  - A search-result summary of the config-basics page also says the closest project config file wins. This is **summary-only, not fetched directly**. — [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- **Hooks:**
  - Defined in `hooks.json` or an inline `[hooks]` table in `config.toml`, using the same schema. `hooks.<Event>` is an array of matcher groups, and `hooks.<Event>[].hooks` holds the handlers.
  - Handler types: command and MCP-tool handlers run. Prompt and agent handlers are "parsed but skipped".
  - Events: `PreModelRequest`, `PostModelRequest`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `Stop`, `Interrupt`.
  - Handler options include `async`, `additionalContextLimit` and `commandWindows`.
  - Enabled by `features.hooks`. `features.codex_hooks` is a deprecated alias.
  - Source: [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
  - A search summary says `features.hooks` is on by default and marked stable. **Not directly confirmed on a fetched page.**
- **Rules:**
  - Files use the `.rules` extension and are written in Starlark: "The `.rules` file format uses `Starlark`."
  - Location: a `rules/` folder next to an active config layer, e.g. `~/.codex/rules/default.rules`. Project rules go in `<repo>/.codex/rules/` and load only when trusted.
  - `prefix_rule()` fields: `pattern` (required), `decision` (`allow` (default) | `prompt` | `forbidden`), `justification`, and `match`/`not_match` example lists validated at load.
  - When several rules match, the most restrictive wins: forbidden > prompt > allow.
  - "Rules are experimental and may change."
  - Test with: `codex execpolicy check --pretty --rules ~/.codex/rules/default.rules -- <command>`.
  - Source: [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
  - `approval_policy.granular.rules` controls whether `prompt`-rule approvals surface. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **MCP:** `[mcp_servers.<id>]` tables with these keys:
  - Connection: `command`, `args`, `env`, `url`, `bearer_token_env_var`, `http_headers`, `enabled`, `required`.
  - Tool filtering: `enabled_tools`, `disabled_tools`, `default_tools_approval_mode`, `tools.<tool>.approval_mode`.
  - Timeouts: `startup_timeout_sec` (default 10s), `tool_timeout_sec` (default 60s).
  - OAuth: `oauth.client_id`, `oauth.callback_port`.
  - Source: [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **Instruction-related keys:** `developer_instructions`, `model_instructions_file`, `compact_prompt`, `experimental_compact_prompt_file`. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- **Features:** On by default: `apps`, `fast_mode`, `goals`, `multi_agent`, `shell_tool`, `unified_exec`, `remote_plugin`, `view_image`. Off by default: `memories`, `network_proxy`, `code_mode.enabled`, `rollout_budget.enabled`. — [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)

### Inferences
- The previously verified "workspace-write + on-request default" still matches the documented interactive preset. The sandboxing page now describes a "default permissions mode" rather than naming the pair explicitly. Combined with the deprecation of `on-failure` and the removal of `untrusted`, approval vocabulary from older docs and blogs is stale.
- Project hooks and rules depend on trust. A repo that ships `.codex/hooks` or `.codex/rules` gets no enforcement until the user marks the project trusted.

### Gaps
- The config reference was read only up to character 100,000 of about 168,000. Keys after `tui.resume_cwd` were not reviewed.
- The dedicated Hooks page (input/output contract per event, blocking semantics) was not fetched.
- The default `network_access` for workspace-write is not stated on the fetched official pages. Third-party sources say it is off. **Unverified.**
- Cloud: the only statement found is "Work cloud containers use existing Work Cloud policies". — [Sandboxing](https://learn.chatgpt.com/docs/sandboxing.md)

## 5. OpenAI prompting guidance relevant to instruction files

### Takeaway
OpenAI's GPT-5 guide explicitly warns that contradictory or vague instructions hurt GPT-5 more than other models. It also warns that emphatic "be THOROUGH"-style instructions cause over-application, such as excessive tool calls. The Codex prompting guide says to start from the standard Codex-Max prompt and make "tactical additions". It also says to remove plan and preamble prompting, because that can make the model stop early. Neither guide states a length number for instructions. The phrase "less is more" does not appear.

### Cited Findings
- **Contradictions:** "poorly-constructed prompts containing contradictory or vague instructions can be more damaging to GPT-5 than to other models". The model spends reasoning tokens reconciling conflicts (paraphrase). The guide recommends the prompt optimizer to find such issues. — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Precision:** "GPT-5 follows prompt instructions with surgical precision". — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Emphasis causes over-application (Cursor case):** The prompt "Be THOROUGH when gathering information. Make sure you have the FULL picture before replying." was found "counterproductive with GPT-5, which is already naturally introspective and proactive at gathering context". It "often caused the model to overuse tools by calling search repetitively". — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **User rules:** "Cursor found allowing users to configure their own [custom Cursor rules] to be particularly impactful with GPT-5's improved steerability". — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Metaprompting:** "early testers have found great success using GPT-5 as a meta-prompter for itself." — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Codex guide scope:** Covers `gpt-5.3-codex` and `GPT-5.1-Codex-Max`. No publication date is shown. — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- **Base prompt:** "start with our standard Codex-Max prompt as your base and make tactical additions from there." — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- **Over-prompting:** "remove all prompting for the model to communicate an upfront plan, preambles, or other status updates during the rollout", "as this can cause the model to stop abruptly before the rollout is complete." — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- **Autonomy defaults in the Codex prompt:** "Persist until the task is fully handled end-to-end within the current turn whenever feasible" and "Bias to action: default to implementing with reasonable assumptions". The GPT-5 guide's Cursor section adds: "you should almost never ask the user whether to proceed with a plan". — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide); [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Tool output budget:** Tool output should be limited to 10k tokens, "approximate this by computing `num_bytes/4`". — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- **OpenAI's own prompt uses some emphasis:** It includes "**NEVER** use destructive commands like `git reset --hard`" and "STOP IMMEDIATELY and ask the user how they would like to proceed". — [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)

### Inferences
- For instruction files read by GPT-5-family Codex models, the documented risks are contradiction and emphatic over-instruction, not length as such.
- OpenAI keeps emphasis for a few irreversible actions, such as destructive git commands, rather than using it broadly.
- Mandatory plan-and-confirm or status-update instructions conflict with OpenAI's stated Codex prompting advice. That advice favours bias to action and warns that plan and preamble prompting causes early stops.

### Gaps
- No "less is more" or numeric instruction-length guidance was found in either guide.
- The GPT-5.1 / GPT-5.x general prompting guides were not fetched separately.

## 6. How OpenAI uses AGENTS.md in its own repo; evaluating instructions; anti-patterns

### Takeaway
The public `openai/codex` repo **deleted its root AGENTS.md and its `.codex/skills/` on 2026-09-30** (commit #49713). Only three small nested AGENTS.md files remain, of 156 B, 564 B and 2,401 B. Before deletion, the root file was 22,397 bytes (about 320 lines) and centred on code-review rules, test conventions and TUI conventions. OpenAI's documented way to check instructions is to ask Codex to summarise what it loaded. No formal eval method was found.

### Cited Findings
- **Root file removal:** Commit `18131270` (2026-09-30), titled "Remove repository-local Codex guidance, skills, and environment config (#49713)". The body reads: "Delete the root `AGENTS.md`, the skills under `.codex/skills/` and their supporting scripts, tests, and references, and `.codex/environments/environment.toml`." The diff removed `AGENTS.md` (−320 lines) and about 13 skills, including `babysit-pr`, `code-review*`, `codex-pr-body`, `remote-tests` and `test-tui`. No reason is given in the commit. — [openai/codex commit 18131270](https://github.com/openai/codex/commit/18131270) (via GitHub API, retrieved 2026-11-06)
- **Remaining AGENTS.md files on `main`:**
  - `codex-rs/code-mode-host/AGENTS.md`: 156 B
  - `codex-rs/tui/src/bottom_pane/AGENTS.md`: 564 B
  - `codex-rs/exec-server/src/sandbox_integrity/AGENTS.md`: 2,401 B
  - Source: [openai/codex tree](https://github.com/openai/codex/tree/main) (GitHub API, retrieved 2026-11-06)
- **Last root file before deletion:** At commit `48750840` (2026-09-07) it was 22,397 bytes. Top-level headings: "Rust/codex-rs", "The `codex-core` crate", "Code Review Rules" (subsections: Crate API surface, Model visible context, Breaking changes, Test authoring guidance, "Change size guidance (800 lines)"), "TUI style conventions", "TUI code conventions", "Tests" (snapshot tests, benchmarks, assertions, Cargo vs Bazel, integration tests), "App-server API Development Best Practices", "Python Development Best Practices", "Platform Support". — [openai/codex AGENTS.md @48750840](https://github.com/openai/codex/blob/48750840/AGENTS.md)
- **Earlier pruning:** Two commits on 2026-09-07 removed contributor-guidance requirements from AGENTS.md (#43423 and #43421). — [openai/codex commits](https://github.com/openai/codex/commits/main/AGENTS.md)
- **Checking instructions:** "Summarize the current instructions." via `codex --ask-for-approval never`, plus session logs. — [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Prompt optimizer:** Recommended for catching contradictions. — [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide)
- **Implied anti-patterns from the docs:**
  - Formatting and lint rules in instructions instead of CI ("Reserve formatting and lint checks for CI").
  - Non-concise review rules.
  - Overrides placed higher than needed.
  - Exceeding the 32 KiB cap silently.
  - Contradictory or vague instructions.
  - Emphatic "be THOROUGH" style directives.
  - Prompting for upfront plans or preambles in Codex rollouts.
  - Sources: [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md); [GPT-5 prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide); [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)

### Inferences
- The repo's own 22 KB root file used about 70% of the 32 KiB default budget before any global or nested file. That is a concrete reference point for "large".
- Deleting it may mean OpenAI moved that guidance elsewhere (e.g. internal or upstream mirroring; the commit carries a `GitOrigin-RevId`), or simply dropped it. **The reason is not stated. Do not infer intent.**
- The agents.md figure of "88" AGENTS.md files refers to "the main OpenAI repo", which is not necessarily `openai/codex`. It does not match the current public `openai/codex` tree (3 files).

### Gaps
- No official OpenAI statement on why the repo's AGENTS.md and skills were removed.
- No OpenAI-published methodology for evaluating AGENTS.md effectiveness was found.
