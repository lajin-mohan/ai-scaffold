/**
 * create command — bootstraps a new project from a scaffold profile.
 * Usage: ais create <project-name> [options]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { collectBootstrapValues, resolveWithDefaults } from '../core/prompts.js';
import { buildFilePlan } from '../core/file-plan.js';
import { detectConflicts, printConflictReport } from '../core/conflicts.js';
import { copyFiles } from '../core/copy.js';
import { buildDryRunPlan, emptyConflicts } from '../core/dry-run-plan.js';
import { templatePath } from '../core/paths.js';

export function createCommand(cli) {
  cli.command('create <project-name>', 'Create a new project from the scaffold')
    .option('--profile <profile>', 'Scaffold profile to use (generic, node, python, golang, laravel; aliases: js, py, go)', { default: 'generic' })
    .option('--yes', 'Use defaults for all options, no prompts')
    .option('--dry-run', 'Show what would be created without writing files')
    .option('--json', 'Print machine-readable dry-run plan as JSON')
    .option('--force', 'Overwrite existing files without prompting')
    .option('--no-git', 'Skip git init and the initial scaffold commit')
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
  const { profile = 'generic', yes = false, dryRun = false, json = false, force = false } = options;
  const shouldInitGit = options.git !== false;

  if (json && !dryRun) {
    console.error(chalk.red('✗ --json is only supported with --dry-run'));
    process.exit(1);
  }

  if (!json) {
    console.log(chalk.bold(`\n🔧 AI Scaffold create — ${projectName}\n`));
  }

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

  // --json is a machine-readable mode — never drop into interactive prompts,
  // which would pollute stdout and corrupt the JSON. Resolve non-interactively
  // whenever --json or --yes is set.
  const nonInteractive = yes || json;
  let bootstrap;
  try {
    bootstrap = nonInteractive
      ? resolveWithDefaults(flags)
      : { resolved: await collectBootstrapValues(flags), defaulted: [] };
  } catch (error) {
    console.error(chalk.red(`✗ ${error.message}`));
    process.exit(1);
  }
  const resolved = bootstrap.resolved;

  // 3. Build file plan — target is new, so no protected-file logic needed
  if (!json) {
    console.log(chalk.gray('Building file plan...'));
  }
  const plan = await buildFilePlan(templateDir, targetDir, { existingTarget: false });

  // 4. Detect conflicts (only for dry-run / existing dirs)
  let conflicts = emptyConflicts();
  if (fs.existsSync(targetDir)) {
    conflicts = await detectConflicts(targetDir, plan);
    if (!json) {
      printConflictReport(conflicts);
    }
  } else {
    if (!json) {
      console.log(chalk.green('✓ Clean target directory'));
    }
  }

  if (json) {
    console.log(JSON.stringify(buildDryRunPlan({
      command: 'create',
      targetDir,
      profile,
      plan,
      conflicts,
      values: resolved,
      defaultedValues: bootstrap.defaulted ?? [],
      existingTarget: false,
    }), null, 2));
    return;
  }

  // 5. Copy files
  console.log(chalk.gray('\nCopying files...'));
  const result = await copyFiles(plan, bootstrap, { dryRun, force, targetDir });

  // 6. Initialize git for new projects unless explicitly disabled.
  const gitResult = !dryRun && shouldInitGit
    ? initializeGitRepository(targetDir)
    : null;

  // 7. Summary
  if (dryRun) {
    console.log(chalk.gray(`\n[dry-run] Would create ${result.copied} files, skip ${result.skipped}`));
  } else {
    console.log(chalk.green(`\n✓ Done! Created ${result.copied} files in ./${projectName}/`));
    console.log(chalk.gray(`  Profile: ${resolved.profile ?? profile}`));
    if (gitResult?.initialized) {
      console.log(chalk.gray(`  Git: initialized${gitResult.committed ? ' with initial commit' : ''}`));
    } else if (gitResult?.warning) {
      console.log(chalk.yellow(`  Git: ${gitResult.warning}`));
    }
    console.log(chalk.gray(`  Bootstrap: ${resolved.profile ?? profile}\n`));
  }
}

function initializeGitRepository(targetDir) {
  const gitAvailable = runGit(['--version'], process.cwd());
  if (gitAvailable.status !== 0) {
    return { initialized: false, committed: false, warning: 'git not available; skipped initialization' };
  }

  const init = runGit(['init'], targetDir);
  if (init.status !== 0) {
    return {
      initialized: false,
      committed: false,
      warning: `git init failed; skipped initial commit (${summarizeGitError(init)})`,
    };
  }

  const add = runGit(['add', '--all'], targetDir);
  if (add.status !== 0) {
    return {
      initialized: true,
      committed: false,
      warning: `git initialized, but git add failed (${summarizeGitError(add)})`,
    };
  }

  const commit = runGit([
    '-c',
    'user.name=AI Scaffold',
    '-c',
    'user.email=ai-scaffold@example.invalid',
    'commit',
    '-m',
    'Initial scaffold commit',
  ], targetDir);

  if (commit.status !== 0) {
    return {
      initialized: true,
      committed: false,
      warning: `git initialized, but initial commit failed (${summarizeGitError(commit)})`,
    };
  }

  return { initialized: true, committed: true };
}

function runGit(args, cwd) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function summarizeGitError(result) {
  const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
  return output.split('\n').find(Boolean)?.trim() || `exit ${result.status}`;
}
