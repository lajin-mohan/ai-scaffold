/**
 * status command — reports installed scaffold version, profile, and managed files.
 * Usage: ais status [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import crypto from 'crypto';

export function statusCommand(cli) {
  cli.command('status [target-dir]', 'Show installed scaffold version, profile, and status')
    .option('--json', 'Output status as JSON')
    .example('ais status')
    .example('ais status ./my-project')
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

  console.log(chalk.bold(`\n📊 AI Scaffold status — ${target}\n`));

  const status = await getStatusObject(target);

  if (!status.installed) {
    console.log(chalk.yellow('⚠ No scaffold installed in this directory.'));
    console.log(chalk.gray('  Run `ais init` to install the scaffold.'));
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
  const managedFiles = await countManagedFiles(target, status);
  console.log(`  ${chalk.cyan(managedFiles)} managed files`);

  // Integrity
  const { modified, missing } = await findManagedFileIssues(target, status);
  if (missing.length > 0) {
    console.log(chalk.red(`  ${missing.length} missing file(s):`));
    for (const f of missing.slice(0, 10)) {
      console.log(`    - ${chalk.red(f)}`);
    }
    if (missing.length > 10) {
      console.log(`    ... and ${missing.length - 10} more`);
    }
  }

  if (modified.length > 0) {
    console.log(chalk.yellow(`  ${modified.length} modified file(s):`));
    for (const f of modified.slice(0, 10)) {
      console.log(`    ~ ${chalk.yellow(f)}`);
    }
    if (modified.length > 10) {
      console.log(`    ... and ${modified.length - 10} more`);
    }
  } else if (missing.length === 0) {
    console.log(chalk.green('  No missing or modified files'));
  }

  // Health status
  const health = getHealthStatus(status, modified, missing);
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

async function countManagedFiles(target, status = {}) {
  if (Array.isArray(status.managedFiles) && status.managedFiles.length > 0) {
    return status.managedFiles.length;
  }

  const managedPaths = [
    '.ai-scaffold/',
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

async function findManagedFileIssues(target, status = {}) {
  const modified = [];
  const missing = [];

  if (!Array.isArray(status.managedFiles)) {
    return { modified, missing };
  }

  for (const file of status.managedFiles) {
    const fullPath = path.join(target, file.path);
    if (!(await fs.pathExists(fullPath))) {
      missing.push(file.path);
      continue;
    }
    const hash = crypto
      .createHash('sha256')
      .update(await fs.readFile(fullPath))
      .digest('hex');
    if (file.hash !== `sha256:${hash}`) {
      modified.push(file.path);
    }
  }

  return { modified, missing };
}

function getHealthStatus(status, modified, missing) {
  if (missing.length > 0) {
    return { icon: '✗', label: chalk.red('Missing files'), message: 'Some managed files are missing' };
  }
  if (modified.length > 0) {
    return { icon: '⚠', label: chalk.yellow('Modified'), message: 'Some managed files have changed' };
  }
  if (status.bootstrapped) {
    return { icon: '✓', label: chalk.green('Healthy'), message: 'All managed files are intact' };
  }
  return { icon: '○', label: chalk.cyan('Partial'), message: 'Scaffold installed but not fully configured' };
}
