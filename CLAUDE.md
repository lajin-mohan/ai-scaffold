# CLAUDE.md — AI Scaffold (the tool)

**You are working on AI Scaffold itself, not on a project built with it.**

This repository *is* the product. The governance under `templates/` is a
deliverable that ships to adopting projects; it does not govern work here. If you
find yourself about to run a BRD → architecture → UX → code workflow to change a
Markdown rule file, you have read the wrong file set.

| | |
|---|---|
| **Product** | `@lajin.m/ai-scaffold` — reusable AI engineering scaffold, distributed as an npm CLI |
| **Owner** | Lajin M J — lajinmj@gmail.com |
| **Deliverable** | A CLI (`bin/`, `src/cli/`) plus 5 profile templates (`templates/`) |
| **Consumers** | Teams running `ais create` / `ais init` in their own repos |

---

## How this repository is governed

**AI Scaffold is a project with its own governance.** It is governed by
*scaffold-maintainer* rules — the ones below and in `.claude/rules/` — **not** by
the generated-project governance it ships under `templates/`. Those are a
deliverable, not rules for this repo.

Concretely, that means:

- **Not bootstrapped.** There is nothing here to fill in; `/bootstrap` is what an
  adopting project runs. A `{{PLACEHOLDER}}` in a root file is a defect (item 76),
  never a value to guess.
- **Not a SaaS application.** `apps/` and `packages/` hold a small layered
  reference example that ships as documentation. The source is `src/cli/`.
- **No 10-stage product workflow** for maintainer work. Sizing and fast lanes
  still apply — see `docs/process/task-size-policy.md`.

### Maintainer operating contract

These bind here regardless of what the shipped templates say:

| | |
|---|---|
| **Commit identity** | All commits use the human owner's identity **only**. Never add `Co-Authored-By`, AI attribution, or any third-party identity. `branching-rules.md:79` and the `2026-05-10` lesson. If a commit carries one, rewrite it before push. |
| **Plan and confirm** | State the plan and get agreement before multi-step or destructive work. |
| **Verify before claiming done** | "Done" means checked against the artifact — the packed tarball, the registry, a generated project — not against the working tree or a green local run. |
| **Task tracking** | One file per active ticket in `tasks/todo/`, moved to `tasks/done/` when complete. `CHANGELOG.md` is the permanent record. |
| **Lessons** | When a correction reveals a repeatable failure, record it in `tasks/lessons.md` **in the same session**, not later. |
| **Destructive actions** | No force-push to `dev`/`main`, no history rewrite on pushed branches, no deletion outside an explicit request. |

**Root `.claude/rules/` remains binding** — `branching-rules`, `ai-coding-rules`,
`coding-standards`, `review-rules`, `testing-rules`, `security-rules`,
`token-usage-rules`, `governance`. Where a root rule presumes a generated project
(UX gates, API standards, compliance scope), it does not apply here; **which
rules those are has not yet been settled — that is open work in item 76.** Until
it is, prefer asking over assuming a rule is inapplicable.

---

## Repository map

```
bin/ai-scaffold.js      CLI entry point
src/cli/commands/       create, init, update, status, doctor, list, export-context
src/cli/core/           copy, file-plan, prompts, manifest, content-templates, …
templates/<profile>/    what ships to a generated project — 5 profiles, kept identical
scripts/                maintainer tooling: pre-publish-smoke, token-report, release checks
docs/                   architecture, process, estimates, brd, setup
tasks/                  todo/ (per-ticket), done/, lessons.md
.claude/                governance for THIS repo — see the note below
```

**`.claude/` at root is the scaffold's own.** `templates/*/.claude/` is what
ships. They are currently near-identical copies, which is the confusion item 76
exists to remove. When you edit governance, know which one you are in.

---

## How work actually happens here

```bash
npm test              # vitest, full suite
npm run test:unit     # src/ only
npm run test:e2e      # tests/ only
npm run lint          # eslint
npm run typecheck     # JS syntax + gitleaks config validation
npm run release:check # release readiness
npm run token-report  # governance corpus size (T0 baseline)
```

Branches: `feature/*`, `fix/*`, `chore/*`, `docs/*` from `dev` → squash PR to
`dev`. Conventional Commits.

