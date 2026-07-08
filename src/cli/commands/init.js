/**
 * init command — installs scaffold into an existing project directory.
 * Usage: ais init [target-dir] [options]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { collectBootstrapValues, resolveWithDefaults } from '../core/prompts.js';
import { buildFilePlan } from '../core/file-plan.js';
import { detectConflicts, printConflictReport } from '../core/conflicts.js';
import { copyFiles } from '../core/copy.js';
import { templatePath } from '../core/paths.js';

export function initCommand(cli) {
  cli.command('init [target-dir]', 'Install scaffold into an existing directory')
    .option('--profile <profile>', 'Scaffold profile to use (generic, laravel, node)', { default: 'generic' })
    .option('--yes', 'Use defaults for all options, no prompts')
    .option('--dry-run', 'Show what would be installed without writing files')
    .option('--force', 'Overwrite existing files without prompting')
    .option('--project-name <name>', 'Override project name (slug)')
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
    .example('ais init')
    .example('ais init ./my-existing-project --profile node --yes')
    .example('ais init --dry-run')
    .action(async (targetDir, options) => {
      await runInit(targetDir, options);
    });
}

async function runInit(targetDir, options) {
  const { profile = 'generic', yes = false, dryRun = false, force = false } = options;

  // Default to current directory if no target specified
  const resolvedTarget = targetDir ? path.resolve(targetDir) : process.cwd();

  console.log(chalk.bold(`\n🔧 AI Scaffold init — ${resolvedTarget}\n`));

  // 1. Verify target exists
  if (!dryRun && !(await fs.pathExists(resolvedTarget))) {
    console.error(chalk.red(`✗ Directory does not exist: ${resolvedTarget}`));
    console.error(chalk.gray('  Use `ais create <project>` for new projects.'));
    process.exit(1);
  }

  // 2. Derive project name from directory if not provided
  const projectName = options['project-name'] || options.projectName
    || path.basename(resolvedTarget).replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  // 3. Collect bootstrap values
  const flags = {
    projectName,
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

  let resolved;
  try {
    resolved = yes
      ? resolveWithDefaults(flags).resolved
      : await collectBootstrapValues(flags);
  } catch (error) {
    console.error(chalk.red(`✗ ${error.message}`));
    process.exit(1);
  }

  // 4. Build file plan
  console.log(chalk.gray('Building file plan...'));
  const templateDir = templatePath(profile);
  const plan = await buildFilePlan(templateDir, resolvedTarget, { existingTarget: true });

  // 5. Detect conflicts
  const conflicts = await detectConflicts(resolvedTarget, plan);
  printConflictReport(conflicts);

  // 6. Copy files
  console.log(chalk.gray('\nInstalling scaffold...'));
  const result = await copyFiles(plan, resolved, { dryRun, force, yes, targetDir: resolvedTarget });

  // 7. Summary
  if (dryRun) {
    console.log(chalk.gray(`\n[dry-run] Would install ${result.copied} files, skip ${result.skipped}`));
  } else {
    console.log(chalk.green(`\n✓ Done! Scaffold installed in ${resolvedTarget}/`));
    console.log(chalk.gray(`  Profile: ${resolved.profile ?? profile}`));
    console.log(chalk.gray(`  Bootstrap: ${resolved.profile ?? profile}\n`));
  }
}
