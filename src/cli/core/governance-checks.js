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
import { REASONS, remedyFor } from './gh-runner.js';
import { FIELD_ABSENT, pickReason } from './github-protection.js';
import { NO_EVIDENCE } from './github-required-checks.js';

/** Reasons this module raises that are not transport outcomes. */
export const LOCAL_REASONS = Object.freeze({
  NO_GIT: 'no-git',
  GIT_DIR_UNREADABLE: 'git-dir-unreadable',
  EVIDENCE_TRUNCATED: 'evidence-truncated',
  NOT_PROTECTED: 'not-protected',
  BRANCH_ABSENT: 'branch-absent',
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
  [REASONS.RATE_LIMITED]: 'GitHub API rate limit exhausted',
  [REASONS.NOT_FOUND]: 'repository or branch not visible',
  [REASONS.TIMEOUT]: 'GitHub API did not respond within the time budget',
  [REASONS.INVALID_REPO]: 'invalid repository name',
  [REASONS.NO_REPO]: 'no GitHub repository configured for this directory',
  [REASONS.UNKNOWN]: 'GitHub CLI failed for an unrecognised reason',
  [FIELD_ABSENT]: 'not returned at this permission level',
  [LOCAL_REASONS.NO_GIT]: 'no git repository at the target',
  [LOCAL_REASONS.GIT_DIR_UNREADABLE]: '.git is not a readable directory',
  [LOCAL_REASONS.EVIDENCE_TRUNCATED]: 'more evidence than the scan reads; absence not proven',
  [LOCAL_REASONS.NOT_PROTECTED]: 'no protection exists on any governed branch to bypass',
  [LOCAL_REASONS.BRANCH_ABSENT]: 'none of the governed branches exist in this repository',
  [NO_EVIDENCE]: 'no merged pull request in the lookback window',
});

export function reasonPhrase(reason) {
  return PHRASE[reason] ?? PHRASE[REASONS.UNKNOWN];
}

