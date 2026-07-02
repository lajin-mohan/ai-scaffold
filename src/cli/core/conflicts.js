/**
 * Conflicts module — detects and reports conflicts between scaffold and existing project.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { diffLines } from 'diff';

/**
 * Detect all conflicts in the target directory.
 * Returns categorized conflict report.
 */
export async function detectConflicts(targetDir, plan) {
  const conflicts = {
    protectedExists: [],
    managedModified: [],
    managedMissing: [],
    claudDirExists: false,
  };

  // Check if .claude/ already exists
  const claudDir = path.join(targetDir, '.claude');
  conflicts.claudDirExists = await fs.pathExists(claudDir);

  // Check protected files that already exist
  for (const file of plan.skipProtected) {
    if (file.exists) {
      conflicts.protectedExists.push(file.rel);
    }
  }

  // Check managed files that are modified or missing
  for (const file of [...plan.copy, ...plan.generate]) {
    const targetExists = await fs.pathExists(file.target);
    if (!targetExists) {
      conflicts.managedMissing.push(file.rel);
    } else {
      // Compare content if it's a text file we can read
      try {
        const srcContent = await fs.readFile(file.src, 'utf-8');
        const targetContent = await fs.readFile(file.target, 'utf-8');
        if (srcContent !== targetContent) {
          conflicts.managedModified.push({
            rel: file.rel,
            src: file.src,
            target: file.target,
          });
        }
      } catch {
        // Binary or unreadable — skip diff check
      }
    }
  }

  return conflicts;
}

/**
 * Print a human-readable conflict report.
 */
export function printConflictReport(conflicts) {
  const hasConflicts = conflicts.protectedExists.length > 0
    || conflicts.managedModified.length > 0
    || conflicts.managedMissing.length > 0
    || conflicts.claudDirExists;

  if (!hasConflicts) {
    console.log(chalk.green('✓ No conflicts detected — clean install'));
    return;
  }

  console.log(chalk.yellow('⚠ Conflicts detected:'));
  console.log('');

  if (conflicts.claudDirExists) {
    console.log(chalk.yellow('  .claude/ directory already exists in target'));
    console.log('');
  }

  if (conflicts.protectedExists.length > 0) {
    console.log(chalk.cyan('  Protected files (will not be overwritten without --force):'));
    for (const rel of conflicts.protectedExists) {
      console.log(chalk.cyan(`    ⊘ ${rel}`));
    }
    console.log('');
  }

  if (conflicts.managedModified.length > 0) {
    console.log(chalk.yellow('  Modified managed files (will be updated):'));
    for (const { rel } of conflicts.managedModified) {
      console.log(chalk.yellow(`    ~ ${rel}`));
    }
    console.log('');
  }

  if (conflicts.managedMissing.length > 0) {
    console.log(chalk.cyan('  New managed files (will be created):'));
    for (const rel of conflicts.managedMissing) {
      console.log(chalk.cyan(`    + ${rel}`));
    }
    console.log('');
  }
}

/**
 * Show a diff between source and target for a conflicting file.
 */
export async function showDiff(srcFile, targetFile) {
  try {
    const srcContent = await fs.readFile(srcFile, 'utf-8');
    const targetContent = await fs.readFile(targetFile, 'utf-8');
    const changes = diffLines(targetContent, srcContent);

    console.log(chalk.gray(`\n--- ${path.basename(targetFile)} (current)`));
    console.log(chalk.gray(`+++ ${path.basename(srcFile)} (scaffold)`));

    for (const part of changes) {
      const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.gray;
      process.stdout.write(color(part.value));
    }
    console.log('');
  } catch {
    // Can't diff — skip
  }
}