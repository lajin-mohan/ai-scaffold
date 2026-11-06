# How prominent repos control AI coding agents: instruction files plus harness (as of 2026-11-06)

**How this was collected (all retrieved 2026-11-06).** For 24 repos I pulled the default-branch HEAD commit and the full recursive git tree through the authenticated GitHub API (`gh api repos/{repo}/git/trees/{sha}?recursive=1`). I matched agent-related paths in each tree: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `*.instructions.md`, `.cursor/rules/`, `.claude/`, `.agents/`, `.codex/`, `.pre-commit-config.yaml` and `justfile`. I then downloaded every instruction file from `raw.githubusercontent.com/{repo}/{sha}/{path}` and measured it: lines are newline-terminated lines, bytes are raw UTF-8 bytes. I also downloaded every `.github/workflows/*` file and the root `.pre-commit-config.yaml` for 11 repos and searched them for references to agent files.

**Limits on the method:**
- Heading lists were extracted with a regex, and the `#` comments inside fenced bash blocks show up as false "headings". Command-presence calls below are based on reading the fenced blocks.
- The `microsoft/TypeScript` tree came back `truncated: true`, so nested files there may be missing.
- Directories committed as symlinks (for example `.claude/skills` → `.agents/skills`) show up as single blobs, so SKILL.md counts for those repos are lower bounds.
- `evals/` fixture AGENTS.md files in `vercel/next.js` were excluded.

Legend: **[F]** = observed fact from a file I fetched. **[W]** = claim made in a write-up (data present or absent is stated). **[O]** = opinion.

---

## Q1. Per-repo inventory: which files exist, how big, what structure, which commands, nesting, path scoping, CI/hook references

### Takeaway
23 of 24 sampled repos have a root-level agent instruction file at HEAD. The exception is `openai/codex`, which deleted its root AGENTS.md on 2026-09-30. The largest root file per repo has a median of 173 lines and 12.6 KB (range 15–538 lines, 0.7–38 KB). Most of these files are commands, repo maps, conventions and gotchas. Several large repos add nested per-directory files, path-scoped rules, skills and committed `.claude/settings.json` hooks and permissions.

### Cited Findings

#### HEAD commits measured (all retrieved 2026-11-06)
| Repo | Branch @ sha (commit date) |
|---|---|
| openai/codex | main @ 7b8d67e456 (2026-11-06) |
| openai/openai-agents-python | main @ d4f07df291 (2026-11-06) |
| anthropics/claude-code | main @ 90380efca7 (2026-11-06) |
| anthropics/claude-agent-sdk-python | main @ 3be907edb9 (2026-11-04) |
| anthropics/anthropic-sdk-python | main @ 4c7b598466 (2026-11-05) |
| microsoft/vscode | main @ 4a19f6c0f9 (2026-11-06) |
| vercel/next.js | canary @ dfac6e70a7 (2026-11-06) |
| facebook/react | main @ 2363bc2b85 (2026-11-05) |
| astral-sh/uv | main @ 24688aaca1 (2026-11-05) |
| astral-sh/ruff | main @ bd1f9e366f (2026-11-06) |
| denoland/deno | main @ e7b39ebd55 (2026-10-26) |
| temporalio/temporal | main @ 81f022c88b (2026-11-06) |
| temporalio/sdk-python | main @ 2c9ae2f51f (2026-11-06) |
| apache/airflow | main @ 1fe65f5f13 (2026-11-05) |
| pytorch/pytorch | main @ 186a7fa8f5 (2026-11-06) |
| grafana/grafana | main @ 68df7b6065 (2026-11-06) |
| cloudflare/workers-sdk | main @ 307a69a35f (2026-11-06) |
| langchain-ai/langchain | master @ bb6a25a878 (2026-11-05) |
| home-assistant/core | dev @ 68a32468e0 (2026-11-06) |
| microsoft/TypeScript | main @ 7502ae1a2d (2026-11-05) |
| vercel/ai | main @ 6737c7721b (2026-11-05) |
| modelcontextprotocol/python-sdk | main @ 77001c96f9 (2026-11-05) |
| google-gemini/gemini-cli | main @ 3fd7d26346 (2026-11-05) |
| sveltejs/svelte | main @ 7775f73b7c (2026-11-04) |

#### Measured root files [F]
In the table below:
- "Nested" counts AGENTS/CLAUDE/GEMINI.md files below the root, excluding `.github/`.
- "Skills" counts `SKILL.md` files under `.agents/`, `.claude/` or `.codex/`.
- "Path-scoped" counts `*.instructions.md`, `.cursor/rules/*` and `.claude/rules/*` files.