export const CHECK_NAMES = Object.freeze({
  C01: 'Branch protection effective (GitHub)',
  C02: 'Required status checks reporting (GitHub)',
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
  return [CHECK_NAMES.C01, CHECK_NAMES.C02, CHECK_NAMES.C03].map((name) => check({
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
export function buildRemoteChecks(report, { requiredChecks } = {}) {
  const all = Object.entries(report.branches);
  const absentNames = all.filter(([, b]) => b.absent).map(([n]) => n).sort();
  const entries = all.filter(([, b]) => !b.absent);

  if (entries.length === 0) {
    const [c01, , c03] = unavailableRemoteChecks(
      LOCAL_REASONS.BRANCH_ABSENT,
      `Create or rename a governed branch; none of ${absentNames.join(', ')} exist here`,
    );
    return [c01, requiredChecksCheck(requiredChecks ?? {}), c03];
  }

  return [
    protectionCheck(entries, absentNames),
    requiredChecksCheck(requiredChecks ?? {}),
    bypassCheck(entries),
  ];
}

/**
 * C-02. Enforcement is the INTERSECTION of configured and observed, so this
 * check can fail in two directions and must not collapse them:
 *
 *   nothing required           verified fail — protection gates no checks
 *   required, never reported   verified fail — the gate is inert (FR-02)
 *   required and reporting     pass
 *
 * and it must refuse to answer in three more:
 *
 *   a surface we could not read      may require a context we never saw
 *   no merged PR in the window       silence from an empty population is not
 *                                    "zero successful checks"
 *   a truncated check-run scan       the context may be on a page we skipped
 *
 * That third one is the subtle one. Not finding a check run is only evidence of
 * absence when the scan was complete.
 */
export function requiredChecksCheck({ configured, observation } = {}) {
  const named = { name: CHECK_NAMES.C02, verifiedBy: 'api', severity: 'high' };

  if (!configured) {
    return check({ ...named, state: 'unavailable', reason: REASONS.UNKNOWN, remedy: remedyFor(REASONS.UNKNOWN) });
  }
  if (configured.status !== 'ok') {
    return check({ ...named, state: 'unavailable', reason: configured.reason, remedy: configured.remedy });
  }

  const contexts = configured.value;
  const details = { configured: contexts, ...(configured.partialReason ? { partialReason: configured.partialReason } : {}) };

  if (contexts.length === 0) {
    // A surface we could not read might require checks. "None required" is only
    // a finding when we could see every place a requirement can live.
    if (configured.partialReason) {
      return check({
        ...named,
        state: 'unavailable',
        reason: configured.partialReason,
        remedy: remedyFor(configured.partialReason),
        note: 'No required status check was found on the surfaces that could be read.',
        details,
      });
    }
    return check({
      ...named,
      state: 'fail',
      message: 'No status check is required to merge — branch protection gates review only, so a red build does not block a merge. '
        + 'Neither protection surface returned a required-checks configuration; the legacy surface returns 401 outright without admin, so a readable body with none listed is read as none configured.',
      details,
    });
  }

  if (!observation || observation.status !== 'ok') {
    return check({
      ...named,
      state: 'unavailable',
      reason: observation?.reason ?? REASONS.UNKNOWN,
      remedy: observation?.remedy ?? remedyFor(REASONS.UNKNOWN),
      note: `${contexts.length} check(s) required: ${contexts.map((c) => c.context).sort().join(', ')}.`,
      details,
    });
  }

  const evidence = observation.value;
  const withEvidence = { ...details, evidence };
  const provenance = `Evidence: ${evidence.source}, over ${evidence.window}.`;

  if (evidence.unobserved.length > 0) {
    const inconclusive = (evidence.truncated || evidence.windowTruncated)
      ? LOCAL_REASONS.EVIDENCE_TRUNCATED
      : evidence.unreadableReason;
    if (inconclusive) {
      return check({
        ...named,
        state: 'unavailable',
        reason: inconclusive,
        remedy: remedyFor(inconclusive),
        note: `Not seen reporting, but the scan was incomplete: ${evidence.unobserved.map((c) => c.context).join(', ')}. ${provenance}`,
        details: withEvidence,
      });
    }
    return check({
      ...named,
      state: 'fail',
      message: `Required but never reported: ${evidence.unobserved.map((c) => c.context).join(', ')}. `
        + `A required check that never runs blocks every pull request; one that is required and absent blocks nothing. ${provenance}`,
      details: withEvidence,
    });
  }

  if (configured.partialReason) {
    return check({
      ...named,
      state: 'unavailable',
      reason: configured.partialReason,
      remedy: remedyFor(configured.partialReason),
      note: `Every requirement that could be read is reporting, but one protection surface could not be read and may require more. ${provenance}`,
      details: withEvidence,
    });
  }

  return check({
    ...named,
    state: 'pass',
    note: provenance,
    details: withEvidence,
  });
}

/**
 * Pick the reason by precedence AND the remedy that goes with it.
 *
 * These used to be chosen independently: the reason from `pickReason` across all
 * unreadable branches, the remedy from whichever branch `Object.entries` put
 * first. With `dev` timed out and `main` forbidden that rendered "insufficient
 * GitHub permission" over the timeout remedy — the half the user acts on was the
 * half the precedence machinery did not reach.
 */
function pickReasonAndRemedy(unreadable, read) {
  const reason = pickReason(unreadable.map(([, b]) => read(b).reason).filter(Boolean));
  const match = unreadable.find(([, b]) => read(b).reason === reason);
  return { reason, remedy: (match ? read(match[1]).remedy : undefined) ?? remedyFor(reason) };
}

function protectionCheck(entries, absentNames = []) {
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
      .map((d) => `${d.branch}/${d.control} legacy=${d.legacy} ruleset=${d.ruleset}`
        + (d.rulesetId != null ? ` (ruleset ${d.rulesetId})` : '')).join('; ')}.`);
  }
  if (unreadable.length > 0) {
    notes.push(`Not verified for ${branchList(unreadable.map(([n]) => n))}.`);
  }
  if (absentNames.length > 0) {
    notes.push(`Not present in this repository: ${branchList(absentNames)}.`);
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
    const { reason, remedy } = pickReasonAndRemedy(unreadable, (b) => b.protected);
    return check({
      ...named,
      state: 'unavailable',
      reason,
      remedy,
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

function bypassCheck(allEntries) {
  const named = { name: CHECK_NAMES.C03, verifiedBy: 'api', severity: 'high' };
  const details = Object.fromEntries(allEntries.map(([branch, b]) => [branch, b.bypass]));

  // "Can an administrator bypass protection?" is only a question where protection
  // exists. Scoring an unprotected branch as "no bypass found" printed a green
  // tick beside a branch anyone can force-push — an empty evidence population
  // rendered as a pass, which is the defect this whole check exists to prevent.
  // Branches whose protection is unreadable stay in scope: their bypass state is
  // unknown, not absent.
  const entries = allEntries.filter(([, b]) => !(b.protected.status === 'ok' && b.protected.value === false));

  const open = entries.filter(([, b]) => b.bypass.status === 'ok' && b.bypass.value.present);
  const unreadable = entries.filter(([, b]) => b.bypass.status !== 'ok');

  if (entries.length === 0) {
    return check({
      ...named,
      state: 'unavailable',
      reason: LOCAL_REASONS.NOT_PROTECTED,
      remedy: 'Protect the branch first; branch protection reports the gap',
      note: 'Every governed branch is unprotected, so there is no protection to bypass.',
      details,
    });
  }

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
    const { reason, remedy } = pickReasonAndRemedy(unreadable, (b) => b.bypass);
    return check({ ...named, state: 'unavailable', reason, remedy, details });
  }

  const skipped = allEntries.length - entries.length;
  return check({
    ...named,
    state: 'pass',
    ...(skipped > 0 ? { note: `${skipped} unprotected branch(es) excluded — nothing there to bypass.` } : {}),
    details,
  });
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
