/**
 * export-context command — backs up the project's non-regenerable context
 * (memory, lessons, requirements notes, hand-edited settings/rules) before a
 * delete-and-reinstall upgrade. Item 56: with `ais update` deferred, "delete
 * the project and re-run `ais create`" is the accepted interim upgrade path —
 * this is the safeguard for it.
 * Usage: ais export-context [target-dir]
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import chalk from 'chalk';

// Relative to the target project. Deliberately the small, definite set that
// is never regenerable by `ais create`/`init` — not an attempt at drift
// detection (that's item 26, deferred alongside item 25's ais update).
const CONTEXT_PATHS = [
  'tasks/lessons.md',
  '.claude/MEMORY.md',
  '.claude/rules',
  '.claude/settings-overrides.json',
  '.ai-scaffold/context.md',
];

export function exportContextCommand(cli) {
  cli.command('export-context [target-dir]', "Back up a project's memory, lessons, and hand-edited settings before reinstalling")
    .option('--out <path>', 'Backup destination (default: ~/.ai-scaffold-backups/<project>-<timestamp>/)')
    .option('--json', 'Output the backup manifest as JSON')
    .example('ais export-context')
    .example('ais export-context ./my-project --out ~/backups/my-project')
    .action(async (targetDir, options) => {
      await runExportContext(targetDir, options);
    });
}

async function runExportContext(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const backupDir = options.out ? path.resolve(options.out) : defaultBackupDir(target);

  const manifest = await copyContextPaths(target, backupDir);

  if (options.json) {
    console.log(JSON.stringify({ target, backupDir, ...manifest }, null, 2));
  } else {
    printReport(target, backupDir, manifest);
  }

  if (manifest.copied.length === 0) {
    process.exitCode = 1;
  }
}

function defaultBackupDir(target) {
  const projectName = path.basename(target) || 'project';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(os.homedir(), '.ai-scaffold-backups', `${projectName}-${timestamp}`);
}

async function copyContextPaths(target, backupDir) {
  const copied = [];
  const missing = [];

  for (const relativePath of CONTEXT_PATHS) {
    const source = path.join(target, relativePath);
    if (!(await fs.pathExists(source))) {
      missing.push(relativePath);
      continue;
    }
    const destination = path.join(backupDir, relativePath);
    await fs.copy(source, destination);
    copied.push(relativePath);
  }

  return { copied, missing };
}

function printReport(target, backupDir, manifest) {
  console.log(chalk.bold(`\n📦 Export context — ${target}\n`));

  if (manifest.copied.length === 0) {
    console.log(chalk.yellow('⚠ Nothing to back up — none of the tracked context files exist here.'));
    console.log(chalk.gray('  Is this a scaffold-managed project? Run `ais doctor` to check.\n'));
    return;
  }

  console.log(chalk.bold('Backed up:'));
  for (const p of manifest.copied) {
    console.log(`  ${chalk.green('✓')} ${p}`);
  }

  if (manifest.missing.length > 0) {
    console.log(chalk.bold('\nNot found (skipped):'));
    for (const p of manifest.missing) {
      console.log(`  ${chalk.gray('-')} ${p}`);
    }
  }

  console.log(chalk.bold('\nBackup location:'));
  console.log(`  ${chalk.cyan(backupDir)}`);
  console.log(chalk.gray('\nSafe to delete and re-run `ais create` now. To restore, copy the files'));
  console.log(chalk.gray('above back into the new project from the backup location.\n'));
}
