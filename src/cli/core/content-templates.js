/**
 * Generated content and placeholder helpers for scaffold installs.
 */

export function resolvePlaceholders(content, values) {
  const tokenMap = {
    '{{PROJECT_NAME}}': values.projectName ?? '',
    '{{PROJECT_DISPLAY_NAME}}': values.displayName ?? '',
    '{{PROJECT_DESCRIPTION}}': values.purpose ?? '',
    '{{ONE_LINE_PURPOSE}}': values.purpose ?? '',
    '{{SaaS / Internal Tool / API / Platform}}': values.projectType ?? '',
    '{{Active Development / MVP / Production}}': 'Active Development',
    '{{IS_MULTI_TENANT}}': String(values.multiTenant ?? false),
    '{{COMPLIANCE_SCOPE}}': formatCompliance(values.complianceScope),
    '{{OWNER_EMAIL}}': values.ownerEmail ?? '',
    '{{EPIC_NAME}}': values.purpose ?? '',
    '{{BACKEND_STACK}}': values.backendStack ?? 'N/A',
    '{{FRONTEND_STACK}}': values.frontendStack ?? 'none',
    '{{DATABASE}}': values.database ?? 'N/A',
    '{{RUNTIME}}': values.backendStack ?? 'N/A',
    '{{REPO_URL}}': 'N/A',
    '{{INSTALL_COMMAND}}': commandOrNA(values.installCommand),
    '{{MIGRATION_COMMAND}}': commandOrNA(values.migrationCommand),
    '{{MIGRATE_COMMAND}}': commandOrNA(values.migrationCommand),
    '{{DEV_COMMAND}}': commandOrNA(values.devCommand),
    '{{BUILD_COMMAND}}': commandOrNA(values.buildCommand),
    '{{TEST_COMMAND}}': commandOrNA(values.testCommand),
    '{{LINT_COMMAND}}': commandOrNA(values.lintCommand),
    '{{SEED_COMMAND}}': 'N/A',
    '{{CACHE_QUEUE}}': 'N/A',
    '{{AUTH_STRATEGY}}': 'N/A',
    '{{EMAIL_PROVIDER}}': 'N/A',
    '{{STORAGE}}': 'N/A',
    '{{CLOUD_PROVIDER}}': 'N/A',
    '{{IAC_TOOL}}': 'N/A',
    '{{CICD_PLATFORM}}': 'GitHub Actions',
    '{{PM_TOOL}}': 'GitHub Projects',
    '{{LICENSE}}': 'AI Scaffold Community License',
    '{{YEAR}}': new Date().getFullYear().toString(),
  };

  let result = content;
  for (const [token, value] of Object.entries(tokenMap)) {
    result = result.split(token).join(value);
  }
  return result;
}

export function buildScaffoldReadme(values) {
  const requirementsPath = values.requirementsPath || 'not linked yet';

  return `# AI Scaffold

This folder contains AI Scaffold's project-local operating context for ${values.displayName}.

## Installed Context

- Profile: ${values.profile}
- Project kind: ${values.projectType}
- Lifecycle stage: ${values.lifecycleStage}
- Data sensitivity: ${values.dataSensitivity}
- Compliance scope: ${formatCompliance(values.complianceScope)}

## Requirements Link

- Source: ${values.requirementsSource ?? 'create-later'}
- Path: ${requirementsPath}

AI work is strongest when every task links to a BRD, FRD, ticket, or acceptance
criteria document. If the path is not linked yet, update \`.ai-scaffold/context.md\`,
\`.claude/settings-overrides.json\`, and \`.claude/MEMORY.md\` before serious
feature work.

Use:

\`\`\`text
/start-task --spec <requirements-or-task-path>
\`\`\`

## Default Install Surface

The default install keeps scaffold-owned reference material small. Larger docs,
QA, UX, research, CI, and template packs should be added explicitly when needed.

See \`.ai-scaffold/context.md\` for the project setup context collected during
installation. Run \`ais doctor\` after changing scaffold settings.
`;
}

