# Lessons Learned

This file records patterns from mistakes and corrections. Claude reads this at the start of every session.

**Format for each entry:**

- **Mistake:** What went wrong
- **Why:** Root cause
- **Rule:** The principle that prevents recurrence

---

<!-- Add lessons below as they are captured. Most recent at the top. -->

## 2026-08-27 — A documented, already-corrected rule lost to a tool default; the "fix" that closed it never covered the path in use

- **Mistake:** Every commit across four branches carried an AI-attribution trailer — 22 commits. This is the **second occurrence of an identical failure**: the `2026-05-10` entry in this file records the same mistake, the correction, and the resulting rule. `.claude/rules/branching-rules.md:79` prohibits it explicitly and line 314 lists it under prohibited actions. That rules file had been read in the same session. Caught only in human review.
- **Why:** Two causes, and the second is the important one. (a) The assistant's own default behaviour adds the trailer, and that default won over a repository rule that had been read but not treated as overriding. (b) The enforcement recorded as *closing* the `2026-05-10` lesson — a `~/.gitmessage` template containing no attribution block — **does not apply to `git commit -m` or `-F`**, which bypass the template entirely. Every commit in this session used `-m` or `-F`. The lesson was marked closed by a control that never covered the path actually used.
- **Rule:** **A repository rule overrides a tool's default, always** — re-read the commit-identity section before the first commit of a session and check the message being written, because the commit template is not a control for non-interactive commits. **This lesson stays open until a `commit-msg` hook rejects attribution mechanically.** Note for whoever writes it: match the trailer form (`^Co-Authored-By:`, with the colon), not the bare phrase — prose discussing the rule can legitimately begin a wrapped line with those words, as this entry's own commit message did.
- **Wider point:** a lesson is not closed by a control that does not cover the path in use. When recording enforcement, name the paths it covers. This is backlog item 66's finding — prose is not enforcement — reached from a different direction.


## 2026-07-10 - npm silently strips `.gitignore` from tarballs; verify the packed artifact, not the source tree

- **Mistake:** Published `v0.8.6` where every generated project had **no `.gitignore`** — a fresh `ais create` produced a git-initialized project with nothing ignored, so a later `.env`, secret, or `node_modules` was immediately committable. For a scaffold whose pitch is safe AI-assisted delivery, it shipped projects that leak secrets on first commit. It passed source lint, CI, tests, and the pre-publish smoke — all of which run from the working tree where the file exists. This is the SECOND occurrence of the class (v0.8.3 shipped inert hooks because `.claude/settings.json` was stripped the same way). Caught only by `npm install @lajin.m/ai-scaffold@0.8.6` and generating a project.
- **Why:** `npm pack` hard-excludes any file literally named `.gitignore` (and `.npmignore`) from the tarball — it treats them as ignore-rule files, and the `package.json` `files` allowlist cannot override this. Every gate validated the working tree; none validated the packed artifact, so the whole "npm silently drops a shipped file" class was invisible.
- **Rule:** **Any file the package must ship whose name npm treats specially (`.gitignore`, `.npmignore`) must be renamed** — ship it as `gitignore` (no dot) and rename to `.gitignore` on copy (the Vite/CRA pattern). **Release gates must assert against the packed tarball or a fresh `npm install`, never the working tree.** For a distributed CLI, "it works / it's fixed" means *generated a project from the installed package and checked the output* — not from source. Enforced now by a smoke gate: the tarball must contain `templates/*/gitignore` and zero `.gitignore`.

## 2026-07-10 - "Released" means verified on npm, not merged to main; the tag push is the publish trigger

- **Mistake:** The `v0.8.7` release PR was squash-merged to `main` and reported "done" — but the `v0.8.7` tag was never created or pushed, so the trusted-publish workflow (which triggers only on a `v*` tag push) never ran. npm stayed at `0.8.6`. The gap sat unnoticed until state was re-checked against `npm view`. A human "done"/"merged" was accepted as the end state.
- **Why:** Merging the release PR to `main` and tagging/publishing are separate steps; the publish trigger is the **tag push**, not the merge. Readiness was inferred from the merge rather than verified against the registry.
- **Rule:** **A release is not shipped until `npm view <pkg> version` shows the new version (with provenance).** After merging the release PR to `main`, the explicit remaining steps are `git tag -a vX.Y.Z <main-release-commit> && git push origin vX.Y.Z`, then confirm the publish workflow succeeded and `npm view` reflects it. Treat every human "done"/"merged"/"published" as a claim to verify against the actual artifact — this session alone had three (tag unpushed, sync squashed, branch out-of-date) where reported state differed from real state.

