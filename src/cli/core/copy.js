/**
 * Copy module — handles safe file copying with conflict detection and confirmation.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import crypto from 'crypto';

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
  } else if (relPath === '.ai-scaffold.json') {
    await fs.writeFile(target, JSON.stringify({
      version: '0.7.0',
      profile: values.profile,
      bootstrapped: true,
      bootstrapCompletedAt: new Date().toISOString().split('T')[0],
      installedAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      source: 'ai-scaffold',
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
        status: 'Active Development',
        multiTenant: values.multiTenant,
        complianceScope: values.complianceScope,
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
      features: {
        accessibility: false,
        gdpr: values.complianceScope === 'GDPR',
        iso27001: values.complianceScope === 'ISO27001',
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
- Never store secrets, credentials, tokens, or private customer data.
- Keep local-only notes in ignored files such as \`.claude/memory/*.local.md\`.

---

Update this index when new memory files are created or existing memory files are archived.
`;
    await fs.writeFile(target, memoryContent);
  }

  console.log(chalk.green(`✓ ${relPath} (generated)`));
}

async function buildManagedFileRecords(targetDir, relPaths) {
  const uniquePaths = [...new Set(relPaths)]
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
    '{{COMPLIANCE_SCOPE}}': values.complianceScope ?? 'N/A',
    '{{OWNER_EMAIL}}': values.ownerEmail ?? '',
    '{{EPIC_NAME}}': values.purpose ?? '',
    '{{BACKEND_STACK}}': values.backendStack ?? 'N/A',
    '{{FRONTEND_STACK}}': values.frontendStack ?? 'N/A',
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

/**
 * Simple confirmation prompt.
 */
async function confirm(message) {
  const prompts = await import('prompts');
  const { confirm } = prompts.default;
  const answer = await confirm({ message, initial: false });
  return answer;
}
