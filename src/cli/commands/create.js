/**
 * create command — bootstraps a new project from a scaffold profile.
 * Usage: ais create <project-name> [options]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { CAC } from 'cac';
import { collectBootstrapValues, resolveWithDefaults } from '../core/prompts.js';
import { buildFilePlan } from '../core/file-plan.js';
import { detectConflicts, printConflictReport } from '../core/conflicts.js';
import { copyFiles } from '../core/copy.js';
import { templatePath } from '../core/paths.js';

export function createCommand(cli) {
  cli.command('create <project-name>', 'Create a new project from the scaffold')
    .option('--profile <profile>', 'Scaffold profile to use (generic, laravel, node)', { default: 'generic' })
    .option('--yes', 'Use defaults for all options, no prompts')
    .option('--dry-run', 'Show what would be created without writing files')
    .option('--force', 'Overwrite existing files without prompting')
    .option('--project-name <name>', 'Project name (slug)')
    .option('--display-name <name>', 'Display name')
    .option('--purpose <text>', 'One-line purpose')
    .option('--project-type <type>', 'Project type/kind (api, web-app, full-stack, library, cli, mobile, infra, data, internal-tool, saas)')
    .option('--owner-email <email>', 'Owner email')
    .option('--backend-stack <stack>', 'Backend stack')
    .option('--frontend-stack <stack>', 'Frontend stack')
    .option('--database <db>', 'Database')
    .option('--multi-tenant', 'Enable multi-tenancy')
    .option('--no-multi-tenant', 'Disable multi-tenancy')
    .option('--compliance <scope>', 'Compliance scope, comma-separated when multiple (GDPR,SOC2)')
    .option('--lifecycle-stage <stage>', 'Lifecycle stage (discovery, active-development, production, maintenance, legacy-modernization)')
    .option('--data-sensitivity <level>', 'Data sensitivity (public, internal, confidential, regulated)')
    .option('--requirements-source <source>', 'Requirements source (existing-docs, create-later, create-now)')
    .option('--requirements-path <path>', 'Existing or intended requirements path')
    .option('--test-command <command>', 'Test command')
    .option('--lint-command <command>', 'Lint command')
    .option('--typecheck-command <command>', 'Typecheck command')
    .option('--build-command <command>', 'Build command')
    .example('ais create billing-api')
    .example('ais create my-app --profile node --yes')
    .example('ais create my-app --dry-run')
    .action(async (projectName, options) => {
      await runCreate(projectName, options);
    });
}

async function runCreate(projectName, options) {
  const { profile = 'generic', yes = false, dryRun = false, force = false } = options;

  console.log(chalk.bold(`\n🔧 AI Scaffold create — ${projectName}\n`));

  // 1. Resolve project directory
  const targetDir = path.resolve(projectName);
  const templateDir = templatePath(profile);
  const projectSlug = options['project-name'] || options.projectName
    || path.basename(targetDir).replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  if (!dryRun && fs.existsSync(targetDir)) {
    console.error(chalk.red(`✗ Directory already exists: ${targetDir}`));
    console.error(chalk.gray('  Use a different project name, or `ais init` to install into an existing directory.'));
    process.exit(1);
  }

  // 2. Collect bootstrap values
  const flags = {
    projectName: projectSlug,
    displayName: options['display-name'] || options.displayName,
    purpose: options.purpose,
    projectType: options['project-type'] || options.projectType,
    ownerEmail: options['owner-email'] || options.ownerEmail,
    backendStack: options['backend-stack'] || options.backendStack,
    frontendStack: options['frontend-stack'] || options.frontendStack,
    database: options.database,
    multiTenant: options.multiTenant,
    complianceScope: options.compliance || options.complianceScope,
    lifecycleStage: options['lifecycle-stage'] || options.lifecycleStage,
    dataSensitivity: options['data-sensitivity'] || options.dataSensitivity,
    requirementsSource: options['requirements-source'] || options.requirementsSource,
    requirementsPath: options['requirements-path'] || options.requirementsPath,
    testCommand: options['test-command'] || options.testCommand,
    lintCommand: options['lint-command'] || options.lintCommand,
    typecheckCommand: options['typecheck-command'] || options.typecheckCommand,
    buildCommand: options['build-command'] || options.buildCommand,
    profile,
  };

  const resolved = yes
    ? resolveWithDefaults(flags).resolved
    : await collectBootstrapValues(flags);

  // 3. Build file plan — target is new, so no protected-file logic needed
  console.log(chalk.gray('Building file plan...'));
  const plan = await buildFilePlan(templateDir, targetDir, { existingTarget: false });

  // 4. Detect conflicts (only for dry-run / existing dirs)
  if (fs.existsSync(targetDir)) {
    const conflicts = await detectConflicts(targetDir, plan);
    printConflictReport(conflicts);
  } else {
    console.log(chalk.green('✓ Clean target directory'));
  }

  // 5. Copy files
  console.log(chalk.gray('\nCopying files...'));
  const result = await copyFiles(plan, resolved, { dryRun, force, targetDir });

  // 6. Summary
  if (dryRun) {
    console.log(chalk.gray(`\n[dry-run] Would create ${result.copied} files, skip ${result.skipped}`));
  } else {
    console.log(chalk.green(`\n✓ Done! Created ${result.copied} files in ./${projectName}/`));
    console.log(chalk.gray(`  Profile: ${resolved.profile ?? profile}`));
    console.log(chalk.gray(`  Bootstrap: ${resolved.profile ?? profile}\n`));
  }
}
