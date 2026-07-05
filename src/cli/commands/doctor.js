/**
 * doctor command — diagnoses scaffold installation health and flags issues.
 * Usage: ai-scaffold doctor [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import crypto from 'crypto';

export function doctorCommand(cli) {
  cli.command('doctor [target-dir]', 'Diagnose scaffold installation health')
    .option('--json', 'Output diagnostics as JSON')
    .example('ai-scaffold doctor')
    .example('ai-scaffold doctor ./my-project --json')
    .action(async (targetDir, options) => {
      await runDoctor(targetDir, options);
    });
}

async function runDoctor(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();

  if (options.json) {
    const diagnostics = await runDiagnostics(target);
    console.log(JSON.stringify(diagnostics, null, 2));
    return;
  }

  console.log(chalk.bold(`\n🔬 ai-scaffold doctor — ${target}\n`));

  const diagnostics = await runDiagnostics(target);
  printDiagnostics(diagnostics);
}

async function runDiagnostics(target) {
  const checks = [];
  const scaffoldFile = path.join(target, '.ai-scaffold.json');
  const scaffoldDir = path.join(target, '.ai-scaffold');
  const claudDir = path.join(target, '.claude');
  const memoryFile = path.join(target, '.claude', 'MEMORY.md');
  const settingsFile = path.join(target, '.claude', 'settings-overrides.json');

  // 1. Scaffold file present
  checks.push({
    name: 'Scaffold manifest (.ai-scaffold.json)',
    passed: await fs.pathExists(scaffoldFile),
    severity: 'critical',
    message: 'Scaffold manifest not found. Run `ai-scaffold init` to install.',
  });

  // 2. .claude/ directory present
  checks.push({
    name: '.claude/ directory',
    passed: await fs.pathExists(claudDir),
    severity: 'critical',
    message: '.claude/ directory not found.',
  });

  // 3. .claude/MEMORY.md present
  checks.push({
    name: 'Project memory (.claude/MEMORY.md)',
    passed: await fs.pathExists(memoryFile),
    severity: 'high',
    message: 'Project memory file not found.',
  });

  // 4. .claude/settings-overrides.json present
  checks.push({
    name: 'Settings overrides (.claude/settings-overrides.json)',
    passed: await fs.pathExists(settingsFile),
    severity: 'high',
    message: 'Settings overrides file not found.',
  });

  // 5. Validate .ai-scaffold.json structure
  let manifestValid = false;
  let manifestData = null;
  if (await fs.pathExists(scaffoldFile)) {
    try {
      manifestData = await fs.readJson(scaffoldFile);
      manifestValid = !!(manifestData.version && manifestData.profile);
    } catch {
      manifestValid = false;
    }
  }
  checks.push({
    name: 'Scaffold manifest valid',
    passed: manifestValid,
    severity: 'high',
    message: manifestValid ? undefined : 'Manifest is corrupt or missing required fields.',
  });

  const integrity = manifestData
    ? await findManagedFileIssues(target, manifestData)
    : { modified: [], missing: [] };

  checks.push({
    name: 'Managed files present',
    passed: integrity.missing.length === 0,
    severity: 'high',
    message: integrity.missing.length > 0 ? `Missing: ${integrity.missing.slice(0, 10).join(', ')}` : undefined,
  });

  checks.push({
    name: 'Managed files unmodified',
    passed: integrity.modified.length === 0,
    severity: 'medium',
    message: integrity.modified.length > 0 ? `Modified: ${integrity.modified.slice(0, 10).join(', ')}` : undefined,
  });

  const namespacedInstall = await fs.pathExists(scaffoldDir);
  const managedRoot = namespacedInstall ? scaffoldDir : target;

  // 6. Check required managed files
  const requiredFiles = ['CLAUDE.md', 'HOW-TO-USE.md', 'AGENTS.md'];
  const missingRequired = [];
  for (const f of requiredFiles) {
    if (!(await fs.pathExists(path.join(managedRoot, f)))) {
      missingRequired.push(f);
    }
  }
  checks.push({
    name: 'Required managed files',
    passed: missingRequired.length === 0,
    severity: 'medium',
    message: missingRequired.length > 0 ? `Missing: ${missingRequired.join(', ')}` : undefined,
  });

  // 7. Check docs/ and tasks/ directories
  checks.push({
    name: namespacedInstall ? '.ai-scaffold/docs/ directory' : 'docs/ directory',
    passed: await fs.pathExists(path.join(managedRoot, 'docs')),
    severity: 'low',
    message: `${namespacedInstall ? '.ai-scaffold/docs' : 'docs'} directory not found.`,
  });

  checks.push({
    name: namespacedInstall ? '.ai-scaffold/tasks/ directory' : 'tasks/ directory',
    passed: await fs.pathExists(path.join(managedRoot, 'tasks')),
    severity: 'low',
    message: `${namespacedInstall ? '.ai-scaffold/tasks' : 'tasks'} directory not found.`,
  });

  // 8. Check .git/ directory
  checks.push({
    name: 'Git repository (.git/)',
    passed: await fs.pathExists(path.join(target, '.git')),
    severity: 'medium',
    message: 'Not a git repository. Recommended for version control.',
  });

  // Summary
  const criticalFailed = checks.filter((c) => c.severity === 'critical' && !c.passed).length;
  const highFailed = checks.filter((c) => c.severity === 'high' && !c.passed).length;
  const mediumFailed = checks.filter((c) => c.severity === 'medium' && !c.passed).length;
  const lowFailed = checks.filter((c) => c.severity === 'low' && !c.passed).length;
  const allPassed = checks.every((c) => c.passed);

  return { target, checks, allPassed, criticalFailed, highFailed, mediumFailed, lowFailed, manifestData };
}

async function findManagedFileIssues(target, manifestData) {
  const modified = [];
  const missing = [];

  if (!Array.isArray(manifestData.managedFiles)) {
    return { modified, missing };
  }

  for (const file of manifestData.managedFiles) {
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

function printDiagnostics(diagnostics) {
  const { checks, allPassed, criticalFailed, highFailed, mediumFailed, lowFailed } = diagnostics;

  const severityColor = { critical: chalk.red, high: chalk.yellow, medium: chalk.yellow, low: chalk.gray };
  const severityLabel = { critical: 'CRIT', high: 'HIGH', medium: 'MED', low: 'LOW' };

  for (const check of checks) {
    const color = severityColor[check.severity];
    const icon = check.passed ? chalk.green('✓') : color('✗');
    const label = severityLabel[check.severity];
    console.log(`  ${icon} [${label}] ${check.name}`);
    if (!check.passed && check.message) {
      console.log(`         ${chalk.gray(check.message)}`);
    }
  }

  console.log('');

  if (allPassed) {
    console.log(chalk.green(`✓ All checks passed — scaffold installation is healthy.`));
  } else if (criticalFailed > 0) {
    console.log(chalk.red(`✗ ${criticalFailed} critical check(s) failed. Scaffold installation is broken.`));
    console.log(chalk.gray('  Run `ai-scaffold init --force` to reinstall.'));
  } else if (highFailed > 0) {
    console.log(chalk.yellow(`⚠ ${highFailed} high-severity check(s) failed. Some features may not work.`));
  } else {
    console.log(chalk.gray(`⚠ ${mediumFailed + lowFailed} minor issue(s) found. Scaffold is functional.`));
  }

  if (diagnostics.manifestData) {
    console.log(chalk.bold('\nInstalled Configuration'));
    console.log(`  Version:  ${chalk.cyan(diagnostics.manifestData.version)}`);
    console.log(`  Profile:  ${chalk.cyan(diagnostics.manifestData.profile)}`);
    console.log(`  Source:   ${chalk.gray(diagnostics.manifestData.source ?? 'N/A')}`);
  }

  console.log('');
}
