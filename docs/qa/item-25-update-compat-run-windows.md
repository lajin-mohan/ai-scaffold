# Item 25 slice 5: `ais update` against real installs

- Candidate: packed tarball `lajin.m-ai-scaffold-0.16.1.tgz` from commit `b21a423ce60c0424f4aa083207ff1c1319bc90c4`, installed with version `0.17.0-compat.0`
- Platform: win32 10.0.26100, Node v24.20.0
- Clock pinned to 2026-10-15T12:00:00Z for every install and update; every project is named `compat-app`

| Case | Criterion | Checks | Apply actions |
|---|---|---|---|
| 0.8.5 create node | 5A | pass 17/17 | replace 82, add 17, remove 9, conflict 1, merge 1, unchanged 42 |
| 0.8.5 create laravel | 5A | pass 18/18 | replace 82, add 17, remove 9, conflict 1, merge 1, unchanged 42 |
| 0.8.5 init node | 5A | pass 19/19 | replace 82, add 20, remove 9, conflict 1, merge 1, unchanged 42 |
| 0.14.0 create node | 5A | pass 17/17 | replace 8, add 3, conflict 1, merge 1, unchanged 130 |
| 0.14.0 create laravel | 5A | pass 18/18 | replace 8, add 3, conflict 1, merge 1, unchanged 130 |
| 0.14.0 create python | 5A | pass 17/17 | replace 8, add 3, conflict 1, merge 1, unchanged 130 |
| 0.14.0 init node | 5A | pass 19/19 | replace 8, add 3, conflict 1, merge 1, unchanged 131 |
| 0.16.1 create node | 5A | pass 17/17 | add 1, conflict 1, merge 1, unchanged 140 |
| 0.16.1 create laravel | 5A | pass 18/18 | add 1, conflict 1, merge 1, unchanged 140 |
| 0.16.1 create python | 5A | pass 17/17 | add 1, conflict 1, merge 1, unchanged 140 |
| 0.16.1 init node | 5A | pass 19/19 | replace 1, add 1, conflict 1, merge 1, unchanged 140 |
| 0.8.5 create node, managedFiles removed | AC-07 | pass 4/4 | add 17, conflict 81, merge 1, unchanged 42 |
| 0.16.1 init node, autocrlf=true clone (154 CRLF files) | 5B | pass 3/3 | replace 142, add 1, merge 1 |
| 0.16.1 create node, autocrlf=true clone (0 CRLF files) | 5B | pass 3/3 | add 1, merge 1, unchanged 141 |

## Failed checks

None.

## Unexplained differences from a fresh install

None.

## Answers given to each fresh reference (the old project's recorded values)

- **0.8.5 create node**: --multi-tenant --test-command npm test --lint-command npm run lint --typecheck-command npm run typecheck --build-command npm run build
- **0.8.5 create laravel**: --multi-tenant --test-command composer test --lint-command none --typecheck-command none --build-command none
- **0.8.5 init node**: --multi-tenant --test-command npm test --lint-command npm run lint --typecheck-command npm run typecheck --build-command npm run build
- **0.14.0 create node**: --test-command npm test --lint-command npm run lint --typecheck-command npm run typecheck --build-command npm run build
- **0.14.0 create laravel**: --test-command composer test --lint-command none --typecheck-command none --build-command none
- **0.14.0 create python**: --test-command pytest --lint-command ruff check . --typecheck-command mypy . --build-command python -m compileall .
- **0.14.0 init node**: --test-command npm test --lint-command npm run lint --typecheck-command npm run typecheck --build-command npm run build
- **0.16.1 create node**: --test-command npm test --lint-command none --typecheck-command none --build-command none
- **0.16.1 create laravel**: --test-command composer test --lint-command none --typecheck-command none --build-command none
- **0.16.1 create python**: --test-command .venv/bin/pytest --lint-command .venv/bin/ruff check . --typecheck-command .venv/bin/mypy . --build-command .venv/bin/python -m compileall .
- **0.16.1 init node**: --test-command npm test --lint-command none --typecheck-command none --build-command none

## Explained differences

- **0.8.5 init node**: `.ai-scaffold/README.md`: renders recorded commands with no install flag: install "none"
- **0.8.5 init node**: `constitution.md`: unowned in this install (FR-42): never added or changed by update
- **0.14.0 init node**: `.ai-scaffold/README.md`: renders recorded commands with no install flag: dev "npm run dev"