## 2026-07-10 - A squashed main→dev sync does not restore ancestry; syncs must be merge commits

- **Mistake:** To fix post-release `main↔dev` divergence, a sync PR was merged with "Squash and merge." That minted a new SHA and did **not** create the two-parent link, so `main` still was not an ancestor of `dev`, `release:check` kept failing, and it took a second sync PR to fix — a wasted round-trip. The full v0.8.7 promotion needed four sync branches.
- **Why:** A squash merge copies content but discards the merge relationship; the sync's entire purpose is the ancestry link, which only a merge commit provides. Also, a naive sync merge conflicts on CHANGELOG/TODO because the merge-base is stale — but `dev` is always a content-superset of `main` right after a release, so `git merge -s ours origin/main` is conflict-free and correct (re-links ancestry, zero content change).
- **Rule:** **A `main→dev` sync must be merged with a merge commit, never squashed** — squashing re-breaks the exact ancestry it exists to restore. Use `git merge -s ours origin/main` for a conflict-free, ancestry-only sync. Now automated: `npm run sync:main-dev` + `.github/workflows/post-release-sync.yml` do it after every release with merge-commit auto-merge, so the manual dance is gone (full hands-off needs a `SYNC_PAT` secret because GITHUB_TOKEN-created PRs don't trigger CI).

## 2026-07-10 - Release-automation gotchas: stray tags break `--tags`, and gate allowlists drift from the docs

- **Mistake:** The sync script died under `set -e` because `git fetch --tags` was rejected by a divergent stray `v1.0` tag ("would clobber existing tag"). Separately, the pre-commit branch-name gate rejected `sync/*` branches even though `branching-rules.md` explicitly describes `sync/*` branches — forcing a rename to `chore/`.
- **Why:** (a) `git fetch --tags` fails wholesale on any single tag that would clobber, so one bad tag breaks the whole fetch; (b) the pre-commit allowed-prefix list (`feature|fix|chore|hotfix|release`) drifted out of sync with the branching-rules doc, which also lists `docs/*` and `sync/*`.
- **Rule:** **In automation, fetch branch refs explicitly (`git fetch origin main dev`), not `--tags`** — one divergent tag must not break the pipeline. **Delete stray/divergent tags promptly** — a divergent `v1.0` is a live landmine for every tag fetch. **Keep the pre-commit branch-name allowlist in lockstep with `branching-rules.md`**; when a doc names a branch class (`sync/*`, `docs/*`), the enforcing gate must accept it, or the two silently disagree.

## 2026-07-10 - Release branches are metadata-only; sync main into dev first

- **Mistake:** During the v0.8.6 promotion, the release branch was created from `dev` while `main` and `dev` had equivalent content through different merge histories. The PR to `main` became conflicted, and resolving it on the release branch created source-file conflict cleanup after the dev merge. That made the release branch behave like a development branch, which is not acceptable for a trusted publish path.
- **Why:** The process checked code quality but did not enforce the branch graph. Green tests, lint, typecheck, and smoke checks do not prove that `main` is an ancestor of the branch being promoted. When `main` is not contained in `dev`, GitHub may require conflict resolution even if the final file contents look equivalent.
- **Rule:** **Before any release or `dev` -> `main` promotion, verify `origin/main` is an ancestor of the candidate branch.** If it is not, stop the release, sync `main` into `dev` through a PR, rerun the full gate, then create a fresh promotion. Release branches are metadata-only: `package.json`, `package-lock.json`, `.ai-scaffold.json`, and `CHANGELOG.md`. Any source, template, docs, or test change must go through a feature PR into `dev` before release prep. Enforce with `npm run release:check`.

## 2026-07-10 - Release readiness requires mergeability checks, not just green tests

- **Mistake:** The v0.8.5 release PR had green CI and passed local smoke checks, but the PR itself was still conflicted against `main`. The release branch carried the right code, but `main` was not an ancestor of the release/dev history, so GitHub could not merge the PR cleanly. We treated "tests pass on the branch" as enough evidence for release readiness.
- **Why:** The guards validated code quality and package behavior, but they did not validate the promotion path. CI runs on the PR branch commit; it can be green even when GitHub reports `mergeable: CONFLICTING` or `mergeStateStatus: DIRTY`. The release workflow also allowed dev/main history to diverge, so later release branches had to reconcile version files, smoke tests, and package-lock changes during promotion.
- **Rule:** **Before any release PR is considered ready, verify both code and merge path.** Required local checks: `git status --short --branch`, no unmerged files, `git merge-base --is-ancestor origin/main HEAD`, `npm test`, `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`, and `npm_config_cache=/private/tmp/ais-npm-cache GOCACHE=/private/tmp/ais-go-cache bash scripts/pre-publish-smoke.sh`. Required GitHub checks: `gh pr view <id> --json mergeable,mergeStateStatus,reviewDecision,statusCheckRollup` must show a mergeable PR and successful checks. If a release PR is conflicted, close it or mark it superseded, merge `main` into the release branch deliberately, resolve conflicts with evidence, rerun the full gate, then open a clean replacement PR.

## 2026-06-25 - Exact-path match for fact-check gates; basename substring matching is a bypass

- **Mistake:** The Read-detection logic in `pre-write-fact-check.sh` matched `Read` tool_use blocks by `endswith(basename)` / `contains("/" + basename)` instead of comparing the canonicalized absolute path of the target file. The same class of bug was in Cited detection (`grep -qF -- "${FILE_BASENAME}:"`). The reviewer reproduced the bypass with a controlled transcript: target `src/a/foo.ts`, citation `src/a/foo.ts:9`, and a `Read` of `src/b/foo.ts` — STRICT mode exited 0 instead of blocking. In any real repo with duplicate filenames (which is most of them), the hook was effectively a no-op. The bypass was not a corner case; it was the normal case the hook was supposed to enforce.
- **Why:** Basename matching was a "be lenient with how the agent typed the path" instinct — the same instinct that produces fallback paths, backward-compat shims, and string-substring shortcuts. For a fact-check gate, lenience is the bypass. If a `Read` was for `src/b/foo.ts`, it does NOT mean the agent has seen the contents of `src/a/foo.ts`, regardless of how similar the names are. Substring matching collapses "did the agent read this file" into "did the agent read some file with the same leaf name" — which is the opposite of the rule H1 (verify before claim) is enforcing. Cited detection had the same defect: a citation of `src/b/foo.ts:N` would have satisfied the gate for editing `src/a/foo.ts`, because the basename `foo.ts` matched regardless of directory.
- **Rule:** **Enforcement hooks compare canonicalized absolute paths exactly. No basename, no substring, no `endswith`, no `contains`.** The two paths to compare are: (1) the agent's payload `file_path` canonicalized via `os.path.abspath` (or equivalent) against the hook's `$PWD`, and (2) the transcript's stored `input.file_path` (which is always absolute for `Read` blocks, empirically verified across 6 Read blocks in 3 transcripts). For Cited detection, agents cite in two forms — absolute path AND relative-to-cwd — so the hook must check both, but still as exact strings (not as substrings). A "relative form" match against the canonicalized path with the `$PWD` prefix stripped is acceptable for the citation side because that's how agents write the citation in natural language. The fix in PR #13 follow-up: replaced both basename matches with `==` on the canonicalized path, dropped the regex-fallback Read path (same class of bypass), and added a `canon_path` helper that handles relative→absolute and `..` collapse without requiring the file to exist.

## 2026-06-25 - Don't keep a half-fixed fallback for the bug the fix was supposed to eliminate

- **Mistake:** The /review BLOCK on `pre-write-fact-check.sh` said "the hook re-enters the exact hand-rolled path reconstruction failure mode the review wanted eliminated." The first fix attempt kept the env-var reconstruction (`CLAUDE_SESSION_ID` + `CLAUDE_PROJECT_DIR` with hand-rolled directory encoding) as a "fallback" on the grounds that older harness versions might not provide `transcript_path` in the payload. The reviewer flagged this on the second pass: the fallback IS the original bug. By keeping it, I left the failure mode in the codebase under the guise of backward compatibility. The whole point of the fix was to make that reconstruction impossible — keeping it "just in case" reintroduces the class of failure the BLOCK was about.
- **Why:** Backward-compat fallbacks feel safe ("if the new way doesn't work, the old way still does") but they're how deprecated code paths outlive the deprecation. The previous attempt to fix the same hook (URL-encoding vs leading-dash) was itself a "fix" of the env-var reconstruction, and the hook still failed open silently. A fix that preserves the failure mode it was meant to remove is not a fix.
- **Rule:** **When a review BLOCK says "remove X", removing X includes removing X's fallback path.** If a fallback to the broken path is needed for older harness support, it should be a separate, more conservative mechanism (e.g. python3 with a different lookup rule) — not a thinly-veiled copy of the original broken code. Specifically for `pre-write-fact-check.sh`: the env-var reconstruction was the root cause of the no-op bug in PR #12; after the BLOCK, the hook must not reconstruct the transcript path from env vars under any branch. If a JSON parser (jq or python3) is not available, the hook fails open and emits a one-line warning to stderr explaining why enforcement is disabled in this session.

## 2026-06-20 - ponytail-mode is OFF by default; per-call intensity only; gates always win

- **Mistake:** A "lazy senior developer" ruleset was added to the scaffold. Without an explicit off-by-default and per-call scoping rule, the agent auto-applied the ladder and tried to skip Stage 1 (BRD), bypass tenant scoping, and stop at "one runnable check" instead of the test pyramid.
- **Why:** The plugin's default behavior is to activate at SessionStart and persist across the session. The reflex-driven mode (`/ponytail lite|full|ultra`) conflicts with the scaffold's stage-gated workflow, layered architecture, and DoD floor. Without an explicit subordination rule, the agent treats the ladder as a parallel enforcement system and the gates as advisory.
- **Rule:** **ponytail-mode is OFF by default in this scaffold.** Intensity is per-call via `/start-task --intensity lite|full|ultra` and never persists. The ladder never overrides the gates, DoD, layered architecture, security rules, or the test pyramid — it is a pressure layer _below_ them, not a parallel driver. See [`.claude/rules/ponytail-ladder.md`](../.claude/rules/ponytail-ladder.md) "What This Rule Does NOT Override" for the full list. Any review finding that says "this should have been caught by gates" while intensity was set should cite this lesson.

## 2026-05-10 - Phase estimation missing from project workflow

- **Mistake:** Phase-level work (Phase 0, Phase 1, etc.) was planned and documented without formal three-point estimates. The team discovered the gap late.
- **Why:** Phase-level work was treated as documentation/planning, not as a development deliverable requiring an estimate. The `/estimate` command existed for features but was never invoked for phases.
- **Rule:** **Every phase and epic requires a formal three-point estimate before work begins.** Invoke `/estimate` for Phase-level work the same as for feature-level work. The estimate must be reviewed by Tech Lead and signed off before Phase kickoff. This is enforced in `/what-next` Stage 2 (Plan) — Phase estimates are a required artifact. Phase-level work without an estimate is a hard gate in `/what-next` Phase-Level Pre-Check.

## 2026-05-10 - Co-Authored-By added to every commit

- **Mistake:** Every commit included `Co-Authored-By: Claude Opus 4.7`, adding an AI identity to the git history. User explicitly required all commits under the git owner's identity only.
- **Why:** AI default behavior includes Co-Authored-By without being prompted to omit it. The existing rules didn't explicitly prohibit it.
- **Rule:** **Never add Co-Authored-By or any AI identity attribution to commits.** All commits must use the human owner's identity only. The git global commit template (`~/.gitmessage`) now enforces this — it contains no Co-Authored-By block. If a template ever includes AI attribution, remove it immediately.

## 2026-05-10 - Plan-and-confirm gate skipped on multi-step task

- **Mistake:** Executed a 28-file, multi-agent, multi-day task without writing a plan first or getting explicit "go" approval. The work spanned multiple architectural layers, multiple agents, and weeks of content.
- **Why:** The task started as what felt like a small continuation but grew organically. No checkpoint was set to trigger the plan-and-confirm gate. The "I'll plan as I go" approach replaced the required written plan.
- **Rule:** **Plan-and-confirm is mandatory for any task with >3 logical steps, multi-file scope, or multi-layer impact.** Write the plan first, wait for explicit "go", then execute. Silence is not approval. CLAUDE.md now has an explicit plan-and-confirm gate in the "Claude Operating Instructions" section. If mid-task the scope grows beyond the original plan, stop and re-plan before continuing.

## 2026-05-10 - Lessons not recorded immediately after correction

- **Mistake:** User corrected the Co-Authored-By issue, but the lesson was not recorded to `tasks/lessons.md` after the correction. The lesson sat unwritten until a later session.
- **Why:** Lesson recording was treated as a future task ("I should add that to lessons") rather than an immediate action triggered by the correction itself.
- **Rule:** **Record lessons immediately when corrected — not at end of session.** The user correction is the trigger. Open `tasks/lessons.md` and write the entry before continuing any other work.

## 2026-05-10 - Per-ticket task tracking not followed

- **Mistake:** Used `TodoWrite` (session-local, ephemeral) for tracking a large multi-file task instead of creating `tasks/todo/<TICKET-ID>-<slug>.md` as required by CLAUDE.md's Working Agreement.
- **Why:** TodoWrite is fast and requires no file creation. Per-ticket files feel heavyweight. But TodoWrite results are session-local and invisible to future sessions or other AI instances.
- **Rule:** **Non-trivial work (anything spanning >1 session or multiple files) must use `tasks/todo/<TICKET-ID>-<slug>.md`.** TodoWrite is for in-conversation step tracking only. Per-ticket files are tracked, persistent, and survive session boundaries. Move completed files to `tasks/done/` on completion.

## 2026-05-08 - Shared mutable status files cause merge conflicts under parallel work

- **Mistake:** During the four-phase audit, three `chore/*` branches forked from `dev` independently. Each modified `tasks/todo.md` to mark its own phase done and the others pending. When merged sequentially, every merge hit a conflict on `tasks/todo.md` because each branch had its own snapshot of cross-phase status.
- **Why:** `tasks/todo.md` was a single tracked file that every parallel work stream needed to update with its own status. Adjacent edits on the same lines guaranteed conflicts. The conflict was structural, not accidental.
- **Rule:** **Never put cross-stream status tracking in a single tracked file.** Use one of:
  1. **Per-ticket files** — one markdown file per ticket under `tasks/todo/<ID>-<slug>.md`, archived to `tasks/done/` on completion. Status is implicit from folder location.
  2. **Append-only logs** — `CHANGELOG.md` (with `merge=union` driver in `.gitattributes`). Adds from parallel branches auto-combine.
  3. **External SoT** — Jira / Linear / GitHub Projects for status; the repo carries only the spec, not the status.

  AI working state (planning, scratch) goes in `.claude/work/` (gitignored). Project work goes in `tasks/todo/` + `tasks/done/`. Permanent record of what shipped goes in `CHANGELOG.md`. **None of these conflict on parallel work.**

## 2026-06-24 - Hooks with unverified assumptions look correct but are no-ops

- **Mistake:** Built three Claude Code hooks (pre-write-fact-check, post-write-console-warn, pre-bash-quality-gate) and only verified them with `/review` for syntax/correctness. The audit (`/ponytail-audit`) revealed the fact-check hook was a complete no-op because (a) the transcript path encoding was wrong (URL-encoding instead of Claude Code's leading-dash + slash-to-dash rule), and (b) the Read-detection regex required `Read` and `file_path` to appear in flat sequence when the actual JSON nests them under `content[].input.file_path`. The console-warn hook also had a bug: the early `exit 0` when `git diff` was empty ran BEFORE the untracked-file fallback, so freshly created untracked files were never scanned. Both hooks looked correct in code review and passed shellcheck. They were broken at the integration boundary.
- **Why:** Two assumptions were never verified against reality: (1) "the transcript lives at this path" was an educated guess about Claude Code's storage convention, and (2) "the Read tool_use JSON shape is `name + file_path`" was a guess about its wire format. Code review catches algorithmic bugs but not assumptions about external systems. The hooks never ran in a real session during development, so the wrong assumptions stayed hidden.
- **Rule:** **When a hook's behavior depends on an external system (filesystem layout, JSON shape, API contract), verify against a real instance of that system before claiming "done."** A hook that does nothing useful is worse than no hook at all — it provides false reassurance. Specifically for Claude Code hooks: (1) find an actual session transcript under `~/.claude/projects/` and confirm the directory-encoding rule by listing the directory, (2) grep a real transcript for the tool's JSON shape before writing the regex, (3) run the hook with a real session's `CLAUDE_SESSION_ID` / `CLAUDE_PROJECT_DIR` env vars and confirm the expected output appears. Add at least one positive-case test (cited-not-read → warns) and one negative-case test (Read happened → silent) to the hook's header comment so future maintainers can re-verify.

## 2026-06-24 - Audit-then-fix sequence caught defects that code review missed

- **Mistake:** The three hooks passed shellcheck, passed `/review` (no BLOCK findings), and looked correct. The defects only surfaced when `/ponytail-audit` was run _and the user agreed to fix the BLOCK finding first_ — at which point I had to actually run the hooks against real transcripts to verify the fix. That verification revealed the untracked-file bug in console-warn that wasn't even in the audit report.
- **Why:** `/review` checks the code-as-written for correctness against the rules; `/ponytail-audit` checks for over-engineering. Neither runs the artifact against a real environment. Both assume the code does what it says.
- **Rule:** **For Claude Code hooks (or any code that depends on external system state), the verification step is "run it against reality," not "review it for correctness."** A `/review` pass without an execution test is incomplete. When building hooks, the work isn't done until the hook has been invoked with a real session ID, a real `CLAUDE_PROJECT_DIR`, and a real transcript, and the output matches the documented behavi
  our for at least one positive case and one negative case.

## 2026-07-14 — Stacked PRs conflict under a squash-merge policy

- **Mistake:** To guarantee a correct CHANGELOG merge order, PR #86 was stacked
  on #85 (feature branch merged into feature branch) and #87 stacked on #86.
  The moment #85 **squash-merged** into `dev`, GitHub created a brand-new
  commit with #85's content — but #86 still carried #85's *original* commits.
  Same content, different history: the 3-way merge saw both sides editing the
  same files and flagged #86 and #87 as CONFLICTING, on a repo with a single
  developer and no parallel work.
- **Why:** Stacked PRs only work with merge-commit workflows. This repo's
  branching rules mandate **squash merges** into `dev` — squashing breaks the
  ancestry the stack depends on, every time, deterministically. The rules also
  already said "rebase from dev before opening or merging PRs"; stacking was a
  deviation from that.
- **Rule:** **Never stack feature branches in this repo.** One PR at a time:
  merge it, then rebase (or freshly cut) the next branch from updated `dev`.
  If work must land together to be correct (like the CHANGELOG union-merge
  ordering), put it in **one PR** instead of stacking. When a stack has already
  conflicted: don't resolve in-place — cut a fresh branch from `dev`, take the
  verified final tree, single commit, one PR.

## 2026-07-15 — Windows path separators broke generated-file lookups (all profiles)

- **Mistake:** `buildFilePlan` (file-plan.js) computed `relPath` via
  `path.relative()` and used it as an exact key in forward-slash object maps
  (`GENERATED_FILE_MAP`, `RENAME_ON_COPY`) and `.includes()` lists. On Windows
  `path.relative()` returns backslash paths, so every lookup missed —
  `.claude/MEMORY.md` and `.claude/settings-overrides.json` were never
  generated. Shipped in every release since the CLI existed; caught only when a
  team member ran the golang profile on Windows and `ais doctor` showed two
  HIGH failures.
- **Why it hid so long:** all tests and all dev machines are macOS/Linux, where
  `path.relative()` already returns forward slashes — the buggy code path is
  never exercised. A `toPosixPath()` helper already existed *for this exact
  reason* and was applied in the manifest and dry-run planners, but whoever
  wrote the core planning loop didn't apply it. Same-class bug, one file away
  from the existing fix, invisible to the whole test suite.
- **Rule:** **Any relative path derived from `path.relative`/`path.join` that is
  later compared against a string literal, used as an object key, or matched by
  a glob MUST be normalized to posix (`toPosixPath`) at the point of
  computation — not per-use.** For a cross-platform CLI, a regression test must
  simulate the other platform's separators (mock `path.relative` to emit `\`),
  because the native test runner will pass a Windows-only bug every time. If a
  posix-normalization helper already exists in the codebase, grep for every
  `path.relative(` / `path.join(` that feeds a comparison and confirm it's
  wrapped.

## 2026-07-16 — Smoke gate over-asserted; CI-only gitleaks exposed a latent bug (PR #98)

- **Mistake:** A new pre-publish smoke gate meant to verify "a generated Go
  project's pre-commit runs Go checks" asserted the *entire* hook exits 0. The
  hook also runs a gitleaks check whose `gitleaks detect --staged --exit-code`
  command is incompatible with the gitleaks version on the GitHub Actions
  runner — so in CI the hook exited 1 (gitleaks FAIL) and the gate failed,
  even though all three Go checks passed. Locally it was green because gitleaks
  isn't installed on the dev machine, so the check skipped.
- **Why:** Two compounding issues. (1) The gate coupled its assertion to
  unrelated checks (gitleaks, branch name) instead of asserting only the thing
  it tests. (2) Same environment-parity blind spot as the Windows bug (item
  60): a tool present in CI but absent locally makes a broken command read
  green on the dev machine. The gate's over-assertion is what *surfaced* the
  latent gitleaks bug — a happy accident, but the gate is still wrong.
- **Rule:** **A gate must assert exactly what it verifies, and nothing else.**
  Scope the assertion to the specific success signal (here: the `OK: Go build`
  / `OK: Go vet` / `OK: Go tests` lines), not a broad `exit 0` that depends on
  co-resident checks. Separately: **when a check shells out to a tool, that
  tool's presence and version differ between CI and dev machines** — a
  command that skips-when-absent locally can fail-when-present in CI. Verify
  tool-dependent commands against the version CI actually installs, and pin it.

## 2026-08-21 — A guardrail that is configured is not a guardrail that is active

- **Mistake:** Spent this session strengthening enforcement, then discovered the repo already had a ruleset named `protected-main` with `enforcement: active` and rules `deletion`, `non_fast_forward`, `pull_request` — whose `conditions.ref_name.include` was `[]`. An empty include list matches no branches, so the ruleset protected nothing while displaying as protected in the GitHub UI. Separately, both branches had `required_approving_review_count: 1` (correct) but `enforce_admins: false`, so every one of the ~15 PRs merged this session bypassed the review requirement via `gh pr merge --admin` — against `review-rules.md`'s explicit "no self-merge". A third instance: `tasks/lessons.md` has 20 entries and 0 tagged, so `/lessons --tag` has never matched anything since the feature was documented.
- **Why:** All three read as "configured" at a glance. Existence of a rule, a setting, or a documented flag was treated as evidence it was doing something. Nothing in the workflow asked "is this rule currently evaluated against anything, and against whom?" The UI actively encourages the mistake — an inert ruleset and a live one look identical in the branch-protection list.
- **Rule:** **Check a guardrail's effective state, not its existence.** For GitHub: `gh api repos/OWNER/REPO/rules/branches/BRANCH` returns the rules *actually evaluated* for that branch — an empty array means nothing is enforced regardless of what the rulesets page shows. Also read `enforce_admins`; with it false, every other setting is advisory for anyone with admin. Generalise: when a control has an audience or scope field (`include`, `enforce_admins`, `paths`, `tags`), verify that field is non-empty and covers the intended target before counting the control as real.

## 2026-08-21 — Verify doc references against the generated artifact, not the source tree

- **Mistake:** Twice in one session I shipped a documentation reference to a path that does not exist in the thing users receive. First: migrating skills from flat `.md` to `<name>/SKILL.md` broke a relative link (`ux-system/DESIGN_TOKENS.md` was correct when flat, wrong once nested) plus 30 other files still pointing at the old paths. Second, and worse because I introduced it while fixing governance: I wrote "Apply these server-side with `scripts/setup-branch-protection.sh`" into the shipped `branching-rules.md` — but `scripts/` is in `EXCLUDED_DEFAULT_PATTERNS`, so that script never reaches a generated project. Every user reading the rule would have run a command they do not have.
- **Why:** The reference was correct in the repo I was editing. I verified by looking at the working tree, where the file plainly exists. What ships is a filtered subset defined by `package.json` `files` plus `file-plan.js` exclusions, and neither is visible while editing a markdown file. The first instance was caught by the smoke doc-link gate; the second was not, because that gate checks links inside generated docs, not whether a referenced *script* is present.
- **Rule:** **After changing any doc that ships, generate a project and resolve every path it references there.** Concretely: `node bin/ai-scaffold.js create /tmp/x --profile node --yes`, then for each path mentioned in the changed doc, assert it exists in `/tmp/x`. Adding a new shipped file needs three edits, not one: the template file, `package.json` `files`, and — if it must land at a specific location — `CREATE_ROOT_FILES_BY_PROFILE` or the `.ai-scaffold/` namespace. Missing the second ships nothing; missing the third ships it into the tarball but never copies it into the project.

## 2026-08-21 — Presence assertions let two profiles ship broken for multiple releases

- **Mistake:** The laravel profile shipped no `composer.json` at all (missing from the npm `files` allowlist, which listed every other profile's manifest). Once that was fixed, three more defects surfaced behind it: the package name was a bare project name where composer requires `vendor/package`; a dependency was `nunomadado/termwind`, a typo for `nunomaduro` that has never existed on packagist; and `laravel/framework ^11.0` was blocked by 7 security advisories so composer refused to resolve. Separately, the python profile crashed on `pip install -e ".[dev]"` — the first command its own README tells you to run — because hatchling's default wheel file-selection requires an importable package directory and the starter is a flat `test_smoke.py`. All of this survived multiple releases with a 113-gate pre-publish smoke suite passing.
- **Why:** The gates asserted that files exist and that `doctor` reports healthy. None ran the project's own documented first command. "The file is present and well-formed" and "the workflow the README describes actually completes" are different claims, and only the second is what a new user experiences.
- **Rule:** **Every profile's golden path must be executed in CI or pre-publish, not asserted.** For each profile, generate a project and run the exact commands its README gives a new user — `pip install -e ".[dev]" && pytest`, `composer install && composer test`, `go build ./... && go test ./...`, `npm install && npm test` — and require exit 0. A gate that checks for a file cannot catch a typo'd dependency, a CVE-blocked version constraint, or a build-backend misconfiguration; running the command catches all three at once.

## 2026-08-21 — "Delete the dead code" is a claim that needs checking before it is a task

- **Mistake:** Planned to delete four command aliases (`ux-analyze`, `ux-flow`, `ux-figma-spec`, `ux-screen-spec`) that `ux-rules.md` itself labels legacy, treating it as safe cleanup. A reference check found them load-bearing: `ux-designer` and `ux-requirement-analyst` route users to `/ux-flow`, and `ux-flow-designer` routes to `/ux-analyze` and `/ux-screen-spec`, plus references in `.claude/roles/`, the role tutorial and `.claude/memory/`. Deleting first would have broken the UX workflow for anyone following an agent's own instructions.
- **Why:** "Marked legacy" was read as "unused". They are different properties: the alias files were the only reason the stale agent references still resolved, so the deprecation label described intent while the files were doing real work. The genuinely valuable finding was not the ~104 lines of dead weight but that three agents instruct users toward a superseded workflow — a correctness bug the cleanup framing had obscured.
- **Rule:** **Before deleting anything labelled dead, deprecated, or legacy, grep for inbound references and report the count before acting.** If references exist, the correct order is repoint-then-delete, never delete-first. When the plan turns out to be wrong, doing *less* than approved is always safe — deleting nothing and recording why is a valid outcome that needs no further approval, whereas deleting and repairing does.

## 2026-08-21 — Governance written for two audiences must name which one it governs

- **Mistake:** This repo's rules serve two distinct consumers — ai-scaffold's own development, and the projects it generates — and I designed enforcement without separating them. The result was a plan to require review on `main` for ai-scaffold, which would have protected nothing (19 of the last 20 PRs target `dev`; `main` only ever receives a bot fast-forward) while simultaneously breaking the release workflow, since blocking direct pushes also blocks the release identity. The requested "PR from dev to main" also appeared to contradict the fast-forward release design — a conflict that dissolved entirely once the audiences were separated, because a generated project ships no `.github/` and therefore has no release workflow to conflict with.
- **Why:** Root `.claude/rules/` and `templates/*/.claude/rules/` had drifted into near-identical copies, which made them look like one policy with redundant copies rather than two policies for two audiences. A byte-identity test over other shipped files reinforced the assumption that divergence is always drift.
- **Rule:** **Before changing a rule in a repo that both follows and distributes rules, state which audience it governs.** Ask: does this apply to this repository's own development, to generated projects, or both? Deliberate divergence between root and `templates/*` is legitimate and should be commented as such at the point of divergence. When a requirement seems to contradict an existing design, check whether the two apply to different audiences before treating it as a real conflict.

## 2026-08-21 — A release precondition I have to remember is one I will keep missing

- **Mistake:** The release workflow refused to run twice with `no entries under [Unreleased] — nothing to release`, once for v0.13.0 and again while preparing v0.14.0. `CLAUDE.md` requires each merging PR to add a CHANGELOG entry; across roughly fifteen PRs this session I added exactly zero until the gate stopped me, then repeated the same omission on the next batch.
- **Why:** The requirement lives only in prose that is read at session start and not at the moment of opening a PR. Nothing in the PR flow surfaces it — the pre-commit hook does not check it, CI does not check it, and the PR template does not ask for it. The release gate is the first point of contact, which is the latest possible moment and after the work is already merged.
- **Rule:** **Move a repeatedly-missed precondition from prose into the workflow that triggers it.** Either add a CHANGELOG checkbox to the PR template, or add a CI check on PRs targeting `dev` that fails when `CHANGELOG.md` is unchanged and the diff touches shipped code. Prose that has been ignored three times is not going to be followed the fourth time by trying harder; the fix is mechanical enforcement at the point of the action, which is the same instruction-versus-guardrail distinction this project already applies to its hooks.
