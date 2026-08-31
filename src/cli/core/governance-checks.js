/**
 * governance-checks — turns verified evidence into doctor checks.
 *
 * Separated from `doctor.js` so the state/severity rules are unit-testable
 * without a filesystem, a subprocess or a rendered line. `doctor.js` keeps
 * orchestration, rendering and the exit code; this module decides only what a
 * check IS. (The HLD's module table put this inside `doctor.js`; splitting it
 * out changes no dependency direction — `commands/` still points at `core/` —
 * and is what makes AC-13's invariant assertable.)
 *
 * The three-state model, once, here:
 *   pass         verified good        passed: true
 *   fail         verified gap         passed: false, counted, severity applies
 *   unavailable  nothing was verified passed: false, excluded from the counts by
 *                default, and NEVER rendered with the ✗ glyph or a severity label
 *
 * `passed === (state === 'pass')` (FR-25) is enforced by construction: every
 * check leaves this module through `check()`.
 */

import path from 'path';
import fs from 'fs-extra';
import { REASONS } from './gh-runner.js';
import { FIELD_ABSENT, pickReason } from './github-protection.js';

/** Reasons this module raises that are not transport outcomes. */
export const LOCAL_REASONS = Object.freeze({
  NO_GIT: 'no-git',
  GIT_DIR_UNREADABLE: 'git-dir-unreadable',
});

/**
 * Short human phrase for the `? [UNAVAILABLE] <name> — <phrase>` line. Distinct
 * from `remedyFor`, which names the ACTION; this names the CONDITION. Both are
 * shown, because "insufficient permission" and "grant more access" are different
 * halves of the same sentence.
 */
const PHRASE = Object.freeze({
  [REASONS.GH_MISSING]: 'GitHub CLI not installed',
  [REASONS.UNAUTHENTICATED]: 'GitHub CLI not authenticated',
  [REASONS.FORBIDDEN]: 'insufficient GitHub permission',
  [REASONS.NOT_FOUND]: 'repository or branch not visible',
  [REASONS.TIMEOUT]: 'GitHub API did not respond within the time budget',
  [REASONS.INVALID_REPO]: 'invalid repository name',
  [REASONS.NO_REPO]: 'no GitHub repository configured for this directory',
  [REASONS.UNKNOWN]: 'GitHub CLI failed for an unrecognised reason',
  [FIELD_ABSENT]: 'not returned at this permission level',
  [LOCAL_REASONS.NO_GIT]: 'no git repository at the target',
  [LOCAL_REASONS.GIT_DIR_UNREADABLE]: '.git is not a readable directory',
});

export function reasonPhrase(reason) {
  return PHRASE[reason] ?? PHRASE[REASONS.UNKNOWN];
}

export const CHECK_NAMES = Object.freeze({
  C01: 'Branch protection effective (GitHub)',
  C03: 'Administrator bypass (GitHub)',
  C04: 'Git pre-commit hook installed (.git/hooks/pre-commit)',
});

/** The single constructor. FR-25 cannot be violated without going around it. */
function check({ name, state, severity, verifiedBy, message, note, reason, remedy, details }) {
  return {
    name,
    passed: state === 'pass',
    state,
    severity,
    verifiedBy,
    // `message` explains a FAILURE — several pre-existing checks carry it
    // unconditionally, so rendering it on a pass would print "Not a git
    // repository" beside a green tick. `note` is the pass-safe channel.
    ...(message !== undefined ? { message } : {}),
    ...(note !== undefined ? { note } : {}),
    ...(reason !== undefined ? { reason } : {}),
    ...(remedy !== undefined ? { remedy } : {}),
    ...(details !== undefined ? { details } : {}),
  };
}

/**
 * Adds the additive fields to a pre-existing local check without restating it.
 *
 * IDEMPOTENT BY NECESSITY. Checks that already carry a state travel in the same
 * array, and deriving `state` from `passed` would flatten their third state:
 * C-04 with no `.git` is `unavailable`, `passed: false` — re-deriving turns it
 * into a verified `fail`, inventing a gap that was never observed.
 */
