/**
 * update command — updates scaffold to the latest version.
 * Usage: ais update [target-dir] [options]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import semver from 'semver';
import { getVersion } from '../core/version.js';

export function updateCommand(cli) {
  cli.command('update [target-dir]', 'Update scaffold to the latest version — (placeholder — Phase 3)')
    .option('--target-version <version>', 'Update to a specific version')
    .option('--dry-run', 'Show what would be updated without making changes')
    .option('--force', 'Force update even if already up to date')
    .example('ais update')
    .example('ais update ./my-project --target-version 1.0.0')
    .example('ais update --dry-run')
    .action(async (targetDir, options) => {
      await runUpdate(targetDir, options);
    });
}

async function runUpdate(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const { dryRun = false, force = false } = options;
  const targetVersion = options.targetVersion;

  console.log(chalk.bold(`\n🔄 AI Scaffold update — ${target}\n`));

  const scaffoldFile = path.join(target, '.ai-scaffold.json');

  // 1. Check if scaffold is installed
  if (!(await fs.pathExists(scaffoldFile))) {
    console.error(chalk.red('✗ No scaffold installation found.'));
    console.error(chalk.gray('  Run `ais init` to install the scaffold first.'));
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

  if (!semver.valid(currentVersion)) {
    console.error(chalk.red(`✗ Installed scaffold version is invalid: ${currentVersion}`));
    console.error(chalk.gray('  Run `ais doctor` and reinstall or repair the scaffold metadata before updating.'));
    process.exit(1);
  }

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

  console.log(chalk.cyan(`  Installed version:  ${currentVersion}`));
  console.log(chalk.cyan(`  CLI version:        ${cliVersion}`));
  console.log(chalk.cyan(`  Target version:     ${resolvedVersion}`));
  console.log(chalk.cyan(`  Profile:            ${currentData.profile ?? 'unknown'}`));
  console.log(chalk.yellow(`  File update engine: not implemented yet`));
  console.log('');

  // 4. Compare versions
  const comparison = semver.compare(resolvedVersion, currentVersion);

  if (comparison === 0 && !force) {
    console.log(chalk.green(`✓ Already at version ${currentVersion}`));
    console.log(chalk.gray('  No files changed.'));
    return;
  }

  if (comparison < 0 && !force) {
    console.log(chalk.yellow(`⚠ Target version ${resolvedVersion} is older than current ${currentVersion}.`));
    console.log(chalk.gray('  Downgrade migrations are not implemented. No files changed.'));
    return;
  }

  if (dryRun) {
    console.log(chalk.gray(`[dry-run] No files changed.`));
    console.log(chalk.gray('  Full managed-file updates, diffs, and manifest migrations are planned for Phase 3.'));
    return;
  }

  console.error(chalk.red('✗ Safe file update logic is not implemented yet. No files changed.'));
  console.error(chalk.gray('  Use `ais update --dry-run` to inspect installed metadata.'));
  console.error(chalk.gray('  Wait for the Phase 3 update engine before changing scaffold versions.'));
  process.exit(1);
}
