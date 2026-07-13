# AI Scaffold

Reusable AI engineering scaffold with CLI distribution.

`@lajin.m/ai-scaffold` packages this repository's AI operating system into a CLI (`ais`) that can create new projects, install scaffold-managed guidance into existing projects, track installed metadata, and run basic health checks.

This repository is the scaffold platform itself, not a generated application. Generated project documentation comes from profile templates during `create` or `init`; scaffold platform documentation lives separately in [README.scaffold.md](./README.scaffold.md).

## Why Use This

AI-assisted delivery gets messy when every assistant invents its own workflow. This scaffold gives a team one shared operating model:

- clear stage gates from analysis through deployment
- role-specific AI guidance for dev, QA, architecture, UX, and ownership work
- reusable commands for planning, review, QA, deployment checks, and lessons learned
- project memory files so AI assistants keep context between sessions
- guardrails for hallucination, verification, security, accessibility, and change control
- safe installation into existing repositories without taking over application source folders

AI coding tools are already good at producing more code. The harder problem is making that code trustworthy, reviewable, testable, and aligned with how your team actually ships software. AI Scaffold is built for that second problem.

It gives every AI assistant the same project constitution: what to read first, which rules win, which stage the work is in, what evidence is required, which reviewer lens to use, and when to stop and ask a human.

## The Problem It Solves

Without a scaffold, AI-assisted development usually breaks down in predictable ways:

| Problem | What happens without structure | What this scaffold adds |
|---|---|---|
| Context resets | Every session starts cold and repeats discovery | project memory, lessons, role tutorials, and stable source-of-truth files |
| Fast code, slow trust | AI generates output quickly, but review and validation become the bottleneck | `/review`, QA workflow, security checks, DoD, and verification gates |
| Inconsistent assistants | Claude, Codex, Cursor, and Copilot follow different assumptions | shared `AGENTS.md`, `CLAUDE.md`, rules, commands, and profile metadata |
| Hidden assumptions | Requirements, architecture, and UX gaps appear during implementation | analysis, BRD, estimate, architecture, UX, and kickoff gates |
| Unsafe repo adoption | A scaffold pollutes an existing application with generic folders | isolated init strategy and protected-file handling |
| Weak handoffs | Developers, QA, UX, and PMs each ask AI in different ways | role-specific commands, agents, tutorials, and expected outputs |
| Unclear accountability | AI output looks plausible but no one knows what was checked | BLOCK/WARN/NIT findings, evidence requirements, and human approval gates |

## Benefits

- **Faster onboarding:** new contributors and AI tools get the same rules, commands, role guides, and workflow from day one.
- **More useful AI output:** assistants receive project identity, stack, rules, memory, and task context before generating plans or code.
- **Better review quality:** `/review`, QA, security, frontend, backend, and architecture reviewers use one shared severity model.
- **Less context loss:** `.claude/MEMORY.md`, lessons, and project-context files give AI assistants a durable starting point.
- **Safer execution:** the scaffold separates requirements, architecture, UX, implementation, review, QA, and deployment.
- **Cleaner existing-repo adoption:** `init` is designed to protect application files and keep scaffold-owned material separate.
- **Repeatable delivery habits:** teams get a common language for BRDs, estimates, ADRs, API contracts, UX handoffs, QA, UAT, and deployment reviews.
- **Better human oversight:** the scaffold makes AI work reviewable by requiring plans, evidence, tests, and explicit approval points.
- **Profile-based setup:** start neutral with `generic`, use `node`/`js`, `python`/`py`, `golang`/`go`, or use the light `laravel` profile for PHP/Laravel teams.

## Who It Helps

