# ai-scaffold

Reusable AI engineering scaffold with CLI distribution.

`ai-scaffold` packages this repository's AI operating system into a CLI that can create new projects, install scaffold-managed files into existing projects, track installed metadata, and run basic health checks.

This repository is the scaffold platform itself, not a generated application. Generated project documentation is produced from template files during `create` or `init`; scaffold platform documentation lives separately in [README.scaffold.md](./README.scaffold.md).

## Status

| Area | State |
|---|---|
| Package version | `0.7.0` |
| Active branch target | `dev` before release promotion |
| Supported profiles | `generic`, `laravel` |
| Implemented commands | `create`, `init`, `status`, `doctor`, `update` |
| Update behavior | Placeholder only until Phase 3 |

## CLI Usage

```bash
npx ai-scaffold my-project
npx ai-scaffold create my-project
npx ai-scaffold init --profile laravel
npx ai-scaffold status
npx ai-scaffold doctor
npx ai-scaffold update
```

## Development

```bash
npm test
npm run test:unit
npm run test:e2e
npm run typecheck
```

The root package is the CLI package. Template profile contents live under `templates/`, and generated project README content is sourced from `README.template.md` files inside each profile.

## Repository Map

| Path | Purpose |
|---|---|
| `bin/ai-scaffold.js` | CLI entry point |
| `src/cli/commands/` | Command handlers |
| `src/cli/core/` | Shared CLI file planning, copying, prompt, path, and version logic |
| `templates/generic/` | Generic profile source |
| `templates/laravel/` | Laravel profile source |
| `docs/cli/` | CLI behavior specs |
| `docs/process/` | Scaffold planning and process records |
| `docs/compliance/third-party-attributions.md` | Third-party sources, licenses, and attribution register |

## Generated Project Documentation

The scaffold keeps platform documentation separate from generated project documentation:

- Platform docs: `README.md` and [README.scaffold.md](./README.scaffold.md)
- Generated project README source: `templates/<profile>/README.template.md`
- Generated output path: `README.md` in the target project

This split prevents project template placeholders from appearing in the scaffold platform README.

## License

This repository is proprietary to Techversant Infotech. See [LICENSE](./LICENSE).

Third-party packages and adapted source material retain their original licenses. See [docs/compliance/third-party-attributions.md](./docs/compliance/third-party-attributions.md).
