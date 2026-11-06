# Empirical evidence on repository instruction files (AGENTS.md, CLAUDE.md, cursor rules) and instruction-following at scale

Fact note as of 2026-11-06. All URLs retrieved 2026-11-06. Status labels: **[preprint]** = arXiv only, no venue found; **[peer-reviewed]** = venue stated by the authors or the proceedings site; **[vendor]** = vendor documentation or research blog, not peer-reviewed. "Measured" means a number the paper reports. "Interpretation" means the authors' own reading of it. Model versions are stated because older models may not generalise.

## Q1. In-the-wild studies: what context files contain, how big they are, how they change

### Takeaway
Three mining studies (Claude Code; Claude, Codex and Copilot; Cursor) agree on the content. Files are mostly functional guidance: build and run commands, implementation details, architecture. Security, performance and UI/UX appear rarely. Files are maintained like configuration code: 59–67% are modified more than once. None of these studies measures whether a file improves agent outcomes. I found no rigorous size distribution (lines or tokens) in the parts I could retrieve.

### Cited Findings
- **Chatlatanagulchai et al., "On the Use of Agentic Coding Manifests: An Empirical Study of Claude Code", arXiv 2509.14744 (Sep 2025) [preprint].**
  - Sample: 253 Claude.md files from 242 GitHub repositories. Initial search found 838 files in 806 repos, created between 2025-02-24 and 2025-06-16. Repos were kept only with at least 20 commits after the file was added.
  - Measured structure: median headers per file are H1 = 1, H2 = 5, H3 = 9. Deep nesting is rare.
  - Measured content (share of files): Build and Run 77.1%, Implementation Details 71.9%, Architecture 64.8%, Testing 60.5%, System Overview 48.2%, Development Process 37.2%, Config & Environment 26.5%, Maintenance 19.8%, AI Integration 15.4%, Docs & References 13.8%, Performance 12.7%, Project Management 11.1%, DevOps 9.5%, Security 8.7%, UI/UX 8.3%.
  - Method: LLM-suggested labels were refined manually to 15. Two inspectors labelled each file. 113 disagreements went to a third inspector.
  - Limitations: Claude Code only; descriptive, with no outcome measurement. The retrieved page gives no line-count statistics.
  - [arXiv HTML](https://arxiv.org/html/2509.14744v1)
- **Chatlatanagulchai, Li et al., "Agent READMEs: An Empirical Study of Context Files for Agentic Coding", arXiv 2511.12884 (Nov 2025) [preprint].**
  - Sample: 2,303 agent context files from 1,925 repositories, covering Claude Code, OpenAI Codex and GitHub Copilot.
  - Measured maintenance: 59–67% of files undergo multiple modifications.
  - Measured content: build/run commands 62.3%, implementation details 69.9%, architecture 67.7%, security 14.5%, performance 14.5%.
  - Interpretation (authors): the files are complex, hard to read, and evolve like configuration code.
  - Numbers come from the search-result abstract summary; I did not verify them against the full text.
  - [arXiv](https://arxiv.org/html/2511.12884v1)
- **Jiang & Nam, "Beyond the Prompt: An Empirical Study of Cursor Rules", arXiv 2512.18925, MSR '26 [peer-reviewed per search listing; venue not verified on the paper page].**
  - Sample: 487 repositories with `.mdc` cursor rule files, found through Sourcegraph, with forks and archived repos excluded. 401 repos were analysed.
  - Output: a taxonomy of five high-level themes, including Conventions and Guidelines. Many rules overlap with traditional documentation.
  - A secondary summary (Moonlight) reports that 28.70% of lines are exact duplicates, that 24.69% of repos cover all five themes, and that developers copy rules from templates and dependency docs. I did **not** verify these figures against the paper.
  - [arXiv](https://arxiv.org/html/2512.18925); [secondary review](https://www.themoonlight.io/review/an-empirical-study-of-developer-provided-context-for-ai-coding-assistants-in-open-source-projects)
- **Related papers I found but did not read:**
  - "Decoding the Configuration of AI Coding Agents: Insights from Claude Code Projects", arXiv 2511.09268 [preprint] — [arXiv](https://arxiv.org/html/2511.09268v1)
  - "A Study of Cursorrules Files in GitHub Open Source Projects", arXiv 2608.10622 [preprint; methods not verified] — [arXiv](https://arxiv.org/pdf/2608.10622)

### Inferences
- Real-world files are written mostly as onboarding and documentation (overview, architecture). Q2 below finds that repository overviews do not help agents find files faster. The common content and the useful content may differ.

### Gaps
- I did not retrieve size distributions (lines or tokens) for in-the-wild files.
- I did not verify the cursor-rules duplication figures against the paper.

## Q2. Controlled evaluations: does a context file change task success, cost or tokens?

### Takeaway
The best controlled evidence (ETH/LogicStar, SWE-bench Lite plus a new benchmark, four agent/model pairs) finds no significant change in success:
- LLM-generated files: −0.5 pp on SWE-bench Lite and −2 pp on CTXbench.
- Developer-written files: +2.4 pp on CTXbench.
- Steps rise by 2.5–3.9 and cost by roughly 19–23%.

A smaller paired study on Codex/gpt-5.2-codex finds the opposite efficiency result: an AGENTS.md lowered median wall-clock time by 28.6% and median output tokens by 16.6%, with correctness not formally measured. A factorial study shows agents do follow the files: compliance with a marker instruction was 0% with no file and about 55–68% with one.

### Cited Findings
- **Gloaguen, Mündler-Sasahara, Müller, Raychev, Vechev (ETH Zurich / LogicStar.ai), "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?", arXiv 2602.11988 (v1 2026-02-12; v3 2026-09-29) [preprint].**
  - The arXiv page lists no venue. ICLR 2026 virtual-site pages exist for this title, which suggests a workshop appearance; I have not verified this.
  - **Setup:**
    - SWE-bench Lite: 300 tasks, 11 Python repos, no developer context files; LLM-generated files were added.
    - CTXbench: 138 instances from 12 repos that have developer-committed context files, built from 5,694 PRs.
    - Agents and models: Claude Code + Sonnet-4.5; Codex + GPT-5.2; Codex + GPT-5.1 mini; Qwen Code + Qwen3-30b-coder.
  - **Measured resolution change vs. no context file (none significant):**
    - LLM-generated: −0.5 pp on SWE-bench Lite (p = 0.87); −2 pp on CTXbench (p = 0.37).
    - Developer-written: +2.4 pp on CTXbench (p = 0.21).
    - Developer-written was about 7 pp better than LLM-generated on CTXbench, which *is* significant (p = 0.038).
  - **Measured cost:**
    - LLM-generated files add 2.45 steps on SWE-bench and 3.92 on CTXbench, with cost up about 20% and 23%.
    - Developer files add about 3.34 steps and up to 19% cost.
    - LLM-generated files raised GPT-5.2 reasoning tokens by about 22% on SWE-bench and 14% on CTXbench.
    - The abstract summarises this as inference cost up by "over 20%" on average.
  - **Measured behaviour:**
    - Agents follow the instructions. `uv` was used about 1.6 times per instance when the file mentioned it, versus under 0.01 when not. Repository-specific tools: about 2.5 times versus under 0.05.
    - Context files led to more tests run, more files searched and read, and more repo-specific tooling.
    - 8 of 12 developer files contain a codebase overview. Overviews did **not** reduce the steps needed to reach the files changed in the golden patch.
  - **Ablations:**
    - With all other documentation removed, LLM-generated files *improved* results by about 2.7 pp and beat developer files. In other words, they duplicate existing docs.
    - Removing the testing section cut cost on CTXbench (p = 0.023) with no accuracy change.
    - File length did not correlate with performance.
    - Stronger models did not write better files.
  - **Interpretation and recommendations (authors):**
    - Omit LLM-generated files for now.
    - Human files should contain only what is not already in the README, such as non-standard conventions and non-functional requirements.
    - "Unnecessary requirements make tasks harder."
    - Evaluate any file rigorously before adopting it.
  - **Limitations:** Python only; measures resolution only, not security or code quality.
  - [arXiv abs](https://arxiv.org/abs/2602.11988); [arXiv HTML](https://arxiv.org/html/2602.11988); [ICLR 2026 page](https://iclr.cc/virtual/2026/10018749)
- **Lulla, Mohsenimofidi, Galster, Zhang, Baltes, Treude, "On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents", arXiv 2601.20404 v2 (JAWs 2026 workshop) [peer-reviewed workshop per paper].**
  - **Setup:**
    - Agent and model: OpenAI Codex CLI with gpt-5.2-codex.
    - Sample: 10 repos, 124 merged PRs (at most 100 changed lines, at most 5 files, code-only).
    - Design: paired; same snapshot with and without the root AGENTS.md; fresh Docker per run.
  - **Measured results (with vs. without the file):**

    | Metric | Without | With | Change | Significant? |
    |---|---|---|---|---|
    | Wall-clock, median | 98.57 s | 70.34 s | −28.64% | Yes |
    | Wall-clock, mean | — | — | −20.27% | Yes |
    | Output tokens, median | 2,925 | 2,440 | −16.58% | Yes |
    | Output tokens, mean | — | — | −20.08% | Yes |
    | Input tokens, mean | — | — | −9.73% | No |
    | Input tokens, median | — | — | +3.41% | No |
    | Total tokens, median | — | — | +1.29% | No |

    Significance is a Wilcoxon signed-rank test at p < 0.05.
  - Task success was **not** measured. The only check was a manual review of 50 outputs for non-trivial changes.
  - **Limitations (authors):** one agent configuration; small PRs only; no correctness evaluation; causal mechanisms speculative; only presence vs. absence of the file was varied, not its content.
  - **Note:** this conflicts in direction with Gloaguen et al. on cost. The setups differ in agent, task type, success metric and file selection: Lulla et al. pre-filtered to repos whose files cover conventions, architecture and project description.
  - [arXiv HTML](https://arxiv.org/html/2601.20404)
- **McMillan, "Instruction Adherence in Coding Agent Configuration Files: A Factorial Study of Four File-Structure Variables", arXiv 2605.10039 (2026-05-11) [preprint].**
  - **Setup:**
    - Scale: 1,650 Claude Code CLI sessions and 16,050 function-level observations.
    - Codebases and tasks: two TypeScript codebases, five tasks.
    - Models: Sonnet 4.6 primary; Opus 4.6 cross-check; Opus 4.7 descriptive only, because of a CLI-version confound.
    - Target instruction: start every new or modified function with `// @tracked`.
  - **Measured compliance:**
    - With no config file: 0 of 524 functions (ICR 0.0%, Wilson upper bound 0.73%).
    - With the matched config: 67.7%. The gap is 67.7 pp.
    - Second codebase: 56.7% (0 of 338 without a file).
    - Opus 4.6 at the same config: 54.9%.
    - Per-task compliance ranged from 45.1% (T4, refactor of existing code) to 84.4% (T2).
  - Opus 4.7 returned a clarifying question instead of code in 38 of 150 trials. When it did produce code, compliance was about 81–82%.
  - [arXiv abs](https://arxiv.org/abs/2605.10039); full text read from the PDF

### Inferences
- The evidence supports "files are followed, and following them costs steps." It does not support "files raise success rates."
- The one measured success gain (+2.4 pp) is not statistically significant. The significant gap is between developer-written and LLM-generated files, not between a file and no file.
- The efficiency results conflict across studies and probably depend on file content and task type. No study varies content systematically.

### Gaps
- No controlled study of Copilot instructions or Cursor rules outcomes.
- No study outside Python and TypeScript.
- No study on long-horizon or multi-PR tasks.
- No vendor (Anthropic or OpenAI) published eval quantifying the effect of CLAUDE.md or AGENTS.md on success was found.
- No direct study of the Claude Code `/init` command specifically. Gloaguen's "LLM-generated" condition is the closest proxy.

## Q3. Instruction-following at scale: instruction count, position, context length

### Takeaway
Degradation with more simultaneous instructions is well replicated:
- IFScale (20 models, 10–500 keyword instructions): at 500 instructions, the best model was 68.9% (gemini-2.5-pro) and Claude Opus 4 was 44.6%. At 100 instructions, most frontier models stayed above 94%.
- ManyIFEval (1–10 instructions): performance declines consistently with count.

Long inputs degrade even simple tasks (Chroma, 18 models). The coding-agent factorial study found **no** detectable effect of file size between 25 and 500 lines, or of instruction position within the file. It did find compliance falling as a session goes on: odds of compliance drop 5.6% per generated function.

### Cited Findings
- **Jaroslawicz et al. (Distyl AI), "How Many Instructions Can LLMs Follow at Once?" (IFScale), arXiv 2507.11538 (Jul 2025); listed on the NeurIPS 2025 virtual site [likely peer-reviewed at a NeurIPS 2025 venue or workshop; exact track not verified].**
  - **Setup:** write a business report that includes N keywords, N = 10–500. 20 models via OpenRouter, reasoning effort "high" where available, 5 seeds.
  - **Measured accuracy at 10 / 100 / 250 / 500 instructions:**

    | Model | 10 | 100 | 250 | 500 |
    |---|---|---|---|---|
    | gemini-2.5-pro | 100% | 98.4% | 84.8% | 68.9% |
    | o3 (high) | 100% | 98.2% | 97.8% | 62.8% |
    | grok-3-beta | 100% | 98.8% | 86.2% | 61.9% |
    | claude-3.7-sonnet | 100% | 94.8% | 72.9% | 52.7% |
    | claude-opus-4 (reasoning) | 92.0% | 81.8% | 81.5% | 52.1% |
    | claude-opus-4 | 100% | 94.6% | 67.9% | 44.6% |
    | claude-sonnet-4 | 100% | 94.4% | 77.2% | 42.9% |

    At 500, llama-4-scout reached 6.7% and claude-3.5-haiku 8.5%.
  - **Measured degradation shapes:**
    - Threshold decay: gemini-2.5-pro, o3.
    - Linear decay: gpt-4.1, claude-3.7-sonnet.
    - Exponential decay to a 7–15% floor: claude-3.5-haiku, llama-4-scout.
  - **Measured position effect:** primacy bias, meaning later instructions are dropped more often. It peaks around 150–200 instructions and becomes uniform (ratio about 1.0–1.5) above 300.
  - **Measured error type:** at high density, omissions far outnumber modifications.
  - **Measured latency:** reasoning models slow sharply. o4-mini rose from 12.4 s to 436 s at 250 instructions.
  - **Limitations (authors):** only simple keyword-inclusion instructions; one task type; English only; coherence judged by an LLM. The instructions are not coding rules.
  - [arXiv HTML](https://arxiv.org/html/2507.11538v1); [NeurIPS page](https://neurips.cc/virtual/2025/122417)
- **Harada et al., "When Instructions Multiply: Measuring and Estimating LLM Capabilities of Multiple Instructions Following" (ManyIFEval), arXiv 2509.21051, Findings of EMNLP 2025 [peer-reviewed].**
  - Setup: 1–10 compatible instructions extending IFEval; ten LLMs, including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro and o3-mini.
  - Measured: performance consistently degrades as the instruction count rises. Reasoning models do better. A logistic regression on instruction count predicts multi-instruction performance with about 10% error.
  - This appears to be the published version of the earlier "Curse of Instructions" submission (not verified). A blog figure of "GPT-4o ~15% on all 10" is **unverified**.
  - Older models only.
  - [arXiv](https://arxiv.org/pdf/2509.21051); [ACL Anthology](https://preview.aclanthology.org/new-sigs/2025.findings-emnlp.896/)
- **Hong, Troynikov, Huber (Chroma), "Context Rot", 2025-07-14 [vendor research report, not peer-reviewed].**
  - Models: 18 — Claude Opus 4, Sonnet 4, Sonnet 3.7, Sonnet 3.5, Haiku 3.5; o3, GPT-4.1 / mini / nano, GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo; Gemini 2.5 Pro / Flash, 2.0 Flash; Qwen3-235B / 32B / 8B.
  - **Measured:**
    - Performance falls faster with input length when needle and question are less similar. Needle position had no notable effect.
    - One distractor hurts, and four hurt more.
    - Models did *better* on shuffled haystacks than on coherent ones.
    - LongMemEval (306 prompts): every model scored notably higher on focused prompts of about 300 tokens than on full prompts of about 113k tokens.
    - On a repeated-words copying task, performance declined with length up to 10k words.
  - **Limitations (authors):** simple synthetic tasks; length is not fully separated from difficulty; no mechanism identified; the similarity result rests on two haystack topics; LLM judge.
  - [Chroma research](https://www.trychroma.com/research/context-rot)
- **McMillan, arXiv 2605.10039 [preprint] — coding-agent-specific scale evidence:**
  - **Measured nulls:**
    - File size (25 / 100 / 250 / 500 lines), instruction position (top / 25% / centre / 75% / bottom), file architecture (single vs. multi-file), and a conflicting instruction in an adjacent AGENTS.md produced no detectable contrast after multiple-testing correction.
    - The size and conflict nulls have affirmative-null Bayes factors (BF10 0.05–0.10).
    - The position and architecture nulls are only failures to reject.
  - **Largest measured effect:** within a session, each additional generated function cut the odds of compliance by 5.6% (OR = 0.944, 95% CI 0.937–0.951). The decline is non-monotonic. It replicated on the second codebase and on Opus 4.6.
  - The author flags that this effect was found during analysis, not pre-registered, and needs replication.
  - **Limitations:** a trivial, syntactically detectable marker instruction, so absolute rates may not transfer to demanding rules; single-turn `--print` harness; Opus 4.7 confounded by CLI version.
  - [arXiv abs](https://arxiv.org/abs/2605.10039)
- **"Lost in the middle" (Liu et al., arXiv 2307.03172, TACL 2024) [peer-reviewed].**
  - Measured: a U-shaped accuracy curve. Performance is best when the relevant information is at the start or end of the context and worst in the middle.
  - Tested on 2023-era models (e.g. GPT-3.5-Turbo, Claude 1.3), so it may not generalise.
  - McMillan's own literature review also summarises this result.
  - I did not re-fetch the paper this session. [arXiv](https://arxiv.org/abs/2307.03172)

### Inferences
- The generic benchmarks (IFScale, ManyIFEval, Chroma) show degradation with instruction count and context length. The one coding-agent study testing file size from 25 to 500 lines found no effect on compliance with a single marker rule.
- These results are compatible: the coding study tested one target instruction among filler, not many competing rules.
- What does degrade measurably in agents is compliance over the course of a session.
- Position effects in agent config files are not established. IFScale shows primacy; McMillan finds no position effect; Chroma finds no needle-position effect.

### Gaps
- No study measures compliance with *many* real coding rules at once inside an agent harness.
- No IFScale-style data on 2026 frontier models (e.g. Opus 4.6+, GPT-5.x) were found.

## Q4. Emphasis / ALL-CAPS, negative instructions, over-specification

### Takeaway
I found no rigorous peer-reviewed study isolating the effect of ALL-CAPS or "IMPORTANT/MUST" emphasis, or negative ("don't") phrasing, on coding-agent compliance. The best evidence available:
- **Vendor guidance (not an eval):** Anthropic says newer Claude models over-trigger on aggressive language and recommends telling the model what to do rather than what not to do.
- **Measured (Gloaguen et al.):** unnecessary requirements raise cost without raising success.

### Cited Findings
- **Anthropic, "Prompting best practices" (platform.claude.com docs) [vendor guidance].**
  - The page states that Opus 4.5/4.6 are "more responsive to the system prompt" and that prompts designed to prevent under-triggering "might now overtrigger". The fix it gives is to soften aggressive language such as "CRITICAL: You MUST use this tool when...".
  - A section is headed "Tell Claude what to do instead of what not to do".
  - It recommends giving the motivation behind instructions.
  - It warns that guidance encouraging thoroughness or aggressive tool use may cause over-triggering on Claude 4.6 models.
  - These are vendor recommendations; no measured data is published on the page.
  - [Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- **Over-specification (measured), Gloaguen et al., arXiv 2602.11988 [preprint]:**
  - Context files increased tests run, exploration and cost with no success gain.
  - Removing the testing section cut cost (p = 0.023) with no accuracy change.
  - File length did not correlate with performance.
  - Interpretation (authors): files should hold only minimal requirements.
  - [arXiv HTML](https://arxiv.org/html/2602.11988)
- **Emphasis studies I found but did not read in full, none on coding agents:**
  - "Spotlight Your Instructions" (arXiv 2505.12025) [preprint] uses inference-time attention steering on marked spans. It reports improved adherence, but this is a model-side mechanism, not prompt wording. [arXiv](https://arxiv.org/abs/2505.12025v2)
  - arXiv 2406.16779 tests emphasis markers on reading comprehension, not instruction following. [arXiv](https://arxiv.org/pdf/2406.16779)
  - A SIGBOVIK 2025 "uppercase" paper exists; SIGBOVIK is a satirical venue and the paper is not reliable evidence. [PDF](https://serenacofano.github.io/files/uppercase.pdf)

### Inferences
- The only measured evidence relevant to over-specification points one way: extra content costs tokens and steps without improving success.
- Claims that ALL-CAPS or MUST improves compliance currently rest on practitioner anecdote. The vendor guidance suggests the reverse for recent Claude models.

### Gaps
- No controlled measurement of ALL-CAPS, emphasis or negative phrasing in agent instruction files.
- McMillan did not vary emphasis.

## Q5. Deterministic enforcement (hooks / CI / linters) vs. prompt rules

### Takeaway
I found no peer-reviewed or preprint study measuring compliance under hooks or linters versus prompt-only rules for coding agents. Indirect measured evidence shows prompt rules are probabilistic: McMillan measured 45–84% compliance with a trivial rule and a 5.6%-per-function decline in odds within a session. A deterministic gate is 100% by construction at the boundary it checks, but no study quantifies the comparison.

### Cited Findings
- **Prompt-rule compliance is incomplete and decays (measured), McMillan arXiv 2605.10039 [preprint]:**
  - 67.7% compliance (Sonnet 4.6) and 54.9% (Opus 4.6) on a trivial marker rule.
  - Per-task range 45.1–84.4%.
  - Within-session odds ratio of 0.944 per generated function.
  - [arXiv](https://arxiv.org/abs/2605.10039)
- **Practitioner claims (unverified):**
  - A blog states that prompts reach 70–90% compliance and hooks 100%, with no method given. [Dotzlaw](https://dotzlaw.com/insights/claude-hooks/)
  - agentpatterns.ai notes that hooks are deterministic only at the tool-call boundary and cites CVE-2025-59536 (malicious hooks firing on repo load), so hooks are also an attack surface. [agentpatterns.ai](https://agentpatterns.ai/instructions/hooks-vs-prompts/)

### Inferences
- Even trivial prompt rules were followed only 45–84% of the time in a controlled agent study. That supports moving checkable, non-negotiable rules into deterministic gates, but as an inference, not a measured head-to-head result.

### Gaps
- No measured head-to-head study of hooks, CI or linters versus prompt rules for agent compliance or outcomes.
- No measured study of the cost or friction of hook-based enforcement.
