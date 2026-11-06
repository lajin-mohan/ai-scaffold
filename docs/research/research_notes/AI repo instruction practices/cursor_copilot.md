# Cursor and GitHub Copilot: instruction/rules formats and vendor guidance (as of 2026-11-06)

All sources were retrieved on 2026-11-06. Most Cursor and docs.github.com pages show no last-updated date. The code.visualstudio.com pages show "Last updated 11/4/2026". Claims are labelled **[fetched]** when the live page was read in full through WebFetch, and **[search-summary]** when the only evidence is a search-result summary of the page; treat those as UNVERIFIED until someone opens the page. GitHub's docs now call the coding agent "Copilot cloud agent".

## Cursor: rules, AGENTS.md/CLAUDE.md, skills, commands, hooks

### Takeaway
Cursor project rules must be `.mdc` files in `.cursor/rules/`. Plain `.md` files there are ignored. Rules use the frontmatter `description` / `globs` / `alwaysApply`, which gives four rule types. Cursor reads `AGENTS.md` at the root and in subdirectories, and reads root `CLAUDE.md` as an always-applied rule. It also loads `.claude/skills/`, and loads Claude Code hooks from `.claude/settings*.json`, but only while a third-party-imports setting is on, which it is by default. The documented size guidance is "Keep rules under 500 lines". `.cursorrules` is "legacy and will be deprecated".

### Cited Findings
**Rule file format and location**
- "Project rules live in `.cursor/rules` as `.mdc` files and are version-controlled." "Each rule is an `.mdc` file that you can name anything you want." "Project rules must use the `.mdc` extension." **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- "A plain `.md` file in `.cursor/rules` is ignored by the rules system ..." The page's example tree marks `api-guidelines.md` as "# Ignored (wrong extension)". The page says: "If you prefer plain markdown, use AGENTS.md instead." **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- Rules can be organized into subfolders of `.cursor/rules/` (example: `frontend/ # Organize rules in folders`). The page does not describe nested `.cursor/rules/` directories inside project subdirectories. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- Frontmatter example on the page: `description: "This rule provides standards for frontend components and API validation"` and `alwaysApply: false`. The three fields `description`, `globs` and `alwaysApply` control application. If `alwaysApply: true`, then `globs` and `description` are ignored. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- The four rule types, quoted from the Help page: "**Always Apply**: included in every conversation"; "**Apply Intelligently**: Agent decides when it's relevant"; "**Apply to Specific Files**: only applies for files matching a pattern (e.g., `*.tsx`)"; "**Apply Manually**: only used when you @mention it in chat". **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules)
- Precedence: Team Rules → Project Rules → User Rules. "earlier sources take precedence when guidance conflicts." Admins can enforce Team Rules, and enforced rules "cannot be disabled in Customize". Team Rules support globs but "do not use the folder structure of Project Rules". **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- "Rules do not impact Cursor Tab or other AI features." **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- CLI: "The CLI agent supports the same rules system as the editor." "The CLI also reads `AGENTS.md` and `CLAUDE.md` at the project root (if present)". **[fetched]** — [Cursor Docs: Using Agent in CLI](https://cursor.com/docs/cli/using)

**.cursorrules**
- "The `.cursorrules` file in your project root is legacy and will be deprecated." The migration steps are to create a project rule, "Set the rule type to **Always Apply** (this matches the old behavior)", and "Delete the `.cursorrules` file". **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules). The Docs Rules page does not mention `.cursorrules` at all. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)

