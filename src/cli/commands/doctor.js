/**
 * doctor command — diagnoses scaffold installation health and flags issues.
 * Usage: ais doctor [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import crypto from 'crypto';
import { validateManifestContext } from '../core/prompts.js';
import { createBudget, resolveRepo } from '../core/gh-runner.js';
import { getProtection } from '../core/github-protection.js';
import { configuredContexts, observeContexts } from '../core/github-required-checks.js';
import {
  LOCAL_REASONS,
  buildRemoteChecks,
  checkGitHook,
  normalizeLocalCheck,
  reasonPhrase,
  summarise,
  unavailableRemoteChecks,
} from '../core/governance-checks.js';

/** NFR-01: ONE wall-clock deadline for the whole run, not one per call. */
const REMOTE_BUDGET_MS = 10_000;

/** The branches the shipped write-side script protects (setup-branch-protection.sh). */
const GOVERNED_BRANCHES = ['main', 'dev'];

/**
 * C-02 evaluates the first governed branch only.
 *
 * Two reasons, both about honesty rather than convenience. Required contexts are
 * per-branch, so unioning them across branches and observing on one would let a
 * dev-only requirement fail against main's history — a fabricated gap. And the
 * observation half costs a call per pull request against ONE shared 10s deadline
 * (NFR-01); doing it twice would push the common case into `timeout`, turning a
 * verified answer into an unavailable one. The branch is named in the output.
 */
const REQUIRED_CHECKS_BRANCH = GOVERNED_BRANCHES[0];

export function doctorCommand(cli) {
  cli.command('doctor [target-dir]', 'Diagnose scaffold installation health')
    .option('--json', 'Output diagnostics as JSON')
    .option('--require-remote', 'Treat unavailable GitHub checks as failures (for CI where gh is guaranteed)')
    .option('--repo <owner/name>', 'Repository to check, overriding `gh repo view` detection')
    .example('ais doctor')
    .example('ais doctor ./my-project --json')
    .example('ais doctor --require-remote --repo acme/widgets')
    .action(async (targetDir, options) => {
      await runDoctor(targetDir, options);
    });
}

async function runDoctor(targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();

  if (options.json) {
    const diagnostics = await runDiagnostics(target, options);
    console.log(JSON.stringify(diagnostics, null, 2));
    setExitCode(diagnostics);
    return;
  }

  console.log(chalk.bold(`\n🔬 AI Scaffold doctor — ${target}\n`));

  const diagnostics = await runDiagnostics(target, options);
  printDiagnostics(diagnostics);
  setExitCode(diagnostics);
}

// A failing critical/high check means the installation is broken or a core
// guarantee is inert — exit non-zero so CI and scripts can gate on it.
export function setExitCode(diagnostics) {
  if (diagnostics.criticalFailed > 0 || diagnostics.highFailed > 0) {
    process.exitCode = 1;
  }
}

export async function runDiagnostics(target, options = {}) {
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

  // 11. C-04 — the hook actually on disk, independent of check 8's settings
  // signal (FR-05). Local, so it answers with no GitHub and no network.
  checks.push(await checkGitHook(target));

  // C-01 and C-03. Every existing check above predates the three-state model and
  // is verified from the filesystem, so it normalises to pass/fail.
  const local = checks.map(normalizeLocalCheck);
  const { repository, remoteChecks } = await runRemoteChecks(target, options);
  const allChecks = [...local, ...remoteChecks];

  const requireRemote = Boolean(options.requireRemote);
  const summary = summarise(allChecks, { requireRemote });

  return {
    target,
    repository,
    checks: allChecks,
    ...summary,
    requireRemote,
    manifestData,
  };
}

/**
 * FR-34/FR-36. Resolution and every `gh` call run with `cwd` set to the resolved
 * target, never `process.cwd()` — `ais doctor ./other-project` reporting the
 * ambient repository's protection would be a confidently wrong answer.
 *
 * Read-only by construction: the only two subprocesses reachable from here are
 * `gh api --method GET` and `gh repo view`, both built inside gh-runner from
 * fixed argv. Nothing on this path can mutate a repository (BR-02).
 */
async function runRemoteChecks(target, options) {
  const noRepository = (reason, remedy) => ({
    repository: { name: null, source: null, state: 'unavailable', reason, remedy },
    remoteChecks: unavailableRemoteChecks(reason, remedy),
  });

  // Skip the subprocess entirely when there is plainly nothing to resolve. A
  // generated project has no `.git`, and spending the budget to be told so
  // makes every release smoke run 10s slower for the same answer.
  if (!options.repo && !(await fs.pathExists(path.join(target, '.git')))) {
    return noRepository(
      LOCAL_REASONS.NO_GIT,
      'Initialise a git repository with a GitHub remote, or pass --repo owner/name',
    );
  }

  const budget = createBudget(REMOTE_BUDGET_MS);
  const resolved = resolveRepo({ repoOverride: options.repo, cwd: target, budget });
  if (!resolved.ok) return noRepository(resolved.reason, resolved.remedy);

  let report;
  try {
    report = await getProtection({
      repo: resolved.repo,
      branches: GOVERNED_BRANCHES,
      cwd: target,
      budget,
    });
  } catch (err) {
    // Validation rejected the name before any request. The message is ours
    // (gh-runner), never `gh` stderr, which would carry the repository path.
    return noRepository('invalid-repo', err.message);
  }

  return {
    repository: { name: resolved.repo, source: resolved.source, state: 'ok' },
    remoteChecks: buildRemoteChecks(report, {
      requiredChecks: await gatherRequiredChecks({ repo: resolved.repo, report, cwd: target, budget }),
    }),
  };
}

