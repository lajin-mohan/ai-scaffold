# Anthropic official guidance on writing and structuring Claude Code instructions

All sources fetched live on 2026-11-06. Primary Anthropic sources only. code.claude.com doc pages showed no "last updated" date in the fetched content. Engineering and blog posts show publication dates, given inline. Short exact phrases are in quotation marks.

Source keys (all retrieved 2026-11-06):
- [MEM] https://code.claude.com/docs/en/memory
- [BP] https://code.claude.com/docs/en/best-practices. `https://www.anthropic.com/engineering/claude-code-best-practices` now returns a **308 Permanent Redirect** to this page, so the old April 2025 engineering post is no longer served separately.
- [FEAT] https://code.claude.com/docs/en/features-overview
- [SK] https://code.claude.com/docs/en/skills
- [SUB] https://code.claude.com/docs/en/sub-agents
- [HG] https://code.claude.com/docs/en/hooks-guide
- [PLAT] https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- [CE] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (published Sep 29, 2025)
- [AS] https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills (published Oct 16, 2025)
- [STEER] https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more (published Jun 18, 2026)

## CLAUDE.md: size, content, structure, emphasis, imports, loading, upkeep

### Takeaway
Anthropic's size target is "under 200 lines per CLAUDE.md file". CLAUDE.md should hold only facts Claude can't find in the repo and needs in every session. Procedures go to skills and area-specific rules go to path-scoped rules. Imports don't reduce cost. Current docs explicitly say to stop adding IMPORTANT or ALL CAPS: a rule that can't bend should become a hook, and a line that keeps getting lost means the file is too long.

