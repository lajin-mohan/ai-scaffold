/**
 * Item 97, L1 probes (HLD docs/architecture/hld-97-control-matrix.md §5).
 * Each fixture case is fed to the shipped guard on stdin under every parser
 * path the guard can take, and the exit code is the result: 2 blocks, 0 allows.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { templatePath } from '../src/cli/core/paths.js';
import { resolveOnPath } from '../src/cli/core/exec-path.js';

const BASH = resolveOnPath('bash');
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'guards');
const GUARDS = {
  'pre-secret-guard.sh': 'secret-guard.json',
  'pre-dangerous-bash-guard.sh': 'dangerous-bash-guard.json',
};
const STATUS = { block: 2, allow: 0 };
const LATENCY_RUNS = 20;
const LATENCY_P95_MS = 1500;

// A stub that is found on PATH but fails, as the Windows Store python3 alias does.
const STUBBED = {
  native: [],
  'python, no jq': ['jq'],
  'bash only': ['jq', 'python3', 'python'],
};
const stubDirs = {};

beforeAll(() => {
  for (const [mode, names] of Object.entries(STUBBED)) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-guard-'));
    for (const name of names) {
      fs.writeFileSync(path.join(dir, name), '#!/bin/sh\nexit 49\n');
      fs.chmodSync(path.join(dir, name), 0o755);
    }
    stubDirs[mode] = dir;
  }
});

afterAll(() => {
  for (const dir of Object.values(stubDirs)) fs.rmSync(dir, { recursive: true, force: true });
});

function envFor(mode) {
  return { ...process.env, PATH: `${stubDirs[mode]}${path.delimiter}${process.env.PATH}` };
}

function runGuard(guard, testCase, mode) {
  const input = 'stdin' in testCase ? testCase.stdin : JSON.stringify(testCase.payload);
  const script = templatePath('node', `.claude/hooks/${guard}`);
  return spawnSync(BASH, [script], { input, encoding: 'utf-8', env: envFor(mode) }).status;
}

const casesFor = (guard) => JSON.parse(fs.readFileSync(path.join(FIXTURES, GUARDS[guard]), 'utf-8'));

describe('guard fixtures are well formed', () => {
  it.each(Object.keys(GUARDS))('%s has both blocked and allowed cases, so neither result passes vacuously', (guard) => {
    const expects = new Set(casesFor(guard).map((c) => c.expect));
    expect([...expects].sort()).toEqual(['allow', 'block']);
  });

  it('the two guards share their input parsing byte for byte', () => {
    const shared = (guard) => {
      const text = fs.readFileSync(templatePath('node', `.claude/hooks/${guard}`), 'utf-8');
      return text.slice(text.indexOf('# --- Hook input'), text.indexOf('# --- end of shared parsing'));
    };
    expect(shared('pre-secret-guard.sh').length).toBeGreaterThan(500);
    expect(shared('pre-secret-guard.sh')).toBe(shared('pre-dangerous-bash-guard.sh'));
  });
});

describe.runIf(BASH)('guard decisions on every parser path (item 97 L1)', { timeout: 120_000 }, () => {
  // Positive control: the stubs really take the parsers away, so the
  // "bash only" results come from the bash reader, not a hidden python.
  it('stubbed parsers fail in the bash-only environment', () => {
    for (const parser of ['jq --version', "python3 -c ''", "python -c ''"]) {
      const result = spawnSync(BASH, ['-c', parser], { env: envFor('bash only') });
      expect(result.status, parser).not.toBe(0);
    }
  });

  for (const guard of Object.keys(GUARDS)) {
    for (const mode of Object.keys(STUBBED)) {
      it.each(casesFor(guard))(`${guard} [${mode}]: $name → $expect`, (testCase) => {
        expect(runGuard(guard, testCase, mode)).toBe(STATUS[testCase.expect]);
      });
    }
  }
});

describe.runIf(BASH)('guard latency (item 97 D2)', { timeout: 120_000, retry: 1 }, () => {
  const harmless = { name: 'harmless', payload: { tool_name: 'Bash', tool_input: { command: 'npm test && git status' } } };

  it.each(Object.keys(GUARDS))(`%s: p95 of ${LATENCY_RUNS} runs is under ${LATENCY_P95_MS} ms`, (guard) => {
    const times = [];
    for (let run = 0; run < LATENCY_RUNS; run += 1) {
      const start = process.hrtime.bigint();
      expect(runGuard(guard, harmless, 'native')).toBe(0);
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(LATENCY_RUNS * 0.95) - 1];
    expect(p95).toBeLessThan(LATENCY_P95_MS);
  });
});
