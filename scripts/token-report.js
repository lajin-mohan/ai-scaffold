#!/usr/bin/env node
/**
 * token-report — scaffold context footprint. Show-only: measures, never mutates.
 *
 *   npm run token-report                      startup context per tool, all five generated profiles
 *   npm run token-report -- --profile node    one profile
 *   npm run token-report -- --project <dir>   an existing generated project
 *   npm run token-report -- --corpus          the legacy T0 corpus report (repository root)
 *   add --json for machine-readable output
 *
 * Figures are static estimates (bytes / 4). Observed context and billed cost
 * are reported as unavailable; record them from the tool itself (item 74).
 */

import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { buildTokenReport } from '../src/cli/core/token-report.js';
import { measureStartupContext } from '../src/cli/core/startup-context.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['generic', 'node', 'python', 'golang', 'laravel'];
const fmt = (n) => n.toLocaleString('en-US');

function argValue(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function generateProject(profile, parent) {
  const dir = path.join(parent, `measure-${profile}`);
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'bin/ai-scaffold.js'), 'create', dir,
    '--profile', profile, '--yes', '--no-git'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ais create --profile ${profile} failed:\n${result.stderr || result.stdout}`);
  return dir;
}

function measureProfiles(profiles) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-token-report-'));
  try {
    return profiles.map((profile) => ({ profile, ...measureStartupContext(generateProject(profile, parent)) }));
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

function printSurface(surface) {
  const status = surface.overBudget ? chalk.red('over') : chalk.green('within');
  const limit = surface.byteLimit ? chalk.gray(` · ${fmt(surface.bytes)} of ${fmt(surface.byteLimit)} B default limit`) : '';
  console.log(`  ${surface.label.padEnd(12)}${String(surface.files.length).padStart(5)} files${fmt(surface.tokens).padStart(9)} est-tokens`
    + `${fmt(surface.bytes).padStart(10)} B  ${status} ${fmt(surface.budgetTokens)}${limit}`);
  if (surface.duplicated.lines) {
    console.log(chalk.gray(`  ${''.padEnd(12)}duplicated across loaded files: ${surface.duplicated.lines} lines, ~${fmt(surface.duplicated.tokens)} est-tokens`));
  }
}

function printStartup(results) {
  console.log(chalk.bold('\nAI Scaffold — startup context per tool') + chalk.gray('  (static estimate, bytes/4)\n'));
  for (const result of results) {
    console.log(chalk.bold(`  ${result.profile ?? result.project}`));
    result.surfaces.forEach(printSurface);
    console.log('');
  }
  console.log(chalk.gray('  Observed context: unavailable here — record from the tool (e.g. Claude Code /context) with version and settings.'));
  console.log(chalk.gray('  Billed cost: unavailable here — record provider usage, cached and uncached separately.'));
  console.log(chalk.gray('  Load sets and sources: src/cli/core/startup-context.js (SURFACES).\n'));
}

function printCorpus(r) {
  console.log(chalk.bold('\nAI Scaffold — corpus footprint (repository root, legacy T0)') + chalk.gray(`  (~chars/${r.charsPerToken})\n`));
  for (const c of r.categories) {
    console.log('  ' + c.label.padEnd(32) + String(c.files).padStart(5) + fmt(c.tokens).padStart(13) + '   ' + chalk.gray(c.loading));
  }
  console.log(`\n  Always-loaded: ${fmt(r.alwaysLoadedTokens)} · On-demand: ${fmt(r.onDemandTokens)}`);
  console.log(chalk.gray('  Measures the maintainer repository, not a generated project; use the default mode for adopters.\n'));
}

function main(argv) {
  const json = argv.includes('--json');
  if (argv.includes('--corpus')) {
    const report = buildTokenReport(repoRoot);
    return json ? console.log(JSON.stringify(report, null, 2)) : printCorpus(report);
  }
  const project = argValue(argv, '--project');
  const profile = argValue(argv, '--profile');
  if (profile && !PROFILES.includes(profile)) throw new Error(`Unknown profile "${profile}". Use one of: ${PROFILES.join(', ')}`);
  const results = project
    ? [{ project, ...measureStartupContext(project) }]
    : measureProfiles(profile ? [profile] : PROFILES);
  return json ? console.log(JSON.stringify(results, null, 2)) : printStartup(results);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(chalk.red(`token-report: ${error.message}`));
  process.exitCode = 1;
}
