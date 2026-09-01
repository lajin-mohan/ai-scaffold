/**
 * Copy module — handles safe file copying with conflict detection and confirmation.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  buildConstitution,
  buildContextFile,
  buildMemoryFile,
  buildCliReference,
  buildScaffoldReadme,
  buildStarterChangelog,
  buildStarterLessons,
  resolvePlaceholders,
} from './content-templates.js';
import {
  buildManagedFileRecords,
  buildManifestData,
  buildSettingsOverridesData,
} from './manifest.js';

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
  } else if (relPath === '.ai-scaffold/cli-reference.md') {
    await fs.writeFile(target, buildCliReference(values));
  } else if (relPath === '.ai-scaffold/context.md') {
    await fs.writeFile(target, buildContextFile(values));
  } else if (relPath === '.ai-scaffold.json') {
    await fs.writeJson(target, buildManifestData(values), { spaces: 2 });
  } else if (relPath === '.claude/settings-overrides.json') {
    await fs.writeJson(target, buildSettingsOverridesData(values), { spaces: 2 });
  } else if (relPath === '.claude/MEMORY.md') {
    await fs.writeFile(target, buildMemoryFile(values));
  } else if (relPath === 'constitution.md') {
    await fs.writeFile(target, buildConstitution(values));
  } else if (relPath.endsWith('CHANGELOG.md')) {
    await fs.writeFile(target, buildStarterChangelog(values));
  } else if (relPath.endsWith('tasks/lessons.md')) {
    await fs.writeFile(target, buildStarterLessons(values));
  } else if (relPath.endsWith('.gitkeep')) {
    await fs.writeFile(target, '');
  }

  console.log(chalk.green(`✓ ${relPath} (generated)`));
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