export function normalizeLocalCheck(existing) {
  if (existing.state !== undefined) return existing;
  return {
    ...existing,
    state: existing.passed ? 'pass' : 'fail',
    verifiedBy: 'filesystem',
  };
}

// ---------------------------------------------------------------- C-04 (local)

/**
 * C-04. The real hook on disk, never `.claude/settings.json` (FR-04). Runs with
 * no GitHub and no network, which is why it is the one governance check a
 * generated project can answer for itself.
 *
 * No `.git` is `unavailable`, not `fail`: nothing was verified, and `ais init`
 * into a bare directory legitimately has no repository yet. That distinction is
 * also what keeps `INIT_DIR` green in the release smoke gates.
 */
export async function checkGitHook(target) {
  const gitPath = path.join(target, '.git');
  const named = { name: CHECK_NAMES.C04, verifiedBy: 'filesystem', severity: 'high' };

  let gitStat;
  try {
    gitStat = await fs.stat(gitPath);
  } catch {
    return check({
      ...named,
      state: 'unavailable',
      reason: LOCAL_REASONS.NO_GIT,
      remedy: 'Initialise a git repository (`git init`) so hook installation can be verified',
    });
  }

  // A worktree or submodule stores `.git` as a file pointing elsewhere. Reading
  // that indirection correctly is more than this check needs, and guessing would
  // report a hook state that was never verified.
  if (!gitStat.isDirectory()) {
    return check({
      ...named,
      state: 'unavailable',
      reason: LOCAL_REASONS.GIT_DIR_UNREADABLE,
      remedy: 'Run doctor from the main working tree; .git here points elsewhere (worktree or submodule)',
    });
  }

  const hookPath = path.join(target, '.git', 'hooks', 'pre-commit');
  let hookStat;
  try {
    hookStat = await fs.stat(hookPath);
  } catch {
    return check({
      ...named,
      state: 'fail',
      message: 'No .git/hooks/pre-commit — commit-time enforcement is not installed, whatever .claude/settings.json says.',
    });
  }

  // Windows has no POSIX executable bit and git ignores it there (core.filemode
  // is false), so requiring it would report a false gap on every Windows install
  // — the class of defect core.test.js already guards for two other checks.
  const executable = process.platform === 'win32' || (hookStat.mode & 0o111) !== 0;
  return executable
    ? check({ ...named, state: 'pass' })
    : check({
        ...named,
        state: 'fail',
        message: '.git/hooks/pre-commit exists but is not executable — git will not run it.',
      });
}

// ------------------------------------------------------------- C-01, C-03

/** Every remote check reports the same reason when the repo could not be reached. */
export function unavailableRemoteChecks(reason, remedy) {
  return [CHECK_NAMES.C01, CHECK_NAMES.C03].map((name) => check({
    name,
    state: 'unavailable',
    severity: 'high',
    verifiedBy: 'api',
    reason,
    remedy,
  }));
}

const branchList = (names) => names.join(', ');

/**
 * C-01 and C-03 from one merged report.
 *
 * A VERIFIED GAP OUTRANKS AN UNREADABLE BRANCH. If `main` is provably
 * unprotected and `dev` timed out, the honest answer is "unprotected: main",
 * not "unavailable" — BR-06 separates the two failures precisely so the one the
 * user can fix is not hidden behind the one they may not control.
 */
export function buildRemoteChecks(report) {
  const entries = Object.entries(report.branches);
  return [protectionCheck(entries), bypassCheck(entries)];
}

