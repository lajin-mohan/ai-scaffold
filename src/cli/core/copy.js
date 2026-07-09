/**
 * Copy module — handles safe file copying with conflict detection and confirmation.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import crypto from 'crypto';
import { getVersion } from './version.js';
import { toPosixPath } from './paths.js';

/**
 * Copy staged files to target directory.
 * Shows diff for conflicting files and prompts before overwriting.
 *
 * @param {object} plan - File plan from buildFilePlan()
 * @param {object} bootstrapValues - Resolved bootstrap values for placeholder replacement
 * @param {object} opts - { dryRun: boolean, force: boolean }
 */
export async function copyFiles(plan, bootstrapValues, opts = {}) {
  const { dryRun = false, force = false, yes = false } = opts;
  // Accept both shapes:
  // - Flat object from collectBootstrapValues() (interactive path)
  // - { resolved, defaulted } from resolveWithDefaults() (--yes path)
  const values = bootstrapValues.resolved
    ? { ...bootstrapValues.resolved, defaulted: bootstrapValues.defaulted ?? [] }
    : { ...bootstrapValues, defaulted: bootstrapValues.defaulted ?? [] };

  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const writtenFiles = [];

  // Handle protected files
  for (const file of plan.skipProtected) {
    if (!file.exists) {
      // Protected file missing in target — offer to create it
      if (force || yes) {
        await writePlannedFile(file, values, dryRun);
        writtenFiles.push(file.rel);
        copied++;
      } else {
        console.log(chalk.yellow(`? ${file.rel} — protected file missing in target`));
        const answer = await confirm(`  Create from template?`);
        if (answer) {
          await writePlannedFile(file, values, dryRun);
          writtenFiles.push(file.rel);
          copied++;
        } else {
          skipped++;
        }
      }
    } else {
      // Protected file exists — never overwrite without --force
      if (force) {
        console.log(chalk.yellow(`! ${file.rel} — overwriting protected file (--force)`));
        await writePlannedFile(file, values, dryRun);
        writtenFiles.push(file.rel);
        copied++;
      } else {
        console.log(chalk.cyan(`⊘ ${file.rel} — protected, skipped`));
        skipped++;
      }
    }
  }

  // Copy managed files
  for (const file of plan.copy) {
    await copySingle(file.src, file.target, values, dryRun);
    writtenFiles.push(file.rel);
    copied++;
  }

  // Generate per-project files
  for (const file of plan.generate) {
    await generateFile(file, values, dryRun);
    writtenFiles.push(file.rel);
    copied++;
  }

  if (!dryRun && opts.targetDir) {
    const manifestPath = path.join(opts.targetDir, '.ai-scaffold.json');
    if (await fs.pathExists(manifestPath)) {
      const manifest = await fs.readJson(manifestPath);
      manifest.defaultedValues = values.defaulted ?? [];
      manifest.managedFiles = await buildManagedFileRecords(opts.targetDir, writtenFiles);
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    }
  }

  return { copied, skipped, errors };
}

async function writePlannedFile(file, values, dryRun) {
  if (file.src) {
    await copySingle(file.src, file.target, values, dryRun);
  } else {
    await generateFile(file, values, dryRun);
  }
}

/**
 * Copy a single file with placeholder resolution.
 */
async function copySingle(src, target, values, dryRun) {
  if (dryRun) {
    console.log(chalk.gray(`[dry-run] copy: ${src} → ${target}`));
    return;
  }

  await fs.ensureDir(path.dirname(target));
  let content = await fs.readFile(src, 'utf-8');
  content = resolvePlaceholders(content, values);
  await fs.writeFile(target, content);
  console.log(chalk.green(`✓ ${path.relative(process.cwd(), target)}`));
}

/**
 * Generate a per-project file from a template with resolved values.
 * @param {object} file - Generated file plan entry
 * @param {object} values - Resolved bootstrap values
 * @param {boolean} dryRun
 */
