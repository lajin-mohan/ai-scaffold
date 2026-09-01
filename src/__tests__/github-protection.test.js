/**
 * github-protection — ADR-005 merge semantics.
 *
 * Fixtures are recorded RUNNER results (`{ok, json}` / `{ok, reason}`), not HTTP
 * responses: the runner owns the subprocess boundary and is tested separately in
 * gh-runner.test.js. Injecting `run` keeps this suite free of `vi.mock` and of any
 * network, exactly as ADR-004 intends.
 */
import { describe, expect, it } from 'vitest';
import { REASONS, remedyFor } from '../cli/core/gh-runner.js';
import {
  FIELD_ABSENT,
  LEGACY_ABSENT,
  findDisagreements,
  getProtection,
  mergeBranch,
} from '../cli/core/github-protection.js';

const REPO = 'acme/widgets';
const B = (p) => `repos/${REPO}/${p}`;

const okJson = (json) => ({ ok: true, json });
const fail = (reason) => ({ ok: false, reason, remedy: remedyFor(reason) });

/** Unrouted paths answer 404 — which is what GitHub does for an unprotected branch. */
function makeRun(routes) {
  const calls = [];
  const run = (path) => {
    calls.push(path);
    const r = Object.prototype.hasOwnProperty.call(routes, path) ? routes[path] : fail(REASONS.NOT_FOUND);
    return typeof r === 'function' ? r() : r;
  };
  run.calls = calls;
  return run;
}

const LEGACY_STRICT = {
  required_pull_request_reviews: {
    required_approving_review_count: 2,
    dismiss_stale_reviews: true,
    require_last_push_approval: true,
  },
  enforce_admins: { enabled: true },
};

const RULES_REF = [
  { type: 'pull_request', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
  { type: 'deletion', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
];

const rulesetStrict = (over = {}) => ({
  id: 42,
  name: 'main-guard',
  enforcement: 'active',
  bypass_actors: [],
  rules: [{
    type: 'pull_request',
    parameters: {
      required_approving_review_count: 2,
      dismiss_stale_reviews_on_push: true,
      require_last_push_approval: true,
    },
  }],
  ...over,
});

const branchOf = async (routes, branch = 'main') =>
  (await getProtection({ repo: REPO, branches: [branch], run: makeRun(routes) })).branches[branch];

// ---------------------------------------------------------------- legacy only

describe('legacy-only protection', () => {
  it('reports protected from the legacy surface with no rulesets', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.protected).toEqual({ status: 'ok', value: true });
    expect(b.sources.legacy).toEqual({ status: 'ok', value: true });
    expect(b.sources.rulesets).toEqual({ status: 'ok', value: [] });
    expect(b.bypass).toEqual({ status: 'ok', value: { present: false, via: [] } });
    expect(b.disagreements).toEqual([]);
  });

  it('reports an admin bypass when enforce_admins is off', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: okJson({ ...LEGACY_STRICT, enforce_admins: { enabled: false } }),
    });
    expect(b.bypass).toEqual({ status: 'ok', value: { present: true, via: [{ type: 'admin', count: 1 }] } });
  });
});

// --------------------------------------------------------------- ruleset only

describe('ruleset-only protection', () => {
  it('treats a 404 on the legacy sub-resource as absent, not unavailable', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict()),
    });
    expect(b.protected).toEqual({ status: 'ok', value: true });
    expect(b.sources.legacy).toEqual({ status: 'ok', value: false });
    expect(b.sources.rulesets.value).toEqual([
      { id: 42, name: 'main-guard', enforcement: 'active', source_type: 'Repository', counted: true },
    ]);
    expect(b.bypass.status).toBe('ok');
  });

  it('reports an unprotected branch as protected:false, never unavailable', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson([]),
    });
    expect(b.protected).toEqual({ status: 'ok', value: false });
    expect(b.bypass).toEqual({ status: 'ok', value: { present: false, via: [] } });
  });

  it('does not count an inactive ruleset but names it', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict({
        enforcement: 'evaluate',
        name: 'dry-run',
        bypass_actors: [{ actor_type: 'OrganizationAdmin' }],
      })),
    });
    expect(b.protected).toEqual({ status: 'ok', value: false });
    expect(b.inactiveRulesetNames).toEqual(['dry-run']);
    expect(b.sources.rulesets.value[0].counted).toBe(false);
    // An evaluate-mode ruleset enforces nothing, so its bypass list opens nothing.
    expect(b.bypass).toEqual({ status: 'ok', value: { present: false, via: [] } });
  });

  it('summarises bypass actors by type and count, never by identity', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict({
        bypass_actors: [
          { actor_id: 5, actor_type: 'Team' },
          { actor_id: 9, actor_type: 'Team' },
          { actor_id: 1, actor_type: 'OrganizationAdmin' },
        ],
      })),
    });
    expect(b.bypass.value).toEqual({
      present: true,
      via: [{ type: 'OrganizationAdmin', count: 1 }, { type: 'Team', count: 2 }],
    });
    expect(JSON.stringify(b.bypass)).not.toContain('actor_id');
  });
});

