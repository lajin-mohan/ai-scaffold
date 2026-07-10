# Contributing

Thanks for helping improve AI Scaffold. This repository is the scaffold platform
itself: CLI code, profile templates, rules, commands, hooks, docs, and release
automation.

Before changing files, read:

1. [CLAUDE.md](./CLAUDE.md) - source of truth for this repo
2. [README.md](./README.md) - product overview and install flow
3. [HOW-TO-USE.md](./HOW-TO-USE.md) - user workflow
4. [.claude/rules/ai-coding-rules.md](./.claude/rules/ai-coding-rules.md)
5. [.claude/rules/branching-rules.md](./.claude/rules/branching-rules.md)

---

## Contribution Flow

```bash
# 1. Branch from dev
git checkout dev
git pull
git checkout -b feature/<short-description>

# 2. Make the change

# 3. Run local gates
npm test
npm run lint
npm run typecheck
npm audit --audit-level=high
bash scripts/pre-publish-smoke.sh

# 4. Open a PR into dev
```

Use `fix/*` for defects, `docs/*` for documentation-only work, `chore/*` for
maintenance, and `release/*` for release promotion.

Do not commit directly to `main` or `dev`.

---

## What To Verify

Every PR should state:

- what changed
- why it changed
- which files or profiles are affected
- how it was verified
- whether generated project output changed

Minimum checks:

```bash
npm test
npm run lint
npm run typecheck
```

Before release or profile/template changes, also run:

```bash
npm audit --audit-level=high
bash scripts/pre-publish-smoke.sh
```

For profile work, create a temporary project and inspect the generated output:

```bash
node bin/ai-scaffold.js create /private/tmp/ais-node --profile node --yes --no-git
node bin/ai-scaffold.js create /private/tmp/ais-python --profile python --yes --no-git
node bin/ai-scaffold.js create /private/tmp/ais-go --profile go --yes --no-git
```

Run `node bin/ai-scaffold.js doctor <path>` against generated projects.

---

## Template And Profile Rules

When changing templates:

- keep existing-project installs small and safe
- do not create root `docs/`, `tasks/`, `_ai/`, `apps/`, `packages/`, `infra/`,
  or `scripts/` by default during `init`
- keep project-owned docs as opt-in folders created when needed
- make sure every new profile file is included in `package.json` `files`
- update `scripts/pre-publish-smoke.sh` when a packaging omission could break
  generated projects
- keep generated READMEs free of unresolved `{{PLACEHOLDER}}` tokens
- avoid links to files that are not generated or shipped

When adding a profile alias, update:

- `src/cli/core/paths.js`
- CLI help text in command options
- README profile tables
- HOW-TO-USE profile table
- tests and smoke checks

---

## Requirements And Context

The product succeeds only when users can link good BRD/FRD content to their
tasks. Changes that affect setup, prompts, memory, or docs should preserve this
flow:

```text
BRD/FRD -> task ID -> /start-task --spec <path> -> plan -> approval -> implementation -> /review -> QA
```

If you change setup fields, update all relevant places:

- `.ai-scaffold.json`
- `.ai-scaffold/context.md`
- `.claude/settings-overrides.json`
- `.claude/MEMORY.md`
- README
- HOW-TO-USE
- tests

---

## Branch And PR Rules

`main` and `dev` are protected. Release readiness requires both code quality and
mergeability.

Before marking a release PR ready:

```bash
git status --short --branch
git merge-base --is-ancestor origin/main HEAD
npm test
npm run lint
npm run typecheck
npm audit --audit-level=high
bash scripts/pre-publish-smoke.sh
```

Also confirm GitHub reports the PR as mergeable with successful checks.

---

## Commit Format

Use Conventional Commits:

```text
type(scope): short description
```

Examples:

```text
feat(cli): add profile alias
fix(doctor): report missing settings overrides
docs(readme): clarify requirements-first workflow
test(smoke): assert python starter files ship
```

Do not add `Co-Authored-By` or AI identity footers.

---

## Security And Attribution

- Never commit secrets, tokens, credentials, private keys, or real customer data.
- Keep `.env` files out of the repo.
- Update [docs/compliance/third-party-attributions.md](./docs/compliance/third-party-attributions.md)
  when adding adapted material, external snippets, templates, or assets.
- Respect the [LICENSE](./LICENSE). The project is source-available under the
  AI Scaffold Community License.

Report security issues privately as described in [SECURITY.md](./SECURITY.md).
