/**
 * gh-runner — the single subprocess boundary between this CLI and GitHub.
 *
 * ADR-004: remote reads go through the `gh` CLI rather than `fetch` + a token,
 * so a credential never enters this process. The runner is a CLOSED CONSTRUCTOR,
 * not an argv passthrough: it takes an endpoint path and builds
 * `['api', '--method', 'GET', path]` itself.
 *
 * That is what makes BR-02's read-only guarantee a property of the code. An
 * `-X`/`--method` check would not be enough — `gh api` switches to POST on any
 * `-f`/`-F`/`--field`/`--input` — and a free-form argv would leave
 * `gh repo delete` reachable.
 *
 * It is also the only place that interprets `gh`'s exit status. `gh` collapses
 * 401, 403 and 404 onto exit 1, and a missing binary is `status === null`, so
 * every honest `unavailable` reason is derived here and nowhere else.
 *
 * Raw stderr NEVER leaves this module. It carries the endpoint path — hence a
 * private repository name — and the resolved host, hence a GitHub Enterprise
 * hostname, and `doctor --json` is echoed verbatim into CI logs by
 * scripts/pre-publish-smoke.sh. Stderr is matched to classify, then dropped.
 */

import { spawnSync } from 'node:child_process';

/** Closed set of transport outcomes. Everything downstream degrades on these. */
export const REASONS = Object.freeze({
  GH_MISSING: 'gh-missing',
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  RATE_LIMITED: 'rate-limited',
  NOT_FOUND: 'not-found',
  TIMEOUT: 'timeout',
  INVALID_REPO: 'invalid-repo',
  NO_REPO: 'no-repo',
  UNKNOWN: 'unknown',
});

/** One action per reason (FR-13). User-facing text comes from here, never from `gh`. */
const REMEDY = Object.freeze({
  [REASONS.GH_MISSING]: 'Install the GitHub CLI: https://cli.github.com',
  [REASONS.UNAUTHENTICATED]: 'Authenticate the GitHub CLI: gh auth login',
  [REASONS.FORBIDDEN]: 'This check needs more permission on the repository than the current token has',
  [REASONS.RATE_LIMITED]: 'The GitHub API rate limit is exhausted; wait for it to reset, or authenticate `gh` for a higher limit',
  [REASONS.NOT_FOUND]: 'The repository or branch was not found, or is not visible to the current token',
  [REASONS.TIMEOUT]: 'The GitHub API did not respond within the time budget',
  [REASONS.INVALID_REPO]: 'Pass a valid repository as --repo owner/name',
  [REASONS.NO_REPO]: 'No GitHub repository is configured here; add a GitHub remote or pass --repo owner/name',
  [REASONS.UNKNOWN]: 'The GitHub CLI failed for an unrecognised reason; run the same query with `gh api` to see it',
});

export function remedyFor(reason) {
  return REMEDY[reason] ?? REMEDY[REASONS.UNKNOWN];
}

// NFR-02. Array form stops shell injection; it does NOT sanitise a request path,
// and it does not stop option injection. A branch named `main#x` would make
// `gh api` fetch `.../branches/main` — the COARSE endpoint — while the caller
// believes it read the detailed one. That is a false verdict reached through a
// validation gap, which is exactly what BR-04 forbids.
const OWNER_REPO_SEGMENT = /^[A-Za-z0-9._-]+$/;
const BRANCH_ALLOWED = /^[A-Za-z0-9._/-]{1,255}$/;

function badSegment(seg) {
  return seg === '' || seg === '.' || seg === '..' || seg.startsWith('-');
}

/** @returns {{ok:true,value:string}|{ok:false,message:string}} */
export function validateRepo(repo) {
  if (typeof repo !== 'string') return { ok: false, message: 'repository must be a string' };
  const parts = repo.split('/');
  if (parts.length !== 2) return { ok: false, message: `expected owner/repo, got "${repo}"` };
  for (const seg of parts) {
    if (!OWNER_REPO_SEGMENT.test(seg) || badSegment(seg)) {
      return { ok: false, message: `invalid repository "${repo}"` };
    }
  }
  return { ok: true, value: repo };
}

/** @returns {{ok:true,value:string}|{ok:false,message:string}} */
export function validateBranch(branch) {
  if (typeof branch !== 'string' || !BRANCH_ALLOWED.test(branch)) {
    return { ok: false, message: `invalid branch name "${branch}"` };
  }
  if (branch.startsWith('/') || branch.endsWith('/')) {
    return { ok: false, message: `invalid branch name "${branch}"` };
  }
  if (branch.split('/').some(badSegment)) {
    return { ok: false, message: `invalid branch name "${branch}"` };
  }
  return { ok: true, value: branch };
}

/**
 * Classify a finished `gh` process. Exported for direct unit testing — this
 * mapping is the whole reason the runner exists.
 */
export function classify({ status, signal, errorCode, stderr = '' }) {
  // `status === null` means the process never produced an exit code. Two very
  // different causes land here and MUST NOT collapse: the binary was absent,
  // or we killed it on the deadline.
  if (status === null || status === undefined) {
    if (errorCode === 'ENOENT') return REASONS.GH_MISSING;
    if (errorCode === 'ETIMEDOUT' || signal === 'SIGTERM' || signal === 'SIGKILL') return REASONS.TIMEOUT;
    return REASONS.UNKNOWN;
  }
  if (status === 0) return null;

  const s = stderr.toLowerCase();
  if (s.includes('gh auth login') || s.includes('authentication') || s.includes('not logged in')) {
    return REASONS.UNAUTHENTICATED;
  }
  if (s.includes('http 401') || s.includes('requires authentication')) return REASONS.UNAUTHENTICATED;
  // Rate limiting arrives as 403 too, and is NOT a permission problem: the
  // remedy is to wait, not to obtain access. Checked first so it is not
  // reported as a missing scope the user would go looking for.
  if (s.includes('rate limit') || s.includes('secondary rate') || s.includes('abuse detection')) {
    return REASONS.RATE_LIMITED;
  }
  if (s.includes('http 403') || s.includes('forbidden')) return REASONS.FORBIDDEN;
  if (s.includes('http 404') || s.includes('not found')) return REASONS.NOT_FOUND;
  return REASONS.UNKNOWN;
}

