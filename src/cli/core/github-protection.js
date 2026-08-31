/**
 * github-protection — effective branch protection, merged from BOTH surfaces.
 *
 * ADR-005. GitHub protects a branch through two independent mechanisms: legacy
 * branch protection and rulesets. A branch may be covered by either, both, or
 * neither — observed live in this repository, where `main` is ruleset-governed
 * and `dev` is legacy-protected. Querying one surface misreports the other.
 *
 * Four rules, in the ADR's order:
 *   1. Protection  — most-restrictive-wins. Protected if legacy covers it OR an
 *                    `enforcement: "active"` ruleset applies. `evaluate` and
 *                    `disabled` contribute nothing and are named, not dropped.
 *   2. Bypass      — most-permissive-wins. A single open door is open. If either
 *                    source is unreadable the answer is `unavailable`, NEVER false.
 *   3. Field absence is unavailability. A 200 whose expected field is *absent*
 *                    yields unavailable for that field, exactly as a 401 would.
 *   4. Disagreement is a finding, not a merge input.
 *
 * I/O and merge are separated: `mergeBranch` is pure and takes payloads, so the
 * rules the ADR calls the likeliest source of a wrong answer are testable without
 * a subprocess. Knows nothing about `doctor.js`, rendering, or severity.
 */

import { REASONS, remedyFor, runGhApi, validateBranch, validateRepo } from './gh-runner.js';

/** Tagged result. `null` and `false` are falsy-identical, so we never use bare null. */
const ok = (value) => ({ status: 'ok', value });
const unavailable = (reason) => ({ status: 'unavailable', reason, remedy: remedyFor(reason) });

/** Rule 3: a 200 whose expected field is absent is unavailable, not a negative. */
export const FIELD_ABSENT = 'field-absent';

/**
 * A readable "there is no legacy protection here". GitHub answers the legacy
 * protection sub-resource with 404 for an unprotected branch — a fact, not a
 * permission failure — so collapsing it into `unavailable` would make every
 * unprotected branch report as unknown. It is a THIRD state, not `ok`, because
 * GitHub also masks insufficient permission with 404 on private repositories
 * and the non-admin probe that would separate the two has not been run.
 */
export const LEGACY_ABSENT = 'absent';
const fieldAbsent = () => ({
  status: 'unavailable',
  reason: FIELD_ABSENT,
  remedy: 'The field is not returned at this permission level; authenticate with more access to read it',
});

/**
 * Controls defined on BOTH surfaces under different names. Rule 4 compares only
 * controls PRESENT on both — a control on one surface and absent from the other
 * is coverage, not disagreement.
 */
const DUAL_CONTROLS = Object.freeze([
  { control: 'require_last_push_approval', legacy: (l) => l?.required_pull_request_reviews?.require_last_push_approval, ruleset: (p) => p?.require_last_push_approval },
  { control: 'dismiss_stale_reviews', legacy: (l) => l?.required_pull_request_reviews?.dismiss_stale_reviews, ruleset: (p) => p?.dismiss_stale_reviews_on_push },
  { control: 'required_approving_review_count', legacy: (l) => l?.required_pull_request_reviews?.required_approving_review_count, ruleset: (p) => p?.required_approving_review_count },
]);

function pullRequestParams(rulesets) {
  for (const rs of rulesets) {
    for (const rule of rs.rules ?? []) {
      if (rule.type === 'pull_request') return rule.parameters ?? {};
    }
  }
  return undefined;
}

/**
 * Rule 4. Only controls defined on both surfaces, so absence never reads as
 * disagreement. Sorted for deterministic output.
 */
export function findDisagreements(legacy, rulesets) {
  if (!legacy || !rulesets?.length) return [];
  const params = pullRequestParams(rulesets);
  if (params === undefined) return [];
  const out = [];
  for (const { control, legacy: fromLegacy, ruleset: fromRuleset } of DUAL_CONTROLS) {
    const l = fromLegacy(legacy);
    const r = fromRuleset(params);
    if (l === undefined || r === undefined) continue;
    if (l !== r) out.push({ control, legacy: l, ruleset: r });
  }
  return out.sort((a, b) => a.control.localeCompare(b.control));
}

/**
 * Pure merge. `legacy` / `rulesets` are tagged results so an unreadable surface
 * stays distinguishable from an empty one — that distinction IS rule 2.
 */