**AGENTS.md and CLAUDE.md**
- "`AGENTS.md` is a plain markdown file without metadata or complex configurations." "Cursor supports AGENTS.md in the project root and subdirectories." "Nested `AGENTS.md` support in subdirectories is now available." Nested files combine with their parents' instructions, and the more specific file takes precedence. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- "Cursor reads `CLAUDE.md` files the same way it reads `AGENTS.md`." "Place a `CLAUDE.md` file in your project root and Cursor picks it up automatically." "`CLAUDE.md` files are always applied to every conversation, regardless of any `alwaysApply` frontmatter setting." "This ensures compatibility with projects that also use Claude Code." **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules)
- The Docs Rules page does not mention CLAUDE.md or `.claude/`. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- Community report, not vendor documentation: while "Include third-party Plugins, Skills, and other configs" is enabled, CLAUDE.md is loaded even when listed in `.cursorignore`. — [Cursor Forum bug report](https://forum.cursor.com/t/cursor-doesnt-respect-ignoring-claude-md-file/154952) **[search-summary]**

**Size and best practice (Cursor)**
- "Keep rules under 500 lines" and "Split large rules into multiple, composable rules". "Good rules are focused, actionable, and scoped." **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- "Keep rules under 500 lines. Split large rules into smaller, focused files." "Each file should cover a single concern, such as styling conventions, testing patterns, or API guidelines." **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules)
- Referencing files by path (e.g. `@service-template.ts`): "Agent reads the file when it needs it; the contents aren't inlined", so "put anything that must always be in context in the rule body." "Start small. Add rules when you notice Agent making the same mistake more than once." "Check rules into git". **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules)
- Anti-patterns Cursor lists: copying entire style guides (use a linter instead); documenting common commands the Agent already knows; adding instructions for rare edge cases; duplicating code that already exists in the codebase. The page also recommends referencing files rather than copying their contents. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)