// ------------------------------------------------------------- both surfaces

describe('both surfaces', () => {
  it('agrees silently when the two surfaces match', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict()),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.disagreements).toEqual([]);
    expect(b.sources.legacy.value).toBe(true);
    expect(b.sources.rulesets.value).toHaveLength(1);
  });

  it('reports disagreements rather than merging them', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict({
        rules: [{
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: false,
            require_last_push_approval: true,
          },
        }],
      })),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.disagreements).toEqual([
      { control: 'dismiss_stale_reviews', legacy: true, ruleset: false, rulesetId: 42 },
      { control: 'required_approving_review_count', legacy: 2, ruleset: 1, rulesetId: 42 },
    ]);
    // Rule 4: a disagreement is a finding, not a merge input.
    expect(b.protected).toEqual({ status: 'ok', value: true });
  });

  it('does not read one-sided coverage as disagreement', () => {
    expect(findDisagreements(
      { required_pull_request_reviews: { required_approving_review_count: 2 } },
      [rulesetStrict({ rules: [{ type: 'pull_request', parameters: { require_last_push_approval: true } }] })],
    )).toEqual([]);
  });
});

// ------------------------------------------------------------- absent fields

describe('absent fields (rule 3)', () => {
  it('treats a 200 without `protected` as unavailable, not false', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ name: 'main' }),
      [B('rules/branches/main')]: okJson([]),
    });
    expect(b.protected).toEqual({ status: 'unavailable', reason: FIELD_ABSENT, remedy: expect.any(String) });
  });

  it('treats an absent bypass_actors key as unavailable, never as an empty list', async () => {
    const rs = rulesetStrict();
    delete rs.bypass_actors;
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rs),
    });
    expect(b.protected.value).toBe(true);
    expect(b.bypass.status).toBe('unavailable');
    expect(b.bypass.reason).toBe(FIELD_ABSENT);
  });

  it('distinguishes an absent bypass_actors key from an empty one', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson(rulesetStrict({ bypass_actors: [] })),
    });
    expect(b.bypass).toEqual({ status: 'ok', value: { present: false, via: [] } });
  });

  it('treats an absent enforce_admins as unavailable', async () => {
    const legacy = { ...LEGACY_STRICT };
    delete legacy.enforce_admins;
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: okJson(legacy),
    });
    expect(b.bypass.reason).toBe(FIELD_ABSENT);
  });

  it('keeps a legacy 404 ambiguous when the coarse flag claims protection nothing explains', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      // protection sub-resource unrouted => 404
    });
    expect(b.protected).toEqual({ status: 'ok', value: true });
    expect(b.bypass).toEqual({
      status: 'unavailable',
      reason: REASONS.NOT_FOUND,
      remedy: remedyFor(REASONS.NOT_FOUND),
    });
  });
});

// -------------------------------------------------------- permission failures