| Role | How it helps |
|---|---|
| Developers | Start work with `/start-task`, follow coding/security rules, reuse lessons, and get a clear verification checklist before review |
| QA engineers | Generate test plans, trace requirements to scenarios, review coverage, and keep UAT/release evidence consistent |
| Architects / tech leads | Force architectural thinking before implementation, record ADRs, review API contracts, and check risk/invariants |
| UX designers | Convert requirements into UX analysis, design prompts, viewport/state checks, accessibility review, and dev handoff |
| PMs / owners | Use `/what-next`, BRDs, estimates, scope summaries, status updates, blockers, and release readiness views |
| Reviewers | Review against the same BLOCK/WARN/NIT model, manual checklist, security rules, and DoD expectations |
| New joiners | Learn how the team works by reading one operating manual instead of reverse-engineering habits from old PRs |
| Client-facing teams | Produce clearer scope, change-request, UAT, and release-note artifacts with less reinvention |

Role guide overview: [docs/ai-os/README.md](./docs/ai-os/README.md).

Tutorials:

- [Developer tutorial](./.claude/roles/tutorials/dev-role-tutorial.md)
- [QA tutorial](./.claude/roles/tutorials/qa-role-tutorial.md)
- [Architect tutorial](./.claude/roles/tutorials/architect-role-tutorial.md)
- [UX tutorial](./.claude/roles/tutorials/ux-role-tutorial.md)
- [Owner tutorial](./.claude/roles/tutorials/owner-role-tutorial.md)

## What It Is Not

- It is not a replacement for human product, architecture, security, or release approval.
- It is not a full application framework.
- It does not generate production business logic for you.
- It does not remove the need to configure real lint, typecheck, test, build, CI, secrets, or deployment commands.
- `update` is not a full managed-file migration system yet; that is planned for Phase 3.
- It is not a magic prompt collection; it is an operating system for disciplined AI-assisted delivery.
- It is not only for Claude. The root `AGENTS.md`, profile templates, and governance docs are intended to help Codex, Cursor, Copilot, and other coding assistants follow the same project rules.

## What To Expect

For a new project, `create` generates a clean starter root with the project README, AI entry files, runtime Claude files, and a small scaffold namespace containing `.ai-scaffold/README.md` and `.ai-scaffold/context.md`. It also initializes a git repository by default, creates an initial scaffold commit when git is available, and writes `.gitattributes` with union merge rules for append-only governance files. Use `--no-git` if you want to initialize git yourself.

For an existing project, `init` is designed to be safer and more isolated. Scaffold-owned context goes under `.ai-scaffold/`, while generated runtime files such as `.ai-scaffold.json`, `.claude/MEMORY.md`, and `.claude/settings-overrides.json` stay at their expected project paths. `init` avoids creating root application folders such as `docs/`, `apps/`, `packages/`, `infra/`, `scripts/`, or `tasks/`, and it no longer installs `.ai-scaffold/docs/`, `.ai-scaffold/tasks/`, or `.ai-scaffold/_ai/` by default.

## When This Is A Good Fit

Use this scaffold when:

- more than one person or AI assistant will touch the repo
- you want AI to help with planning, coding, review, QA, and release work
- your team needs consistent handoffs between PM, UX, architecture, dev, QA, and DevOps
- you have recurring issues with context loss, skipped tests, weak review notes, or unclear requirements
- you want AI-generated work to be easier to audit and challenge
- you are starting a Node.js/JavaScript project and want a day-one `node`/`js` profile
- you are adopting an existing repo and want AI governance without moving the application code

It may be too heavy if you are making a throwaway prototype, a one-file script, or a project where no staged workflow is needed.

## Common Use Cases

```bash
# Start a new AI-governed JavaScript project
npx @lajin.m/ai-scaffold create my-node-app --profile js

# Add AI delivery governance to an existing repository
npx @lajin.m/ai-scaffold init --profile node --dry-run
npx @lajin.m/ai-scaffold init --profile node

# Let QA create a traceable test plan
/qa-plan

# Ask for a release readiness view
/what-next

# Run AI review before human PR review
/review
```

## Research Context

AI-assisted development is shifting engineering effort from pure code creation toward supervision, verification, and correction. Recent industry reporting notes that organizations are adopting AI coding tools faster than their governance practices, making review, validation, traceability, and accountability the real bottlenecks. Research on human-in-the-loop software agents also shows productivity benefits when engineers can guide plans and code, while code quality still needs disciplined review and testing.

