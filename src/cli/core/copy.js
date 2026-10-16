/**
 * Copy module — handles safe file copying with conflict detection and confirmation.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { buildManagedFileRecords } from './manifest.js';
import { renderPlannedFile } from './render.js';

/**
 * Copy staged files to target directory.
 * Shows diff for conflicting files and prompts before overwriting.
 *
 * @param {object} plan - File plan from buildFilePlan()
 * @param {object} bootstrapValues - Resolved bootstrap values for placeholder replacement
 * @param {object} opts - { dryRun: boolean, force: boolean, now?: Date, installMode?: 'create'|'init' }
 */
export async function copyFiles(plan, bootstrapValues, opts = {}) {
  const { dryRun = false, force = false, yes = false } = opts;
  // One clock for the whole run, so every stamp in one install agrees (NFR-07).
  const now = opts.now ?? new Date();
  // Accept both shapes:
  // - Flat object from collectBootstrapValues() (interactive path)
  // - { resolved, defaulted } from resolveWithDefaults() (--yes path)
  const values = bootstrapValues.resolved
    ? { ...bootstrapValues.resolved, defaulted: bootstrapValues.defaulted ?? [] }
    : { ...bootstrapValues, defaulted: bootstrapValues.defaulted ?? [] };
  if (opts.installMode) values.installMode = opts.installMode;

  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const writtenFiles = [];

  // Handle protected files
  for (const file of plan.skipProtected) {
    if (!file.exists) {
      // Protected file missing in target — offer to create it
      if (force || yes) {
        await writePlannedFile(file, values, dryRun, now);
        writtenFiles.push(file.rel);
        copied++;
      } else {
        console.log(chalk.yellow(`? ${file.rel} — protected file missing in target`));
        const answer = await confirm(`  Create from template?`);
        if (answer) {
          await writePlannedFile(file, values, dryRun, now);
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
        await writePlannedFile(file, values, dryRun, now);
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
    await copySingle(file, values, dryRun, now);
    writtenFiles.push(file.rel);
    copied++;
  }

  // Generate per-project files
  for (const file of plan.generate) {
    await generateFile(file, values, dryRun, now);
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

async function writePlannedFile(file, values, dryRun, now) {
  if (file.src) {
    await copySingle(file, values, dryRun, now);
  } else {
    await generateFile(file, values, dryRun, now);
  }
}

/**
 * Copy a single file with placeholder resolution.
 */
async function copySingle(file, values, dryRun, now) {
  const { src, target } = file;
  if (dryRun) {
    console.log(chalk.gray(`[dry-run] copy: ${src} → ${target}`));
    return;
  }

  await fs.ensureDir(path.dirname(target));
  await fs.writeFile(target, await renderPlannedFile(file, values, { kind: 'copy', now }));
  console.log(chalk.green(`✓ ${path.relative(process.cwd(), target)}`));
}

/**
 * Generate a per-project file from a template with resolved values.
 * @param {object} file - Generated file plan entry
 * @param {object} values - Resolved bootstrap values
 * @param {boolean} dryRun
 * @param {Date} now
 */
async function generateFile(file, values, dryRun, now) {
  const { rel: relPath, target } = file;

  if (dryRun) {
    console.log(chalk.gray(`[dry-run] generate: ${relPath}`));
    return;
  }

  await fs.ensureDir(path.dirname(target));
  const content = await renderPlannedFile(file, values, { kind: 'generate', now });
  if (content !== null) {
    await fs.writeFile(target, content);
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