**Skills and commands**
- Project skill locations are `.agents/skills/` and `.cursor/skills/`. User skill locations are `~/.agents/skills/` and `~/.cursor/skills/`. Each skill is a folder containing `SKILL.md`. Nested directories are scanned recursively, and a skill in a nested folder is scoped to files under that folder. **[fetched]** — [Cursor Docs: Skills](https://cursor.com/docs/context/skills)
- "For compatibility", Cursor also loads `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/` and `~/.codex/skills/`. The Skills page states no further conditions. **[fetched]** — [Cursor Docs: Skills](https://cursor.com/docs/context/skills)
- SKILL.md frontmatter:
  - `name`: required. Lowercase letters, digits and hyphens, and it must match the folder name.
  - `description`: required.
  - `paths`: optional globs, as a list or a comma-separated string. Legacy `globs` is accepted as a fallback.
  - `disable-model-invocation`: optional. When true, the skill runs only on explicit `/skill-name`.
  - `icon`, `color`, `metadata`: optional.
  - Source: **[fetched]** — [Cursor Docs: Skills](https://cursor.com/docs/context/skills)
- Size guidance for skills: "Keep your main `SKILL.md` focused and move detailed reference material to separate files". No number is given. **[fetched]** — [Cursor Docs: Skills](https://cursor.com/docs/context/skills)
- Commands: `/migrate-to-skills` (Cursor 2.4) converts user and workspace slash commands into skills with `disable-model-invocation: true`. It also converts dynamic rules, but not rules with `alwaysApply: true` or with specific `globs`. The Skills page does not describe a `.cursor/commands/` directory. **[fetched]** — [Cursor Docs: Skills](https://cursor.com/docs/context/skills)

**Hooks (re-check)**
- `hooks.json` locations:
  - Enterprise: `/Library/Application Support/Cursor/hooks.json` (macOS), `/etc/cursor/hooks.json` (Linux/WSL), `C:\ProgramData\Cursor\hooks.json` (Windows).
  - Team: dashboard.
  - Project: `<project-root>/.cursor/hooks.json`.
  - User: `~/.cursor/hooks.json`.
  - Priority order: Enterprise → Team → Project → User, then plugin hooks.
  - Source: **[fetched]** — [Cursor Docs: Hooks](https://cursor.com/docs/agent/hooks)
- The 21 events:
  - Agent: sessionStart, sessionEnd, preToolUse, postToolUse, postToolUseFailure, subagentStart, subagentStop, beforeShellExecution, afterShellExecution, beforeMCPExecution, afterMCPExecution, beforeReadFile, afterFileEdit, beforeSubmitPrompt, preCompact, stop, afterAgentResponse, afterAgentThought.
  - Tab: beforeTabFileRead, afterTabFileEdit.
  - App: workspaceOpen.
  - Source: **[fetched]** — [Cursor Docs: Hooks](https://cursor.com/docs/agent/hooks)
- `failClosed` is a per-script option and defaults to `false`. When true, hook failures "block the action"; failures include crashes, timeouts, non-zero exit codes and missing output. Exit code 0 means success and the JSON output is used. Exit code 2 blocks, equivalent to `permission: "deny"`, which "matches Claude Code behavior for compatibility". Any other exit code fails open. `loop_limit` defaults to "`5` for Cursor hooks, `null` for Claude Code hooks". `CLAUDE_PROJECT_DIR` is an "Alias for project dir (Claude compatibility)". **[fetched]** — [Cursor Docs: Hooks](https://cursor.com/docs/agent/hooks)
- **Verification of "loads Claude Code hooks".** It is confirmed on the separate Third Party Hooks page, which is linked from the Hooks page:
  - Files read: `.claude/settings.local.json`, `.claude/settings.json` and `~/.claude/settings.json`.
  - Condition: the setting "Include Third-Party Plugins, Skills, and Other Configs" (Cursor Settings → Agents → Third-Party Imports) must be on. The page says it is on by default.
  - Event mapping: PreToolUse→preToolUse, PostToolUse→postToolUse, UserPromptSubmit→beforeSubmitPrompt, Stop→stop, SubagentStop→subagentStop, SessionStart→sessionStart, SessionEnd→sessionEnd, PreCompact→preCompact.
  - Unsupported: the `Notification` and `PermissionRequest` events, and mapping of the `Glob` tool.
  - Native-only features: `subagentStart`, `loop_limit`, and Team/Enterprise distribution.
  - Priority: Claude sources rank after all Cursor sources. All matching hooks run, and the higher-priority source wins when responses conflict.
  - Source: **[fetched]** — [Cursor Docs: Third Party Hooks](https://cursor.com/docs/reference/third-party-hooks)

### Inferences
- If a scaffold emits plain `.md` files into `.cursor/rules/`, Cursor ignores them. Rules there must be `.mdc` with frontmatter, or the content should go in `AGENTS.md`.
- A repo that ships root `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/*.mdc` together will have Cursor load both markdown files on every conversation. Duplicated content is therefore paid for twice.
- With the default third-party setting, a repo's Claude Code hooks in `.claude/settings.json` will also run inside Cursor. They run with fail-open semantics unless the hook itself exits 2.

### Gaps
- No vendor page found that says Cursor reads `.claude/rules/` or nested `CLAUDE.md` files. The Help page covers only the root `CLAUDE.md`.
- The `.cursor/commands/` directory format was not verified on a live page (not stated in the pages fetched).
- Cursor docs pages carry no last-updated dates.
- No official date or version is given for removing `.cursorrules` ("will be deprecated").
- The Skills page does not say whether the third-party toggle also gates `.claude/skills` loading. It gives the compatibility paths without conditions.

## GitHub Copilot: repository instructions, AGENTS.md/CLAUDE.md, prompts, agents, skills, hooks, setup steps

### Takeaway
GitHub Copilot reads:
- `.github/copilot-instructions.md` for repository-wide instructions.
- `.github/instructions/**/*.instructions.md` for path-specific instructions, selected by `applyTo` globs. The optional `excludeAgent` field takes `"code-review"` or `"cloud-agent"`.
- `AGENTS.md` anywhere in the repo, with the nearest file winning.
- One root `CLAUDE.md` or `GEMINI.md`.

Copilot CLI additionally reads `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` across the path from the repo root to the current working directory, plus `.claude/CLAUDE.md`. Other customization types:
- Prompt files: `.github/prompts/*.prompt.md`. Supported in IDEs only, not on GitHub.com or in the CLI.
- Custom agents: `.github/agents/`.
- Skills: `.github/skills`, `.claude/skills` or `.agents/skills` (`SKILL.md`).
- Hooks: `.github/hooks/*.json`.

Code review's 4,000-character cutoff was removed in June 2026. GitHub states no hard size limit; guidance is about 1,000 lines maximum per file.

### Cited Findings
**Repository and path-specific instructions**
- Repository-wide instructions are "specified in a `copilot-instructions.md` file in the `.github` directory of the repository." Path-specific instructions are "specified in one or more `NAME.instructions.md` files within or below the `.github/instructions` directory", with `applyTo` frontmatter, e.g. `applyTo: "**/*.ts,**/*.tsx"`. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- `excludeAgent`: "Use either `"code-review"` or `"cloud-agent"`." If it is omitted, both code review and the cloud agent use the file. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- On GitHub.com: "path-specific custom instructions are only supported for Copilot cloud agent and Copilot code review." Code review reads instructions, agent instructions and skills from the PR **head** branch. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- Agent instructions: `AGENTS.md` files may be anywhere, and "the nearest `AGENTS.md` file in the directory tree will take precedence". Alternatively, use a single `CLAUDE.md` or `GEMINI.md` in the repository root. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- Precedence: personal instructions first, then repository, then organization. All relevant sets are provided to Copilot, so the page advises avoiding conflicts. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- Content guidance comes from the docs' sample onboarding prompt: a repo summary; build, test and lint steps with tool versions; the project layout; and the checks run before check-in. Instructions "must not be task specific". The prompt says "Instructions must be no longer than 2 pages". That is guidance inside the sample prompt, not a stated file limit. Whitespace between instructions is ignored. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)

**Size limits**
- Code review previously stopped reading `copilot-instructions.md` / `*.instructions.md` after 4,000 characters. That limit has been removed, per the changelog of 2026-06-12. **[search-summary, UNVERIFIED]** — [GitHub Changelog 2026-06-12](https://github.blog/changelog/2026-06-12-copilot-code-review-new-configurations-and-controls/)
- Recommendation: limit any single instruction file to about 1,000 lines, because quality may deteriorate beyond that. **[search-summary, UNVERIFIED exact wording]** — [GitHub Docs: Customize code review tutorial](https://docs.github.com/en/copilot/tutorials/customize-code-review); [GitHub Blog: master your instructions files](https://github.blog/ai-and-ml/github-copilot/unlocking-the-full-power-of-copilot-code-review-master-your-instructions-files/)

**Copilot CLI**
- User level: `$HOME/.copilot/copilot-instructions.md` and `$HOME/.copilot/instructions/**/*.instructions.md`. `COPILOT_HOME` overrides the base directory. **[fetched]** — [GitHub Docs: CLI custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- `.github/copilot-instructions.md` is found in "the repository root, the current working directory, intermediate directories between them". `.github/instructions/**/*.instructions.md` is found in the standard locations "but not intermediate directories". **[fetched]** — [GitHub Docs: CLI custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` are discovered in the standard locations. The CLI "also reads `.claude/CLAUDE.md`". `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` is a comma-separated list of extra directories. **[fetched]** — [GitHub Docs: CLI custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- The CLI combines all applicable files and de-duplicates identical ones. It "does not define a general precedence order between these files." Path-specific files are included only when `applyTo` matches a file in use. `/instructions` can disable files. **[fetched]** — [GitHub Docs: CLI custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)

**Prompt files, custom agents, skills, hooks (cheat sheet)**
- Locations:
  - Prompt files: `.github/prompts/*.prompt.md`.
  - Custom agents: `.github/agents/AGENT-NAME.md` at repo level, and `/agents/AGENT-NAME.md` in an org or enterprise `.github` / `.github-private` repo.
  - Project skills: `.github/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md`, `.agents/skills/<name>/SKILL.md`.
  - Personal skills: `~/.copilot/skills/` and `~/.agents/skills/`.
  - Hooks: `.github/hooks/*.json`.
  - MCP: `mcp.json`, or repository MCP settings on GitHub.
  - Source: **[fetched]** — [GitHub Docs: Customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
- Surface support (✓ supported, ✗ not supported, P preview):

  | Feature | VS Code | Visual Studio | JetBrains | GitHub.com | Copilot CLI |
  |---|:-:|:-:|:-:|:-:|:-:|
  | Prompt files | ✓ | ✓ | P | ✗ | ✗ |
  | Custom agents | ✓ | ✓ | P | ✓ | ✓ |
  | Skills | ✓ | ✓ | P | ✓ | ✓ |
  | Hooks | P | ✗ | ✗ | ✓ | ✓ |

  **[fetched]** — [GitHub Docs: Customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
- Custom agent extension: search results and the VS Code overview example use `.agent.md` (e.g. `.github/agents/reviewer.agent.md`). The cheat sheet shows `AGENT-NAME.md`. This is a naming inconsistency between sources; exact required extension UNVERIFIED. — [VS Code: Customization overview](https://code.visualstudio.com/docs/copilot/customization/overview) **[fetched]**; [GitHub Docs: Create custom agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents) **[search-summary]**
- Skills `allowed-tools` frontmatter lists tools usable without confirmation. A personal agent takes precedence over a project agent with the same ID. **[search-summary, UNVERIFIED]** — [GitHub Docs: Add skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)

**copilot-setup-steps.yml (cloud agent)**
- Path: `.github/workflows/copilot-setup-steps.yml`. It "must contain a single `copilot-setup-steps` job"; "The job MUST be called `copilot-setup-steps` or it will not be picked up by Copilot." **[fetched]** — [GitHub Docs: Customize agent environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
- Allowed keys: `steps`, `permissions`, `runs-on`, `services`, `snapshot`, `timeout-minutes` (maximum `59`). "If you try to customize other settings, your changes will be ignored." **[fetched]** — same page
- "The `copilot-setup-steps.yml` workflow won't trigger unless it's present on your default branch." A failing step skips the remaining steps. The checkout `fetch-depth` "will be overridden". Only Ubuntu x64 and Windows 64-bit runners are supported. Setup steps do not apply to cloud-sandbox sessions. **[fetched]** — same page

### Inferences
- A single root `CLAUDE.md` is read by Copilot (cloud agent and code review per GitHub docs, plus the CLI), by VS Code's Local harness, and by Cursor. However, GitHub describes it as an *alternative* to AGENTS.md ("Alternatively"). Shipping both may duplicate content in tools that read both.
- Path-specific `.instructions.md` files only work on github.com for the cloud agent and code review. Chat on github.com relies on `copilot-instructions.md`.

### Gaps
- GitHub docs do not say how Copilot combines root `AGENTS.md` with root `CLAUDE.md` when both exist (not stated).
- Exact frontmatter schema for `.agent.md` and `.prompt.md` files was not fetched.
- The schema and events for Copilot hooks were not fetched.
- The 4,000-character removal and the 1,000-line guidance are based on search summaries; the pages themselves were not opened.

## VS Code settings controlling AGENTS.md / instructions discovery

### Takeaway
VS Code now distinguishes harnesses: Copilot, Claude, Codex and "Local". The `chat.*` settings control only the Local harness's discovery; native Copilot, Claude and Codex discovery is unaffected. Nested `AGENTS.md` discovery is experimental and off by default.

### Cited Findings
- Files by harness:

  | Harness | Project instructions | Targeted instructions |
  |---|---|---|
  | Copilot | `.github/copilot-instructions.md` or `AGENTS.md` | `.github/instructions/**/*.instructions.md` or nested `AGENTS.md` |
  | Claude | `CLAUDE.md` or `.claude/CLAUDE.md` | `.claude/rules` (frontmatter `paths`, an array of globs) |
  | Codex | `AGENTS.md` | `AGENTS.md` files along the path to the working directory |
  | Local | all of the above formats | all of the above formats |

  "Local checks the workspace-root `CLAUDE.md`, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, and `CLAUDE.local.md`." **[fetched, last updated 11/4/2026]** — [VS Code: Custom instructions reference](https://code.visualstudio.com/docs/agents/reference/custom-instructions-reference)
- `*.instructions.md` frontmatter:
  - `name`: optional; defaults to the file name.
  - `description`: optional; Local can use it to load the file on demand.
  - `applyTo`: optional comma-separated globs; "Use `**` for all files"; no default.
  - `excludeAgent`: the page says not to assume it switches the VS Code harness.
  - With neither `description` nor `applyTo`, the file can only be attached manually.
  - Source: **[fetched]** — same page
- Local-harness settings:
  - `github.copilot.chat.codeGeneration.useInstructionFiles`
  - `chat.includeApplyingInstructions`
  - `chat.includeReferencedInstructions` (off by default)
  - `chat.useAgentsMdFile`
  - `chat.useNestedAgentsMdFiles` (experimental)
  - `chat.useClaudeMdFile`
  - `chat.useCustomizationsInParentRepositories`
  - `chat.instructionsFilesLocations`
  - `github.copilot.chat.organizationInstructions.enabled` (on by default)
  - "These settings control Local discovery only." **[fetched]** — same page
- `chat.useAgentsMdFile` defaults to true. `chat.useNestedAgentsMdFiles` defaults to false and requires `chat.useAgentsMdFile`. AGENTS.md support was enabled by default in VS Code 1.104; the nested setting arrived in 1.105. **[search-summary]** — [VS Code AI settings reference](https://code.visualstudio.com/docs/agents/reference/ai-settings); [VS Code 1.104 release notes](https://code.visualstudio.com/updates/v1_104); [VS Code 1.105 release notes](https://code.visualstudio.com/updates/v1_105)
- VS Code guidance: "Keep rules concise." "Prefer actionable details." "Avoid unnecessary context." "Maintain instructions with the code." "Don't rely on a universal precedence order: combination rules differ by harness." No numeric size limit is given. **[fetched, last updated 11/4/2026]** — [VS Code: Custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)

### Inferences
- A scaffold cannot rely on VS Code `chat.*` settings to change what the native Copilot harness loads. File placement is what controls Copilot.

### Gaps
- The defaults for `chat.useClaudeMdFile` and `chat.instructionsFilesLocations` were not captured.

## Documented anti-patterns (both vendors)

### Takeaway
Both vendors say the same things: keep instructions short, focused and actionable; don't paste style guides or things the agent already knows; avoid conflicting instructions across files; and remember that a loaded file does not guarantee compliance.

### Cited Findings
- Cursor's anti-patterns are copying entire style guides (use a linter instead), documenting common commands the agent knows, instructions for rare edge cases, and duplicating existing code. Reference files instead of copying them. **[fetched]** — [Cursor Docs: Rules](https://cursor.com/docs/context/rules)
- Cursor says to add rules only when the agent repeats a mistake, and to split rules by single concern. **[fetched]** — [Cursor Help: Rules](https://cursor.com/help/customization/rules)
- GitHub says instructions "must not be task specific". It advises avoiding conflicting instructions, because all sets (personal, repository, organization) are sent. **[fetched]** — [GitHub Docs: Add repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- VS Code: "Creating or saving a file doesn't establish that the agent uses it." "Inclusion doesn't guarantee that the agent follows the guidance." Put one-time requirements in the request rather than a customization. "Store a customization at the narrowest scope". "Don't repeat the customization's rules in the test prompt." **[fetched, last updated 11/4/2026]** — [VS Code: Customization overview](https://code.visualstudio.com/docs/copilot/customization/overview)

### Inferences
- The guidance from all three sources points toward one compact always-on file plus scoped or on-demand files. It argues against duplicating the same corpus into every vendor format that a single tool will load.

### Gaps
- Neither vendor publishes token budgets for instruction files. The only numbers are Cursor's "under 500 lines", GitHub's 1,000-line recommendation (search summary only), and "no longer than 2 pages" in GitHub's sample prompt.