describe('permission failures', () => {
  it('keeps protection readable from the coarse flag when legacy detail is 401', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: fail(REASONS.UNAUTHENTICATED),
    });
    expect(b.protected).toEqual({ status: 'ok', value: true });
    expect(b.sources.legacy.status).toBe('unavailable');
    expect(b.bypass.reason).toBe(REASONS.UNAUTHENTICATED);
  });

  it('marks bypass unavailable when the ruleset surface is forbidden', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: fail(REASONS.FORBIDDEN),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.protected.value).toBe(true);
    expect(b.sources.rulesets).toEqual({
      status: 'unavailable', reason: REASONS.FORBIDDEN, remedy: remedyFor(REASONS.FORBIDDEN),
    });
    expect(b.bypass.reason).toBe(REASONS.FORBIDDEN);
  });

  it('names the failing surface rather than assuming forbidden', async () => {
    // A 404 on the coarse branch endpoint now means the branch is absent, so the
    // "coarse surface unreadable" case is a non-404 failure.
    const b = await branchOf({
      [B('branches/main')]: fail(REASONS.RATE_LIMITED),
      [B('rules/branches/main')]: okJson([]),
    });
    expect(b.protected).toEqual({
      status: 'unavailable', reason: REASONS.RATE_LIMITED, remedy: remedyFor(REASONS.RATE_LIMITED),
    });
  });

  it('lets a visible open door win over an unreadable surface (most-permissive)', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: fail(REASONS.UNAUTHENTICATED),
      [B('branches/main/protection')]: okJson({ ...LEGACY_STRICT, enforce_admins: { enabled: false } }),
    });
    expect(b.bypass).toEqual({ status: 'ok', value: { present: true, via: [{ type: 'admin', count: 1 }] } });
  });

  it('reports bypass unavailable when a referenced ruleset resolves only partially', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: 7, ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'deletion', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
      ]),
      [B('rulesets/7')]: okJson(rulesetStrict({ id: 7, name: 'seven' })),
      [B('rulesets/42')]: fail(REASONS.FORBIDDEN),
    });
    expect(b.sources.rulesets.value.map((r) => r.id)).toEqual([7]);
    expect(b.bypass.status).toBe('unavailable');
    expect(b.bypass.reason).toBe(REASONS.FORBIDDEN);
  });
});

// ------------------------------------------------------ malformed responses

describe('malformed responses', () => {
  it('treats a non-array rules body as unavailable, not as "no rulesets"', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson({ message: 'nope' }),
    });
    // Reading an unparsed body as an empty list let C-01 report a confident
    // negative and C-03 a green pass off a response nobody understood.
    expect(b.sources.rulesets).toMatchObject({ status: 'unavailable', reason: REASONS.UNKNOWN });
    expect(b.protected.status).toBe('unavailable');
    expect(b.bypass.status).toBe('unavailable');
  });

  it('survives a ruleset body missing name, enforcement and rules', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: okJson({ id: 42 }),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.sources.rulesets.value[0]).toEqual({
      id: 42, name: undefined, enforcement: undefined, source_type: 'Repository', counted: false,
    });
    expect(b.disagreements).toEqual([]);
    // Protection still readable: legacy covers it.
    expect(b.protected.value).toBe(true);
  });

  it('treats a null legacy body as no legacy protection', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: okJson(null),
    });
    expect(b.sources.legacy).toEqual({ status: 'ok', value: false });
    expect(b.protected.value).toBe(false);
  });

  it('ignores rule entries with no ruleset_id', async () => {
    const run = makeRun({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson([{ type: 'creation' }]),
    });
    const out = await getProtection({ repo: REPO, branches: ['main'], run });
    expect(out.branches.main.sources.rulesets.value).toEqual([]);
    expect(run.calls.some((p) => p.includes('/rulesets/'))).toBe(false);
  });
});

// --------------------------------------------------------------- timeouts

describe('timeouts', () => {
  it('propagates a timeout on the coarse branch call', async () => {
    const b = await branchOf({
      [B('branches/main')]: fail(REASONS.TIMEOUT),
      [B('rules/branches/main')]: okJson([]),
    });
    expect(b.protected.reason).toBe(REASONS.TIMEOUT);
    expect(b.bypass.reason).toBe(REASONS.TIMEOUT);
  });

  it('does not turn a timed-out ruleset detail into an empty bypass list', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson(RULES_REF),
      [B('rulesets/42')]: fail(REASONS.TIMEOUT),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    expect(b.sources.rulesets).toEqual({
      status: 'unavailable', reason: REASONS.TIMEOUT, remedy: remedyFor(REASONS.TIMEOUT),
    });
    expect(b.bypass.reason).toBe(REASONS.TIMEOUT);
  });
});

// ------------------------------------------------------- reference resolution