/**
 * Run one authenticated GET against the GitHub API.
 *
 * @param {string} endpointPath e.g. `repos/o/r/branches/main` — a path, never argv
 * @param {{cwd:string, budget?:{remainingMs:()=>number}}} opts
 * @returns {{ok:true,json:unknown}|{ok:false,reason:string,remedy:string}}
 */
export function runGhApi(endpointPath, { cwd, budget } = {}) {
  // An exhausted budget must short-circuit BEFORE spawning: spawnSync's
  // `timeout: 0` means NO timeout, so passing a remaining 0 down would hang.
  const remaining = budget ? budget.remainingMs() : undefined;
  if (remaining !== undefined && remaining <= 0) {
    return { ok: false, reason: REASONS.TIMEOUT, remedy: remedyFor(REASONS.TIMEOUT) };
  }

  const result = spawnSync('gh', ['api', '--method', 'GET', endpointPath], {
    cwd,
    encoding: 'utf-8',
    // stdin ignored so `gh` can never prompt and stall the budget.
    stdio: ['ignore', 'pipe', 'pipe'],
    // Inherited deliberately: FR-16 wants generated projects to run
    // `doctor --require-remote` in CI, where `gh` authenticates by env alone.
    // ADR-004's claim is about CUSTODY — we never read, store or log it.
    env: { ...process.env, GH_NO_UPDATE_NOTIFIER: '1' },
    ...(remaining !== undefined ? { timeout: remaining } : {}),
  });

  const reason = classify({
    status: result.status,
    signal: result.signal,
    errorCode: result.error?.code,
    stderr: result.stderr ?? '',
  });

  // Never surface `result.stderr`, and never serialise the spawn options —
  // `options.env` would carry a token.
  if (reason) return { ok: false, reason, remedy: remedyFor(reason) };

  try {
    return { ok: true, json: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, reason: REASONS.UNKNOWN, remedy: remedyFor(REASONS.UNKNOWN) };
  }
}

/** A single wall-clock deadline for a whole run (NFR-01), not one per call. */
export function createBudget(totalMs, now = () => Date.now()) {
  const start = now();
  return { remainingMs: () => Math.max(0, totalMs - (now() - start)) };
}

/**
 * Resolve the repository the way the WRITE side already does.
 *
 * `scripts/setup-branch-protection.sh:58-66` takes an explicit `owner/repo`
 * argument first and otherwise falls back to `gh repo view --json nameWithOwner`.
 * Read side and write side disagreeing on "which repository" would be a defect
 * in its own right, so the source and the precedence are deliberately identical.
 * The one addition is NFR-02 validation: this value is interpolated into request
 * paths, which the shell script never does with it.
 *
 * Still a closed constructor — `repo` and `view` are fixed, and no caller-supplied
 * string reaches argv.
 */
export function runGhRepoView({ cwd, budget } = {}) {
  const remaining = budget ? budget.remainingMs() : undefined;
  if (remaining !== undefined && remaining <= 0) {
    return { ok: false, reason: REASONS.TIMEOUT, remedy: remedyFor(REASONS.TIMEOUT) };
  }

  const result = spawnSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GH_NO_UPDATE_NOTIFIER: '1' },
    ...(remaining !== undefined ? { timeout: remaining } : {}),
  });

  const reason = classify({
    status: result.status,
    signal: result.signal,
    errorCode: result.error?.code,
    stderr: result.stderr ?? '',
  });
  if (reason) return { ok: false, reason, remedy: remedyFor(reason) };

  const repo = (result.stdout ?? '').trim();
  // `gh repo view` exits 0 with empty stdout outside a repository with a remote.
  if (repo === '') return { ok: false, reason: REASONS.NO_REPO, remedy: remedyFor(REASONS.NO_REPO) };
  return { ok: true, repo };
}

/**
 * `--repo` first, `gh repo view` second, validation over both (FR-34, Q-03 = C).
 * `source` is kept so the output can say where the name came from — FR-35 exists
 * because a fork silently checked as upstream is a wrong answer, not a missing one.
 *
 * @returns {{ok:true,repo:string,source:'flag'|'gh'}|{ok:false,reason:string,remedy:string}}
 */
export function resolveRepo({ repoOverride, cwd, budget, run = runGhRepoView } = {}) {
  if (repoOverride !== undefined && repoOverride !== null && repoOverride !== '') {
    const check = validateRepo(repoOverride);
    if (!check.ok) return { ok: false, reason: REASONS.INVALID_REPO, remedy: check.message };
    return { ok: true, repo: check.value, source: 'flag' };
  }

  const res = run({ cwd, budget });
  if (!res.ok) return res;

  const check = validateRepo(res.repo);
  if (!check.ok) return { ok: false, reason: REASONS.INVALID_REPO, remedy: check.message };
  return { ok: true, repo: check.value, source: 'gh' };
}
