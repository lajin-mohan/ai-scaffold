#!/usr/bin/env node
/**
 * Golden-path execution gate (backlog item 65b, slice 1).
 *
 * Generates a project from the PACKED npm artifact and runs the commands that
 * project's own manifest declares. Presence assertions cannot catch a typo'd
 * dependency, a CVE-blocked version constraint, or a build backend that
 * refuses to install — running the command catches all three.
 *
 * Slice 1 runs the finite capabilities only: install -> migration -> test.
 * `dev`/`serve` readiness needs bounded start/probe/terminate and is slice 2.
 *
 * Commands come from the generated project's `.ai-scaffold.json`, never from
 * parsing its README: deciding what to execute by reading generated prose
 * would make this gate's correctness depend on Markdown formatting.
 *
 * Usage:
 *   node scripts/golden-path.js [--profiles a,b] [--skip-missing-toolchain]
 * Exit: 0 all green, 1 a failure, 2 usage/setup error.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ALL_PROFILES = ['generic', 'node', 'python', 'golang', 'laravel'];
const CAPABILITIES = ['install', 'migration', 'test']; // slice 1: finite only
const TIMEOUTS = { install: 300_000, migration: 60_000, test: 300_000 };
const OUTPUT_CAP = 1024 * 1024;

// A capability's toolchain, so a missing interpreter is reported as such
// rather than as a golden-path failure (FR-32).
const TOOLCHAIN = { python: 'python3', golang: 'go', laravel: 'php', node: 'node' };

const args = process.argv.slice(2);
const profiles = (args.find((a) => a.startsWith('--profiles='))?.split('=')[1] || '')
  .split(',').filter(Boolean);
const selected = profiles.length ? profiles : ALL_PROFILES;
const skipMissingToolchain = args.includes('--skip-missing-toolchain');

for (const p of selected) {
  if (!ALL_PROFILES.includes(p)) {
    console.error(`unknown profile: ${p}`);
    process.exit(2);
  }
}

function run(cmd, cwd, timeout) {
  // shell:true is required: declared commands legitimately contain quoting and
  // globs (`pip install -e ".[dev]"`). The commands originate from profile
  // templates in this repository, changed only through reviewed PRs — never
  // from user input or anything fetched at run time.
  const r = spawnSync(cmd, {
    cwd, shell: true, encoding: 'utf-8', timeout,
    env: { ...process.env, CI: '1', COMPOSER_NO_INTERACTION: '1' },
  });
  let out = `${r.stdout || ''}${r.stderr || ''}`;
  if (out.length > OUTPUT_CAP) {
    const head = out.slice(0, OUTPUT_CAP / 4);
    const tail = out.slice(-((OUTPUT_CAP * 3) / 4));
    out = `${head}\n… [${out.length - OUTPUT_CAP} chars elided] …\n${tail}`;
  }
  return { status: r.status, out, timedOut: r.error?.code === 'ETIMEDOUT', error: r.error };
}

/** A command that only occupies a manifest field is a failure, not a pass. */
function isPlaceholder(cmd, projectDir) {
  const first = cmd.trim().replace(/^\w+=\S+\s+/g, '').split(/\s+/)[0];
  if (['echo', 'printf', 'true', ':'].includes(first)) return true;
  if (/^\s*exit\s+0\s*$/.test(cmd)) return true;
  // Resolve one level of script indirection — `npm run lint` and
  // `composer test` hide their real command in a manifest, which is exactly
  // where the stubs this gate exists to catch used to live.
  const npm = cmd.match(/^npm\s+(?:run\s+)?([\w:-]+)/);
  if (npm) {
    const name = npm[1] === 'test' && !/^npm\s+run/.test(cmd) ? 'test' : npm[1];
    const pkg = path.join(projectDir, 'package.json');
    if (existsSync(pkg)) {
      const s = JSON.parse(readFileSync(pkg, 'utf-8')).scripts || {};
      if (s[name]) return isPlaceholder(s[name], projectDir);
    }
  }
  const comp = cmd.match(/^composer\s+(?:run-script\s+)?([\w:-]+)/);
  if (comp) {
    const cj = path.join(projectDir, 'composer.json');
    if (existsSync(cj)) {
      const s = JSON.parse(readFileSync(cj, 'utf-8')).scripts || {};
      const v = s[comp[1]];
      if (v) return isPlaceholder(Array.isArray(v) ? v[0] : v, projectDir);
    }
  }
  return false;
}

const root = process.cwd();
const scratch = mkdtempSync(path.join(tmpdir(), 'golden-path-'));
console.log(`Golden-path execution — scratch ${scratch}\n`);