export function buildContextFile(values) {
  return `# AI Scaffold Context

Generated during AI Scaffold setup. Keep this file factual and lightweight.

## Project

| Field | Value |
|---|---|
| Slug | ${values.projectName} |
| Display name | ${values.displayName} |
| Purpose | ${values.purpose} |
| Kind | ${values.projectType} |
| Lifecycle stage | ${values.lifecycleStage} |
| Owner | ${values.ownerEmail ?? 'none'} |

## Stack

| Field | Value |
|---|---|
| Primary/backend | ${values.backendStack ?? 'none'} |
| Frontend | ${values.frontendStack ?? 'none'} |
| Database | ${values.database ?? 'none'} |

## Risk And Governance

| Field | Value |
|---|---|
| Multi-tenant | ${String(values.multiTenant ?? false)} |
| Data sensitivity | ${values.dataSensitivity ?? 'internal'} |
| Compliance scope | ${formatCompliance(values.complianceScope)} |

## Requirements

| Field | Value |
|---|---|
| Source | ${values.requirementsSource ?? 'create-later'} |
| Path | ${values.requirementsPath || 'none'} |

## Verification Commands

| Command | Value |
|---|---|
| Test | ${values.testCommand ?? 'none'} |
| Lint | ${values.lintCommand ?? 'none'} |
| Typecheck | ${values.typecheckCommand ?? 'none'} |
| Build | ${values.buildCommand ?? 'none'} |

## Notes

- Existing requirements documents should be indexed here, not moved.
- Root \`docs/requirements/\` should only be created when explicitly requested.
- Do not store secrets, credentials, tokens, production data, or client-confidential text here unless explicitly approved for this repository.
`;
}

export function buildMemoryFile(values) {
  return `# Project Memory

Living index for project memory and session compactions.

---

## Project Snapshot

| Field | Value |
|---|---|
| Project | ${values.displayName} |
| Purpose | ${values.purpose} |
| Project kind | ${values.projectType} |
| Lifecycle stage | ${values.lifecycleStage} |
| Data sensitivity | ${values.dataSensitivity} |
| Compliance scope | ${formatCompliance(values.complianceScope)} |
| Requirements source | ${values.requirementsSource ?? 'create-later'} |
| Requirements path | ${values.requirementsPath || 'none'} |
| Current epic | ${values.purpose} |
| Active AI role | not configured |
| Last updated | ${new Date().toISOString().split('T')[0]} |

---

## Core Memory Files

| File | Purpose | Updated |
|---|---|---|
| [project-context.md](memory/project-context.md) | Sprint state, blockers, in-flight work, team | Per sprint |
| [architecture-decisions.md](memory/architecture-decisions.md) | ADRs, standing invariants, deferred decisions | Per ADR |
| [business-rules.md](memory/business-rules.md) | Non-obvious business logic, edge cases | Per discovery |
| [known-issues.md](memory/known-issues.md) | Active bugs, workarounds, technical debt | Per issue |

---

## How Memory Is Used

At the start of every session:
1. Read \`.claude/MEMORY.md\` to orient to active state and recent changes.
2. Read \`.claude/memory/project-context.md\` for sprint/work status.
3. Run \`/lessons --recent 3\` when lessons exist.

Before planning or architecture work:
- Read the linked BRD/FRD/ticket path from this file or \`.ai-scaffold/context.md\`.
- Start implementation tasks with \`/start-task --spec <requirements-or-task-path>\`.
- Read \`.claude/memory/architecture-decisions.md\`.
- Read \`.claude/memory/business-rules.md\`.

Before debugging or investigating:
- Read \`.claude/memory/known-issues.md\`.
- Search lessons for similar past issues.

---

## Memory Hygiene Rules

- Code and current specs win over stale memory.
- Archive stale entries instead of deleting useful history.
- Project memory only: do not install or depend on global/user-home memory by default.
- Never store secrets, credentials, API tokens, production data, private customer data, or client-confidential text unless explicitly approved for this repo.
- Treat memory edits as reviewed project changes; prefer small, factual updates with source context.
- Keep local-only notes in ignored files such as \`.claude/memory/*.local.md\`.

---

Update this index when new memory files are created or existing memory files are archived.
`;
}

export function buildStarterChangelog(values) {
  return `# Changelog

All notable changes to ${values.displayName} are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each merging PR adds an entry under [Unreleased].

---

## [Unreleased]
`;
}

