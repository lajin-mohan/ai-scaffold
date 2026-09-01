/**
 * governance-checks + doctor wiring.
 *
 * Every test here runs with no network and no subprocess: the pure builders take
 * synthetic reports, `resolveRepo` takes an injected runner, and the doctor
 * integration tests use a target with no `.git`, which short-circuits before any
 * `gh` call. That is deliberate — a suite that reaches GitHub would be green or
 * red depending on the machine that ran it.
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REASONS, remedyFor, resolveRepo } from '../cli/core/gh-runner.js';
import {
  CHECK_NAMES,
  LOCAL_REASONS,
  buildRemoteChecks,
  checkGitHook,
  countsAsFailure,
  normalizeLocalCheck,
  summarise,
  unavailableRemoteChecks,
} from '../cli/core/governance-checks.js';
import { printDiagnostics, runDiagnostics, setExitCode } from '../cli/commands/doctor.js';

let tmp;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-doctor-'));
});
afterEach(async () => {
  await fs.remove(tmp);
});

// ------------------------------------------------------------ report fixtures

const okv = (value) => ({ status: 'ok', value });
const unav = (reason) => ({ status: 'unavailable', reason, remedy: remedyFor(reason) });

const branch = (over = {}) => ({
  protected: okv(true),
  sources: { legacy: okv(true), rulesets: okv([]) },
  inactiveRulesetNames: [],
  bypass: okv({ present: false, via: [] }),
  disagreements: [],
  ...over,
});

const report = (branches) => ({ repo: 'acme/widgets', branches });
const byName = (checks, name) => checks.find((c) => c.name === name);

// Look checks up by name, never by position: buildRemoteChecks returns three
// entries now and would return more later, and an index would silently retarget.
const c01Of = (r) => byName(buildRemoteChecks(r), CHECK_NAMES.C01);
const c03Of = (r) => byName(buildRemoteChecks(r), CHECK_NAMES.C03);

// ------------------------------------------------------------------ C-01/C-03

describe('C-01 branch protection', () => {
  it('passes when every branch is protected', () => {
    const c01 = c01Of(report({ main: branch(), dev: branch() }));
    expect(c01).toMatchObject({ state: 'pass', passed: true, verifiedBy: 'api' });
  });

  it('fails at high when a branch is verifiably unprotected', () => {
    const c01 = c01Of(report({
      main: branch(),
      dev: branch({ protected: okv(false), sources: { legacy: okv(false), rulesets: okv([]) } }),
    }));
    expect(c01).toMatchObject({ state: 'fail', passed: false, severity: 'high' });
    expect(c01.message).toContain('Not protected: dev');
  });

  it('lets a verified gap outrank an unreadable branch', () => {
    const c01 = c01Of(report({
      main: branch({ protected: unav(REASONS.FORBIDDEN) }),
      dev: branch({ protected: okv(false) }),
    }));
    expect(c01.state).toBe('fail');
    expect(c01.message).toContain('Not protected: dev');
    expect(c01.message).toContain('Not verified for main');
  });

  it('names an evaluate-mode ruleset instead of silently ignoring it (AC-17)', () => {
    const c01 = c01Of(report({
      main: branch({ protected: okv(false), inactiveRulesetNames: ['dry-run'] }),
    }));
    expect(c01.state).toBe('fail');
    expect(c01.message).toContain('dry-run');
  });

  it('reports a surface disagreement even on a passing branch (R-09)', () => {
    const c01 = c01Of(report({
      main: branch({ disagreements: [{ control: 'required_approving_review_count', legacy: 2, ruleset: 1 }] }),
    }));
    expect(c01.state).toBe('pass');
    expect(c01.message).toBeUndefined();
    expect(c01.note).toContain('legacy=2 ruleset=1');
  });

  it('is unavailable, never a pass, when no branch could be read', () => {
    const c01 = c01Of(report({
      main: branch({ protected: unav(REASONS.UNAUTHENTICATED) }),
      dev: branch({ protected: unav(REASONS.TIMEOUT) }),
    }));
    expect(c01).toMatchObject({ state: 'unavailable', passed: false, reason: REASONS.UNAUTHENTICATED });
  });

  it('keeps a passing check free of failure text (pre-existing checks set message unconditionally)', () => {
    const c01 = c01Of(report({ main: branch() }));
    expect(c01.message).toBeUndefined();
    expect(c01.note).toBeUndefined();
  });

  it('preserves per-branch provenance in details', () => {
    const c01 = c01Of(report({
      main: branch({ sources: { legacy: okv(false), rulesets: okv([{ id: 1, name: 'g', enforcement: 'active', counted: true }]) } }),
    }));
    expect(c01.details.main.legacy).toEqual(okv(false));
    expect(c01.details.main.rulesets.value[0].name).toBe('g');
  });
});

describe('C-03 administrator bypass', () => {
  it('fails at high when a door is verified open', () => {
    const c03 = c03Of(report({
      main: branch({ bypass: okv({ present: true, via: [{ type: 'admin', count: 1 }] }) }),
    }));
    expect(c03).toMatchObject({ state: 'fail', severity: 'high' });
    expect(c03.message).toContain('main (admin×1)');
  });

  it('reports both bypass sources together (AC-03)', () => {
    const c03 = c03Of(report({
      main: branch({ bypass: okv({ present: true, via: [{ type: 'Team', count: 2 }, { type: 'admin', count: 1 }] }) }),
    }));
    expect(c03.message).toContain('Team×2');
    expect(c03.message).toContain('admin×1');
  });

  it('never converts a permission absence into a pass', () => {
    const c03 = c03Of(report({ main: branch({ bypass: unav(REASONS.FORBIDDEN) }) }));
    expect(c03).toMatchObject({ state: 'unavailable', passed: false, reason: REASONS.FORBIDDEN });
    expect(c03.remedy).toBe(remedyFor(REASONS.FORBIDDEN));
  });
});

// ------------------------------------------------------------------ C-04

describe('C-04 git pre-commit hook', () => {
  it('is unavailable, not failed, when the target has no git repository', async () => {
    const c = await checkGitHook(tmp);
    expect(c).toMatchObject({ state: 'unavailable', passed: false, reason: LOCAL_REASONS.NO_GIT, verifiedBy: 'filesystem' });
  });

  it('fails at high when .git exists and the hook does not', async () => {
    await fs.ensureDir(path.join(tmp, '.git', 'hooks'));
    const c = await checkGitHook(tmp);
    expect(c).toMatchObject({ state: 'fail', severity: 'high' });
  });

  it('passes when the hook is present and executable', async () => {
    await fs.ensureDir(path.join(tmp, '.git', 'hooks'));
    await fs.writeFile(path.join(tmp, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\n', { mode: 0o755 });
    expect(await checkGitHook(tmp)).toMatchObject({ state: 'pass', passed: true });
  });

  it.skipIf(process.platform === 'win32')('fails when the hook is present but not executable', async () => {
    await fs.ensureDir(path.join(tmp, '.git', 'hooks'));
    await fs.writeFile(path.join(tmp, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\n', { mode: 0o644 });
    const c = await checkGitHook(tmp);
    expect(c.state).toBe('fail');
    expect(c.message).toContain('not executable');
  });

  it('is unavailable when .git is a worktree pointer rather than a directory', async () => {
    await fs.writeFile(path.join(tmp, '.git'), 'gitdir: /elsewhere\n');
    expect(await checkGitHook(tmp)).toMatchObject({
      state: 'unavailable', reason: LOCAL_REASONS.GIT_DIR_UNREADABLE,
    });
  });
});

// ------------------------------------------------------------- repo resolution

describe('repository resolution (FR-34, Q-03 = C)', () => {
  it('prefers --repo and never spawns when it is given', () => {
    let spawned = false;
    const res = resolveRepo({ repoOverride: 'acme/widgets', run: () => { spawned = true; return { ok: true, repo: 'other/repo' }; } });
    expect(res).toEqual({ ok: true, repo: 'acme/widgets', source: 'flag' });
    expect(spawned).toBe(false);
  });

  it('falls back to gh repo view, matching the write-side script order', () => {
    const res = resolveRepo({ run: () => ({ ok: true, repo: 'acme/widgets' }) });
    expect(res).toEqual({ ok: true, repo: 'acme/widgets', source: 'gh' });
  });

  it('validates the detected name as well as the flag', () => {
    expect(resolveRepo({ repoOverride: '../../etc' }).reason).toBe(REASONS.INVALID_REPO);
    expect(resolveRepo({ run: () => ({ ok: true, repo: 'not-a-repo' }) }).reason).toBe(REASONS.INVALID_REPO);
  });

  it('propagates a transport failure unchanged', () => {
    const res = resolveRepo({ run: () => ({ ok: false, reason: REASONS.GH_MISSING, remedy: 'install' }) });
    expect(res).toEqual({ ok: false, reason: REASONS.GH_MISSING, remedy: 'install' });
  });
});

// ------------------------------------------------------------------ aggregates

describe('aggregates (FR-20, FR-25)', () => {
  const checks = [
    { name: 'a', state: 'pass', passed: true, severity: 'high', verifiedBy: 'filesystem' },
    { name: 'b', state: 'fail', passed: false, severity: 'medium', verifiedBy: 'filesystem' },
    { name: 'c', state: 'unavailable', passed: false, severity: 'high', verifiedBy: 'api' },
    { name: 'd', state: 'unavailable', passed: false, severity: 'high', verifiedBy: 'filesystem' },
  ];

  it('excludes unavailable from the severity counts by default', () => {
    expect(summarise(checks)).toEqual({
      allPassed: false, criticalFailed: 0, highFailed: 0, mediumFailed: 1, lowFailed: 0, unavailableCount: 2,
    });
  });

  it('counts unavailable REMOTE checks under --require-remote, and only those', () => {
    const s = summarise(checks, { requireRemote: true });
    expect(s.highFailed).toBe(1);
    expect(s.unavailableCount).toBe(2);
    expect(countsAsFailure(checks[3], true)).toBe(false);
  });

  it('keeps the pre-existing count meaning when nothing is unavailable', () => {
    const legacyOnly = checks.slice(0, 2);
    expect(summarise(legacyOnly)).toMatchObject({ mediumFailed: 1, highFailed: 0, unavailableCount: 0 });
    expect(summarise(legacyOnly, { requireRemote: true })).toMatchObject({ mediumFailed: 1, highFailed: 0 });
  });

  it('normalises a pre-existing local check additively', () => {
    const before = { name: 'x', passed: false, severity: 'high', message: 'm' };
    expect(normalizeLocalCheck(before)).toEqual({ ...before, state: 'fail', verifiedBy: 'filesystem' });
  });

  it('leaves a check that already has a state alone, third state included', () => {
    const already = { name: 'y', passed: false, state: 'unavailable', severity: 'high', verifiedBy: 'filesystem', reason: 'no-git' };
    expect(normalizeLocalCheck(already)).toBe(already);
  });
});

// -------------------------------------------------------------- doctor wiring

describe('doctor wiring', () => {
  const exitCodeFor = (diagnostics) => {
    const prev = process.exitCode;
    process.exitCode = undefined;
    setExitCode(diagnostics);
    const code = process.exitCode;
    process.exitCode = prev;
    return code;
  };

  it('runs with no GitHub and no network, and names the repository as none', async () => {
    const d = await runDiagnostics(tmp, {});
    expect(d.repository).toMatchObject({ name: null, state: 'unavailable', reason: LOCAL_REASONS.NO_GIT });
    expect(byName(d.checks, CHECK_NAMES.C01).state).toBe('unavailable');
    expect(byName(d.checks, CHECK_NAMES.C03).state).toBe('unavailable');
    expect(byName(d.checks, CHECK_NAMES.C04).state).toBe('unavailable');
  });

  it('keeps the pre-existing JSON fields and adds the new ones', async () => {
    const d = await runDiagnostics(tmp, {});
    for (const key of ['target', 'checks', 'allPassed', 'criticalFailed', 'highFailed', 'mediumFailed', 'lowFailed']) {
      expect(d).toHaveProperty(key);
    }
    expect(d).toHaveProperty('unavailableCount');
    expect(d).toHaveProperty('repository');
    expect(d).toHaveProperty('requireRemote');
  });

  it('holds AC-13 for every check', async () => {
    const d = await runDiagnostics(tmp, {});
    for (const c of d.checks) {
      expect(['pass', 'fail', 'unavailable']).toContain(c.state);
      expect(['api', 'filesystem']).toContain(c.verifiedBy);
      expect(c.passed).toBe(c.state === 'pass');
      if (c.state === 'unavailable') expect(typeof c.reason).toBe('string');
      if (c.state === 'unavailable') expect(c.reason.length).toBeGreaterThan(0);
    }
  });

  it('does not let unavailable affect the exit code by default (FR-14)', async () => {
    const d = await runDiagnostics(tmp, {});
    // The empty target fails critical checks of its own; isolate the unavailable ones.
    const onlyUnavailable = { ...summarise(d.checks.filter((c) => c.state === 'unavailable')), requireRemote: false };
    expect(exitCodeFor(onlyUnavailable)).toBeUndefined();
  });

  it('makes unavailable REMOTE checks fail under --require-remote (AC-10)', async () => {
    const d = await runDiagnostics(tmp, { requireRemote: true });
    const remote = d.checks.filter((c) => c.verifiedBy === 'api');
    expect(remote.length).toBeGreaterThan(0);
    expect(summarise(remote, { requireRemote: true }).highFailed).toBe(remote.length);
    expect(exitCodeFor(summarise(remote, { requireRemote: true }))).toBe(1);
  });

  it('does not let --require-remote fail an unavailable LOCAL check', async () => {
    const d = await runDiagnostics(tmp, { requireRemote: true });
    const c04 = byName(d.checks, CHECK_NAMES.C04);
    expect(c04.state).toBe('unavailable');
    expect(countsAsFailure(c04, true)).toBe(false);
    expect(summarise([c04], { requireRemote: true }).highFailed).toBe(0);
  });

  it('emits no ✗ [HIGH] line for an unavailable check (AC-18)', () => {
    const unavailableChecks = unavailableRemoteChecks(REASONS.GH_MISSING, 'install gh');
    for (const c of unavailableChecks) {
      expect(c.state).toBe('unavailable');
      expect(c.passed).toBe(false);
    }
    expect(summarise(unavailableChecks).highFailed).toBe(0);
  });
});

// ---------------------------------------------------------- the summary counter
//
// Written because a truncated sample run LOOKED like the summary was counting
// unavailable checks as failures: one visible ✗ [HIGH] and two ? [UNAVAILABLE]
// lines above "3 high-severity check(s) failed". The elided lines held two more
// verified failures. The reading was wrong; the risk it names is not, and a
// hand-built fixture is the only way to settle it without eliding anything.

describe('unavailable is never counted as failed', () => {
  const exitCodeFor = (summary) => {
    const prev = process.exitCode;
    process.exitCode = undefined;
    setExitCode(summary);
    const code = process.exitCode;
    process.exitCode = prev;
    return code;
  };

  /** EXACTLY three high-severity checks. Nothing else, so nothing can be elided. */
  const fixture = () => [
    {
      name: CHECK_NAMES.C04,
      passed: false, state: 'fail', severity: 'high', verifiedBy: 'filesystem',
      message: 'No .git/hooks/pre-commit — commit-time enforcement is not installed.',
    },
    {
      name: CHECK_NAMES.C01,
      passed: false, state: 'unavailable', severity: 'high', verifiedBy: 'api',
      reason: REASONS.GH_MISSING, remedy: remedyFor(REASONS.GH_MISSING),
    },
    {
      name: CHECK_NAMES.C03,
      passed: false, state: 'unavailable', severity: 'high', verifiedBy: 'api',
      reason: REASONS.GH_MISSING, remedy: remedyFor(REASONS.GH_MISSING),
    },
  ];

  const render = (checks, options) => {
    const summary = summarise(checks, options);
    const lines = [];
    const original = console.log;
    console.log = (...args) => lines.push(args.join(' '));
    try {
      printDiagnostics({ ...summary, checks, requireRemote: Boolean(options?.requireRemote) });
    } finally {
      console.log = original;
    }
    return { summary, lines };
  };

  it('counts one failure by default, and still exits 1', () => {
    const summary = summarise(fixture());
    expect(summary.highFailed).toBe(1);
    expect(summary.unavailableCount).toBe(2);
    expect(summary.criticalFailed).toBe(0);
    expect(summary.allPassed).toBe(false);
    expect(exitCodeFor(summary)).toBe(1);
  });

  it('counts all three under --require-remote, and exits 1', () => {
    const summary = summarise(fixture(), { requireRemote: true });
    expect(summary.highFailed).toBe(3);
    expect(summary.unavailableCount).toBe(2);
    expect(exitCodeFor(summary)).toBe(1);
  });

  it('does not describe an unavailable check as failed in default mode', () => {
    const { lines } = render(fixture(), {});
    const summaryLine = lines.find((l) => l.includes('high-severity check(s) failed'));
    expect(summaryLine).toContain('1 high-severity check(s) failed');
    expect(summaryLine).not.toContain('3 high-severity');

    // The two unavailable checks appear, but never on a ✗ line and never with
    // a severity label — FR-11, and what keeps the release smoke gates green.
    const failLines = lines.filter((l) => l.includes('✗'));
    expect(failLines).toHaveLength(1);
    expect(failLines[0]).toContain(CHECK_NAMES.C04);
    for (const name of [CHECK_NAMES.C01, CHECK_NAMES.C03]) {
      const line = lines.find((l) => l.includes(name));
      expect(line).toContain('? [UNAVAILABLE]');
      expect(line).not.toContain('[HIGH]');
    }
    expect(lines.some((l) => l.includes('do not affect the exit code'))).toBe(true);
  });

  it('says three failed under --require-remote, where they genuinely do', () => {
    const { lines } = render(fixture(), { requireRemote: true });
    expect(lines.find((l) => l.includes('high-severity check(s) failed')))
      .toContain('3 high-severity check(s) failed');
    // The glyph still never becomes ✗ — the count changes, the evidence does not.
    expect(lines.filter((l) => l.includes('✗'))).toHaveLength(1);
    expect(lines.some((l) => l.includes('do not affect the exit code'))).toBe(false);
  });

  it('reports no failures and no false health when everything is unavailable', () => {
    const onlyUnavailable = fixture().slice(1);
    const { summary, lines } = render(onlyUnavailable, {});
    expect(summary.highFailed).toBe(0);
    expect(summary.allPassed).toBe(false);
    expect(exitCodeFor(summary)).toBeUndefined();
    expect(lines.some((l) => l.includes('All checks passed'))).toBe(false);
    expect(lines.some((l) => l.includes('2 check(s) could not be verified'))).toBe(true);
  });
});