/**
 * C-02's evidence. The configured half is free — it reads bodies `getProtection`
 * already fetched — so the observation half only runs when there is something to
 * look for. Nothing to observe is not the same as nothing observed, and the
 * check distinguishes them.
 */
async function gatherRequiredChecks({ repo, report, cwd, budget }) {
  // Prefer the first governed branch, but fall back to whichever governed branch
  // actually exists: a repository with no `main` still has required checks worth
  // verifying, and the branch is named in the evidence either way.
  const branchName = [REQUIRED_CHECKS_BRANCH, ...GOVERNED_BRANCHES]
    .find((b) => report.branches[b] && !report.branches[b].absent);
  const branchReport = branchName ? report.branches[branchName] : undefined;
  if (!branchReport) return { configured: undefined, observation: undefined };

  const configured = configuredContexts(branchReport.raw);
  if (configured.status !== 'ok' || configured.value.length === 0) {
    return { configured, observation: undefined };
  }

  const observation = await observeContexts({
    repo,
    branch: branchName,
    contexts: configured.value,
    cwd,
    budget,
  });
  return { configured, observation };
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

export function printDiagnostics(diagnostics) {
  const { checks, allPassed, criticalFailed, highFailed, mediumFailed, lowFailed, unavailableCount } = diagnostics;

  const severityColor = { critical: chalk.red, high: chalk.yellow, medium: chalk.yellow, low: chalk.gray };
  const severityLabel = { critical: 'CRIT', high: 'HIGH', medium: 'MED', low: 'LOW' };

  printRepositoryLine(diagnostics);

  for (const check of checks) {
    // FR-11. `unavailable` gets neither the ✗ glyph nor a severity label, and it
    // is labelled UNAVAILABLE rather than SKIP: nothing here was skipped —
    // verification was attempted and could not produce evidence. A generated
    // project has no remote, so this is the path every release takes.
    if (check.state === 'unavailable') {
      console.log(`  ${chalk.cyan('?')} [UNAVAILABLE] ${check.name} — ${chalk.gray(reasonPhrase(check.reason))}`);
      if (check.remedy) console.log(`         ${chalk.gray(check.remedy)}`);
      if (check.note) console.log(`         ${chalk.gray(check.note)}`);
      continue;
    }

    const color = severityColor[check.severity];
    const icon = check.passed ? chalk.green('✓') : color('✗');
    const label = severityLabel[check.severity];
    console.log(`  ${icon} [${label}] ${check.name}`);
    if (!check.passed && check.message) {
      console.log(`         ${chalk.gray(check.message)}`);
    }
    // A pass can still carry a note — a non-enforcing ruleset, or two protection
    // surfaces disagreeing. Suppressing it would hide the drift this exists to
    // find. `note`, not `message`: pre-existing checks set `message` even when
    // they pass, and printing that would caption a green tick with its own
    // failure text.
    if (check.note) {
      console.log(`         ${chalk.gray(check.note)}`);
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
  } else if (mediumFailed + lowFailed > 0) {
    console.log(chalk.gray(`⚠ ${mediumFailed + lowFailed} minor issue(s) found. Scaffold is functional.`));
  } else {
    // Nothing failed, but something could not be verified. Reporting "healthy"
    // here is exactly the false pass BR-03 exists to prevent.
    console.log(chalk.gray(`⚠ No failures, but ${unavailableCount} check(s) could not be verified.`));
  }

  if (unavailableCount > 0 && !diagnostics.requireRemote) {
    console.log(chalk.gray('  Unverified checks do not affect the exit code; use --require-remote to enforce them.'));
  }

  if (diagnostics.manifestData) {
    console.log(chalk.bold('\nInstalled Configuration'));
    console.log(`  Version:  ${chalk.cyan(diagnostics.manifestData.version)}`);
    console.log(`  Profile:  ${chalk.cyan(diagnostics.manifestData.profile)}`);
    console.log(`  Source:   ${chalk.gray(diagnostics.manifestData.source ?? 'N/A')}`);
  }

  console.log('');
}

/** FR-35. A fork silently checked as upstream is a wrong answer, not a missing one. */
function printRepositoryLine(diagnostics) {
  const repo = diagnostics.repository;
  if (!repo) return;
  if (repo.state === 'ok') {
    const via = repo.source === 'flag' ? '--repo' : 'gh repo view';
    console.log(`  ${chalk.gray('Repository checked:')} ${chalk.cyan(repo.name)} ${chalk.gray(`(via ${via})`)}\n`);
  } else {
    console.log(`  ${chalk.gray(`Repository checked: none — ${reasonPhrase(repo.reason)}`)}\n`);
  }
}