export function mergeBranch({ protectedFlag, legacy, rulesets }) {
  const activeRulesets = rulesets.status === 'ok'
    ? rulesets.value.filter((rs) => rs.enforcement === 'active')
    : [];
  const inactiveRulesets = rulesets.status === 'ok'
    ? rulesets.value.filter((rs) => rs.enforcement !== 'active')
    : [];

  // Rule 1 — most-restrictive-wins. Either surface protecting is enough.
  let isProtected;
  const legacyProtects = legacy.status === 'ok' && legacy.value != null;
  const legacyReadable = legacy.status === 'ok' || legacy.status === LEGACY_ABSENT;
  const rulesetProtects = activeRulesets.length > 0;
  if (legacyProtects || rulesetProtects) {
    isProtected = ok(true);
  } else if (protectedFlag.status === 'ok' && protectedFlag.value === true) {
    // The coarse `protected` boolean is true but neither detail surface explains
    // it: legacy detail is usually 401 without admin. Protected, provenance unknown.
    isProtected = ok(true);
  } else if (protectedFlag.status === 'ok' && legacyReadable && rulesets.status === 'ok') {
    isProtected = ok(false);
  } else {
    // Name the surface that actually failed rather than assuming a permission error.
    const reason = protectedFlag.status !== 'ok'
      ? protectedFlag.reason
      : (!legacyReadable ? legacy.reason : rulesets.reason);
    isProtected = unavailable(reason ?? REASONS.UNKNOWN);
  }

  // Rule 2 — most-permissive-wins, and rule 3 gates it. `bypass_actors` absent
  // from a 200 is the observed case: reading it as "no bypass actors" would be
  // the false negative BR-04 exists to prevent.
  const bypass = mergeBypass(legacy, rulesets, activeRulesets, protectedFlag);

  return {
    protected: isProtected,
    sources: {
      legacy: legacy.status === 'ok'
        ? ok(legacy.value != null)
        : legacy.status === LEGACY_ABSENT
          ? ok(false)
          : { status: 'unavailable', reason: legacy.reason, remedy: legacy.remedy },
      rulesets: rulesets.status === 'ok'
        ? ok(rulesets.value.map((rs) => ({
            id: rs.id,
            name: rs.name,
            enforcement: rs.enforcement,
            source_type: rs.source_type,
            counted: rs.enforcement === 'active',
          })).sort((a, b) => a.id - b.id))
        : { status: 'unavailable', reason: rulesets.reason, remedy: rulesets.remedy },
    },
    inactiveRulesetNames: inactiveRulesets.map((rs) => rs.name).sort(),
    bypass,
    disagreements: findDisagreements(
      legacy.status === 'ok' ? legacy.value : null,
      rulesets.status === 'ok' ? rulesets.value : [],
    ),
  };
}

/**
 * Deterministic precedence for "why couldn't we tell?". Several surfaces can be
 * unreadable at once and first-one-wins would make the reported reason depend on
 * the order the code happens to check them. Ordered by what the operator must do
 * first: a missing or unauthenticated CLI blocks everything, a permission gap
 * blocks one surface, a timeout is transient, and absence is the weakest signal.
 */
const REASON_PRECEDENCE = Object.freeze([
  REASONS.GH_MISSING,
  REASONS.UNAUTHENTICATED,
  REASONS.FORBIDDEN,
  REASONS.TIMEOUT,
  REASONS.NOT_FOUND,
  FIELD_ABSENT,
  REASONS.UNKNOWN,
]);

export function pickReason(reasons) {
  if (reasons.length === 0) return null;
  const rank = (r) => {
    const i = REASON_PRECEDENCE.indexOf(r);
    return i === -1 ? REASON_PRECEDENCE.length : i;
  };
  return [...reasons].sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)))[0];
}

function mergeBypass(legacy, rulesets, activeRulesets, protectedFlag) {
  const via = [];
  const unreadable = [];

  // An unreadable coarse surface makes everything downstream uninterpretable: we
  // cannot even confirm the branch exists, so a 404 on the protection sub-resource
  // proves nothing. Its reason belongs in the pool or it would be masked by that 404.
  if (protectedFlag && protectedFlag.status !== 'ok') unreadable.push(protectedFlag.reason);

  if (legacy.status === 'ok' && legacy.value != null) {
    const enforceAdmins = legacy.value.enforce_admins?.enabled;
    if (enforceAdmins === undefined) unreadable.push(FIELD_ABSENT);
    else if (enforceAdmins === false) via.push({ type: 'admin', count: 1 });
  } else if (legacy.status === LEGACY_ABSENT) {
    // No legacy protection => no legacy admin door. Safe ONLY while nothing else
    // claims the branch is protected; if the coarse flag says protected and no
    // active ruleset explains it, this 404 may be a permission mask hiding an
    // open door, and `unavailable` is the honest answer.
    const unexplained = protectedFlag?.status === 'ok'
      && protectedFlag.value === true
      && activeRulesets.length === 0;
    if (unexplained) unreadable.push(REASONS.NOT_FOUND);
  } else if (legacy.status !== 'ok') {
    unreadable.push(legacy.reason);
  }

  if (rulesets.status === 'ok') {
    // A ruleset we could not resolve is a ruleset whose bypass list we cannot see.
    if (rulesets.partialReason) unreadable.push(rulesets.partialReason);
    for (const rs of activeRulesets) {
      // Rule 3. Absent is NOT empty.
      if (!('bypass_actors' in rs)) { unreadable.push(FIELD_ABSENT); continue; }
      for (const actor of rs.bypass_actors ?? []) {
        via.push({ type: actor.actor_type ?? 'unknown', count: 1 });
      }
    }
  } else {
    unreadable.push(rulesets.reason);
  }

  // Most-permissive-wins: a door we CAN see is decisive even if another source
  // is unreadable. Only when we saw none and something was unreadable is the
  // honest answer `unavailable`.
  if (via.length > 0) return ok({ present: true, via: summariseActors(via) });
  const reason = pickReason(unreadable.filter(Boolean));
  if (reason) {
    return reason === FIELD_ABSENT
      ? fieldAbsent()
      : { status: 'unavailable', reason, remedy: remedyFor(reason) };
  }
  return ok({ present: false, via: [] });
}

