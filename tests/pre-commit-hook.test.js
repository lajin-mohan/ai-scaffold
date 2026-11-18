// Real-git behaviour of the shipped pre-commit hook's verify contract (item 113):
// a committed scripts/verify replaces the stack's test step, must pass when
// present, and leaves the default unchanged when absent.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['generic', 'golang', 'laravel', 'node', 'python'];
const hookOf = (profile) => path.join(REPO_ROOT, 'templates', profile, '.claude', 'hooks', 'pre-commit');

let repo;

const git = (args) => spawnSync('git', args, { cwd: repo, encoding: 'utf-8' });
const write = (rel, content) => fs.outputFileSync(path.join(repo, rel), content);
const packageJson = (testScript) => write('package.json', JSON.stringify({
  name: 'fixture', private: true, scripts: { test: testScript },
}));

// Runs the hook the way git does: from the repository root, on a work branch.
const runHook = () => {
  const result = spawnSync('bash', [hookOf('node')], { cwd: repo, encoding: 'utf-8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
};

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-commit-'));
  git(['init', '-q', '-b', 'feature/verify-fixture']);
});

afterEach(() => fs.removeSync(repo));

describe('pre-commit hook: shipping', () => {
  it('is byte-identical across all five profiles', () => {
    const node = fs.readFileSync(hookOf('node'));
    for (const profile of PROFILES) {
      expect(fs.readFileSync(hookOf(profile)).equals(node), profile).toBe(true);
    }
  });

  it('no longer suggests --no-verify when a check fails', () => {
    const body = fs.readFileSync(hookOf('node'), 'utf-8');
    const echoed = body.split('\n').filter((line) => /^\s*echo /.test(line));
    expect(echoed.join('\n')).not.toContain('--no-verify');
  });
});

// Each case spawns bash and npm; a loaded Windows runner exceeds 5 s.
describe('pre-commit hook: scripts/verify', { timeout: 60_000 }, () => {
  it('keeps the default test step when no verify script exists', () => {
    packageJson('node -e "process.exit(0)"');
    const { status, out } = runHook();
    expect(status, out).toBe(0);
    expect(out).toContain('OK: Unit Tests');
  });

  it('blocks a failing default test step and points to scripts/verify', () => {
    packageJson('node -e "process.exit(1)"');
    const { status, out } = runHook();
    expect(status).toBe(1);
    expect(out).toContain('FAIL: Unit Tests');
    expect(out).toContain('commit a scripts/verify');
  });

  it('runs scripts/verify in place of a test step that needs a database', () => {
    packageJson('node -e "console.error(\'ECONNREFUSED 127.0.0.1:5432\'); process.exit(1)"');
    write('scripts/verify', 'echo unit tests passed\n');
    const { status, out } = runHook();
    expect(status, out).toBe(0);
    expect(out).toContain('OK: scripts/verify');
    expect(out).not.toContain('Unit Tests');
  });

  it('blocks the commit when scripts/verify fails', () => {
    packageJson('node -e "process.exit(0)"');
    write('scripts/verify', 'exit 3\n');
    const { status, out } = runHook();
    expect(status).toBe(1);
    expect(out).toContain('FAIL: scripts/verify (exit 3)');
    expect(out).not.toContain('commit a scripts/verify');
  });

  it('fails closed when scripts/verify calls a command that is not installed', () => {
    packageJson('node -e "process.exit(0)"');
    write('scripts/verify', 'ais-no-such-command-113\n');
    const { status, out } = runHook();
    expect(status).toBe(1);
    expect(out).toContain('(exit 127)');
    expect(out).toContain('was not found');
  });

  it('runs scripts/verify even when no stack is detected', () => {
    write('scripts/verify', 'exit 1\n');
    const { status, out } = runHook();
    expect(status).toBe(1);
    expect(out).not.toContain('template state');
  });

  it('keeps the template-state pass when there is neither a stack nor a verify script', () => {
    const { status, out } = runHook();
    expect(status, out).toBe(0);
    expect(out).toContain('template state');
  });
});