| Repo | Root file(s): lines / bytes | Exact build/test/lint commands in root file? | Nested files (total bytes) | Skills | Path-scoped |
|---|---|---|---|---|---|
| openai/codex — [repo](https://github.com/openai/codex) | **No root AGENTS.md.** Commit 18131270fe (2026-09-30), "Remove repository-local Codex guidance, skills, and environment config (#49713)", deleted the root `AGENTS.md`, `.codex/skills/` and `.codex/environments/environment.toml`. A `justfile` (205 L) remains. | n/a | 3 (3,121 B): `codex-rs/tui/src/bottom_pane/AGENTS.md` 12 L, `exec-server/.../sandbox_integrity/AGENTS.md` 43 L, `code-mode-host/AGENTS.md` 3 L | 0 | 0 |
| openai/openai-agents-python — [AGENTS.md](https://raw.githubusercontent.com/openai/openai-agents-python/main/AGENTS.md) | AGENTS.md 214 L / 38,241 B (very long lines); `CLAUDE.md` = 9 B text pointer "AGENTS.md" | Yes (Operation Guide → Testing & Automated Checks) | 0 | 14 (`.agents/skills/*`, plus 17 `.agents/references/*.md`) | 0 |
| anthropics/claude-code — [CLAUDE.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CLAUDE.md) | CLAUDE.md 40 L / 2,218 B | No. The whole file is one section, "Security hardening for GitHub Actions" | 0 | 0 (3 `.claude/commands/*`) | 0 |
| anthropics/claude-agent-sdk-python — [CLAUDE.md](https://raw.githubusercontent.com/anthropics/claude-agent-sdk-python/main/CLAUDE.md) | CLAUDE.md 84 L / 4,111 B | Yes: ruff check/format, mypy, pytest | 0 | 1 (`verify`) | 0 |
| anthropics/anthropic-sdk-python — [CLAUDE.md](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/CLAUDE.md) | CLAUDE.md 369 L / 31,855 B | Yes ("Build, test, lint" section: test matrix, pytest, ruff) | 0 | 0 | 0 |
| microsoft/vscode — [copilot-instructions](https://raw.githubusercontent.com/microsoft/vscode/main/.github/copilot-instructions.md) | `.github/copilot-instructions.md` 173 L / 14,552 B; `AGENTS.md` 5 L / 271 B (pointer to copilot-instructions) | Yes ("Validating TypeScript changes") | 7 (284,336 B). Includes `src/vs/platform/agentHost/AGENTS.md` at 1,019 L / 225,118 B, the largest file seen | 3 (`.agents/skills/launch` etc.) | 32 `.github/instructions/*.instructions.md` (29 root + 3 in extensions/copilot) |
| vercel/next.js — [AGENTS.md](https://raw.githubusercontent.com/vercel/next.js/canary/AGENTS.md) | AGENTS.md 538 L / 31,539 B (largest root file by lines) | Yes. Extensive: build, fast dev, test, lint/types, CI-failure triage | 5 (9,605 B): `turbopack/`, `test/`, `crates/`, `packages/next/`, `apps/bundle-analyzer/`; also `.github/AGENTS.md` 78 L | 21 | 0 |
| facebook/react — [CLAUDE.md](https://raw.githubusercontent.com/facebook/react/main/CLAUDE.md) | CLAUDE.md 13 L / 359 B; `.claude/instructions.md` 46 L / 1,272 B, injected by a SessionStart hook | Yes, in `.claude/instructions.md` ("Verification", "Commands") | 1: `compiler/CLAUDE.md` 276 L / 10,343 B | 14 (7 root + 7 compiler) | 5 `compiler/.claude/rules/*.md` |
| astral-sh/uv — [AGENTS.md](https://raw.githubusercontent.com/astral-sh/uv/main/AGENTS.md) | AGENTS.md 49 L / 3,746 B, no headings, all imperative bullets (ALWAYS/NEVER/PREFER/AVOID) | Partial. "Read CONTRIBUTING.md for guidelines on how to run tools", plus `cargo xwin clippy` and `cargo update --precise` | 0 | 1 (`.codex/skills`) | 0 |
| astral-sh/ruff — [AGENTS.md](https://raw.githubusercontent.com/astral-sh/ruff/main/AGENTS.md) | AGENTS.md 241 L / 20,380 B; CLAUDE.md = `@AGENTS.md` (11 B) | Yes (nextest, mdtest, snapshot updates, clippy) | 0 | 6 + 5 threat-model refs in `.agents/references/` | 0 |
| denoland/deno — [CLAUDE.md](https://raw.githubusercontent.com/denoland/deno/main/CLAUDE.md) | CLAUDE.md 433 L / 11,866 B and `.github/copilot-instructions.md` 352 L / 12,567 B (two parallel files with overlapping sections) | Yes (cargo check/build, `./x` style lint/fmt, spec tests) | 0 | 6 | 0 |
| temporalio/temporal — [AGENTS.md](https://raw.githubusercontent.com/temporalio/temporal/main/AGENTS.md) | AGENTS.md 42 L / 2,483 B; copilot-instructions 167 L / 14,022 B (code-review guideline set with severity levels) | Yes ("Development Commands") | 1: `chasm/AGENTS.md` 33 L | 1 | 1 `.cursor/rules/review.mdc` (globs `**/*.go`, `alwaysApply: false`, body `@.github/copilot-instructions.md`) |
| temporalio/sdk-python — [AGENTS.md](https://raw.githubusercontent.com/temporalio/sdk-python/main/AGENTS.md) | AGENTS.md 137 L / 6,590 B | Yes ("Building and Testing") | 0 | 0 | 0 |
| apache/airflow — [AGENTS.md](https://raw.githubusercontent.com/apache/airflow/main/AGENTS.md) | AGENTS.md 253 L / 23,160 B; CLAUDE.md = text "AGENTS.md" (9 B) | Yes ("Commands", kept in sync by a pre-commit hook, see Q3) | 14 (56,751 B), e.g. `registry/AGENTS.md` 611 L, `providers/AGENTS.md` 114 L, `scripts/ci/prek/AGENTS.md` 66 L; `.github/AGENTS.md` 38 L | 8 | 1 (`.github/instructions/code-review.instructions.md`, `applyTo: "**"`) |
| pytorch/pytorch — [CLAUDE.md](https://raw.githubusercontent.com/pytorch/pytorch/main/CLAUDE.md) | CLAUDE.md 373 L / 17,137 B; AGENTS.md = text "CLAUDE.md" (9 B); copilot-instructions 127 L | Yes (Build, Testing, Linting sections) | 3: `torch/_dynamo/CLAUDE.md` 305 L, `torch/distributed/CLAUDE.md` 21 L (+ AGENTS.md pointer) | 19 | 0 |
| grafana/grafana — [AGENTS.md](https://raw.githubusercontent.com/grafana/grafana/main/AGENTS.md) | AGENTS.md 180 L / 10,818 B; CLAUDE.md = `@AGENTS.md` | Yes (`make run`, `go test -run`, `pnpm test`, etc.) | 13 (125,825 B), e.g. `pkg/router/AGENTS.md` 556 L, `public/app/features/alerting/unified/AGENTS.md` 611 L | 3 | 0 |
| cloudflare/workers-sdk — [AGENTS.md](https://raw.githubusercontent.com/cloudflare/workers-sdk/main/AGENTS.md) | AGENTS.md 157 L / 9,450 B; CLAUDE.md 5 L ("See @AGENTS.md") | Yes ("Common Commands") | 7 per-package (43,273 B): wrangler, miniflare, vite-plugin, vitest-plugin, C3, workers-auth (214 L), workers-utils | 0 | 0 |
| langchain-ai/langchain — [AGENTS.md](https://raw.githubusercontent.com/langchain-ai/langchain/master/AGENTS.md) | AGENTS.md 390 L / 20,580 B | Yes (uv sync, unit tests, lint, format, type check) | 0 | 0 | 0 |
| home-assistant/core — [AGENTS.md](https://raw.githubusercontent.com/home-assistant/core/dev/AGENTS.md) | AGENTS.md 58 L / 6,097 B; CLAUDE.md = text "AGENTS.md"; copilot-instructions 198 L, generated from AGENTS.md plus a review section | Yes ("Development Commands") | 2 (hassfest) | 9 (`.claude/skills/*`) + 2 `.claude/agents/*` | 0 |
| microsoft/TypeScript — [copilot-instructions](https://raw.githubusercontent.com/microsoft/TypeScript/main/.github/copilot-instructions.md) | `.github/copilot-instructions.md` 144 L / 5,835 B (only file found; tree truncated) | Yes (hereby test commands) | unknown (tree truncated) | 0 | 0 |
| vercel/ai — [AGENTS.md](https://raw.githubusercontent.com/vercel/ai/main/AGENTS.md) | AGENTS.md 363 L / 16,284 B | Yes (root-level and package-level commands, `pnpm run-verifiers --modified`) | 3: `packages/ai/AGENTS.md`, `apps/docs/AGENTS.md` (+ CLAUDE.md `@AGENTS.md`) | symlinked dir (count unknown) | `.agents/guidelines/*.md` with matching `.agents/verifiers/*.ts` (see Q3) |
| modelcontextprotocol/python-sdk — [AGENTS.md](https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/AGENTS.md) | AGENTS.md 166 L / 8,714 B; CLAUDE.md = `@AGENTS.md` | Yes (uv, pytest, coverage, pyright, ruff) | 0 | 1 | 0 |
| google-gemini/gemini-cli — [GEMINI.md](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/GEMINI.md) | GEMINI.md 96 L / 4,610 B (no AGENTS.md or CLAUDE.md) | Yes ("Building and Running", "Testing and Quality") | 7 per-package GEMINI.md (10,578 B) | 0 | 0 |
| sveltejs/svelte — [AGENTS.md](https://raw.githubusercontent.com/sveltejs/svelte/main/AGENTS.md) | AGENTS.md 15 L / 667 B: defers to CONTRIBUTING.md and the PR template, requires "full test suite" before PR | No (delegated to CONTRIBUTING.md) | 0 | 1 | 0 |

#### Notable section content [F]
- **Human approval gates in instruction files exist, but they gate GitHub and push actions, not development stages.**
  - grafana AGENTS.md, "Human Review Gates": stop and get explicit human approval before `git push`. It states that "Open a PR" in a task description is intent, not permission — [grafana AGENTS.md](https://raw.githubusercontent.com/grafana/grafana/main/AGENTS.md).
  - pytorch CLAUDE.md opens with "AI Policy — MANDATORY": never act autonomously on GitHub, label all AI-generated content, open unreviewed PRs as drafts, check for duplicates — [pytorch CLAUDE.md](https://raw.githubusercontent.com/pytorch/pytorch/main/CLAUDE.md).
  - home-assistant AGENTS.md, "AI policy": autonomous contributions are not accepted, and agents must not open issues or PRs or comment without the user's review — [HA AGENTS.md](https://raw.githubusercontent.com/home-assistant/core/dev/AGENTS.md).
  - openai-agents-python: "Never push, open a PR, or otherwise mutate GitHub." — [AGENTS.md](https://raw.githubusercontent.com/openai/openai-agents-python/main/AGENTS.md).
- **openai-agents-python is the clearest case of process encoded in an instruction file.**
  - It has "Mandatory Skill Usage": `$implementation-strategy` before runtime or API changes, `$implementation-final-review`, `$code-change-verification` and `$pr-draft-summary`.
  - It mandates status words (`RUNNING` / `COMPLETE` / `NEEDS_DECISION`), ExecPlans, documentation verification tiers and a code-review finding threshold — [AGENTS.md](https://raw.githubusercontent.com/openai/openai-agents-python/main/AGENTS.md).
- **anthropics/claude-code's CLAUDE.md is entirely about harness security.** Jobs that call Claude must use an egress-firewall runner, an allow-list file with `mode: enforce`, and `--permission-mode auto`. The file states that `.github/workflows/workflow-hardening.yml` fails CI when protections 1 or 3 are broken — [CLAUDE.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CLAUDE.md). The same section also appears in claude-agent-sdk-python's CLAUDE.md.
- **astral-sh/uv shows prose-hygiene rules.** It forbids leaking "our conversation, prompt, or iteration history into code comments, pull request descriptions" — [uv AGENTS.md](https://raw.githubusercontent.com/astral-sh/uv/main/AGENTS.md).
- **Cross-tool aliasing is common.**
  - 9 repos keep a 9–132 byte CLAUDE.md or AGENTS.md that only points at the other file: `@AGENTS.md` import syntax in ruff, grafana, MCP python-sdk, vercel/ai docs and workers-sdk. A plain text "AGENTS.md" appears in airflow, home-assistant and openai-agents-python. pytorch goes the other way, with AGENTS.md pointing to "CLAUDE.md".
  - vscode's AGENTS.md points to copilot-instructions.
  - temporal's `.cursor/rules/review.mdc` imports copilot-instructions — [ruff CLAUDE.md](https://raw.githubusercontent.com/astral-sh/ruff/main/CLAUDE.md), [workers-sdk CLAUDE.md](https://raw.githubusercontent.com/cloudflare/workers-sdk/main/CLAUDE.md).
  - The pointers above are git symlinks or one-line files, as observed in the raw content.
- **Path scoping:**
  - vscode has 32 `*.instructions.md` files. 18 of the 29 root-level ones have an `applyTo:` glob within their first 6 lines (e.g. `src/vs/**/*.css`, `**/test/**`). The other 11 showed none in the first 6 lines; I did not check whether it appears later — [vscode .github/instructions](https://github.com/microsoft/vscode/tree/main/.github/instructions).
  - react/compiler has 5 `.claude/rules/*.md` — [react compiler/.claude](https://github.com/facebook/react/tree/main/compiler/.claude).
  - temporal has one `.mdc` file with `globs` — [review.mdc](https://raw.githubusercontent.com/temporalio/temporal/main/.cursor/rules/review.mdc).
  - Every other repo relies on directory-nested AGENTS/CLAUDE/GEMINI.md instead.

### Inferences
- The dominant shape is a root file of roughly 100–400 lines with: a project/repo map, exact build/test/lint commands, coding conventions, testing conventions, PR/commit rules, and gotchas. 21 of the 23 repos with a root file include, or directly point to, runnable commands.
- When a file encodes process, it is narrow. The common thread is "a human must approve anything that leaves the machine (push, PR, issue comment)" plus "run these checks". None of the sampled files encodes a multi-stage BRD → design → implementation lifecycle. openai-agents-python comes closest, and it encodes its process through skills rather than prose stages.
- Large monorepos (vscode, grafana, airflow, workers-sdk, gemini-cli, next.js) scale by nesting files near the code. Their total nested volume (up to ~284 KB in vscode) far exceeds the root file. Root files stay moderate.
- One vendor's own flagship repo (openai/codex) removed its root AGENTS.md and repo skills in Sept 2026. The commit message gives no rationale, so the reason is unknown.

### Gaps
- Why openai/codex removed its guidance: the commit body says only what was deleted.
- microsoft/TypeScript nested files: the tree API truncated.
- Exact SKILL.md counts where `.claude/skills` or `.agents/skills` is a symlinked directory (vercel/ai, airflow, pytorch, next.js, home-assistant).
- I did not read every nested file in full. Section summaries for nested files are not provided.

---

## Q2. Patterns: size distribution, recurring sections, process vs commands/conventions

### Takeaway
Measured median root-file size is 173 lines (≈12.6 KB). That is consistent with Anthropic's documented "under 200" guidance, and 9 of 23 repos exceed 200 lines. Recurring sections are commands, structure map, conventions, testing, PR/commit rules and "don't" lists. Process content is limited to approval gates for outward actions and a few skill mandates.

### Cited Findings
- **[F] Size distribution.** I took the largest root-level file per repo across AGENTS/CLAUDE/GEMINI/copilot-instructions/.claude/instructions.md (n=23, from the Q1 table).
  - Sorted line counts: 15, 40, 46, 49, 84, 96, 137, 144, 157, 166, 167, 173, 180, 198, 214, 241, 253, 352, 363, 369, 373, 390, 538.
  - Median 173 lines. Byte median 12,567 B, min 667 B (svelte), max 38,241 B (openai-agents-python).
  - If deno's 433-line CLAUDE.md is used instead of its slightly larger-by-bytes copilot file, the max by lines stays 538 (next.js).
- **[F] Recurring sections in root files.**
  - Commands/build/test/lint appear in 21/23.
  - A repo structure or architecture map appears in most (vscode, next.js, airflow, grafana, langchain, vercel/ai, deno, pytorch, workers-sdk, MCP).
  - Coding standards/style appear in most.
  - PR/commit conventions: next.js, ruff, airflow, pytorch, HA, workers-sdk, sdk-python, openai-agents-python.
  - Security sections: anthropics/claude-code, claude-agent-sdk-python, airflow "Security Model", langchain "Corridor security analysis", openai-agents-python "Security checklist", svelte.
  - Explicit "Do Not" or "Boundaries" sections: vercel/ai "Do Not", airflow "Boundaries".
  - Sources are the heading extraction and the files linked in Q1.
- **[F] "Code Review Rules" sections aimed at AI reviewers** appear in openai-agents-python, ruff, grafana, deno ("Before commenting, verify your claims"), temporal's copilot-instructions (severity levels) and airflow's `code-review.instructions.md` — files linked in Q1.
- **[F] Emphatic tokens are common.** For example, pytorch CLAUDE.md has 26 occurrences of MUST/NEVER/ALWAYS/IMPORTANT, next.js 25, airflow 23 and ruff 18 (my regex count over the fetched files).
- **[W, vendor docs, no outcome data]** Anthropic's Claude Code best-practices page says CLAUDE.md "works best when it only holds" what Claude can't work out itself. It points to the memory guide, which "recommends staying under 200" lines. It also warns that adding IMPORTANT "probably won't fix" an ignored line: either the file is too long or the rule belongs in a hook — [Claude Code best practices](https://code.claude.com/docs/en/best-practices) (retrieved 2026-11-06).
- **[W, survey of 2,500+ files, no outcome data]** GitHub's Matt Nigh (published 2025-11-19, updated 2025-11-25) reports analysing "over 2,500 agents.md files". The recommendations: commands early, examples over explanation, clear boundaries ("never commit secrets" the most common), a specific stack, and six areas (commands, testing, structure, style, git workflow, boundaries). The post gives no sampling method and no outcome metrics — [GitHub blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/).
- **[W/O] HumanLayer (Kyle, 2025-11-25).**
  - Recommendations: under 300 lines ("general consensus", which is opinion). Their own root file is under 60 lines. Use progressive disclosure into `agent_docs/`, don't use the LLM as a linter, and don't auto-generate with `/init`.
  - The post cites arXiv 2507.11538 for frontier models following ~150–200 instructions with linear decay. It also estimates (opinion) ~50 instructions in Claude Code's own system prompt.
  - Source: [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md).
- **[W, controlled study with data]** Gloaguen, Mündler-Sasahara, Müller, Raychev, Vechev, "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?" (arXiv 2602.11988, v1 2026-02-12, v3 2026-09-29).
  - The abstract says context files "do not generally improve task success rates" and increase inference cost "by over 20% on average" — [arXiv](https://arxiv.org/abs/2602.11988).
  - A search-result summary adds: AGENTbench has 138 tasks from 12 Python repos, with Claude Code, Codex and Qwen Code as agents. LLM-generated files slightly reduce success. Developer-written files give up to ~4% gain. Agents do follow the files and explore more. I did not verify these numbers in the PDF myself, so treat them as secondary — [ICLR 2026 listing](https://iclr.cc/virtual/2026/10021235).

### Inferences
- The observed median (173 lines) sits just under Anthropic's 200-line guidance, but the tail is long: next.js 538, deno 433, langchain 390, pytorch 373, anthropic-sdk-python 369, vercel/ai 363. Prominent teams do not uniformly follow the "keep it short" advice in the root file.
- The one controlled study found small or no gains from context files and a >20% cost increase. Combined with that, the evidence base for "more instruction text = better agent" is weak. Content that cannot be derived from code (commands, gotchas, outward-action boundaries) is the defensible core. This is an inference, not a measured finding.

### Gaps
- No study found that correlates file size or section mix with outcomes on real repos at this scale. GitHub's survey has no outcome data.
- I did not independently verify the 2602.11988 per-condition numbers (only the abstract).

---

## Q3. Harness patterns in the sampled repos (settings/hooks/permissions, pre-commit, CI checks on agent files, verify scripts)

### Takeaway
Committed harness configuration is present but minority. Four repos commit `.claude/settings.json` with hooks and/or permission allow/deny lists:
- facebook/react: SessionStart hook plus allow/deny lists
- anthropics/claude-agent-sdk-python: PostToolUse ruff fix/format plus allowlist
- astral-sh/ruff: SessionStart hook plus plugin marketplace
- vercel/ai: PostToolUse `pnpm fix`, mirrored in `.codex/hooks.json`

A few repos go further and treat agent files as tested artifacts: airflow (pre-commit sync, command-existence check and promptfoo skill-evals), openai-agents-python (CI job testing `.agents/**`), home-assistant (copilot-instructions generated from AGENTS.md), vercel/ai (deterministic guideline verifiers) and anthropics/claude-code (CI that enforces workflow hardening).

### Cited Findings
- **[F] facebook/react `.claude/settings.json`.** A SessionStart hook cats `.claude/instructions.md` when not in `compiler/`. allow covers `Skill(...)` for 7 skills plus `yarn test/lint/flow/prettier/build...`. deny covers `npm:*`, `pnpm:*`, `bun:*`, `npx:*` and `yarn download-build*`. The `compiler/.claude/settings.json` allows `yarn snap`, `cargo test/check` etc. and denies the root skills — [react settings](https://raw.githubusercontent.com/facebook/react/main/.claude/settings.json), [compiler settings](https://raw.githubusercontent.com/facebook/react/main/compiler/.claude/settings.json).
- **[F] anthropics/claude-agent-sdk-python `.claude/settings.json`.** allow lists the exact ruff, mypy and pytest commands. A PostToolUse hook on `Edit|Write|MultiEdit` runs `python -m ruff check ... --fix && python -m ruff format ...` — [settings.json](https://raw.githubusercontent.com/anthropics/claude-agent-sdk-python/main/.claude/settings.json).
- **[F] vercel/ai.** `.claude/settings.json` and `.codex/hooks.json` are byte-identical (215 B). Each has a PostToolUse hook on `Write|Edit` running `pnpm fix`. AGENTS.md documents `pnpm discover-guidelines --modified` and `pnpm run-verifiers --modified`, which run TS verifiers in `.agents/verifiers/` matching `.agents/guidelines/*.md`. The file adds that when verifiers flag something, "it is a clear guideline violation" — [settings.json](https://raw.githubusercontent.com/vercel/ai/main/.claude/settings.json), [AGENTS.md](https://raw.githubusercontent.com/vercel/ai/main/AGENTS.md).
- **[F] astral-sh/ruff.**
  - `.claude/settings.json` enables plugin `ty-skills@ruff-agent-skills` from a directory marketplace at `.agents`, plus a SessionStart hook `.claude/hooks/session-start.sh`. That script dispatches to `session-start-web.sh` when `CLAUDE_CODE_REMOTE=true`.
  - The CI workflow `ci.yaml` references `threat-models: .agents/references`.
  - `.pre-commit-config.yaml` includes patterns for `.agents/skills/.*`.
  - Sources: [settings.json](https://raw.githubusercontent.com/astral-sh/ruff/main/.claude/settings.json), [session-start.sh](https://raw.githubusercontent.com/astral-sh/ruff/main/.claude/hooks/session-start.sh).
- **[F] apache/airflow `.pre-commit-config.yaml` (prek)** has four hooks that treat AGENTS.md as code — [pre-commit config](https://raw.githubusercontent.com/apache/airflow/main/.pre-commit-config.yaml):
  - `generate-agent-skills`, "Sync AGENTS.md commands from contributing docs", runs `scripts/ci/prek/generate_agent_skills.py`.
  - `check-documented-commands`, "Check documented breeze and prek commands exist".
  - `run-skill-eval` and `run-skill-eval-codex` are manual stage only. They run `dev/skill-evals/eval.py` with `promptfoo@0.121.17` plus `@anthropic-ai/claude-agent-sdk` or `@openai/codex-sdk`. A comment says they are skipped in CI because the node environments are ~3.5 GB.
  - A fourth hook, "Verify skill-eval ran on current AGENTS.md and cases", is defined at line 1556 of the file.
- **[F] openai/openai-agents-python.** `.github/workflows/repo-skills.yml` triggers on changes to `.agents/**` and runs `make tests-repo-skills`. Several skills ship tested Python scripts, e.g. `implementation-final-review/scripts/test_review_protocol.py` and `implementation-kickoff/scripts/test_validate_handoff.py` — [repo-skills.yml](https://raw.githubusercontent.com/openai/openai-agents-python/main/.github/workflows/repo-skills.yml), [tree](https://github.com/openai/openai-agents-python/tree/main/.agents/skills).
- **[F] home-assistant/core.** The pre-commit hook `gen_copilot_instructions` (`python3 -m script.gen_copilot_instructions`) fires on changes to `AGENTS.md` or `.github/copilot-instructions.md`. CI `ci.yaml` has a `gen-copilot-instructions` job. GitHub Agentic Workflows lock files set `GH_AW_AGENT_FILES: "AGENTS.md"`. `quality-scale-reviewer` installs only `.claude/skills/ha-quality-scale-verify` and deletes the other skills before running — [pre-commit config](https://raw.githubusercontent.com/home-assistant/core/dev/.pre-commit-config.yaml), [workflows dir](https://github.com/home-assistant/core/tree/dev/.github/workflows).
- **[F] anthropics/claude-code.** CLAUDE.md states that `.github/workflows/workflow-hardening.yml` with `.github/scripts/check_workflow_hardening.py` fails CI if a Claude-calling job lacks the firewall runner or `--permission-mode auto`, or if the egress allow list is missing, empty, not enforce-mode, or wildcarded — [CLAUDE.md](https://raw.githubusercontent.com/anthropics/claude-code/main/CLAUDE.md). Code search confirms the workflow file exists — [workflow-hardening.yml](https://github.com/anthropics/claude-code/blob/main/.github/workflows/workflow-hardening.yml).
- **[F] pytorch/pytorch.**
  - `.github/workflows/claude-code.yml` wires `.claude/hooks/claude_code/time-budget.sh` as a hook. Its comments say Claude Code "stops the agent loop when a PostToolBatch hook exits 2", which is why the script traps exit 0.
  - `hardened-pr-review-run.yml` copies only trusted-checkout skills (`.agents/skills/pr-review`, `cuda-streams`) into `~/.claude/skills`. It notes that the PR tree's own `.agents/` "is never loaded" and restricts `--allowedTools` to Skill/Read/Grep on specific paths.
  - Sources: [time-budget.sh](https://raw.githubusercontent.com/pytorch/pytorch/main/.claude/hooks/claude_code/time-budget.sh), [workflows](https://github.com/pytorch/pytorch/tree/main/.github/workflows).
- **[F] Other references.** langchain's `openwiki-update.yml` references AGENTS.md. grafana's `pr-unified-storage-compatibility.yml` echoes "see pkg/storage/unified/AGENTS.md" to contributors — [langchain workflows](https://github.com/langchain-ai/langchain/tree/master/.github/workflows), [grafana workflows](https://github.com/grafana/grafana/tree/main/.github/workflows).
- **[F] No agent-file references** were found in workflow files of vercel/next.js (29 files scanned), vercel/ai (16) or cloudflare/workers-sdk (30). The scan was a pattern match over `.github/workflows/*` at HEAD.
- **[F] Verify commands as named entry points.**
  - react `.claude/skills/verify` and claude-agent-sdk-python `.claude/skills/verify/SKILL.md`.
  - openai-agents-python `$code-change-verification` with `scripts/run.sh`.
  - openai/codex `justfile` (205 L).
  - vercel/ai `pnpm run-verifiers`.
  - Sources: trees linked in Q1.
- **[W, vendor docs]** Anthropic's best-practices page separates "non-deterministic" instructions (prompt, CLAUDE.md, skills) from "deterministic" ones (hooks, deny rules, managed settings). It advises: "If something has to happen every time, make it a hook, a deny rule, or a managed setting." It recommends a Stop hook (exit 2 blocks finishing) for enforcing typecheck. It says "the single most useful line in your CLAUDE.md is the command that runs" your check — [Claude Code best practices](https://code.claude.com/docs/en/best-practices).

### Inferences
- In the most mature setups, the harness does three things:
  1. Auto-runs formatters after edits (PostToolUse).
  2. Allowlists the project's own test, lint and build commands while denying the wrong package managers or download scripts.
  3. In CI, treats agent files and skills as artifacts with tests or sync checks (airflow, openai-agents-python, home-assistant, vercel/ai).
- Security-hardened CI agent runs (pytorch, claude-code) deliberately avoid loading repo-controlled agent config from untrusted PR trees. This means committed `.claude/` content is itself treated as an attack surface.
- No sampled repo uses a Stop hook in committed settings, and none uses hooks to enforce plan approval. Enforcement is concentrated on formatting, command scope and CI.

### Gaps
- I did not scan workflows for all 24 repos (11 scanned), and I did not read `check_workflow_hardening.py` or airflow's `generate_agent_skills.py` in full.
- Local-only `.claude/settings.local.json` usage is by definition not observable.

---

## Q4. Credible engineering write-ups by named teams

### Takeaway
Vendor write-ups (OpenAI harness engineering, Anthropic team usage, Anthropic best-practices docs) and GitHub's survey give consistent qualitative advice: a short root file used as a map, commands first, deterministic enforcement over prose, and mechanical checks on docs. Outcome data is thin. The only controlled evaluation (ETH/LogicStar, arXiv 2602.11988) found little or no success gain and >20% higher cost.

### Cited Findings
- **[W] OpenAI, "Harness engineering: leveraging Codex in an agent-first world" (2026-02-11).** The primary page returned HTTP 403 to my fetcher, so the claims below come via search-result extracts quoting the page.
  - The team first tried one large AGENTS.md, which "failed in predictable ways". They moved to a ~100-line AGENTS.md used as "the table of contents", with a structured `docs/` directory as "system of record" (DESIGN.md, PLANS.md, SECURITY.md). They note that a single large file is hard to check mechanically. The initial AGENTS.md was itself written by Codex.
  - Secondary sources report ~1,500 merged PRs with a team of three engineers. Others say 3–7 engineers, so the team size is inconsistent across sources and unverified.
  - Sources: [OpenAI](https://openai.com/index/harness-engineering/), [secondary summary](https://rywalker.com/research/openai-harness).
- **[W] Anthropic, "How Anthropic teams use Claude Code" (2025-07-24).**
  - Teams use CLAUDE.md files for onboarding (Infrastructure/data science), with Claude reading the relevant CLAUDE.md files to explain pipeline dependencies.
  - Product Design runs autonomous write-code → run-tests → iterate loops with human review afterwards.
  - Security Engineering moved to TDD with Claude.
  - Numbers given are anecdotal and team-reported, with no method stated: incident debugging "3x as quickly" (Security Engineering), ~20 minutes saved in an outage (Data Infrastructure), an 80% reduction in research time (Inference).
  - The article does not mention hooks.
  - Source: [Claude blog](https://claude.com/blog/how-anthropic-teams-use-claude-code). The companion PDF could not be text-extracted in this session.
- **[W] Anthropic Claude Code docs, best practices (retrieved 2026-11-06).** Keep CLAUDE.md short. The memory guide recommends under 200 lines. Use hooks, deny rules and managed settings for rules that "can't have exceptions". Give Claude a check to run (tests, typecheck, Stop hook, CI). Skills are lighter on context than CLAUDE.md — [docs](https://code.claude.com/docs/en/best-practices).
- **[W] GitHub (Matt Nigh), 2,500+ AGENTS.md analysis (2025-11-19).** The six-area recommendation is listed under Q2. It has no outcome metrics — [GitHub blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/).
- **[O] HumanLayer (2025-11-25).** Practitioner opinion with one cited instruction-following paper — [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md).
- **[W, data] Gloaguen et al., ETH Zurich / LogicStar.ai, arXiv 2602.11988.** Covered under Q2 — [arXiv](https://arxiv.org/abs/2602.11988).

### Inferences
- What the repos actually do agrees with the write-ups on the "map plus commands" core. Several prominent repos (next.js, langchain, pytorch, anthropic-sdk-python) nonetheless run root files of 360–540 lines, above vendor guidance. Practice lags the guidance, or the teams judge the cost acceptable; I cannot say which.
- Quantitative evidence that instruction files improve outcomes is limited to one benchmark study, which is mildly negative to neutral. Most other "evidence" is anecdotal time savings or unscored surveys.

### Gaps
- I found no primary engineering posts with data from Stripe, Shopify, Cloudflare, Vercel, Sourcegraph, Factory or Builder.io in this session; time was spent on artifact measurement instead. Treat these as not covered, not as "none exist".
- The OpenAI harness post text could not be fetched directly (403). Its claims are reported via quoted extracts.
- The Anthropic team-usage PDF could not be parsed. Only the blog summary was used.