function protectionCheck(entries) {
  const named = { name: CHECK_NAMES.C01, verifiedBy: 'api', severity: 'high' };

  const unprotected = entries.filter(([, b]) => b.protected.status === 'ok' && b.protected.value === false);
  const unreadable = entries.filter(([, b]) => b.protected.status !== 'ok');
  const evaluateNames = [...new Set(entries.flatMap(([, b]) => b.inactiveRulesetNames))].sort();
  const disagreements = entries.flatMap(([branch, b]) => b.disagreements.map((d) => ({ branch, ...d })));
  const details = protectionDetails(entries);

  // FR-06 / AC-17: an evaluate-mode ruleset blocks nothing, so it is named
  // whether or not the branch turned out to be protected by something else.
  const notes = [];
  if (evaluateNames.length > 0) {
    notes.push(`Non-enforcing ruleset(s) present and not counted: ${branchList(evaluateNames)}.`);
  }
  if (disagreements.length > 0) {
    notes.push(`The two protection surfaces disagree: ${disagreements
      .map((d) => `${d.branch}/${d.control} legacy=${d.legacy} ruleset=${d.ruleset}`).join('; ')}.`);
  }
  if (unreadable.length > 0) {
    notes.push(`Not verified for ${branchList(unreadable.map(([n]) => n))}.`);
  }

  if (unprotected.length > 0) {
    return check({
      ...named,
      state: 'fail',
      message: [`Not protected: ${branchList(unprotected.map(([n]) => n))}.`, ...notes].join(' '),
      details,
    });
  }

  if (unreadable.length > 0) {
    const reason = pickReason(unreadable.map(([, b]) => b.protected.reason).filter(Boolean));
    return check({
      ...named,
      state: 'unavailable',
      reason,
      remedy: unreadable[0][1].protected.remedy,
      ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
      details,
    });
  }

  return check({
    ...named,
    state: 'pass',
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
    details,
  });
}

function bypassCheck(entries) {
  const named = { name: CHECK_NAMES.C03, verifiedBy: 'api', severity: 'high' };

  const open = entries.filter(([, b]) => b.bypass.status === 'ok' && b.bypass.value.present);
  const unreadable = entries.filter(([, b]) => b.bypass.status !== 'ok');
  const details = Object.fromEntries(entries.map(([branch, b]) => [branch, b.bypass]));

  if (open.length > 0) {
    const described = open.map(([branch, b]) => `${branch} (${b.bypass.value.via
      .map((v) => `${v.type}×${v.count}`).join(', ')})`);
    const trailer = unreadable.length > 0
      ? ` Not verified for ${branchList(unreadable.map(([n]) => n))}.`
      : '';
    return check({
      ...named,
      state: 'fail',
      message: `Protection can be bypassed on ${branchList(described)}.${trailer}`,
      details,
    });
  }

  if (unreadable.length > 0) {
    const reason = pickReason(unreadable.map(([, b]) => b.bypass.reason).filter(Boolean));
    return check({
      ...named,
      state: 'unavailable',
      reason,
      remedy: unreadable[0][1].bypass.remedy,
      details,
    });
  }

  return check({ ...named, state: 'pass', details });
}

/** Provenance survives into `--json`: which surface answered, and what it said. */
function protectionDetails(entries) {
  return Object.fromEntries(entries.map(([branch, b]) => [branch, {
    protected: b.protected,
    legacy: b.sources.legacy,
    rulesets: b.sources.rulesets,
    inactiveRulesetNames: b.inactiveRulesetNames,
    disagreements: b.disagreements,
  }]));
}

// ------------------------------------------------------------------ aggregates

/**
 * FR-20. By default the severity counts mean exactly what they meant before:
 * `state === 'fail'`. `--require-remote` adds unavailable REMOTE checks and
 * nothing else — a local check that verified nothing (C-04 with no `.git`) is
 * not something a remote-enforcement flag can speak to.
 */
export function countsAsFailure(c, requireRemote) {
  if (c.state === 'fail') return true;
  return Boolean(requireRemote) && c.state === 'unavailable' && c.verifiedBy === 'api';
}

export function summarise(checks, { requireRemote = false } = {}) {
  const failedAt = (severity) => checks
    .filter((c) => c.severity === severity && countsAsFailure(c, requireRemote)).length;

  return {
    allPassed: checks.every((c) => c.state === 'pass'),
    criticalFailed: failedAt('critical'),
    highFailed: failedAt('high'),
    mediumFailed: failedAt('medium'),
    lowFailed: failedAt('low'),
    unavailableCount: checks.filter((c) => c.state === 'unavailable').length,
  };
}