export function buildStarterLessons(values) {
  return `# Lessons

Root-cause and process lessons for ${values.displayName}. Append an entry after
every user correction or non-obvious bug fix: what failed, why it happened, and
the rule that prevents it recurring.

Queried by \`/lessons\`. Read at the start of every session before doing anything else.

---
`;
}

export function commandOrNA(command) {
  return command && command !== 'none' ? command : 'N/A';
}

export function formatCompliance(complianceScope) {
  if (!Array.isArray(complianceScope) || complianceScope.length === 0) {
    return 'none';
  }
  return complianceScope.join(', ');
}

export function buildConstitution(values) {
  const tenantLine = values.multiTenant
    ? '9. **Tenant isolation.** Every query that touches tenant data is scoped by `tenant_id` at the repository layer — a missing scope is a data breach. — [security-rules.md](.claude/rules/security-rules.md)'
    : '9. **Tenant isolation** applies only if this project is multi-tenant (it is not, per the current setup). If that changes, scope every tenant-data query by `tenant_id` at the repository layer. — [security-rules.md](.claude/rules/security-rules.md)';

  return `# Constitution — ${values.displayName}

**Read this first.** It is the source of truth for *how* work happens here — for
humans and for every AI assistant (Claude, Codex, Cursor, Copilot, and others).
It is short on purpose: a one-page index and tie-breaker over the detailed rules
in \`.claude/rules/\`. It does not replace those rules — it orders them and points
you to them.

## The non-negotiables

Each line is a summary; the linked file is authoritative for the detail.

1. **Verify before you claim.** No statement about the code without reading it
   this session; cite \`file:line\`. — [ai-coding-rules.md](.claude/rules/ai-coding-rules.md)
2. **When unsure, ask.** "I don't know" is a valid and required answer — do not
   guess. — [ai-coding-rules.md](.claude/rules/ai-coding-rules.md)
3. **Plan, then execute.** Work over ~3 steps or spanning multiple files gets a
   written plan and explicit approval before code. — [ai-coding-rules.md](.claude/rules/ai-coding-rules.md)
4. **Production-grade only.** No stubs, no half-implementations, no \`TODO\`
   without a ticket. — [coding-standards.md](.claude/rules/coding-standards.md)
5. **Verify before "done".** Lint, typecheck, and tests run and pass — with
   evidence, not assumption. — [ai-coding-rules.md](.claude/rules/ai-coding-rules.md)
6. **Parameterized queries only.** No string-built SQL, ever. — [security-rules.md](.claude/rules/security-rules.md)
7. **Validate input at every boundary; no secrets in code; no PII in logs.** — [security-rules.md](.claude/rules/security-rules.md)
8. **Tests are required** — happy path plus at least two edge/failure cases plus
   an auth-failure case. — [testing-rules.md](.claude/rules/testing-rules.md)
${tenantLine}
10. **Branch discipline.** \`feature\`/\`fix\`/\`chore\`/\`docs\` -> \`dev\` (squash);
    \`release\` -> \`main\` (squash + tag); a \`main\`->\`dev\` sync uses a **merge
    commit**, never a squash. — [branching-rules.md](.claude/rules/branching-rules.md)

## Governance order (the tie-breaker)

When two rules seem to conflict, resolve in this order — and the **linked rule
file wins on detail**; this file only sets precedence:

\`\`\`
this constitution (order only)
  -> ai-coding-rules.md    (how AI writes code here)
  -> security-rules.md     (never negotiable)
  -> coding-standards.md   (structure, correctness)
  -> testing-rules.md      (what "tested" means)
  -> dod-rules.md          (what "done" means)
  -> the remaining files in .claude/rules/
\`\`\`

## Start here

1. Read this file.
2. Read [CLAUDE.md](CLAUDE.md) — the full operating guide (workflow, agents,
   commands, current state).
3. Run \`/what-next\`, or start work with \`/start-task --spec <requirements-path>\`.

---

This file owns **precedence and order** — when rules conflict, it decides which
one wins. The linked rule files own the **detailed implementation** of each rule.
It is a tie-breaker and an index, not a second rulebook: if this summary ever
misstates a detail, correct it here so it matches the rule it points to.
`;
}