**There is no promotion PR from `dev` to `main`.** Releases go through the
one-button **Release** Action, which stamps the version and CHANGELOG on `dev`,
**fast-forwards `main` to that exact commit**, then tags — and the tag push
triggers publish. No release branch, no promotion PR, no sync PR. Fast-forward is
what keeps `main` a true ancestor of `dev`, so there is nothing to sync back.
Full contract: `docs/setup/release-flow.md`.

Cutting a release by hand from a `release/*` branch is how v0.12.0 sat untagged
and unpublished for 9 days.

---

## The five rules that matter in this repo

These are not general good practice. Each one is here because it already went
wrong. Full detail in `tasks/lessons.md`.

1. **Verify the packed artifact, never the working tree.** `npm pack` silently
   excludes any file literally named `.gitignore`. v0.8.6 shipped projects with
   no `.gitignore`; v0.8.3 shipped inert hooks the same way. Both passed lint,
   CI, tests and smoke — all of which read the working tree. "It works" means you
   generated a project from the packed tarball and looked at the output.

2. **A release is not shipped until `npm view` shows it.** The publish trigger is
   the **tag push**, not the merge to `main`. Treat every "done" / "merged" /
   "published" as a claim to verify against the registry.

3. **Shared changes go to every affected profile; stack-specific changes stay
   scoped.** Governance and common template assets are byte-identical across the
   five profiles — a shared change landed in one is a latent bug in four (90.3%
   of `templates/` commits touch 2+ copies; 51.6% touch all five). But the
   profiles **intentionally differ**: Python has `pyproject.toml` and
   `test_smoke.py`, Go has `go.mod` / `main.go` / `main_test.go`, Laravel has
   `composer.json` and `phpunit.xml`. Never propagate stack-specific behaviour
   across profiles; prove intentional differences with tests. (Item 34 exists to
   make the shared half mechanical.)

4. **A root file carrying a project placeholder is a defect.** `/bootstrap` never
   runs here. `.cursorrules`, `.github/copilot-instructions.md` and
   `.claude/memory/project-context.md` still hold live `{{…}}` — item 76. Do not
   "fix" them by inventing values, and do not bootstrap this repo.

5. **When a flow is designed out, the docs describing it go in the same change.**
   The v0.12.0 release incident was root-caused to `branching-rules.md` still
   documenting the superseded manual path. Documentation drift is the recurring
   defect class in this repo, not code.

---

## Editing the governance that ships

The corpus under `templates/*/.claude/` is the product. When changing it:

- **Shared governance and common assets**: apply to all five profiles — they are
  byte-identical by design. **Stack-specific files** (`pyproject.toml`, `go.mod`,
  `composer.json`, `phpunit.xml`, profile test files) stay scoped to their
  profile. Check which kind you are touching before copying anything sideways.
- Placeholders in shipped files are of two kinds and must not be swept together:
  **project placeholders** awaiting bootstrap (`{{PROJECT_NAME}}`,
  `{{BACKEND_STACK}}`) and **authoring slots** inside output templates
  (`{{FEATURE_NAME}}` in `brd-template.md`). The first must resolve at
  `ais create`; the second must survive it.
- A new project placeholder needs a matching entry in `resolvePlaceholders`
  (`src/cli/core/content-templates.js`) or it ships unresolved to every adopter.
- Governance surface has a running cost: 140,531 est-tokens across 94 files.
  `npm run token-report` before and after.

---

## Pointers

| Need | File |
|---|---|
| Roadmap, priorities, waves | `docs/process/pre-npm-publish-todo.md` |
| What already went wrong | `tasks/lessons.md` |
| Release procedure | `docs/setup/release-flow.md` |
| Task sizing and fast lanes | `docs/process/task-size-policy.md` |
| Architecture decisions | `docs/architecture/adr/` |
| What ships in the package | `package.json` `files` allowlist |
| Current version | `package.json` — and `npm view @lajin.m/ai-scaffold version` for what is actually published |
| Roadmap, wave status, open items | `docs/process/pre-npm-publish-todo.md` |
| Work in flight | `tasks/todo/` |

> **No project state is recorded in this file** — version, wave status and open
> item numbers live in the sources above. The previous `CLAUDE.md` carried a
> Current State block that went stale (it still named `v0.10.0` and two merged
> branches at `v0.14.0`). Do not reintroduce one.