This scaffold is designed around that reality: use AI for leverage, but make the work inspectable, staged, and governed.

The hallucination guard posture is also conceptually influenced by Andrej Karpathy's public writing on LLM hallucinations and his later "vibe coding" framing, used here as a cautionary contrast: this scaffold is for supervised, inspected, evidence-backed AI-assisted engineering, not accepting generated output on vibes.

Sources:

- [Andrej Karpathy, The Unreasonable Effectiveness of Recurrent Neural Networks](https://karpathy.github.io/2015/05/21/rnn-effectiveness/)
- [Human-In-the-Loop Software Development Agents](https://arxiv.org/abs/2411.12924)
- [The Impact of AI Coding Assistants on Software Engineering](https://arxiv.org/abs/2605.23135)
- [GitLab study coverage on AI code governance bottlenecks](https://www.techradar.com/pro/speed-without-control-is-a-liability-not-an-advantage-gitlab-study-reveals-ai-code-generation-is-outpacing-controls)

## Governance In Place

The scaffold includes:

- **10-stage delivery workflow:** analysis, plan, architecture, UX, execution, AI review, manual review, QA, CI/CD, deploy
- **Fast lanes:** smaller paths for bug fixes, hotfixes, spikes, micro-changes, and internal tooling
- **AI role routing:** `dev`, `qa`, `architect`, `ux`, and `owner`
- **Hard gates:** no implementation before approved specs; no review without verification; no deploy without release checks
- **Security and compliance rules:** no secrets, input validation, data-access review, and compliance prompts
- **UX rules:** state coverage, accessibility, responsive checks, and handoff gates
- **Lessons loop:** mistakes and project preferences are recorded so future AI sessions improve

Full operating guide: [HOW-TO-USE.md](./HOW-TO-USE.md).

## How It Works

AI Scaffold works best when the project has a clear BRD or FRD and each task
points back to it. The scaffold does not make vague requirements safe; it makes
good requirements easier to execute, review, test, and hand off.

When you run `/start-task`, the command reads the linked spec, project memory,
rules, lessons, and role guidance before it proposes a plan. After one explicit
approval, implementation runs inside that approved scope. Hooks guard dangerous
tool use, verification proves the result, and `/review` gives the work a second
AI review before human PR review.

![AI Scaffold flow — spec and context inputs (BRD / FRD / ticket spec, .ai-scaffold/context.md, .claude/MEMORY.md + tasks/lessons.md, .claude/rules, .claude/roles + agents + skills) feed /start-task; it produces a plan, files, and verification; after one human "go", AI implementation runs under runtime guards (settings.json-wired hooks: secret/path guard, dangerous-bash guard, governance-file guard); then verify (lint / typecheck / tests / AC checks), /review by backend + frontend + security + QA + architecture, and finally human PR review / merge decision](docs/assets/ai-scaffold-flow.png)

## Requirements First

The most important setup step is linking the project to its requirements source.
Use an existing BRD/FRD when you have one:

```bash
npx @lajin.m/ai-scaffold init \
  --profile node \
  --requirements-source existing-docs \
  --requirements-path docs/requirements/frd.md
```

If the project does not have requirements yet, choose `create-later` during setup
and create the document before serious feature work:

```text
1. Run `ais doctor` to confirm the scaffold is healthy.
2. Create or link the BRD/FRD.
3. Break the BRD/FRD into task IDs and acceptance criteria.
4. Start each task with `/start-task --spec <requirements-or-task-path>`.
5. Approve the plan once.
6. Let the AI implement only the approved scope.
7. Run `/review`, then QA and human PR review.
```

After initialization, update project context manually here when reality changes:

| File | What to update |
|---|---|
| `.ai-scaffold.json` | Install metadata and requirements source/path; do not hand-edit version or managed-file hashes unless recovering from a known migration issue |
| `.ai-scaffold/context.md` | Human-readable project setup summary and requirements link |
| `.claude/settings-overrides.json` | Project identity, stack, lifecycle, compliance, and verification commands |
| `.claude/MEMORY.md` | Long-lived project memory, requirements notes, safety policy, team context |
| `CLAUDE.md` | Main AI operating guide for the project |
| `AGENTS.md` | Short cross-agent guide for Codex, Cursor, Copilot, and other assistants |
| `tasks/lessons.md` | Recurring mistakes, decisions, and patterns learned over time |
| `CHANGELOG.md` | Shipped changes and release notes |

Run `ais doctor` after manual changes. `doctor` is the scaffold health check: it
validates the manifest, required files, project memory, settings overrides,
managed files, meaningful setup values, wired hooks, verification commands, and
git presence.

## Supported Profiles

| Profile | Status | Notes |
|---|---|---|
| `generic` | Supported | Default scaffold profile |
| `node` | Supported | Day-one Node.js/JavaScript profile |
| `js`, `javascript`, `nodejs` | Aliases | Resolve to `node` |
| `laravel` | Light profile | PHP/Laravel defaults; still intentionally lightweight |
| `python` | Supported | Ships `pyproject.toml`; pytest/ruff/mypy defaults |
| `golang` | Supported | Ships `go.mod`; go test/vet/build defaults |
| `py`, `python3` | Aliases | Resolve to `python` |
| `go` | Alias | Resolves to `golang` |

Each profile also seeds install, dev/serve, and migration command defaults (for
example `pip install -e ".[dev]"` for `python`, `composer install` +
`php artisan serve` for `laravel`) so a generated project's `README.md` shows
runnable commands instead of `N/A`. These are profile defaults and interactive
prompt values, not `create`/`init` flags — see the per-profile table in
[HOW-TO-USE.md](HOW-TO-USE.md).

Additional profiles such as Next.js, Java, .NET, and Flutter are planned after the CLI fundamentals are stable.

## The Core 6 — Start Here

You do not need all 35 commands on day one. Start with these six; everything else is
opt-in as the work calls for it. Run `ais list` in a scaffolded project to see the full set.

| Command | Use it to |
|---|---|
| `/what-next` | Get the exact next action for the current project state |
| `/start-task` | Plan → confirm → implement → verify a change |
| `/review` | Run the parallel AI review before a PR |
| `/debug-fix` | Root-cause a bug before touching code |
| `/commit-changes` | Commit with the project's git rules enforced |
| `/lessons` | Recall past root causes so mistakes do not repeat |

## Install And Use

You can run AI Scaffold directly with `npx`, or install it globally and use the shorter `ais` command.

Use `npx` when you do not want a global install:

```bash
npx @lajin.m/ai-scaffold my-project
npx @lajin.m/ai-scaffold create my-project
npx @lajin.m/ai-scaffold create my-node-app --profile node
npx @lajin.m/ai-scaffold create my-js-app --profile js
```

Install globally when you want the `ais` command available everywhere:

```bash
npm install -g @lajin.m/ai-scaffold
ais --help
```

### Create A New Project

Use `create` when AI Scaffold should make a new project directory. A bare project name is treated as `create`.

```bash
npx @lajin.m/ai-scaffold my-project
npx @lajin.m/ai-scaffold create my-project
npx @lajin.m/ai-scaffold create my-node-app --profile node
npx @lajin.m/ai-scaffold create my-laravel-app --profile laravel
npx @lajin.m/ai-scaffold create my-project --no-git
```

After global install:

```bash
ais create my-project --profile node
ais create my-project --profile node --no-git
```

By default, `create` runs `git init`, stages the generated starter files, and creates an initial scaffold commit. It does not do this for `--dry-run`, and `--no-git` disables it.

### Install Into An Existing Repository

Use `init` from the root of an existing repository when you want AI governance, rules, hooks, project memory, and role guides without moving application code. `init` keeps scaffold-owned setup context under `.ai-scaffold/` and protects existing app files such as `README.md`, `package.json`, `.env`, and workflow files.

```bash
npx @lajin.m/ai-scaffold init
npx @lajin.m/ai-scaffold .
npx @lajin.m/ai-scaffold init --profile node
npx @lajin.m/ai-scaffold init --profile javascript
npx @lajin.m/ai-scaffold init --profile laravel
```

After global install:

```bash
ais init --profile node
ais . --profile node
```

### Choose A Profile

Profiles tune generated defaults and stack guidance.

| Profile | Use case |
|---|---|
| `generic` | Default profile for mixed or undecided stacks |
| `node` | Node.js/JavaScript projects |
| `js`, `javascript`, `nodejs` | Aliases for `node` |
| `laravel` | PHP/Laravel projects |
| `python` | Python projects with pytest/ruff/mypy defaults |
| `py`, `python3` | Aliases for `python` |
| `golang` | Go projects with go test/vet/build defaults |
| `go` | Alias for `golang` |

### Preview Before Writing

Use `--dry-run` first on important existing repositories. It prints the file plan without changing files.

```bash
npx @lajin.m/ai-scaffold init --profile node --dry-run
npx @lajin.m/ai-scaffold . --profile node --dry-run
ais init --profile node --dry-run
```

Use `--dry-run --json` when you want a machine-readable plan for review gates,
automation, or change approval.

```bash
ais init --profile node --dry-run --json
ais create my-project --profile python --dry-run --json
```

### Non-Interactive Install

Use `--yes` for CI, scripts, or fast local setup. When values are not provided, conservative defaults are used and recorded in `.ai-scaffold.json`.

```bash
npx @lajin.m/ai-scaffold create my-project --yes
npx @lajin.m/ai-scaffold init --profile node --yes
ais init --profile node --yes
```

### Pass Explicit Project Context

Use explicit flags when adopting an existing repo so project memory and generated settings start with useful context.

```bash
npx @lajin.m/ai-scaffold init \
  --profile node \
  --project-name acme-api \
  --display-name "Acme API" \
  --purpose "Internal API for Acme operations" \
  --project-type api \
  --owner-email team@example.com \
  --backend-stack "Node.js" \
  --frontend-stack none \
  --database "PostgreSQL" \
  --data-sensitivity internal \
  --requirements-source existing-docs \
  --requirements-path docs/requirements/brd.md \
  --compliance GDPR,SOC2 \
  --test-command "npm test" \
  --lint-command "npm run lint" \
  --typecheck-command "npm run typecheck" \
  --build-command "npm run build"
```

### Check An Installed Scaffold

Use `status` for a quick summary of installed version, profile, managed-file count, and modified or missing managed files.

```bash
npx @lajin.m/ai-scaffold status
npx @lajin.m/ai-scaffold status ./my-project
ais status
ais status ./my-project
```

Use `doctor` for deeper health checks: manifest validity, required files, project memory, settings overrides, managed-file integrity, and git presence.

```bash
npx @lajin.m/ai-scaffold doctor
npx @lajin.m/ai-scaffold doctor --json
ais doctor
ais doctor ./my-project --json
```

### Update An Installed Scaffold

`update` exists in this MVP as a safe placeholder. Full managed-file migrations are planned for Phase 3. It reports installed metadata but does not mutate `.ai-scaffold.json` or apply file updates.

```bash
npx @lajin.m/ai-scaffold update --dry-run
npx @lajin.m/ai-scaffold update --target-version <version>
ais update --dry-run
ais update --target-version <version>
```

Full safe file updates, diffs, and version-pinned migrations are planned for Phase 3. Until then, `update` exits without changing files when an actual version change would be required.

### Before You Reinstall

Until managed-file migrations ship (see above), the safe way to move an existing project onto a newer scaffold version is: **back up context, delete, `create` again.** Reinstalling **does not** preserve any project state — it generates a fresh project from the template.

**Back up first, always.** Two files accumulate real, non-regenerable project value and are lost on a plain delete-and-recreate:

- `tasks/lessons.md` — recurring mistakes and decisions learned on this project
- `.claude/MEMORY.md` — long-lived project memory

Also worth preserving: `.ai-scaffold/context.md` (setup context), `.claude/settings-overrides.json` and any hand-edited files under `.claude/rules/` (project-specific customizations).

Run this first:

```bash
npx @lajin.m/ai-scaffold export-context ./my-project
```

It copies those paths to `~/.ai-scaffold-backups/<project>-<timestamp>/` — **outside** the project directory, so the backup survives even if you delete the whole project folder next. Use `--out <path>` to choose a different destination. After reinstalling, manually copy the files you need back from the backup into the new project.

### Command Reference

| Command | Use when | Example |
|---|---|---|
| `create <dir>` | Start a new project from a profile template; initializes git unless `--no-git` is used | `npx @lajin.m/ai-scaffold create my-app --profile node` |
| `<dir>` | Short form for `create <dir>` | `npx @lajin.m/ai-scaffold my-app` |
| `init [dir]` | Add AI Scaffold to an existing repository | `npx @lajin.m/ai-scaffold init --profile node --dry-run` |
| `.` | Short form for `init` in the current directory | `npx @lajin.m/ai-scaffold . --profile node` |
| `status [dir]` | Show installed profile, version, and managed-file status | `npx @lajin.m/ai-scaffold status` |
| `export-context [dir]` | Back up memory/lessons/settings before deleting and reinstalling | `npx @lajin.m/ai-scaffold export-context ./my-app` |
| `doctor [dir]` | Diagnose missing, changed, or invalid scaffold files | `npx @lajin.m/ai-scaffold doctor --json` |
| `update [dir]` | Update scaffold metadata in this MVP; full migrations are later | `npx @lajin.m/ai-scaffold update --dry-run` |

## Local Development

Run the CLI locally from this repository:

```bash
node bin/ai-scaffold.js create /private/tmp/my-project --profile node --yes
node bin/ai-scaffold.js init /private/tmp/existing-project --profile javascript --yes --dry-run
node bin/ai-scaffold.js status /private/tmp/my-project
node bin/ai-scaffold.js doctor /private/tmp/my-project
```

Run checks:

```bash
npm test
npm run test:unit
npm run test:e2e
npm run typecheck
bash scripts/pre-publish-smoke.sh
```

## Repository Map

| Path | Purpose |
|---|---|
| `bin/ai-scaffold.js` | CLI entry point |
| `src/cli/commands/` | Command handlers |
| `src/cli/core/` | Shared CLI file planning, copying, prompt, path, and version logic |
| `templates/generic/` | Generic profile source |
| `templates/laravel/` | Laravel profile source |
| `templates/node/` | Node.js/JavaScript profile source |
| `templates/python/` | Python profile source |
| `templates/golang/` | Go profile source |
| `docs/ai-os/` | Human guide for AI roles |
| `docs/cli/` | CLI behavior specs |
| `docs/process/` | Scaffold planning and process records |
| `docs/compliance/third-party-attributions.md` | Third-party sources, licenses, and attribution register |

## Generated Project Documentation

The scaffold keeps platform documentation separate from generated project documentation:

- Platform docs: `README.md` and [README.scaffold.md](./README.scaffold.md)
- Generated project README source: `templates/<profile>/README.template.md`
- Generated output path: `README.md` in the target project

This split prevents project template placeholders from appearing in the scaffold platform README.

## License And Attribution

This repository is released under the AI Scaffold Community License, with copyright retained by Lajin M J. It is free for personal, educational, internal, and non-commercial use, including forks and pull requests. Selling, sublicensing, paid redistribution, or commercializing the scaffold itself requires prior written permission. See [LICENSE](./LICENSE).

Third-party packages and adapted source material retain their original licenses. See [docs/compliance/third-party-attributions.md](./docs/compliance/third-party-attributions.md).
