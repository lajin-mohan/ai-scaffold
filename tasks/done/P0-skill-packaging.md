# P0 — Repair Claude Code skill packaging

## Goal

Make all intended project skills discoverable in the repository and every shipped template, then prevent regressions with automated validation.

## Acceptance criteria

- [x] Nine flat skill Markdown files are converted to `<skill-name>/SKILL.md`.
- [x] Root configuration and all supported template profiles use the valid layout.
- [x] Each converted skill has valid `name` and `description` frontmatter.
- [x] The legacy `ux-audit` compatibility skill directs users to `ux-review`.
- [x] Tests reject flat skill files, invalid directory names, missing entrypoints, and missing metadata.
- [x] Lint, typecheck, unit tests, end-to-end tests, and package inspection pass.

## Scope

- `.claude/skills/`
- `templates/{generic,node,python,golang,laravel}/.claude/skills/`
- `src/__tests__/core.test.js`

## Verification

- `npm run lint` — passed.
- `npm run typecheck` — passed; 25 JavaScript files and 4 gitleaks configs checked.
- `npm run test:unit` — passed; 62 tests.
- `npm run test:e2e` — passed; 12 tests.
- `npm test` — passed; 74 tests across 2 files.
- `npm --cache /private/tmp/ai-scaffold-p0-npm-cache pack --dry-run` — passed; all template skill entrypoints included in the 819-file package manifest.
