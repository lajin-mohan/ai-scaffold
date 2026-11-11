#!/usr/bin/env node
/**
 * check-governance — item 105. Generates each profile and checks what it ships:
 * startup budget per tool (and Codex's byte limit), links and resolved
 * placeholders, command and hook references, retired command and model names,
 * the command guide, the rule manifest, and the repository's user docs. Exits 1 on any error; warnings are printed only.
 *
 *   node scripts/check-governance.js            all five profiles
 *   node scripts/check-governance.js --profile node
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkBudget, checkCommandGuide, checkObsoleteNames, checkReferences, checkRuleManifest, checkUserDocs,
} from './governance/checks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['generic', 'node', 'python', 'golang', 'laravel'];

function generate(profile, parent) {
  const dir = path.join(parent, `governance-${profile}`);
  const args = [path.join(repoRoot, 'bin/ai-scaffold.js'), 'create', dir, '--profile', profile, '--yes', '--no-git',
    '--purpose', 'Governance check', '--owner-email', 'governance@example.com'];
  const created = spawnSync(process.execPath, args, { encoding: 'utf-8' });
  if (created.status !== 0) throw new Error(`ais create --profile ${profile} failed:\n${created.stderr || created.stdout}`);
  return dir;
}

function linkCheck(dir) {
  const run = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/check-generated-links.js'), dir], { encoding: 'utf-8' });
  const lines = `${run.stdout}${run.stderr}`.split('\n').filter((line) => /^(BROKEN LINK|UNRESOLVED)/.test(line.trim()));
  return { errors: run.status === 0 ? [] : (lines.length > 0 ? lines : [`link check exited ${run.status}`]), warnings: [] };
}

function checkProfile(profile, parent, manifest) {
  const dir = generate(profile, parent);
  return [checkBudget(dir), linkCheck(dir), checkReferences(dir), checkObsoleteNames(dir), checkCommandGuide(dir),
    checkRuleManifest(dir, manifest, repoRoot)]
    .reduce((acc, r) => ({ errors: [...acc.errors, ...r.errors], warnings: [...acc.warnings, ...r.warnings] }), { errors: [], warnings: [] });
}

function main(argv) {
  const at = argv.indexOf('--profile');
  const profiles = at === -1 ? PROFILES : [argv[at + 1]];
  if (profiles.some((p) => !PROFILES.includes(p))) throw new Error(`Unknown profile. Use one of: ${PROFILES.join(', ')}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/governance/rule-manifest.json'), 'utf-8'));
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-governance-'));
  const docs = checkUserDocs(repoRoot);
  for (const line of docs.errors) console.error(`✗ [docs] ${line}`);
  let errors = docs.errors.length;
  try {
    for (const profile of profiles) {
      const { errors: e, warnings: w } = checkProfile(profile, parent, manifest);
      errors += e.length;
      for (const line of e) console.error(`✗ [${profile}] ${line}`);
      if (profile === profiles[0]) for (const line of w) console.warn(`⚠ ${line}`);
    }
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
  console.log(errors === 0 ? `✓ governance checks passed (${profiles.join(', ')})` : `✗ ${errors} governance error(s)`);
  return errors === 0 ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`check-governance: ${error.message}`);
  process.exitCode = 1;
}
