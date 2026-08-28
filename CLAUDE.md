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

## What this repository is not

- **Not a governed project.** The branch, commit and CI gates defined in
  `templates/` apply to generated projects. This repo keeps only its own build,
  test and release workflows.
- **Not bootstrapped.** There is nothing here to fill in. `/bootstrap` is what an
  adopting project runs. **A `{{PLACEHOLDER}}` in a root file is a defect
  (backlog item 76), never a value to guess.**
- **Not a SaaS application.** `apps/` and `packages/` hold a small layered
  reference example that ships as documentation. They are not this project's
  source; the source is `src/cli/`.

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

Branches: `feature/*`, `fix/*`, `chore/*`, `docs/*` from `dev` → PR to `dev`;
`dev` → `main` by a separate PR. `hotfix/*` from `main` is the one exception and
requires a back-merge. Conventional Commits.

**Releases go through the one-button Release Action.** See
`docs/setup/release-flow.md`. Cutting a release by hand from a `release/*` branch
is how v0.12.0 sat untagged and unpublished for 9 days.

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

3. **Change all 5 profiles, or none.** 90.3% of commits touching `templates/`
   touch two or more profile copies; 51.6% touch all five. A change landed in one
   profile is a latent bug in four. (Item 34 exists to remove this tax.)

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

- Apply the change to **all five profiles**. They are byte-identical by design.
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

## Current state

- **Version:** 0.14.0, published with provenance. `dev` and `main` aligned.
- **Roadmap:** `docs/process/pre-npm-publish-todo.md` — the value-ordered backlog
  and the wave sequencing. Read it before proposing work.
- **Wave 0** (effectiveness baseline, item 74) captured 2026-08-27;
  `docs/process/effectiveness-baseline-2026-08-27.md`. **Wave 1** is unblocked:
  items 26, 65 follow-up, 66.
- **Open structural items:** 76 (split this file set from the shipped one),
  34 (de-duplicate the 5 profiles), 77 (placeholder-substitution gaps).

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
