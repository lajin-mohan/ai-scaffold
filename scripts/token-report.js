#!/usr/bin/env node
/**
 * token-report — prints the scaffold's context footprint (token-efficiency
 * workstream T0). Show-only: measures, never mutates. Run: `npm run token-report`.
 *
 * Token counts are an estimate (chars / 4) held constant so before/after diffs
 * on an optimization are meaningful — not exact per-model counts.
 */

import chalk from 'chalk';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildTokenReport } from '../src/cli/core/token-report.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fmt(n) {
  return n.toLocaleString('en-US');
}

function pct(part, whole) {
  return whole ? `${Math.round((part / whole) * 100)}%` : '0%';
}

function main() {
  const r = buildTokenReport(repoRoot);

  console.log(chalk.bold('\nAI Scaffold — token footprint') + chalk.gray(`  (~chars/${r.charsPerToken}, estimate)\n`));

  console.log(chalk.gray('  Category                         Files   Est tokens   Share   Loaded'));
  console.log(chalk.gray('  ' + '-'.repeat(76)));
  for (const c of r.categories) {
    console.log(
      '  ' +
        c.label.padEnd(32) +
        String(c.files).padStart(5) +
        fmt(c.tokens).padStart(13) +
        pct(c.tokens, r.total.tokens).padStart(8) +
        '   ' +
        chalk.gray(c.loading),
    );
  }
  console.log(chalk.gray('  ' + '-'.repeat(76)));
  console.log('  ' + chalk.bold('Total'.padEnd(32)) + String(r.total.files).padStart(5) + chalk.bold(fmt(r.total.tokens).padStart(13)) + '\n');

  console.log(
    '  ' +
      chalk.bold('Always-loaded: ') +
      fmt(r.alwaysLoadedTokens) +
      chalk.gray('  ·  ') +
      chalk.bold('On-demand: ') +
      fmt(r.onDemandTokens) +
      chalk.gray(' (cached / loaded only when used)'),
  );
  console.log(
    '  ' +
      chalk.bold(`/review fan-out floor: `) +
      fmt(r.reviewFanout.tokens) +
      chalk.gray(` — ${r.reviewFanout.agents.length} reviewer defs, re-loaded per full review (T1 target)\n`),
  );

  console.log(chalk.bold('  Largest files (optimization targets):'));
  for (const f of r.topFiles) {
    console.log('    ' + fmt(f.tokens).padStart(7) + '  ' + chalk.gray(f.path));
  }
  console.log('');
}

main();
