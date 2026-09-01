import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  REASONS,
  classify,
  createBudget,
  remedyFor,
  resolveRepo,
  runGhApi,
  runGhRepoView,
  validateBranch,
  validateRepo,
} from '../cli/core/gh-runner.js';

describe('gh-runner — classify', () => {
  it('maps exit 0 to no reason', () => {
    expect(classify({ status: 0 })).toBeNull();
  });

  // The collision the architecture review flagged: `status === null` has two
  // very different causes and they must not collapse onto one reason.
  it('distinguishes a missing binary from a killed one', () => {
    expect(classify({ status: null, errorCode: 'ENOENT' })).toBe(REASONS.GH_MISSING);
    expect(classify({ status: null, errorCode: 'ETIMEDOUT' })).toBe(REASONS.TIMEOUT);
    expect(classify({ status: null, signal: 'SIGTERM' })).toBe(REASONS.TIMEOUT);
  });

  it('separates 401, 403 and 404, which gh collapses onto exit 1', () => {
    expect(classify({ status: 1, stderr: 'gh: HTTP 401: Requires authentication' })).toBe(REASONS.UNAUTHENTICATED);
    expect(classify({ status: 1, stderr: 'gh: HTTP 403: Forbidden' })).toBe(REASONS.FORBIDDEN);
    expect(classify({ status: 1, stderr: 'gh: HTTP 404: Not Found' })).toBe(REASONS.NOT_FOUND);
  });

  it('recognises an unauthenticated CLI', () => {
    expect(classify({ status: 1, stderr: 'To get started with GitHub CLI, please run: gh auth login' }))
      .toBe(REASONS.UNAUTHENTICATED);
  });

  it('falls back to unknown rather than guessing', () => {
    expect(classify({ status: 1, stderr: 'something nobody predicted' })).toBe(REASONS.UNKNOWN);
  });

  it('gives every reason exactly one action (FR-13)', () => {
    for (const reason of Object.values(REASONS)) {
      expect(remedyFor(reason)).toBeTruthy();
    }
  });
});

describe('gh-runner — repo validation (NFR-02)', () => {
  it('accepts a normal owner/repo', () => {
    expect(validateRepo('lajin-mohan/ai-scaffold').ok).toBe(true);
  });

  it('rejects traversal, including the form that matches the charset', () => {
    for (const bad of ['..', '../..', 'owner/..', '../repo', 'owner/.']) {
      expect(validateRepo(bad).ok, bad).toBe(false);
    }
  });

  it('rejects option-injection shapes', () => {
    // A leading hyphen matches the charset but reads as a flag once the value
    // becomes its own argv element.
    expect(validateRepo('-x/repo').ok).toBe(false);
    expect(validateRepo('owner/-x').ok).toBe(false);
  });

  it('rejects anything that is not exactly owner/repo', () => {
    for (const bad of ['owner', 'a/b/c', '', 'owner/repo?x=1', 'owner/repo#f']) {
      expect(validateRepo(bad).ok, bad).toBe(false);
    }
  });
});