async function generateFile(file, values, dryRun) {
  const { rel: relPath, target, src } = file;

  if (dryRun) {
    console.log(chalk.gray(`[dry-run] generate: ${relPath}`));
    return;
  }

  await fs.ensureDir(path.dirname(target));

  if (relPath.endsWith('README.md') && src) {
    const content = await fs.readFile(src, 'utf-8');
    await fs.writeFile(target, resolvePlaceholders(content, values));
  } else if (relPath === '.ai-scaffold/README.md') {
    await fs.writeFile(target, buildScaffoldReadme(values));
  } else if (relPath === '.ai-scaffold/context.md') {
    await fs.writeFile(target, buildContextFile(values));
  } else if (relPath === '.ai-scaffold.json') {
    await fs.writeFile(target, JSON.stringify({
      version: getVersion(),
      profile: values.profile,
      bootstrapped: true,
      bootstrapCompletedAt: new Date().toISOString().split('T')[0],
      installedAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      source: 'ai-scaffold',
      project: {
        slug: values.projectName,
        displayName: values.displayName,
        purpose: values.purpose,
        kind: values.projectType,
        lifecycleStage: values.lifecycleStage,
        owner: values.ownerEmail,
      },
      stack: {
        primary: values.backendStack,
        backend: values.backendStack,
        frontend: values.frontendStack,
        database: values.database,
      },
      risk: {
        multiTenant: values.multiTenant,
        dataSensitivity: values.dataSensitivity,
        complianceScope: values.complianceScope ?? [],
      },
      requirements: {
        source: values.requirementsSource,
        paths: values.requirementsPath ? [values.requirementsPath] : [],
      },
      commands: {
        test: values.testCommand,
        lint: values.lintCommand,
        typecheck: values.typecheckCommand,
        build: values.buildCommand,
      },
      defaultedValues: values.defaulted ?? [],
      managedFiles: [],
    }, null, 2));
  } else if (relPath === '.claude/settings-overrides.json') {
    await fs.writeFile(target, JSON.stringify({
      project: {
        name: values.projectName,
        displayName: values.displayName,
        purpose: values.purpose,
        type: values.projectType,
        lifecycleStage: values.lifecycleStage,
        status: lifecycleStageToStatus(values.lifecycleStage),
        multiTenant: values.multiTenant,
        complianceScope: values.complianceScope,
        dataSensitivity: values.dataSensitivity,
        requirementsSource: values.requirementsSource,
        requirementsPath: values.requirementsPath,
        owner: values.ownerEmail,
        firstEpic: values.purpose,
      },
      techStack: {
        backend: values.backendStack,
        frontend: values.frontendStack,
        database: values.database,
        cacheQueue: 'N/A',
        auth: 'N/A',
        email: 'N/A',
        storage: 'N/A',
        cloud: 'N/A',
        iac: 'N/A',
        cicd: 'GitHub Actions',
        projectMgmt: 'GitHub Projects',
      },
      commands: {
        test: values.testCommand,
        lint: values.lintCommand,
        typecheck: values.typecheckCommand,
        build: values.buildCommand,
      },
      features: {
        accessibility: false,
        gdpr: hasCompliance(values, 'GDPR'),
        iso27001: hasCompliance(values, 'ISO27001'),
        sast: true,
        preCommitFull: true,
        iac: false,
        cicd: 'basic',
        mfa: false,
        auditLog: true,
        asyncJobs: false,
      },
    }, null, 2));
  } else if (relPath === '.claude/MEMORY.md') {
    const memoryContent = `# Project Memory

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
    await fs.writeFile(target, memoryContent);
  } else if (relPath.endsWith('CHANGELOG.md')) {
    await fs.writeFile(target, buildStarterChangelog(values));
  } else if (relPath.endsWith('tasks/lessons.md')) {
    await fs.writeFile(target, buildStarterLessons(values));
  } else if (relPath.endsWith('.gitkeep')) {
    await fs.writeFile(target, '');
  }

  console.log(chalk.green(`✓ ${relPath} (generated)`));
}

function buildStarterChangelog(values) {
  return `# Changelog

All notable changes to ${values.displayName} are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each merging PR adds an entry under [Unreleased].

---

## [Unreleased]
`;
}

function buildStarterLessons(values) {
  return `# Lessons

Root-cause and process lessons for ${values.displayName}. Append an entry after
every user correction or non-obvious bug fix: what failed, why it happened, and
the rule that prevents it recurring.

Queried by \`/lessons\`. Read at the start of every session before doing anything else.

---
`;
}

async function buildManagedFileRecords(targetDir, relPaths) {
  const uniquePaths = [...new Set(relPaths.map(toPosixPath))]
    .filter((relPath) => relPath !== '.ai-scaffold.json')
    .sort();

  const records = [];
  for (const relPath of uniquePaths) {
    const fullPath = path.join(targetDir, relPath);
    if (!(await fs.pathExists(fullPath))) {
      continue;
    }
    const hash = crypto
      .createHash('sha256')
      .update(await fs.readFile(fullPath))
      .digest('hex');
    records.push({ path: relPath, hash: `sha256:${hash}` });
  }
  return records;
}

/**
 * Replace all {{PLACEHOLDER}} tokens in text content with resolved values.
 */
function resolvePlaceholders(content, values) {
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
    '{{INSTALL_COMMAND}}': 'N/A',
    '{{MIGRATION_COMMAND}}': 'N/A',
    '{{MIGRATE_COMMAND}}': 'N/A',
    '{{DEV_COMMAND}}': 'N/A',
    '{{BUILD_COMMAND}}': 'N/A',
    '{{TEST_COMMAND}}': 'N/A',
    '{{LINT_COMMAND}}': 'N/A',
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

function buildScaffoldReadme(values) {
  return `# AI Scaffold

This folder contains AI Scaffold's project-local operating context for ${values.displayName}.

## Installed Context

- Profile: ${values.profile}
- Project kind: ${values.projectType}
- Lifecycle stage: ${values.lifecycleStage}
- Data sensitivity: ${values.dataSensitivity}
- Compliance scope: ${formatCompliance(values.complianceScope)}

## Default Install Surface

The default install keeps scaffold-owned reference material small. Larger docs,
QA, UX, research, CI, and template packs should be added explicitly when needed.

See \`.ai-scaffold/context.md\` for the project setup context collected during installation.
`;
}

function buildContextFile(values) {
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

function formatCompliance(complianceScope) {
  if (!Array.isArray(complianceScope) || complianceScope.length === 0) {
    return 'none';
  }
  return complianceScope.join(', ');
}

function hasCompliance(values, scope) {
  return Array.isArray(values.complianceScope) && values.complianceScope.includes(scope);
}

function lifecycleStageToStatus(stage) {
  const labels = {
    discovery: 'Discovery',
    'active-development': 'Active Development',
    production: 'Production',
    maintenance: 'Maintenance',
    'legacy-modernization': 'Legacy Modernization',
  };
  return labels[stage] ?? 'Active Development';
}

/**
 * Simple confirmation prompt.
 */
async function confirm(message) {
  const prompts = await import('prompts');
  const { confirm } = prompts.default;
  const answer = await confirm({ message, initial: false });
  return answer;
}
