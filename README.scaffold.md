# AI Scaffold Platform Documentation

## Purpose

`ai-scaffold` is a reusable AI engineering scaffold and CLI platform. It provides:

- Governance rules for AI-assisted delivery.
- Agent and command prompts for planning, architecture, review, QA, and release workflows.
- Template profiles for new or existing application repositories.
- CLI commands for creating, installing, diagnosing, and eventually updating scaffold-managed files.

## Documentation Split

This file documents the scaffold platform itself. Generated projects receive their own `README.md` from the active profile's `README.template.md` during CLI installation.

| Documentation | Source | Output |
|---|---|---|
| Scaffold platform README | `README.md` | Repo root |
| Detailed scaffold docs | `README.scaffold.md` | Repo root |
| Generated project README | `templates/<profile>/README.template.md` | Target `README.md` |

## Release Checklist

Before promoting a CLI release:

1. Confirm the worktree contains only intended tracked changes.
2. Run `npm test`.
3. Run `npm run typecheck`.
4. Create a temporary project with `node bin/ai-scaffold.js create <tmp> --yes`.
5. Run `node bin/ai-scaffold.js doctor <tmp>`.
6. Confirm generated files include `.ai-scaffold.json`, `.claude/MEMORY.md`, `.claude/settings-overrides.json`, and `README.md`.
7. Confirm generated project README content has no unresolved project identity placeholders.
8. Update [docs/compliance/third-party-attributions.md](./docs/compliance/third-party-attributions.md) when dependencies, adapted materials, snippets, or templates are added.

## Template Hygiene

- Do not commit generated local files such as `.claude/MEMORY.md` or `.claude/settings-overrides.json`.
- Do not put generated project placeholder content in the scaffold platform `README.md`.
- Keep template README content in `README.template.md`.
- Keep attribution, license, and source-origin records current.