describe('ruleset reference resolution', () => {
  it('fetches each referenced ruleset once, in sorted id order', async () => {
    const run = makeRun({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'deletion', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'non_fast_forward', ruleset_id: 7, ruleset_source_type: 'Repository', ruleset_source: REPO },
      ]),
      [B('rulesets/7')]: okJson(rulesetStrict({ id: 7, name: 'seven' })),
      [B('rulesets/42')]: okJson(rulesetStrict({ id: 42, name: 'forty-two' })),
    });
    const out = await getProtection({ repo: REPO, branches: ['main'], run });
    const fetched = run.calls.filter((p) => p.includes('/rulesets/'));
    expect(fetched).toEqual([B('rulesets/7'), B('rulesets/42')]);
    expect(out.branches.main.sources.rulesets.value.map((r) => r.id)).toEqual([7, 42]);
  });

  it('resolves an organization-sourced ruleset through the org endpoint', async () => {
    const run = makeRun({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: 9, ruleset_source_type: 'Organization', ruleset_source: 'acme' },
      ]),
      'orgs/acme/rulesets/9': okJson(rulesetStrict({ id: 9, name: 'org-guard' })),
    });
    const out = await getProtection({ repo: REPO, branches: ['main'], run });
    expect(run.calls).toContain('orgs/acme/rulesets/9');
    expect(out.branches.main.sources.rulesets.value[0]).toMatchObject({ id: 9, source_type: 'Organization' });
  });

  it('emits branches in sorted order regardless of input order', async () => {
    const run = makeRun({
      [B('branches/dev')]: okJson({ protected: true }),
      [B('rules/branches/dev')]: okJson([]),
      [B('branches/dev/protection')]: okJson(LEGACY_STRICT),
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([]),
      [B('branches/main/protection')]: okJson(LEGACY_STRICT),
    });
    const out = await getProtection({ repo: REPO, branches: ['main', 'dev'], run });
    expect(Object.keys(out.branches)).toEqual(['dev', 'main']);
  });
});

// ---------------------------------------------------------------- validation

describe('input validation', () => {
  it('rejects a traversal repo before any subprocess', async () => {
    const run = makeRun({});
    await expect(getProtection({ repo: '../../etc', branches: ['main'], run })).rejects.toThrow(TypeError);
    expect(run.calls).toEqual([]);
  });

  it('rejects a branch carrying a query or fragment', async () => {
    await expect(getProtection({ repo: REPO, branches: ['main?x=1'], run: makeRun({}) })).rejects.toThrow(TypeError);
    await expect(getProtection({ repo: REPO, branches: ['main#x'], run: makeRun({}) })).rejects.toThrow(TypeError);
  });
});

// ------------------------------------------------------------- pure merge

describe('mergeBranch is pure', () => {
  it('accepts the absent legacy state without any I/O', () => {
    const merged = mergeBranch({
      protectedFlag: { status: 'ok', value: false },
      legacy: { status: LEGACY_ABSENT, reason: REASONS.NOT_FOUND, remedy: 'x' },
      rulesets: { status: 'ok', value: [] },
    });
    expect(merged.protected).toEqual({ status: 'ok', value: false });
    expect(merged.bypass.value).toEqual({ present: false, via: [] });
  });

  it('picks the reason by precedence, not by which surface was checked first', () => {
    const both = (legacyReason, rulesetReason) => mergeBranch({
      protectedFlag: { status: 'ok', value: true },
      legacy: { status: 'unavailable', reason: legacyReason, remedy: 'x' },
      rulesets: { status: 'unavailable', reason: rulesetReason, remedy: 'x' },
    }).bypass.reason;
    expect(both(REASONS.UNAUTHENTICATED, REASONS.TIMEOUT)).toBe(REASONS.UNAUTHENTICATED);
    expect(both(REASONS.TIMEOUT, REASONS.UNAUTHENTICATED)).toBe(REASONS.UNAUTHENTICATED);
    expect(both(REASONS.NOT_FOUND, REASONS.FORBIDDEN)).toBe(REASONS.FORBIDDEN);
  });

  it('never reports bypass:false when both surfaces are unreadable', () => {
    const merged = mergeBranch({
      protectedFlag: { status: 'ok', value: true },
      legacy: { status: 'unavailable', reason: REASONS.UNAUTHENTICATED, remedy: 'x' },
      rulesets: { status: 'unavailable', reason: REASONS.UNAUTHENTICATED, remedy: 'x' },
    });
    expect(merged.protected).toEqual({ status: 'ok', value: true });
    expect(merged.bypass.status).toBe('unavailable');
  });
});

