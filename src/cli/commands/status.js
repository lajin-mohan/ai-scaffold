/**
 * status command — reports installed scaffold version, profile, and managed files.
 * Usage: ai-scaffold status [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export function statusCommand(cli) {
  cli.command('status [target-dir]', 'Show installed scaffold version, profile, and status')
    .option('--json', 'Output status as JSON')
    .example('ai-scaffold status')
    .example('ai-scaffold status ./my-project')
    .action(async (targetDir, options) => {
      await runStatus(targetDir, options);
    });
}

async function runStatus(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const scaffoldFile = path.join(target, '.ai-scaffold.json');

  if (options.json) {
    const status = await getStatusObject(target);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(chalk.bold(`\n📊 ai-scaffold status — ${target}\n`));

  const status = await getStatusObject(target);

  if (!status.installed) {
    console.log(chalk.yellow('⚠ No scaffold installed in this directory.'));
    console.log(chalk.gray('  Run `ai-scaffold init` to install the scaffold.'));
    return;
  }

  // Core info
  console.log(chalk.bold('Scaffold Info'));
  console.log(`  Version:    ${chalk.cyan(status.version)}`);
  console.log(`  Profile:    ${chalk.cyan(status.profile)}`);
  console.log(`  Installed:  ${chalk.gray(status.installedAt)}`);
  console.log(`  Updated:    ${chalk.gray(status.updatedAt)}`);
  console.log(`  Source:     ${chalk.gray(status.source)}`);

  // Bootstrap defaults
  if (status.defaultedValues && status.defaultedValues.length > 0) {
    console.log(chalk.bold('\nDefaulted Values'));
    console.log(`  ${chalk.gray(status.defaultedValues.join(', '))}`);
  }

  // Managed files
  console.log(chalk.bold('\nManaged Files'));
  const managedFiles = await countManagedFiles(target);
  console.log(`  ${chalk.cyan(managedFiles)} managed files`);

  // Modified files
  const modified = await findModifiedFiles(target);
  if (modified.length === 0) {
    console.log(chalk.green('  No modified files'));
  } else {
    console.log(chalk.yellow(`  ${modified.length} modified file(s):`));
    for (const f of modified.slice(0, 10)) {
      console.log(`    ~ ${chalk.yellow(f)}`);
    }
    if (modified.length > 10) {
      console.log(`    ... and ${modified.length - 10} more`);
    }
  }

  // Health status
  const health = getHealthStatus(status, modified);
  console.log(chalk.bold('\nHealth'));
  console.log(`  Status: ${health.icon} ${health.label}`);
  if (health.message) {
    console.log(`  ${chalk.gray(health.message)}`);
  }

  console.log('');
}

async function getStatusObject(target) {
  const scaffoldFile = path.join(target, '.ai-scaffold.json');

  if (!(await fs.pathExists(scaffoldFile))) {
    return { installed: false, target };
  }

  try {
    const data = await fs.readJson(scaffoldFile);
    return { installed: true, target, ...data };
  } catch {
    return { installed: false, target, error: 'Corrupt .ai-scaffold.json' };
  }
}

async function countManagedFiles(target) {
  const managedPaths = [
    '.claude/',
    '.cursor/',
    '_ai/',
    'docs/',
    'tasks/',
    'AGENTS.md',
    'CLAUDE.md',
    'HOW-TO-USE.md',
    'CONTRIBUTING.md',
  ];

  let count = 0;
  for (const p of managedPaths) {
    const fullPath = path.join(target, p);
    if (await fs.pathExists(fullPath)) {
      count++;
    }
  }
  return count;
}

async function findModifiedFiles(target) {
  // Placeholder — returns empty list until hash tracking is implemented
  // Phase 3 will add file hash comparison
  return [];
}

function getHealthStatus(status, modified) {
  if (modified.length > 0) {
    return { icon: '⚠', label: chalk.yellow('Modified'), message: 'Some managed files have been changed' };
  }
  if (status.bootstrapped) {
    return { icon: '✓', label: chalk.green('Healthy'), message: 'All managed files are intact' };
  }
  return { icon: '○', label: chalk.cyan('Partial'), message: 'Scaffold installed but not fully configured' };
}