describe('gh-runner — branch validation (NFR-02)', () => {
  it('accepts ordinary and slashed branch names', () => {
    for (const good of ['main', 'dev', 'feature/26-gh-runner', 'release/v1.2.0']) {
      expect(validateBranch(good).ok, good).toBe(true);
    }
  });

  // The sharp one. `main#x` is non-empty and whitespace-free, so the weaker
  // rule would pass it — and `gh api .../branches/main#x/protection` fetches
  // `.../branches/main`, the COARSE endpoint, while the caller believes it read
  // the detailed one. A false verdict through a validation gap.
  it('rejects a fragment that would silently change the endpoint', () => {
    expect(validateBranch('main#x').ok).toBe(false);
  });

  it('rejects a query string that would append parameters to every call', () => {
    expect(validateBranch('main?x=1').ok).toBe(false);
  });

  it('rejects traversal, leading dash, and stray slashes', () => {
    for (const bad of ['..', 'a/../b', '-x', '/main', 'main/', 'a//b', '']) {
      expect(validateBranch(bad).ok, bad).toBe(false);
    }
  });

  it('rejects encoded traversal, whitespace and control characters', () => {
    for (const bad of ['%2e%2e%2f', 'main ', 'main[31m', 'maиn']) {
      expect(validateBranch(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it('rejects a name longer than the limit', () => {
    expect(validateBranch('a'.repeat(256)).ok).toBe(false);
  });
});

describe('gh-runner — budget (NFR-01)', () => {
  it('is one wall-clock deadline for the run, not one per call', () => {
    let now = 1000;
    const budget = createBudget(10000, () => now);
    expect(budget.remainingMs()).toBe(10000);
    now += 4000;
    expect(budget.remainingMs()).toBe(6000);
    now += 9000;
    expect(budget.remainingMs()).toBe(0);
  });

  it('never reports negative remaining time', () => {
    let now = 0;
    const budget = createBudget(100, () => now);
    now = 5000;
    expect(budget.remainingMs()).toBe(0);
  });
});

// ---------------------------------------------------------- the spawn surface
//
// `runGhApi` and `runGhRepoView` were the module's only untested exports, and
// they carry its headline guarantees: the closed argv constructor, "raw stderr
// NEVER leaves this module", the pre-spawn budget short-circuit, and the
// JSON.parse failure path. A `gh` stub on PATH exercises all four for real.

describe('the spawn surface', () => {
  let binDir;
  let originalPath;

  const stub = (script) => {
    fs.writeFileSync(path.join(binDir, 'gh'), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  };

  beforeEach(() => {
    binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-stub-'));
    originalPath = process.env.PATH;
    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    fs.rmSync(binDir, { recursive: true, force: true });
  });

  it('builds a fixed GET argv and parses the body', () => {
    stub('printf \'{"argv":"\'"$*"\'"}\'');
    const res = runGhApi('repos/acme/widgets/branches/main');
    expect(res.ok).toBe(true);
    expect(res.json.argv).toBe('api --method GET repos/acme/widgets/branches/main');
  });

  it('never lets gh stderr — or a token in it — reach the caller', () => {
    stub([
      'echo "GH_TOKEN=ghp_SENTINELVALUE" >&2',
      'echo "HTTP 403: Forbidden (https://ghe.internal.example/api/v3/repos/acme/secret-repo)" >&2',
      'exit 1',
    ].join('\n'));
    const res = runGhApi('repos/acme/secret-repo/branches/main');
    const serialised = JSON.stringify(res);
    expect(res).toEqual({ ok: false, reason: REASONS.FORBIDDEN, remedy: remedyFor(REASONS.FORBIDDEN) });
    for (const secret of ['ghp_SENTINELVALUE', 'secret-repo', 'ghe.internal.example']) {
      expect(serialised).not.toContain(secret);
    }
  });

  it('reports a rate limit as its own reason, not as a permission gap', () => {
    stub('echo "HTTP 403: API rate limit exceeded" >&2; exit 1');
    expect(runGhApi('repos/acme/widgets/branches/main').reason).toBe(REASONS.RATE_LIMITED);
  });

  it('returns unknown rather than throwing when the body is not JSON', () => {
    stub('echo "not json at all"');
    expect(runGhApi('repos/acme/widgets/branches/main')).toEqual({
      ok: false, reason: REASONS.UNKNOWN, remedy: remedyFor(REASONS.UNKNOWN),
    });
  });

  it('short-circuits an exhausted budget without spawning', () => {
    // A spawnSync `timeout: 0` means NO timeout, so passing a remaining 0 down
    // would hang forever. The guard must fire before the spawn.
    stub('sleep 30');
    const started = Date.now();
    const res = runGhApi('repos/acme/widgets/branches/main', { budget: { remainingMs: () => 0 } });
    expect(res).toEqual({ ok: false, reason: REASONS.TIMEOUT, remedy: remedyFor(REASONS.TIMEOUT) });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('reports gh-missing when the binary is not on PATH', () => {
    process.env.PATH = binDir;
    expect(runGhApi('repos/acme/widgets/branches/main').reason).toBe(REASONS.GH_MISSING);
  });

  it('resolves the repository through a fixed `repo view` argv', () => {
    stub('echo "$*" >&2; echo acme/widgets');
    expect(runGhRepoView()).toEqual({ ok: true, repo: 'acme/widgets' });
  });

  it('treats an empty `repo view` answer as no repository, not as a repo named ""', () => {
    stub('exit 0');
    expect(runGhRepoView()).toEqual({
      ok: false, reason: REASONS.NO_REPO, remedy: remedyFor(REASONS.NO_REPO),
    });
  });

  it('feeds resolveRepo the same guarantees end to end', () => {
    stub('echo acme/widgets');
    expect(resolveRepo({})).toEqual({ ok: true, repo: 'acme/widgets', source: 'gh' });
  });
});
