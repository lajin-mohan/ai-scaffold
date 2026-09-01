/**
 * C-02 — configured contexts, observed evidence, and the verdict over both.
 * Injected runner, synthetic bodies, no network.
 */
import { describe, expect, it } from 'vitest';
import { REASONS, remedyFor } from '../cli/core/gh-runner.js';
import { FIELD_ABSENT } from '../cli/core/github-protection.js';
import {
  LOOKBACK,
  NO_EVIDENCE,
  configuredContexts,
  contextKey,
  observeContexts,
} from '../cli/core/github-required-checks.js';
import { CHECK_NAMES, LOCAL_REASONS, requiredChecksCheck } from '../cli/core/governance-checks.js';

const REPO = 'acme/widgets';
const okJson = (json) => ({ ok: true, json });
const fail = (reason) => ({ ok: false, reason, remedy: remedyFor(reason) });

function makeRun(routes) {
  const calls = [];
  const run = (p) => {
    calls.push(p);
    const key = Object.keys(routes).find((k) => p.startsWith(k));
    const r = key ? routes[key] : fail(REASONS.NOT_FOUND);
    return typeof r === 'function' ? r(p) : r;
  };
  run.calls = calls;
  return run;
}

const legacyOk = (rsc) => ({ status: 'ok', value: { required_status_checks: rsc } });
const rulesetsOk = (list, extra = {}) => ({ status: 'ok', value: list, ...extra });
const rscRule = (checks) => ({
  type: 'required_status_checks',
  parameters: { required_status_checks: checks },
});
const activeRuleset = (rules) => ({ id: 1, name: 'guard', enforcement: 'active', rules });

// --------------------------------------------------------------- configured

describe('configured contexts', () => {
  it('reads app identity from legacy `checks` in preference to `contexts`', () => {
    const c = configuredContexts({
      legacy: legacyOk({ contexts: ['build'], checks: [{ context: 'build', app_id: 15368 }] }),
      rulesets: rulesetsOk([]),
    });
    expect(c.value).toEqual([{ context: 'build', appId: 15368, sources: ['legacy'] }]);
  });

  it('merges a context demanded by both surfaces into one requirement', () => {
    const c = configuredContexts({
      legacy: legacyOk({ checks: [{ context: 'build', app_id: null }] }),
      rulesets: rulesetsOk([activeRuleset([rscRule([{ context: 'build' }])])]),
    });
    expect(c.value).toHaveLength(1);
    expect(c.value[0].sources).toEqual(['legacy', 'ruleset']);
  });

  it('keeps the same context under two app identities apart', () => {
    const c = configuredContexts({
      legacy: legacyOk({ checks: [{ context: 'build', app_id: 1 }, { context: 'build', app_id: 2 }] }),
      rulesets: rulesetsOk([]),
    });
    expect(c.value.map(contextKey)).toEqual(['build 1', 'build 2']);
  });

  it('deduplicates and sorts deterministically whatever order the API used', () => {
    const forward = configuredContexts({
      legacy: legacyOk({ contexts: ['lint', 'build', 'lint'] }),
      rulesets: rulesetsOk([activeRuleset([rscRule([{ context: 'build' }, { context: 'test' }])])]),
    });
    const reversed = configuredContexts({
      legacy: legacyOk({ contexts: ['lint', 'build'] }),
      rulesets: rulesetsOk([activeRuleset([rscRule([{ context: 'test' }, { context: 'build' }])])]),
    });
    expect(forward.value.map((c) => c.context)).toEqual(['build', 'lint', 'test']);
    expect(forward.value).toEqual(reversed.value);
  });

  it('ignores a non-enforcing ruleset', () => {
    const c = configuredContexts({
      legacy: { status: 'absent' },
      rulesets: rulesetsOk([{ ...activeRuleset([rscRule([{ context: 'build' }])]), enforcement: 'evaluate' }]),
    });
    expect(c.value).toEqual([]);
  });

  it('reads an omitted legacy required_status_checks as none configured', () => {
    const c = configuredContexts({ legacy: { status: 'ok', value: {} }, rulesets: rulesetsOk([]) });
    expect(c).toMatchObject({ status: 'ok', value: [] });
    expect(c.partialReason).toBeUndefined();
  });

  it('treats a ruleset rule with no parameters key as unavailable, not as none', () => {
    const c = configuredContexts({
      legacy: { status: 'absent' },
      rulesets: rulesetsOk([activeRuleset([{ type: 'required_status_checks' }])]),
    });
    expect(c.partialReason).toBe(FIELD_ABSENT);
  });

  it('carries a partial reason when one surface is unreadable', () => {
    const c = configuredContexts({
      legacy: { status: 'unavailable', reason: REASONS.UNAUTHENTICATED },
      rulesets: rulesetsOk([activeRuleset([rscRule([{ context: 'build' }])])]),
    });
    expect(c.status).toBe('ok');
    expect(c.partialReason).toBe(REASONS.UNAUTHENTICATED);
  });

  it('is unavailable when neither surface could be read', () => {
    const c = configuredContexts({
      legacy: { status: 'unavailable', reason: REASONS.FORBIDDEN },
      rulesets: { status: 'unavailable', reason: REASONS.RATE_LIMITED },
    });
    // Established precedence: a rate limit outranks a permission gap.
    expect(c).toMatchObject({ status: 'unavailable', reason: REASONS.RATE_LIMITED });
  });

  it('carries a partially-resolved ruleset list through as partial', () => {
    const c = configuredContexts({
      legacy: { status: 'absent' },
      rulesets: rulesetsOk([activeRuleset([rscRule([{ context: 'build' }])])], { partialReason: REASONS.FORBIDDEN }),
    });
    expect(c.partialReason).toBe(REASONS.FORBIDDEN);
  });
});

