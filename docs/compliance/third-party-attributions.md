# Third-Party Attributions and License Register

This register records external repositories, packages, snippets, templates, and other resources incorporated into `ai-scaffold`.

Update this file whenever the scaffold adds, removes, or materially adapts third-party material. Dependency manifests and lockfiles are not enough by themselves; this document is the human-readable compliance index.

## Repository License

`ai-scaffold` is proprietary to Techversant Infotech. See [../../LICENSE](../../LICENSE).

No outbound open-source license is granted for this repository unless a separate written agreement says otherwise. Third-party components retain their original licenses.

## Direct npm Dependencies

| Package | Use | License | Source |
|---|---|---|---|
| `cac` | CLI command parser | MIT | https://github.com/cacjs/cac |
| `chalk` | Terminal colors | MIT | https://github.com/chalk/chalk |
| `diff` | Text diff rendering | BSD-3-Clause | https://github.com/kpdecker/jsdiff |
| `fs-extra` | File-system utilities | MIT | https://github.com/jprichardson/node-fs-extra |
| `picomatch` | Glob and path matching | MIT | https://github.com/micromatch/picomatch |
| `prompts` | Interactive CLI prompts | MIT | https://github.com/terkelg/prompts |
| `semver` | Semantic version handling | ISC | https://github.com/npm/node-semver |

## Development Dependencies

| Package | Use | License | Source |
|---|---|---|---|
| `vitest` | Unit and smoke test runner | MIT | https://github.com/vitest-dev/vitest |

Transitive dependency licenses are recorded in `package-lock.json` and should be reviewed before public distribution.

## Adapted External Materials

| Source | License | Incorporated Material | Local Locations | Attribution Notes |
|---|---|---|---|---|
| Dietrich Gebert, `ponytail` | MIT | Ponytail ladder philosophy, shortcut marker taxonomy, audit/debt command ideas | `.claude/rules/ponytail-ladder.md`, `.claude/commands/ponytail-audit.md`, `.claude/commands/ponytail-debt.md`, `tasks/ponytail-debt.md`, related docs | Keep file-level attribution blocks in adapted files. Upstream: https://github.com/DietrichGebert/ponytail |

## Scaffold-Owned Materials

The following categories are treated as first-party Techversant scaffold material unless a file-level attribution block says otherwise:

- `.claude/agents/`
- `.claude/commands/`
- `.claude/rules/`
- `.claude/templates/`
- `docs/`
- `templates/generic/`
- `templates/laravel/`
- `src/cli/`

## Compliance Rules

- Do not copy third-party code, prompts, templates, icons, images, or large text excerpts into the scaffold without recording source, license, and attribution requirements here.
- Preserve required copyright notices and license text for adapted material.
- Prefer linking to external reference material instead of copying it.
- Before release, compare `package.json` and `package-lock.json` against this register.
- If a dependency or source has a copyleft, non-commercial, attribution-heavy, or unclear license, pause and get human approval before inclusion.

## Release Audit Checklist

- [ ] `package.json` direct dependencies match this file.
- [ ] `package-lock.json` was regenerated after dependency changes.
- [ ] File-level attribution blocks remain in adapted files.
- [ ] `README.md`, `README.scaffold.md`, and generated README templates do not claim an incompatible license.
- [ ] New template assets, snippets, or copied examples are listed here.