/** Type and count only — `--json` reaches CI logs, and the verdict needs no identities. */
function summariseActors(via) {
  const counts = new Map();
  for (const { type } of via) counts.set(type, (counts.get(type) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => ({ type, count }));
}

/**
 * Resolve every distinct ruleset referenced by a branch's rules.
 *
 * A branch's rule list names the same `ruleset_id` once per rule type, and an
 * org-sourced ruleset lives under a different endpoint. Each id is fetched at
 * most once (memoised), a visited set makes a self- or mutually-referential
 * response terminate rather than loop, and ids are processed in sorted order so
 * the output does not depend on API ordering.
 */
async function resolveRulesets(rules, { repo, cwd, budget, run }) {
  const refs = new Map();
  for (const rule of rules) {
    if (rule.ruleset_id == null) continue;
    if (!refs.has(rule.ruleset_id)) {
      refs.set(rule.ruleset_id, { id: rule.ruleset_id, sourceType: rule.ruleset_source_type, source: rule.ruleset_source });
    }
  }

  const visited = new Set();
  const resolved = [];
  let firstFailure = null;

  for (const id of [...refs.keys()].sort((a, b) => a - b)) {
    if (visited.has(id)) continue;
    visited.add(id);
    const ref = refs.get(id);
    const isOrg = String(ref.sourceType ?? '').toLowerCase() === 'organization';
    const path = isOrg
      ? `orgs/${encodeURIComponent(String(ref.source ?? '').split('/')[0])}/rulesets/${id}`
      : `repos/${repo}/rulesets/${id}`;

    const res = run(path, { cwd, budget });
    if (!res.ok) { firstFailure = firstFailure ?? res.reason; continue; }
    const body = res.json ?? {};
    resolved.push({
      id,
      name: body.name,
      enforcement: body.enforcement,
      source_type: ref.sourceType,
      rules: body.rules,
      // Preserve absence: rule 3 needs `'bypass_actors' in rs` to stay false.
      ...('bypass_actors' in body ? { bypass_actors: body.bypass_actors } : {}),
    });
  }

  if (resolved.length === 0 && firstFailure) return { status: 'unavailable', reason: firstFailure, remedy: remedyFor(firstFailure) };
  const value = resolved.sort((a, b) => a.id - b.id);
  // A partial resolve is readable for protection (the ones we saw still count)
  // but NOT for bypass: the unseen ruleset may carry actors. Carried, not dropped.
  return firstFailure ? { status: 'ok', value, partialReason: firstFailure } : ok(value);
}

/**
 * @param {{repo:string, branches:string[], cwd?:string, budget?:object, run?:Function}} opts
 */
export async function getProtection({ repo, branches, cwd, budget, run = runGhApi }) {
  const repoCheck = validateRepo(repo);
  if (!repoCheck.ok) throw new TypeError(repoCheck.message);
  for (const b of branches) {
    const check = validateBranch(b);
    if (!check.ok) throw new TypeError(check.message);
  }

  const out = { repo, branches: {} };
  for (const branch of [...branches].sort()) {
    const branchRes = run(`repos/${repo}/branches/${branch}`, { cwd, budget });
    const protectedFlag = branchRes.ok
      ? ('protected' in (branchRes.json ?? {}) ? ok(branchRes.json.protected) : fieldAbsent())
      : { status: 'unavailable', reason: branchRes.reason, remedy: branchRes.remedy };

    const rulesRes = run(`repos/${repo}/rules/branches/${branch}`, { cwd, budget });
    const rulesets = rulesRes.ok && Array.isArray(rulesRes.json)
      ? await resolveRulesets(rulesRes.json, { repo, cwd, budget, run })
      : rulesRes.ok
        ? ok([])
        : { status: 'unavailable', reason: rulesRes.reason, remedy: rulesRes.remedy };

    const legacyRes = run(`repos/${repo}/branches/${branch}/protection`, { cwd, budget });
    const legacy = legacyRes.ok
      ? ok(legacyRes.json ?? null)
      : (legacyRes.reason === REASONS.NOT_FOUND && protectedFlag.status === 'ok')
        ? { status: LEGACY_ABSENT, reason: REASONS.NOT_FOUND, remedy: legacyRes.remedy }
        : { status: 'unavailable', reason: legacyRes.reason, remedy: legacyRes.remedy };

    out.branches[branch] = mergeBranch({ protectedFlag, legacy, rulesets });
  }
  return out;
}