// ----------------------------------------------------------------- observed

const PR = (n, sha, mergedAt) => ({ number: n, head: { sha }, merged_at: mergedAt });
const runsBody = (names, total) => ({
  total_count: total ?? names.length,
  check_runs: names.map((n) => (typeof n === 'string'
    ? { name: n, status: 'completed', conclusion: 'success', app: { id: 15368 } }
    : { name: n.name, status: 'completed', conclusion: 'success', app: { id: n.appId } })),
});
const ctx = (context, appId = null) => ({ context, appId });

describe('observed evidence', () => {
  it('stops at the first pull request once every context is seen', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z'), PR(8, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '2026-08-29T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody(['build', 'lint'])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build'), ctx('lint')], run });
    expect(o.value.unobserved).toEqual([]);
    expect(o.value.examined).toHaveLength(1);
    expect(run.calls.some((c) => c.includes('/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/'))).toBe(false);
  });

  it('ignores closed-but-unmerged pull requests', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([{ number: 9, head: { sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, merged_at: null }]),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o).toMatchObject({ status: 'unavailable', reason: NO_EVIDENCE });
  });

  it('reports no qualifying pull request as unavailable, not as zero checks', async () => {
    const run = makeRun({ [`repos/${REPO}/pulls`]: okJson([]) });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.status).toBe('unavailable');
    expect(o.reason).toBe(NO_EVIDENCE);
  });

  it('orders the window by merge time then number, not by API order', async () => {
    const same = '2026-08-30T10:00:00Z';
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(7, 'cccccccccccccccccccccccccccccccccccccccc', same), PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', same), PR(8, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', same)]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody([])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
      [`repos/${REPO}/commits/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/check-runs`]: okJson(runsBody([])),
      [`repos/${REPO}/commits/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/status`]: okJson({ statuses: [] }),
      [`repos/${REPO}/commits/cccccccccccccccccccccccccccccccccccccccc/check-runs`]: okJson(runsBody(['build'])),
      [`repos/${REPO}/commits/cccccccccccccccccccccccccccccccccccccccc/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.examined.map((e) => e.pullRequest)).toEqual([9, 8, 7]);
  });

  it('paginates check runs and marks a scan it could not finish', async () => {
    const page1 = Array.from({ length: LOOKBACK.checkRunPageSize }, (_, i) => `noise-${i}`);
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: (p) => (p.includes('page=1')
        ? okJson(runsBody(page1, 5000))
        : okJson({ total_count: 5000, check_runs: [] })),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.truncated).toBe(true);
    expect(o.value.unobserved).toEqual([{ context: 'build', appId: null }]);
  });

  it('accepts a commit status for an app-blind requirement', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody([])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [{ context: 'ci/jenkins', state: 'success' }] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('ci/jenkins')], run });
    expect(o.value.unobserved).toEqual([]);
  });

  it('refuses a commit status for an app-qualified requirement', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody([])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [{ context: 'build', state: 'success' }] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build', 99)], run });
    expect(o.value.unobserved).toEqual([{ context: 'build', appId: 99 }]);
  });

  it('does not match a check run produced by the wrong app', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody([{ name: 'build', appId: 1 }])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build', 2)], run });
    expect(o.value.unobserved).toEqual([{ context: 'build', appId: 2 }]);
  });

  it('records an unreadable page rather than dropping it', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: fail(REASONS.RATE_LIMITED),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.unreadableReason).toBe(REASONS.RATE_LIMITED);
  });

  it('is unavailable when the pull-request listing itself fails', async () => {
    const run = makeRun({ [`repos/${REPO}/pulls`]: fail(REASONS.TIMEOUT) });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o).toMatchObject({ status: 'unavailable', reason: REASONS.TIMEOUT });
  });

  it('makes no request at all when nothing is required', async () => {
    const run = makeRun({});
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [], run });
    expect(o.status).toBe('ok');
    expect(run.calls).toEqual([]);
  });

  it('names the window and the evidence source', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/check-runs`]: okJson(runsBody(['build'])),
      [`repos/${REPO}/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.window).toContain('merged pull request(s) into main');
    expect(o.value.source).toContain('check runs');
  });
});

// ------------------------------------------------------------------ verdict

describe('C-02 verdict', () => {
  const evidence = (over = {}) => ({
    status: 'ok',
    value: {
      branch: 'main', source: 'src', window: 'win',
      examined: [{ pullRequest: 9 }], observed: [], unobserved: [], truncated: false,
      unreadableReasons: [], unreadableReason: null,
      ...over,
    },
  });

  it('fails when nothing is required', () => {
    const c = requiredChecksCheck({ configured: { status: 'ok', value: [] } });
    expect(c).toMatchObject({ name: CHECK_NAMES.C02, state: 'fail', severity: 'high' });
    expect(c.message).toContain('No status check is required');
  });

  it('does not call it "nothing required" when a surface was unreadable', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [], partialReason: REASONS.UNAUTHENTICATED },
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: REASONS.UNAUTHENTICATED });
  });

  it('passes when every requirement was observed, naming the window', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')] },
      observation: evidence({ observed: [{ context: 'build' }] }),
    });
    expect(c.state).toBe('pass');
    expect(c.note).toContain('win');
    expect(c.message).toBeUndefined();
  });

  it('fails when a requirement never reported and the scan was complete', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')] },
      observation: evidence({ unobserved: [{ context: 'build', appId: null }] }),
    });
    expect(c).toMatchObject({ state: 'fail', severity: 'high' });
    expect(c.message).toContain('Required but never reported: build');
  });

  it('will not call a truncated scan evidence of absence', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')] },
      observation: evidence({ unobserved: [{ context: 'build', appId: null }], truncated: true }),
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: LOCAL_REASONS.EVIDENCE_TRUNCATED });
  });

  it('will not call an unreadable scan evidence of absence', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')] },
      observation: evidence({ unobserved: [{ context: 'build', appId: null }], unreadableReason: REASONS.RATE_LIMITED }),
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: REASONS.RATE_LIMITED });
  });

  it('withholds a pass when a surface that may require more was unreadable', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')], partialReason: REASONS.FORBIDDEN },
      observation: evidence({ observed: [{ context: 'build' }] }),
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: REASONS.FORBIDDEN });
    expect(c.details.evidence).toBeDefined();
  });

  it('preserves evidence on every unavailable verdict it can', () => {
    const c = requiredChecksCheck({
      configured: { status: 'ok', value: [ctx('build')] },
      observation: { status: 'unavailable', reason: NO_EVIDENCE, remedy: 'r' },
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: NO_EVIDENCE });
    expect(c.note).toContain('build');
    expect(c.details.configured).toHaveLength(1);
  });

  it('is unavailable when the configured half could not be read at all', () => {
    const c = requiredChecksCheck({
      configured: { status: 'unavailable', reason: REASONS.UNAUTHENTICATED, remedy: 'r' },
    });
    expect(c).toMatchObject({ state: 'unavailable', reason: REASONS.UNAUTHENTICATED });
  });

  it('never reports passed true unless the state is pass', () => {
    const all = [
      requiredChecksCheck({ configured: { status: 'ok', value: [] } }),
      requiredChecksCheck({ configured: { status: 'ok', value: [ctx('b')] }, observation: evidence({ observed: [{ context: 'b' }] }) }),
      requiredChecksCheck({ configured: { status: 'unavailable', reason: 'x', remedy: 'y' } }),
    ];
    for (const c of all) expect(c.passed).toBe(c.state === 'pass');
  });
});

// ------------------------------------------------- regressions from /review

describe('regressions found by adversarial review', () => {
  it('marks the scan truncated when the page budget runs out and total_count is absent', async () => {
    const fullPage = Array.from({ length: LOOKBACK.checkRunPageSize }, (_, i) => `noise-${i}`);
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'a'.repeat(40), '2026-08-30T10:00:00Z')]),
      // No `total_count` anywhere, and every page is full: the only signal that
      // the scan stopped short is that the page budget ran out.
      [`repos/${REPO}/commits/${'a'.repeat(40)}/check-runs`]: okJson({ check_runs: fullPage.map((n) => ({ name: n, app: { id: 1 } })) }),
      [`repos/${REPO}/commits/${'a'.repeat(40)}/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.truncated).toBe(true);
    const c = requiredChecksCheck({ configured: { status: 'ok', value: [ctx('build')] }, observation: o });
    expect(c).toMatchObject({ state: 'unavailable', reason: LOCAL_REASONS.EVIDENCE_TRUNCATED });
  });

  it('pages past closed-unmerged pull requests instead of settling for a stale window', async () => {
    const unmerged = Array.from({ length: LOOKBACK.candidatePageSize }, (_, i) => ({ number: 100 + i, head: { sha: 'b'.repeat(40) }, merged_at: null }));
    const run = makeRun({
      [`repos/${REPO}/pulls`]: (p) => (p.includes('page=1')
        ? okJson(unmerged)
        : okJson([PR(9, 'a'.repeat(40), '2026-08-30T10:00:00Z')])),
      [`repos/${REPO}/commits/${'a'.repeat(40)}/check-runs`]: okJson(runsBody(['build'])),
      [`repos/${REPO}/commits/${'a'.repeat(40)}/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.unobserved).toEqual([]);
    expect(o.value.candidatesScanned).toBe(LOOKBACK.candidatePageSize + 1);
  });

  it('will not call a fail on a window it could not finish assembling', async () => {
    const unmerged = (start) => Array.from({ length: LOOKBACK.candidatePageSize }, (_, i) => ({ number: start + i, head: { sha: 'b'.repeat(40) }, merged_at: null }));
    const run = makeRun({
      [`repos/${REPO}/pulls`]: (p) => okJson(p.includes('page=1') ? unmerged(100) : unmerged(200)),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    // Every candidate was unmerged and the page budget is spent: no population.
    expect(o).toMatchObject({ status: 'unavailable', reason: NO_EVIDENCE });
  });

  it('reports the window it actually examined, not the one it hoped for', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([PR(9, 'a'.repeat(40), '2026-08-30T10:00:00Z')]),
      [`repos/${REPO}/commits/${'a'.repeat(40)}/check-runs`]: okJson(runsBody(['build'])),
      [`repos/${REPO}/commits/${'a'.repeat(40)}/status`]: okJson({ statuses: [] }),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o.value.window).toBe('1 most recent merged pull request(s) into main (of 1 closed pull request(s) scanned)');
  });

  it('rejects a pull-request head sha that is not a sha', async () => {
    const run = makeRun({
      [`repos/${REPO}/pulls`]: okJson([{ number: 9, head: { sha: '../../../../user' }, merged_at: '2026-08-30T10:00:00Z' }]),
    });
    const o = await observeContexts({ repo: REPO, branch: 'main', contexts: [ctx('build')], run });
    expect(o).toMatchObject({ status: 'unavailable', reason: NO_EVIDENCE });
    expect(run.calls.some((p) => p.includes('/commits/'))).toBe(false);
  });
});