// 1. Pack, and install the CLI from the tarball. What is verified must be what
//    adopters receive: `npm pack` applies the files allowlist, and every
//    packaging defect this project has shipped was invisible to the source tree.
console.log('==> npm pack');
const packed = run(`npm pack --pack-destination "${scratch}"`, root, 300_000);
if (packed.status !== 0) { console.error(packed.out); process.exit(2); }
const tarball = readdirSync(scratch).find((f) => f.endsWith('.tgz'));
if (!tarball) { console.error('no tarball produced'); process.exit(2); }

const cliDir = path.join(scratch, 'cli');
run(`mkdir -p "${cliDir}"`, root, 30_000);
console.log(`==> installing ${tarball}`);
const inst = run(`npm install "${path.join(scratch, tarball)}" --no-save --silent`, cliDir, 300_000);
if (inst.status !== 0) { console.error(inst.out); process.exit(2); }

const cli = path.join(cliDir, 'node_modules/@lajin.m/ai-scaffold/bin/ai-scaffold.js');
if (!existsSync(cli)) { console.error(`CLI not found at ${cli}`); process.exit(2); }
console.log(`==> CLI under test: ${cli}\n`);

const results = [];
let failed = 0;

for (const profile of selected) {
  const projectDir = path.join(scratch, `p-${profile}`);
  const gen = run(`node "${cli}" create "${projectDir}" --profile ${profile} --yes`, root, 120_000);
  if (gen.status !== 0) {
    results.push({ profile, capability: 'create', verdict: 'failed', reason: 'generation failed', out: gen.out });
    failed++; continue;
  }

  const manifest = JSON.parse(readFileSync(path.join(projectDir, '.ai-scaffold.json'), 'utf-8'));
  const commands = manifest.commands || {};

  // Derive the toolchain from the command the profile actually declares, not
  // from a hardcoded guess: the python profile passed a `python3` check and
  // then failed on `pip: command not found`, which is a toolchain gap
  // reported as a golden-path failure — precisely what FR-32 forbids.
  const firstCmd = CAPABILITIES.map((c) => commands[c]).find((x) => x && x !== 'none');
  const tool = firstCmd ? firstCmd.trim().split(/\s+/)[0] : TOOLCHAIN[profile];
  if (tool && run(`command -v ${tool}`, root, 10_000).status !== 0) {
    const verdict = skipMissingToolchain ? 'toolchain-missing' : 'failed';
    if (!skipMissingToolchain) failed++;
    results.push({ profile, capability: '-', verdict, reason: `${tool} not installed` });
    continue;
  }

  let ran = 0;
  for (const cap of CAPABILITIES) {
    const cmd = commands[cap];
    if (!cmd || cmd === 'none') { results.push({ profile, capability: cap, verdict: 'skipped', reason: 'declared none' }); continue; }
    if (isPlaceholder(cmd, projectDir)) {
      results.push({ profile, capability: cap, verdict: 'failed', command: cmd, reason: 'placeholder command — occupies a manifest field without doing work' });
      failed++; continue;
    }
    const r = run(cmd, projectDir, TIMEOUTS[cap]);
    if (r.status === 0) { results.push({ profile, capability: cap, verdict: 'passed', command: cmd }); ran++; }
    else {
      results.push({ profile, capability: cap, verdict: 'failed', command: cmd, status: r.status, reason: r.timedOut ? 'timed out' : `exit ${r.status}`, out: r.out });
      failed++;
    }
  }
  if (ran === 0 && !results.some((x) => x.profile === profile && x.verdict === 'failed')) {
    results.push({ profile, capability: '-', verdict: 'no-golden-path', reason: 'every capability declared none' });
  }
}

console.log('\n' + '='.repeat(72));
for (const r of results) {
  const mark = { passed: 'PASS', failed: 'FAIL', skipped: 'skip', 'no-golden-path': 'none', 'toolchain-missing': 'tool' }[r.verdict];
  console.log(`  ${mark}  ${r.profile.padEnd(8)} ${String(r.capability).padEnd(10)} ${r.command || r.reason || ''}`);
}
console.log('='.repeat(72));

if (failed > 0) {
  console.log('\nFAILURES\n');
  for (const r of results.filter((x) => x.verdict === 'failed')) {
    console.log(`  profile    : ${r.profile}`);
    console.log(`  capability : ${r.capability}`);
    if (r.command) console.log(`  command    : ${r.command}`);
    console.log(`  reason     : ${r.reason}`);
    if (r.out) console.log(`  output tail:\n${r.out.split('\n').slice(-25).map((l) => `    ${l}`).join('\n')}`);
    console.log('');
  }
}

const counts = results.reduce((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] || 0) + 1 }), {});
console.log(`Summary: ${JSON.stringify(counts)}`);
process.exit(failed > 0 ? 1 : 0);