### Cited Findings
**Size**
- "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." — [MEM](https://code.claude.com/docs/en/memory)
- The troubleshooting section says "Files over 200 lines consume more context and may reduce adherence. Claude Code skips a file over 4 MiB." — [MEM](https://code.claude.com/docs/en/memory)
- Claude gets the whole of each launch-loaded CLAUDE.md up to 4 MiB. Files that load on demand have a smaller per-file limit and are truncated past it: "40,000 characters" on a 200K window, and on a 1M window "200,000 characters on Claude Opus 4.6 and Claude Sonnet 4.6, and 150,000 characters on later models". These files are subdirectory CLAUDE.md/CLAUDE.local.md and their imports, subdirectory `.claude/rules`, and path-scoped rules. When truncated, Claude gets the start plus a note to Read the rest. — [MEM](https://code.claude.com/docs/en/memory)
- The rule of thumb is "Keep CLAUDE.md under 200 lines. If it's growing, move reference content to skills or split into `.claude/rules/` files." — [FEAT](https://code.claude.com/docs/en/features-overview)
- "Keep CLAUDE.md under 200 lines, give it an owner, and review changes to it like code." — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) (Jun 18, 2026)
- On `/init`: "From there the work is mostly removing lines. The memory guide recommends staying under 200." — [BP](https://code.claude.com/docs/en/best-practices)

**What to include and exclude**
- "Only write down what Claude can't find by reading the repo, or what it would otherwise spend time rediscovering every session." The test has two questions: "Could it find this by reading the code? Would it actually go and look? If both are yes, leave it out." — [BP](https://code.claude.com/docs/en/best-practices)
- Include these: exact test, typecheck and lint commands, including how to run one test file. "Places where the code is misleading". "Decisions that aren't in the repo". "Anything you've had to correct twice already." The cost is that "every line in it takes a little of Claude's attention on *every* task, whether it's relevant or not." — [BP](https://code.claude.com/docs/en/best-practices)
- "Keep it to facts Claude should hold in every session: build commands, conventions, project layout, 'always do X' rules. If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule instead." — [MEM](https://code.claude.com/docs/en/memory)
- The "What you can stop doing" table lists "Describe your architecture and file layout in `CLAUDE.md`" as old advice, because "Claude reads the repo itself. Only write down what isn't in there." — [BP](https://code.claude.com/docs/en/best-practices). Note the tension: [MEM](https://code.claude.com/docs/en/memory) still lists "project layout" and "architectural decisions", and [FEAT](https://code.claude.com/docs/en/features-overview) lists "project architecture/structure" as CLAUDE.md content.
- When to add an entry: "Claude makes the same mistake a second time", a code review catches something Claude should have known, the same correction gets typed again, or a new teammate would need the context. — [MEM](https://code.claude.com/docs/en/memory). [FEAT](https://code.claude.com/docs/en/features-overview) gives the trigger as "Claude gets a convention or command wrong twice".
- The example CLAUDE.md in the docs is 3 sections and about 8 lines: `# Commands`, `# Conventions`, `# Gotchas`. — [BP](https://code.claude.com/docs/en/best-practices)
- A command line alone is enough to tell Claude how to check its work. "A line like `Always typecheck before you finish` in this file works most of the time, not every time." Enforcement belongs in a Stop hook. — [BP](https://code.claude.com/docs/en/best-practices)

**Writing style and structure**
- Write instructions "concrete enough to verify", for example "Use 2-space indentation" instead of "Format code properly". "Structure: group related instructions under markdown headers and bullets." "Consistency: if two instructions contradict each other, Claude may pick one arbitrarily." — [MEM](https://code.claude.com/docs/en/memory)
- "The more specific and concise your instructions, the more consistently Claude follows them." — [MEM](https://code.claude.com/docs/en/memory)
- Block-level HTML comments (`<!-- ... -->`) are stripped before injection. Use them for maintainer notes "without spending context tokens on them". — [MEM](https://code.claude.com/docs/en/memory)

**Emphasis words (IMPORTANT, YOU MUST, ALL CAPS)**
- The old advice was to "Add IMPORTANT or ALL CAPS to instructions Claude keeps missing". The current line is: "Older models sometimes needed the emphasis. Current ones follow a plainly worded line, and piling on emphasis mostly makes Claude over-apply the rule. If it's a rule that can't bend, turn it into a hook or a deny rule. If the line is getting lost in a long file, the file needs to be shorter." — [BP](https://code.claude.com/docs/en/best-practices)
- "If Claude keeps ignoring a line that *is* in `CLAUDE.md`, adding IMPORTANT probably won't fix it." — [BP](https://code.claude.com/docs/en/best-practices)
- "If you keep adding emphasis to a `CLAUDE.md` line and Claude still misses it, that's a sign the line belongs in a hook." — [BP](https://code.claude.com/docs/en/best-practices)
- Possible conflict: the cross-product skill authoring guide still lists "using stronger language such as 'MUST filter' instead of 'always filter'" as one refinement Claude A might suggest. It also shows "ALWAYS use this exact template structure" for strict output formats. — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Imports (`@path`)**
- Imports "help you organize a long file but don't reduce its context cost, because imported files load together with the CLAUDE.md that imports them." — [MEM](https://code.claude.com/docs/en/memory)
- Mechanics: relative paths resolve from the importing file. Imports can recurse to a "maximum depth of four hops". Imports inside code spans and fenced blocks are skipped. Imports from outside the working directory trigger a one-time approval dialog. — [MEM](https://code.claude.com/docs/en/memory)

**Loading behaviour (hierarchy, nested files, CLAUDE.local.md)**
- CLAUDE.md and CLAUDE.local.md in the working directory and above are "loaded at launch. Files in subdirectories load on demand". A subdirectory file loads once Claude reads, writes or edits a file in that subdirectory. — [MEM](https://code.claude.com/docs/en/memory)
- Files are concatenated, not overridden. They are ordered from the filesystem root down, and within a directory CLAUDE.local.md comes after CLAUDE.md. Load order is managed policy, then user `~/.claude/CLAUDE.md`, then project, then local. — [MEM](https://code.claude.com/docs/en/memory)
- "When instructions conflict, Claude uses judgment to reconcile them." — [FEAT](https://code.claude.com/docs/en/features-overview)
- CLAUDE.local.md is for "Personal project-specific preferences; add to `.gitignore`". It only exists in the worktree where it was created. To share it across worktrees, import from the home directory. — [MEM](https://code.claude.com/docs/en/memory)
- "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself... there's no guarantee of strict compliance, especially for vague or conflicting instructions." — [MEM](https://code.claude.com/docs/en/memory)
- After `/compact`, the project-root CLAUDE.md is re-read from disk and re-injected. Nested CLAUDE.md files and `paths:` rules reload on demand. — [MEM](https://code.claude.com/docs/en/memory)
- AGENTS.md is read only when no CLAUDE.md or CLAUDE.local.md exists in the working directory or above. This is configurable and requires v2.1.277 or later. — [MEM](https://code.claude.com/docs/en/memory)
- `claudeMdExcludes` skips ancestor or other-team files. It cannot exclude a managed CLAUDE.md. — [MEM](https://code.claude.com/docs/en/memory)

**`/init`, keeping it current, pruning**
- `/init` generates a starting file. If one already exists, it "suggests improvements rather than overwriting". With `CLAUDE_CODE_NEW_INIT=1` it runs an interactive multi-phase flow that can also set up skills and hooks. — [MEM](https://code.claude.com/docs/en/memory)
- "Review your CLAUDE.md files, nested CLAUDE.md files in subdirectories, and `.claude/rules/` periodically to remove outdated or conflicting instructions." — [MEM](https://code.claude.com/docs/en/memory)
- `/doctor prompt-audit` looks for "instructions written for older models, references to files or commands that don't exist, and files that contradict each other". It covers CLAUDE.md, CLAUDE.local.md, AGENTS.md, rules, skills, commands, subagents and output styles, proposes edits, and changes nothing without approval. It needs v2.1.283 or later. — [MEM](https://code.claude.com/docs/en/memory)
- "`/doctor` suggests cuts for anything Claude can already work out from the code." — [BP](https://code.claude.com/docs/en/best-practices)
- Anti-pattern in shared repos: "every team appends its own instructions and nothing gets deleted." — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- Auto memory's `MEMORY.md` loads its first "200 lines or 25KB". This limit applies only to MEMORY.md. — [MEM](https://code.claude.com/docs/en/memory)

### Inferences
- A CLAUDE.md that restates rule files, or uses `@` imports to pull them in, gets no context saving from that. Only `paths:` scoping, skills or deletion reduce always-loaded cost.
- Heavy use of IMPORTANT, MUST or BLOCK is now classed by Anthropic as legacy, and as likely to cause over-application.

### Gaps
- No official token figure is given for a 200-line file. A line count is the only stated metric.
- None of the fetched pages has a "last updated" date.

## .claude/rules: loading with and without `paths:`, glob syntax, uses

### Takeaway
A rule without `paths:` loads at launch exactly like CLAUDE.md, so it has the same cost. Only path-scoped rules save context.

### Cited Findings
- "Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`." This was already verified elsewhere and is unchanged. — [MEM](https://code.claude.com/docs/en/memory)
- "An unscoped rule is mechanically identical to putting the content in CLAUDE.md." — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- A path-scoped rule loads when Claude uses Read, Write or Edit on a matching file, or reads one with a Bash command that counts as a read, such as `cat` or `head`. — [MEM](https://code.claude.com/docs/en/memory)
- Glob examples: `**/*.ts`, `src/**/*`, `*.md` (anywhere), `/*.md` (base directory only), and brace expansion such as `src/**/*.{ts,tsx}`. Patterns are relative to the directory containing `.claude`. Each rule's expansions are capped at "1,000 expanded patterns and 4 MiB". A literal `[` must be escaped. — [MEM](https://code.claude.com/docs/en/memory)
- "`paths` is the only field Claude Code reads from a rule; any other field is ignored." If the YAML is malformed, the rule loads as if it had no `paths`. — [MEM](https://code.claude.com/docs/en/memory)
- Files are discovered recursively. Each file should cover one topic and have a descriptive filename. User rules in `~/.claude/rules/` load before project rules, and "if a user rule and a project rule conflict, Claude may follow either one". — [MEM](https://code.claude.com/docs/en/memory)
- A rule symlinked from outside the working directory is treated as an external import. Once approved, only rules without `paths` load. — [MEM](https://code.claude.com/docs/en/memory)
- "Rules load into context every session or when matching files are opened. For task-specific instructions that don't need to be in context all the time, use skills instead." — [MEM](https://code.claude.com/docs/en/memory)
- Recommended use: "Language-specific or directory-specific guidelines". "Use rules to keep CLAUDE.md focused." — [FEAT](https://code.claude.com/docs/en/features-overview). Prefer a path-scoped rule over a nested CLAUDE.md "when the instruction regards a cross-cutting concern". — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- The `InstructionsLoaded` hook can log which CLAUDE.md and rule files loaded, when, and why. — [MEM](https://code.claude.com/docs/en/memory)

### Inferences
- A repo with many unscoped rule files is in effect running one large CLAUDE.md, and the 200-line guidance applies to the combined surface. This is inferred: the docs give the 200-line target per CLAUDE.md file, not per rule set.

### Gaps
- No size target is stated for individual rule files, apart from the truncation limit for on-demand files.

## Skills: progressive disclosure, size, and skill vs rule vs command vs subagent

### Takeaway
Skills load only name and description up front and the body on use. Keep SKILL.md under 500 lines and descriptions short and front-loaded. Custom slash commands have been merged into skills. Once a skill's content loads, it stays in context, so a long body is a recurring cost.

### Cited Findings
- "Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. Your existing `.claude/commands/` files keep working." — [SK](https://code.claude.com/docs/en/skills)
- "skill descriptions are loaded into context so Claude knows what's available, but full skill content only loads when invoked." Skills preloaded into a subagent inject their full content at startup instead. — [SK](https://code.claude.com/docs/en/skills)
- There are three levels: metadata at startup, then the SKILL.md body when relevant, then extra files "only as needed". Because of this, bundled context is "effectively unbounded". — [AS](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) (Oct 16, 2025)
- With `disable-model-invocation: true` the description is not in context and the skill runs only when the user invokes it. Recommended "for skills with side effects. This saves context". — [SK](https://code.claude.com/docs/en/skills), [FEAT](https://code.claude.com/docs/en/features-overview)
- Size: "Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files." — [SK](https://code.claude.com/docs/en/skills). The same 500-line target appears in [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
- "Once a skill loads, its content stays in context across turns, so every line is a recurring token cost. State what to do rather than narrating how or why." Claude Code "does not re-read the skill file on later turns, so write guidance that should apply throughout a task as standing instructions". — [SK](https://code.claude.com/docs/en/skills)
- Compaction keeps "the first 5,000 tokens of each" re-attached skill, within a "combined budget of 25,000 tokens". So "put the most important instructions near the top of `SKILL.md`." — [SK](https://code.claude.com/docs/en/skills)
- Each skill's combined `description` and `when_to_use` is "truncated at 1,536 characters". The whole listing's budget "scales at 1% of the model's context window". On overflow, descriptions of the least-invoked skills are dropped first. The budget can be tuned with `skillListingBudgetFraction`, `SLASH_COMMAND_TOOL_CHAR_BUDGET` or `skillOverrides: "name-only"`. — [SK](https://code.claude.com/docs/en/skills)
- Platform frontmatter limits are `name` "Maximum 64 characters" and `description` "Maximum 1,024 characters". Descriptions should be written in third person and state both what the skill does and when to use it. — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Authoring guidance:
  - "The context window is a public good." The default assumption is that "Claude is already very smart", so only add context it doesn't have.
  - Match the degree of freedom to how fragile the task is.
  - Keep references "one level deep from `SKILL.md`". Give reference files over 100 lines a table of contents.
  - Avoid time-sensitive information and inconsistent terminology.
  - Avoid "offering too many options".
  - — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- When to use each:
  - "Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact." — [SK](https://code.claude.com/docs/en/skills)
  - CLAUDE.md is for "'Always do X' rules". Skills are for "Reference material, invocable workflows". Rules are for "Language-specific or directory-specific guidelines". — [FEAT](https://code.claude.com/docs/en/features-overview)
  - "Procedures belong in skills." — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
  - "The `CLAUDE.md` rule applies to skills too: only write down what Claude can't find on its own." — [BP](https://code.claude.com/docs/en/best-practices)
- "If descriptions are vague or overlap, Claude may load the wrong skill or miss one that would help." — [FEAT](https://code.claude.com/docs/en/features-overview)
- `context: fork` runs a skill in a forked subagent that "doesn't see your conversation history". It "only makes sense for skills with explicit instructions". A skill's `paths` frontmatter uses the same glob format as rules. — [SK](https://code.claude.com/docs/en/skills)
- To keep a must-hold rule with a skill, define it as a hook in the skill's `hooks` frontmatter. That hook is active from invocation until the session ends. — [SK](https://code.claude.com/docs/en/skills)

### Inferences
- Large always-loaded rule files that describe procedures (review checklists, release steps, UX workflows) are, by Anthropic's criteria, candidates for skills.
- A large number of skills and commands has a measurable listing cost, capped at 1% of the context window. Past that cap, descriptions are silently dropped.

### Gaps
- No official count is given for how many skills is too many. Only the budget mechanism is documented.

## Subagents: isolation, when to use, cost

### Takeaway
Subagents give separate context, parallelism, tool restriction and a fresh reviewer. They don't give a smarter answer, and they cost tokens and sometimes time. Current docs drop "protect your context window" as the main reason to use them.

### Cited Findings
- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read." A subagent does load the full CLAUDE.md hierarchy, including project rules. Explore and Plan skip it, and `omitClaudeMd` opts out. Auto memory is not loaded. — [SUB](https://code.claude.com/docs/en/sub-agents)
- Use the main conversation for back-and-forth, for shared multi-phase context, for quick changes, and when "Latency matters". Use subagents for verbose output, tool restrictions, and self-contained work. — [SUB](https://code.claude.com/docs/en/sub-agents)
- "What they cost you is mostly tokens... a fresh subagent first has to gather context your conversation already had, so it can end up *slower*." "You get parallelism or a fresh pair of eyes out of it, but not a smarter answer." — [BP](https://code.claude.com/docs/en/best-practices)
- The old advice "Use subagents to protect your context window" is retired: "Running out of context is rarely the problem anymore." The old advice "Delegate to a subagent for a better answer" is also retired. — [BP](https://code.claude.com/docs/en/best-practices)
- Subagent descriptions "take up context, so keep them short". Startup warns when custom subagent descriptions total more than "15,000 tokens". The concurrency limit is 20, and nesting goes "up to three layers". — [SUB](https://code.claude.com/docs/en/sub-agents)
- Restricting a subagent to `tools: Read, Grep, Glob` creates a read-only reviewer, "enforced by Claude Code rather than requested in a prompt." — [BP](https://code.claude.com/docs/en/best-practices)
- Subagents "explore extensively, using tens of thousands of tokens or more" and return "a condensed, distilled summary of its work (often 1,000-2,000 tokens)." — [CE](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (Sep 29, 2025)
- When asking a reviewer subagent to check against a spec, include "skip style", because "A reviewer that's asked to find problems will always find *something*." — [BP](https://code.claude.com/docs/en/best-practices)

### Inferences
- Running five reviewer agents in parallel on every change multiplies token cost. By Anthropic's own framing, the payoff is independence of review, not better answers.

### Gaps
- No numeric cost figure per subagent is given. Anthropic points to `/usage` for per-agent breakdowns.

## Hooks as deterministic enforcement vs advisory instructions

### Takeaway
Anthropic now explicitly sorts instructions into two kinds. CLAUDE.md, skills and prompts are non-deterministic: Claude decides. Hooks, deny rules and managed settings are deterministic: the harness enforces them. Anthropic also warns against turning preferences into hooks.

### Cited Findings
- On CLAUDE.md, skills and prompts: "there's no *guarantee* that it'll follow your instructions." Hooks, deny rules and managed settings are applied "every time, no matter what the model decided to do." — [BP](https://code.claude.com/docs/en/best-practices)
- "If something has to happen every time, make it a hook, a deny rule, or a managed setting. `CLAUDE.md` is for guidelines, and Claude is allowed to decide a guideline doesn't apply." — [BP](https://code.claude.com/docs/en/best-practices)
- "Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead." — [MEM](https://code.claude.com/docs/en/memory)
- "Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer." — [MEM](https://code.claude.com/docs/en/memory)
- "An instruction like 'never edit `.env`' in CLAUDE.md or a skill is a request, not a guarantee." Hooks have context cost "Zero unless the hook returns output". — [FEAT](https://code.claude.com/docs/en/features-overview)
- Hooks give "deterministic control: certain actions always happen rather than relying on the LLM to choose to run them." — [HG](https://code.claude.com/docs/en/hooks-guide)
- `prompt` and `agent` hooks are not deterministic. "For real enforcement, use a `command` or `http` hook". Add `onFailure: "block"` to fail closed. — [BP](https://code.claude.com/docs/en/best-practices)
- A Stop hook that exits with code 2 blocks the stop. After "eight stops in a row" with no tool call in between, Claude Code overrides the block. The cap is set with `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`. — [BP](https://code.claude.com/docs/en/best-practices)
- "Don't overdo it... a hook is for a rule with *zero* exceptions." "Keep the enforced set small. Every hook and deny rule will occasionally fire when it shouldn't... If you ever find yourself at forty of them, most are probably preferences." "If you have hooks for things that are only preferences, delete them and let Claude decide." — [BP](https://code.claude.com/docs/en/best-practices)
- "Most of the time, you want Claude to decide. Almost every guideline has exceptions." — [BP](https://code.claude.com/docs/en/best-practices)
- Auto mode "is a classifier model judging each action rather than a hard rule", so "your 'never' rules belong in deny rules or hooks." — [BP](https://code.claude.com/docs/en/best-practices)
- "the model can fail to follow a prompted rule" under pressure, in long sessions, or after prompt injection. "A real guardrail needs to be deterministic." — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)

### Inferences
- A rules corpus labels many items "BLOCK" or "non-negotiable" while only a few are backed by hooks. Under Anthropic's framing, the rest are guidelines Claude may judge inapplicable.

### Gaps
- None for the scope of this question.

## Context engineering principles (anthropic.com/engineering)

### Takeaway
Treat context as a finite attention budget. Aim for the smallest set of high-signal tokens. Write system prompts at the "right altitude". Prefer just-in-time retrieval, and Claude Code itself is a hybrid: CLAUDE.md up front, then glob and grep.

### Cited Findings
All findings in this section are from [CE](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (Sep 29, 2025) unless marked otherwise.
- The goal is "finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome".
- Context rot: as context grows, "the model's ability to accurately recall information from that context decreases". LLMs have an "attention budget", and transformers produce "n² pairwise relationships for n tokens".
- The right altitude is "the Goldilocks zone". One failure mode is "hardcoding complex, brittle logic". The other is "vague, high-level guidance". Aim for "the minimal set of information that fully outlines your expected behavior". Separate sections with "XML tagging or Markdown headers".
- Avoid stuffing "a laundry list of edge cases into a prompt". Instead, "curate a set of diverse, canonical examples".
- Avoid "bloated tool sets". Curate "a minimal viable set of tools".
- Just-in-time retrieval: keep "lightweight identifiers (file paths, stored queries, web links, etc.)". In Claude Code, "CLAUDE.md files are naively dropped into context up front" while "glob and grep" retrieve "just-in-time".
- Long-horizon techniques are compaction, structured note-taking outside the window, and sub-agent architectures.
- Claude Code docs now say "Most current models have a 1M-token window and compaction happens on its own, so running out is rare". They still recommend `/clear` between tasks "because a focused context gets you better answers and costs less". — [BP](https://code.claude.com/docs/en/best-practices)
- "Every feature you add consumes some of Claude's context. Too much can... add noise that makes Claude less effective; skills may not trigger correctly, or Claude may lose track of your conventions." — [FEAT](https://code.claude.com/docs/en/features-overview)

### Inferences
- The two sources together suggest the concern has shifted from running out of window to protecting attention and adherence. The 200-line target is justified by adherence ("reduce adherence"), not by capacity.

### Gaps
- "Writing effective tools for agents" was not fetched: tool-call budget, and it's tool-design-specific. Unverified here.

## Measuring and evaluating instruction effectiveness

### Takeaway
Anthropic recommends evaluation-driven development for skills: baseline without the skill, at least 3 scenarios, fresh sessions, A/B. It ships tooling for this (skill-creator, `claude plugin eval`, `/doctor prompt-audit`, `/context`, `/usage`). No equivalent eval method is documented for CLAUDE.md or rules, beyond audit, load-checking and observation.

### Cited Findings
- "Create evaluations BEFORE writing extensive documentation." The steps: identify gaps, create three scenarios, establish a baseline without the skill, write minimal instructions, iterate. "There is not currently a built-in way to run these evaluations" on the platform. "Evaluations are your source of truth for measuring Skill effectiveness." The checklist requires "At least three evaluations created" and testing with Haiku, Sonnet and Opus. — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- The Claude A/Claude B method: one instance authors, a fresh instance tests on real tasks, and you observe navigation (unexpected paths, missed references, ignored files). — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Seeing a skill trigger tells you Claude found it, not that it did what you intended." Run realistic prompts in fresh sessions with and without the skill, "because leftover context from authoring the skill will mask gaps". — [SK](https://code.claude.com/docs/en/skills)
- The skill-creator plugin covers several measurements. — [SK](https://code.claude.com/docs/en/skills)
  - It benchmarks "pass rate, time, and tokens for with-skill versus without-skill".
  - It runs a blind A/B between skill versions.
  - It tunes the description using should-trigger and should-not-trigger prompts and "measures the hit rate".
- For plugin skills, `claude plugin eval` with a `tool_used: Skill` grader measures how often a skill triggers. — [SK](https://code.claude.com/docs/en/skills)
- "Start with evaluation: Run agents on representative tasks to find capability gaps." — [AS](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Tools for CLAUDE.md and rules: `/context all` confirms which files loaded. `/doctor prompt-audit` finds stale and conflicting content. The `InstructionsLoaded` hook logs loads. — [MEM](https://code.claude.com/docs/en/memory). `/usage` breaks usage down "by skill, subagent, plugin, and MCP server" and flags patterns over 10% of usage. — [BP](https://code.claude.com/docs/en/best-practices)
- The STEER post "offers no measurement methodology". — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)

### Inferences
- The with/without baseline method in [SK] could be applied to CLAUDE.md or rule files, by toggling a file and comparing fresh sessions. Anthropic documents this only for skills.

### Gaps
- No Anthropic-published adherence statistics, and no quantified line-count-vs-adherence curve, were found.

## Documented anti-patterns

### Takeaway
The anti-patterns Anthropic documents are:
- an over-long CLAUDE.md
- content Claude could discover itself
- contradictions across files
- stale or old-model instructions
- emphasis-stacking
- guardrails written only as instructions
- the opposite error, preferences turned into hooks
- unscoped rules
- procedures in CLAUDE.md

### Cited Findings
- Over-long files "reduce adherence", and a missed line means "the file has grown long enough that the line gets lost". — [MEM](https://code.claude.com/docs/en/memory), [BP](https://code.claude.com/docs/en/best-practices)
- On conflicts: "Claude may pick one arbitrarily". — [MEM](https://code.claude.com/docs/en/memory)
- Stale content: audit for "instructions written for older models, references to files or commands that don't exist". — [MEM](https://code.claude.com/docs/en/memory). "Avoid time-sensitive information". — [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Instruction-only guardrails: "a request, not a guarantee". — [FEAT](https://code.claude.com/docs/en/features-overview). Putting "Every time X, always do Y" and "Never do this" in CLAUDE.md instead of hooks or permissions is an anti-pattern. — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- Over-enforcement: "forty of them" means "most are probably preferences". — [BP](https://code.claude.com/docs/en/best-practices)
- Retired prompt habits:
  - "think hard"
  - "be thorough"
  - "loop until done, don't be lazy", which is "more likely to cause over-work than fix a stall"
  - — [BP](https://code.claude.com/docs/en/best-practices)
- A long procedure in CLAUDE.md should be a skill, and an unscoped API rule should have `paths:`. Personal preferences don't belong in project files. Over-appending to the system prompt means "the less strictly Claude will follow them". — [STEER](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- Repeated corrections in the same session: "/clear plus one new prompt that folds in what you learned works better almost every time." — [BP](https://code.claude.com/docs/en/best-practices)
- Skills that are vague or overlap lead to mis-triggering. Offering too many options is also an anti-pattern. — [FEAT](https://code.claude.com/docs/en/features-overview), [PLAT](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### Inferences
- None beyond those under the earlier questions.

### Gaps
- Anthropic's own public repos' CLAUDE.md files were not examined; another researcher covers repos.
- The `hooks` reference page was not re-checked. The items already verified (exit 2 blocks, `onFailure` from v2.1.295) were taken as given. [BP] confirms that `onFailure: "block"` exists.
