/**
 * doctor command — diagnoses scaffold installation health and flags issues.
 * Usage: ais doctor [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import crypto from 'crypto';
import { validateManifestContext } from '../core/prompts.js';

export function doctorCommand(cli) {
  cli.command('doctor [target-dir]', 'Diagnose scaffold installation health')
    .option('--json', 'Output diagnostics as JSON')
    .example('ais doctor')
    .example('ais doctor ./my-project --json')
    .action(async (targetDir, options) => {
      await runDoctor(targetDir, options);
    });
}

async function runDoctor(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();

  if (options.json) {
    const diagnostics = await runDiagnostics(target);
    console.log(JSON.stringify(diagnostics, null, 2));
    setExitCode(diagnostics);
    return;
  }

  console.log(chalk.bold(`\n🔬 AI Scaffold doctor — ${target}\n`));

  const diagnostics = await runDiagnostics(target);
  printDiagnostics(diagnostics);
  setExitCode(diagnostics);
}

// A failing critical/high check means the installation is broken or a core
// guarantee is inert — exit non-zero so CI and scripts can gate on it.
function setExitCode(diagnostics) {
  if (diagnostics.criticalFailed > 0 || diagnostics.highFailed > 0) {
    process.exitCode = 1;
  }
}

async function runDiagnostics(target) {
  const checks = [];
  const scaffoldFile = path.join(target, '.ai-scaffold.json');
  const scaffoldDir = path.join(target, '.ai-scaffold');
  const claudDir = path.join(target, '.claude');
  const memoryFile = path.join(target, '.claude', 'MEMORY.md');
  const settingsFile = path.join(target, '.claude', 'settings-overrides.json');
  const contextFile = path.join(scaffoldDir, 'context.md');

  // 1. Scaffold file present
  checks.push({
    name: 'Scaffold manifest (.ai-scaffold.json)',
    passed: await fs.pathExists(scaffoldFile),
    severity: 'critical',
    message: 'Scaffold manifest not found. Run `ais init` to install.',
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

  // 6. Check required managed files. Longer docs/tasks are optional packs.
  const requiredFiles = ['CLAUDE.md', 'AGENTS.md'];
  const missingRequired = [];
  for (const f of requiredFiles) {
    const rootExists = await fs.pathExists(path.join(target, f));
    const namespacedExists = await fs.pathExists(path.join(scaffoldDir, f));
    if (!rootExists && !namespacedExists) {
      missingRequired.push(f);
    }
  }
  checks.push({
    name: 'Required managed files',
    passed: missingRequired.length === 0,
    severity: 'medium',
    message: missingRequired.length > 0 ? `Missing: ${missingRequired.join(', ')}` : undefined,
  });

  checks.push({
    name: 'Scaffold namespace (.ai-scaffold/)',
    passed: await fs.pathExists(scaffoldDir),
    severity: 'medium',
    message: '.ai-scaffold/ directory not found.',
  });

  checks.push({
    name: 'Scaffold context (.ai-scaffold/context.md)',
    passed: await fs.pathExists(contextFile),
    severity: 'medium',
    message: '.ai-scaffold/context.md not found.',
  });

  const invalidContextFields = await findInvalidContextFields(manifestData, settingsFile);
  checks.push({
    name: 'Setup context values are meaningful',
    passed: invalidContextFields.length === 0,
    severity: 'medium',
    message: invalidContextFields.length > 0
      ? `Invalid setup values found: ${invalidContextFields.join(', ')}`
      : undefined,
  });

  // 7. Check .git/ directory
  checks.push({
    name: 'Git repository (.git/)',
    passed: await fs.pathExists(path.join(target, '.git')),
    severity: 'medium',
    message: 'Not a git repository. Recommended for version control.',
  });

  // 8. Claude Code hooks wired — the deterministic enforcement layer is inert
  // if settings.json has no hooks block, even when the hook scripts are present.
  checks.push(await checkHooksWired(target));

  // 9. Verification configured — a bootstrapped project with no test/lint/
  // typecheck/build commands cannot satisfy the verification mandate.
  checks.push(checkVerificationConfigured(manifestData));

  // 10. Governance skeleton — files the shipped CLAUDE.md workflow references.
  checks.push(await checkGovernanceSkeleton(target));

  // Summary
  const criticalFailed = checks.filter((c) => c.severity === 'critical' && !c.passed).length;
  const highFailed = checks.filter((c) => c.severity === 'high' && !c.passed).length;
  const mediumFailed = checks.filter((c) => c.severity === 'medium' && !c.passed).length;
  const lowFailed = checks.filter((c) => c.severity === 'low' && !c.passed).length;
  const allPassed = checks.every((c) => c.passed);

  return { target, checks, allPassed, criticalFailed, highFailed, mediumFailed, lowFailed, manifestData };
}

async function findInvalidContextFields(manifestData, settingsFile) {
  const invalid = [];
  const manifestChecks = [
    ['.ai-scaffold.json project.kind', manifestData?.project?.kind],
    ['.ai-scaffold.json project.lifecycleStage', manifestData?.project?.lifecycleStage],
    ['.ai-scaffold.json stack.frontend', manifestData?.stack?.frontend],
    ['.ai-scaffold.json risk.dataSensitivity', manifestData?.risk?.dataSensitivity],
    ['.ai-scaffold.json profile', manifestData?.profile],
  ];

  for (const [name, value] of manifestChecks) {
    if (typeof value === 'number') {
      invalid.push(name);
    }
  }

  let settingsData = null;
  if (await fs.pathExists(settingsFile)) {
    try {
      settingsData = await fs.readJson(settingsFile);
      const settingsChecks = [
        ['settings project.type', settingsData?.project?.type],
        ['settings project.lifecycleStage', settingsData?.project?.lifecycleStage],
        ['settings techStack.frontend', settingsData?.techStack?.frontend],
        ['settings project.dataSensitivity', settingsData?.project?.dataSensitivity],
      ];
      for (const [name, value] of settingsChecks) {
        if (typeof value === 'number') {
          invalid.push(name);
        }
      }
    } catch {
      // The existing settings-valid check reports corrupt JSON separately.
    }
  }

  return [...new Set([...invalid, ...validateManifestContext(manifestData ?? {}, settingsData)])];
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

async function checkHooksWired(target) {
  const settingsPath = path.join(target, '.claude', 'settings.json');
  let wired = false;
  if (await fs.pathExists(settingsPath)) {
    try {
      const settings = await fs.readJson(settingsPath);
      wired = !!settings.hooks && Object.keys(settings.hooks).length > 0;
    } catch {
      wired = false;
    }
  }
  return {
    name: 'Claude Code hooks wired (.claude/settings.json)',
    passed: wired,
    severity: 'high',
    message: wired ? undefined : 'No hooks block in .claude/settings.json — deterministic enforcement is inert.',
  };
}

function checkVerificationConfigured(manifestData) {
  const commands = manifestData?.commands ?? {};
  const values = [commands.test, commands.lint, commands.typecheck, commands.build];
  const allNone = values.every((command) => !command || command === 'none');
  const flagged = manifestData?.bootstrapped === true && allNone;
  return {
    name: 'Verification commands configured',
    passed: !flagged,
    severity: 'medium',
    message: flagged
      ? 'Bootstrapped but test/lint/typecheck/build are all "none" — configure them so /review and verification gates work.'
      : undefined,
  };
}

async function checkGovernanceSkeleton(target) {
  const required = ['tasks/lessons.md', 'CHANGELOG.md'];
  const missing = [];
  for (const rel of required) {
    if (!(await fs.pathExists(path.join(target, rel)))) {
      missing.push(rel);
    }
  }
  return {
    name: 'Governance skeleton present',
    passed: missing.length === 0,
    severity: 'medium',
    message: missing.length > 0 ? `Missing files the CLAUDE.md workflow references: ${missing.join(', ')}` : undefined,
  };
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
    console.log(chalk.gray('  Run `ais init --force` to reinstall.'));
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
