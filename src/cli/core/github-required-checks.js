/**
 * github-required-checks — C-02's two halves, kept apart on purpose.
 *
 * FR-02: a required check counts as satisfied only when it is BOTH configured
 * AND observed reporting. Those are different questions with different failure
 * modes, so they are answered separately and merged by the caller:
 *
 *   configured   which contexts the two protection surfaces demand
 *   observed     which of them actually reported, over a stated lookback
 *
 * The asymmetry that matters: a configured-but-never-observed check blocks
 * nothing, and a check that reports but is not required gates nothing. Only the
 * intersection is enforcement. Reporting either half alone is the "configured
 * intent is not a pass" defect (BR-01) in one direction or the other.
 *
 * This module decides no severity and no verdict. It returns evidence.
 */

import { REASONS, remedyFor, runGhApi } from './gh-runner.js';
import { FIELD_ABSENT, pickReason } from './github-protection.js';

const ok = (value, extra = {}) => ({ status: 'ok', value, ...extra });
const unavailable = (reason) => ({ status: 'unavailable', reason, remedy: remedyFor(reason) });

/** No qualifying pull request in the window is NOT "zero successful checks". */
export const NO_EVIDENCE = 'no-evidence';

/**
 * The lookback contract, stated so the output can name it.
 *
 * `merged` pull requests only: a closed-unmerged PR may have been abandoned
 * before its checks ran, so its silence proves nothing. Merged PRs are exactly
 * the population the gates let through, which is what "does this check actually
 * gate anything" asks.
 *
 * The window is small and the scan short-circuits as soon as every configured
 * context has been seen, so the healthy case costs one or two calls. The wider
 * limits exist to bound the unhealthy case against NFR-01's single deadline.
 */
export const LOOKBACK = Object.freeze({
  maxPullRequests: 5,
  candidatePageSize: 20,
  checkRunPageSize: 100,
  maxCheckRunPages: 3,
});

export const EVIDENCE_SOURCE = 'check runs and commit statuses on merged pull-request heads';

export function describeLookback(lookback = LOOKBACK, branch) {
  return `up to ${lookback.maxPullRequests} most recent merged pull requests into ${branch}`;
}

// ------------------------------------------------------------- configured half

/** Stable identity. A context required of a SPECIFIC app is not the same requirement. */
export function contextKey({ context, appId }) {
  return `${context} ${appId ?? '*'}`;
}

const sortContexts = (list) => [...list].sort((a, b) => contextKey(a).localeCompare(contextKey(b)));

/**
 * Which contexts the two surfaces demand.
 *
 * Deduplicated by identity and sorted, so the same repository always produces
 * the same list whatever order the API answered in. A context demanded by both
 * surfaces is one requirement with two sources, not two requirements.
 *
 * Field-absence asymmetry, deliberate and narrow: on the LEGACY surface an
 * omitted `required_status_checks` is read as "none configured", not as
 * unavailable. That endpoint is all-or-nothing — without admin it returns 401
 * outright — so a 200 body is a complete body. The ruleset surface is different:
 * a `required_status_checks` RULE whose parameters key is missing is a partial
 * body, and that IS unavailable, exactly as `bypass_actors` is (ADR-005 rule 3).
 * The two cases differ in what a wrong answer costs: the legacy reading can only
 * produce a visible `fail`, never a silent pass.
 */
export function configuredContexts({ legacy, rulesets }) {
  const found = new Map();
  const unreadable = [];
  let legacyReadable = false;
  let rulesetsReadable = false;

  if (legacy.status === 'ok' && legacy.value != null) {
    legacyReadable = true;
    for (const entry of legacyRequirements(legacy.value)) addContext(found, entry, 'legacy');
  } else if (legacy.status === 'absent') {
    // No legacy protection at all, so it demands nothing. Readable.
    legacyReadable = true;
  } else if (legacy.status !== 'ok') {
    unreadable.push(legacy.reason);
  }

  if (rulesets.status === 'ok') {
    rulesetsReadable = true;
    if (rulesets.partialReason) unreadable.push(rulesets.partialReason);
    for (const rs of rulesets.value.filter((r) => r.enforcement === 'active')) {
      const rule = (rs.rules ?? []).find((r) => r.type === 'required_status_checks');
      if (!rule) continue;
      const params = rule.parameters;
      if (!params || !('required_status_checks' in params)) { unreadable.push(FIELD_ABSENT); continue; }
      for (const entry of rulesetRequirements(params)) addContext(found, entry, 'ruleset');
    }
  } else {
    unreadable.push(rulesets.reason);
  }

  if (!legacyReadable && !rulesetsReadable) {
    return unavailable(pickReason(unreadable.filter(Boolean)) ?? REASONS.UNKNOWN);
  }

  const value = sortContexts([...found.values()].map((c) => ({ ...c, sources: [...c.sources].sort() })));
  const partialReason = pickReason(unreadable.filter(Boolean));
  return partialReason ? ok(value, { partialReason }) : ok(value);
}

function addContext(found, entry, source) {
  const key = contextKey(entry);
  const existing = found.get(key);
  if (existing) { existing.sources.add(source); return; }
  found.set(key, { context: entry.context, appId: entry.appId ?? null, sources: new Set([source]) });
}

function legacyRequirements(protection) {
  const rsc = protection.required_status_checks;
  if (!rsc) return [];
  // `checks` carries app identity; `contexts` is the older, app-blind form. Both
  // are returned, so preferring `checks` avoids counting one requirement twice
  // under two identities.
  if (Array.isArray(rsc.checks) && rsc.checks.length > 0) {
    return rsc.checks.map((c) => ({ context: c.context, appId: c.app_id ?? null }));
  }
  return (rsc.contexts ?? []).map((context) => ({ context, appId: null }));
}