// ------------------------------------------------- regressions from /review

describe('regressions found by adversarial review', () => {
  it('will not report a branch unprotected when a ruleset could not be read', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: 7, ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'deletion', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
      ]),
      [B('rulesets/7')]: okJson(rulesetStrict({ id: 7, name: 'seven', enforcement: 'evaluate' })),
      [B('rulesets/42')]: fail(REASONS.FORBIDDEN),
    });
    // Ruleset 42 may be the one protecting this branch. A partial resolve
    // supports a positive verdict, never a negative one.
    expect(b.protected).toMatchObject({ status: 'unavailable', reason: REASONS.FORBIDDEN });
  });

  it('still reports protected when a resolved ruleset protects and another failed', async () => {
    const b = await branchOf({
      [B('branches/main')]: okJson({ protected: true }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: 7, ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'deletion', ruleset_id: 42, ruleset_source_type: 'Repository', ruleset_source: REPO },
      ]),
      [B('rulesets/7')]: okJson(rulesetStrict({ id: 7, name: 'seven' })),
      [B('rulesets/42')]: fail(REASONS.FORBIDDEN),
    });
    expect(b.protected).toEqual({ status: 'ok', value: true });
  });

  it('marks a governed branch that does not exist as absent rather than unavailable', async () => {
    const out = await getProtection({
      repo: REPO,
      branches: ['main', 'dev'],
      run: makeRun({
        [B('branches/main')]: okJson({ protected: true }),
        [B('rules/branches/main')]: okJson([]),
        [B('branches/main/protection')]: okJson(LEGACY_STRICT),
        [B('branches/dev')]: fail(REASONS.NOT_FOUND),
      }),
    });
    expect(out.branches.dev).toEqual({ absent: true, reason: REASONS.NOT_FOUND, remedy: expect.any(String) });
    expect(out.branches.main.protected).toEqual({ status: 'ok', value: true });
  });

  it('does not query a branch it already found absent', async () => {
    const run = makeRun({ [B('branches/dev')]: fail(REASONS.NOT_FOUND) });
    await getProtection({ repo: REPO, branches: ['dev'], run });
    expect(run.calls).toEqual([B('branches/dev')]);
  });

  it('ignores a disabled ruleset when looking for disagreements', () => {
    const legacy = { required_pull_request_reviews: { required_approving_review_count: 2, dismiss_stale_reviews: true } };
    const disabled = rulesetStrict({
      id: 1, enforcement: 'disabled',
      rules: [{ type: 'pull_request', parameters: { required_approving_review_count: 1, dismiss_stale_reviews_on_push: false } }],
    });
    expect(findDisagreements(legacy, [disabled])).toEqual([]);
  });

  it('compares every active ruleset, not only the first', () => {
    const legacy = { required_pull_request_reviews: { required_approving_review_count: 2 } };
    const agrees = rulesetStrict({ id: 1, rules: [{ type: 'pull_request', parameters: { required_approving_review_count: 2 } }] });
    const differs = rulesetStrict({ id: 2, rules: [{ type: 'pull_request', parameters: { required_approving_review_count: 9 } }] });
    expect(findDisagreements(legacy, [agrees, differs])).toEqual([
      { control: 'required_approving_review_count', legacy: 2, ruleset: 9, rulesetId: 2 },
    ]);
  });

  it('refuses a ruleset id that is not a safe non-negative integer', async () => {
    const run = makeRun({
      [B('branches/main')]: okJson({ protected: false }),
      [B('rules/branches/main')]: okJson([
        { type: 'pull_request', ruleset_id: '../../../../user', ruleset_source_type: 'Repository', ruleset_source: REPO },
        { type: 'deletion', ruleset_id: -1, ruleset_source_type: 'Repository', ruleset_source: REPO },
      ]),
    });
    await getProtection({ repo: REPO, branches: ['main'], run });
    expect(run.calls.some((p) => p.includes('/rulesets/'))).toBe(false);
  });
});