// ------------------------------------------------- regressions from /review

describe('regressions found by adversarial review', () => {
  it('does not print a green bypass tick for a branch nobody protects', () => {
    const c03 = c03Of(report({
      main: branch({ protected: okv(false), sources: { legacy: okv(false), rulesets: okv([]) } }),
    }));
    expect(c03).toMatchObject({ state: 'unavailable', passed: false, reason: LOCAL_REASONS.NOT_PROTECTED });
  });

  it('still evaluates bypass on the protected branches and says what it excluded', () => {
    const c03 = c03Of(report({
      main: branch(),
      dev: branch({ protected: okv(false) }),
    }));
    expect(c03.state).toBe('pass');
    expect(c03.note).toContain('1 unprotected branch(es) excluded');
  });

  it('keeps a branch whose protection is unreadable in bypass scope', () => {
    const c03 = c03Of(report({
      main: branch({ protected: unav(REASONS.FORBIDDEN), bypass: unav(REASONS.FORBIDDEN) }),
    }));
    expect(c03).toMatchObject({ state: 'unavailable', reason: REASONS.FORBIDDEN });
  });

  it('pairs the reason with its own remedy, not with the first branch it looked at', () => {
    const c01 = c01Of(report({
      dev: branch({ protected: unav(REASONS.TIMEOUT) }),
      main: branch({ protected: unav(REASONS.FORBIDDEN) }),
    }));
    expect(c01.reason).toBe(REASONS.FORBIDDEN);
    expect(c01.remedy).toBe(remedyFor(REASONS.FORBIDDEN));
  });

  it('excludes an absent governed branch and names it', () => {
    const checks = buildRemoteChecks({
      repo: 'acme/widgets',
      branches: { main: branch(), dev: { absent: true, reason: REASONS.NOT_FOUND } },
    });
    const c01 = byName(checks, CHECK_NAMES.C01);
    expect(c01.state).toBe('pass');
    expect(c01.note).toContain('Not present in this repository: dev');
  });

  it('is unavailable, not failed, when no governed branch exists at all', () => {
    const checks = buildRemoteChecks({
      repo: 'acme/widgets',
      branches: {
        main: { absent: true, reason: REASONS.NOT_FOUND },
        dev: { absent: true, reason: REASONS.NOT_FOUND },
      },
    });
    for (const name of [CHECK_NAMES.C01, CHECK_NAMES.C03]) {
      expect(byName(checks, name)).toMatchObject({ state: 'unavailable', reason: LOCAL_REASONS.BRANCH_ABSENT });
    }
    expect(summarise(checks).highFailed).toBe(0);
  });
});