function rulesetRequirements(params) {
  return (params.required_status_checks ?? []).map((c) => ({
    context: c.context,
    appId: c.integration_id ?? null,
  }));
}

// --------------------------------------------------------------- observed half

/**
 * Did each configured context actually report?
 *
 * Newest-first, stopping the moment every context has been seen: a healthy
 * repository costs one page of one pull request. Everything that could make an
 * "unobserved" verdict wrong — an unreadable page, a truncated check-run list,
 * an exhausted budget — is recorded rather than dropped, because the caller
 * must not turn "we did not look far enough" into "this check never runs".
 */
export async function observeContexts({ repo, branch, contexts, cwd, budget, run = runGhApi, lookback = LOOKBACK }) {
  const evidence = {
    branch,
    source: EVIDENCE_SOURCE,
    window: describeLookback(lookback, branch),
    examined: [],
    observed: [],
    unobserved: [],
    truncated: false,
    unreadableReasons: [],
  };

  if (contexts.length === 0) return ok(evidence);

  const prPath = `repos/${repo}/pulls?state=closed&base=${encodeURIComponent(branch)}`
    + `&per_page=${lookback.candidatePageSize}&sort=updated&direction=desc`;
  const prRes = run(prPath, { cwd, budget });
  if (!prRes.ok) return unavailable(prRes.reason);
  if (!Array.isArray(prRes.json)) return unavailable(REASONS.UNKNOWN);

  const merged = prRes.json
    .filter((pr) => pr && pr.merged_at && pr.head && typeof pr.head.sha === 'string')
    // Newest merge first, then PR number, so the window never depends on how the
    // API happened to order two pull requests merged in the same second.
    .sort((a, b) => (b.merged_at.localeCompare(a.merged_at)) || ((b.number ?? 0) - (a.number ?? 0)))
    .slice(0, lookback.maxPullRequests);

  if (merged.length === 0) return unavailable(NO_EVIDENCE);

  const outstanding = new Map(contexts.map((c) => [contextKey(c), c]));

  for (const pr of merged) {
    if (outstanding.size === 0) break;
    const seen = collectEvidence({ repo, sha: pr.head.sha, cwd, budget, run, lookback, evidence });
    for (const [key, ctx] of [...outstanding.entries()]) {
      if (matches(ctx, seen)) {
        outstanding.delete(key);
        evidence.observed.push({
          context: ctx.context, appId: ctx.appId, pullRequest: pr.number, sha: pr.head.sha,
        });
      }
    }
    evidence.examined.push({
      pullRequest: pr.number,
      sha: pr.head.sha,
      mergedAt: pr.merged_at,
      checkRuns: seen.runs.length,
      statuses: seen.statuses.length,
    });
  }

  evidence.observed.sort((a, b) => a.context.localeCompare(b.context));
  evidence.unobserved = sortContexts([...outstanding.values()]).map(({ context, appId }) => ({ context, appId }));
  evidence.unreadableReason = pickReason(evidence.unreadableReasons.filter(Boolean));
  return ok(evidence);
}

/**
 * A configured context is observed when a check run of that name reported, and,
 * where the requirement names an app, when that app produced it.
 *
 * Commit statuses are the fallback: not every CI posts check runs, and treating
 * a status-only pipeline as "never reported" would be a false gap. A status
 * carries no app identity, so it can satisfy an app-blind requirement but never
 * an app-qualified one — claiming otherwise would assert an identity we did not
 * see.
 */
function matches(ctx, seen) {
  const byCheckRun = seen.runs.some((r) => r.name === ctx.context
    && (ctx.appId == null || r.appId === ctx.appId));
  if (byCheckRun) return true;
  if (ctx.appId != null) return false;
  return seen.statuses.some((s) => s.context === ctx.context);
}

function collectEvidence({ repo, sha, cwd, budget, run, lookback, evidence }) {
  const runs = [];
  let total = null;

  for (let page = 1; page <= lookback.maxCheckRunPages; page += 1) {
    const res = run(
      `repos/${repo}/commits/${sha}/check-runs?per_page=${lookback.checkRunPageSize}&page=${page}`,
      { cwd, budget },
    );
    if (!res.ok) { evidence.unreadableReasons.push(res.reason); break; }
    const body = res.json ?? {};
    if (!Array.isArray(body.check_runs)) { evidence.unreadableReasons.push(REASONS.UNKNOWN); break; }
    total = typeof body.total_count === 'number' ? body.total_count : total;
    for (const r of body.check_runs) {
      runs.push({ name: r.name, status: r.status, conclusion: r.conclusion, appId: r.app?.id ?? null });
    }
    if (body.check_runs.length < lookback.checkRunPageSize) break;
  }
  // A page-limited scan that stopped short must say so: an unseen context may be
  // on a page we never fetched, and that is not evidence of absence.
  if (total !== null && runs.length < total) evidence.truncated = true;

  const statusRes = run(`repos/${repo}/commits/${sha}/status?per_page=${lookback.checkRunPageSize}`, { cwd, budget });
  const statuses = statusRes.ok && Array.isArray(statusRes.json?.statuses)
    ? statusRes.json.statuses.map((s) => ({ context: s.context, state: s.state }))
    : [];
  if (!statusRes.ok) evidence.unreadableReasons.push(statusRes.reason);

  // Deterministic order for anything that reaches --json.
  runs.sort((a, b) => a.name.localeCompare(b.name) || String(a.appId).localeCompare(String(b.appId)));
  statuses.sort((a, b) => String(a.context).localeCompare(String(b.context)));
  return { runs, statuses };
}
