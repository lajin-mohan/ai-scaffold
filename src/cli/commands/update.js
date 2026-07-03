/**
 * update command — updates scaffold to the latest version.
 * Usage: ai-scaffold update [target-dir] [options]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import semver from 'semver';
import { getVersion } from '../core/version.js';

export function updateCommand(cli) {
  cli.command('update [target-dir]', 'Update scaffold to the latest version — (placeholder — Phase 3)')
    .option('--version <version>', 'Update to a specific version')
    .option('--dry-run', 'Show what would be updated without making changes')
    .option('--force', 'Force update even if already up to date')
    .example('ai-scaffold update')
    .example('ai-scaffold update ./my-project --version 1.0.0')
    .example('ai-scaffold update --dry-run')
    .action(async (targetDir, options) => {
      await runUpdate(targetDir, options);
    });
}

async function runUpdate(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const { dryRun = false, force = false } = options;
  const targetVersion = options.version;

  console.log(chalk.bold(`\n🔄 ai-scaffold update — ${target}\n`));

  const scaffoldFile = path.join(target, '.ai-scaffold.json');

  // 1. Check if scaffold is installed
  if (!(await fs.pathExists(scaffoldFile))) {
    console.error(chalk.red('✗ No scaffold installation found.'));
    console.error(chalk.gray('  Run `ai-scaffold init` to install the scaffold first.'));
    process.exit(1);
  }

  // 2. Read current version
  let currentData;
  try {
    currentData = await fs.readJson(scaffoldFile);
  } catch {
    console.error(chalk.red('✗ .ai-scaffold.json is corrupt.'));
    process.exit(1);
  }

  const currentVersion = currentData.version;
  const cliVersion = getVersion();

  // 3. Determine target version
  let resolvedVersion;
  if (targetVersion) {
    if (!semver.valid(targetVersion)) {
      console.error(chalk.red(`✗ Invalid version: ${targetVersion}`));
      console.error(chalk.gray('  Use a valid semver version like 1.0.0 or 1.2.3'));
      process.exit(1);
    }
    resolvedVersion = targetVersion;
  } else {
    resolvedVersion = cliVersion;
  }

  // 4. Compare versions
  const comparison = semver.compare(resolvedVersion, currentVersion);

  if (comparison === 0 && !force) {
    console.log(chalk.green(`✓ Already at version ${currentVersion}`));
    console.log(chalk.gray('  Use --force to re-apply the same version.'));
    return;
  }

  if (comparison < 0 && !force) {
    console.log(chalk.yellow(`⚠ Target version ${resolvedVersion} is older than current ${currentVersion}.`));
    console.log(chalk.gray('  Use --force to downgrade.'));
    return;
  }

  if (comparison > 0) {
    console.log(chalk.cyan(`  Current:  ${currentVersion}`));
    console.log(chalk.cyan(`  Target:   ${resolvedVersion}`));
    console.log(chalk.cyan(`  Profile:  ${currentData.profile}`));
    console.log('');

    if (dryRun) {
      console.log(chalk.gray(`[dry-run] Would update from ${currentVersion} to ${resolvedVersion}`));
      console.log(chalk.gray('  Note: Delta update logic is not yet implemented (Phase 3).'));
      return;
    }

    // 5. Apply update
    // Phase 3 will implement delta updates and migration strategies
    // For now, this is a placeholder that updates the version field
    const updatedData = {
      ...currentData,
      version: resolvedVersion,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    await fs.writeJson(scaffoldFile, updatedData, { spaces: 2 });

    console.log(chalk.green(`✓ Updated from ${currentVersion} to ${resolvedVersion}`));
    console.log(chalk.gray('\n  Note: Full delta updates and migration strategies coming in Phase 3.'));
  }

  console.log('');
}