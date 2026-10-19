/**
 * Flag and version policy for `ais update` (item 25: BRD FR-01, FR-02,
 * FR-04, FR-44, FR-46). Pure: no file system access.
 */

import semver from 'semver';

export const PACKAGE_NAME = '@lajin.m/ai-scaffold';

/** A failure with a machine-readable code; the JSON report carries both. */
export class UpdateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UpdateError';
    this.code = code;
  }
}

function toList(value, flag) {
  if (value === undefined || value === null || value === false) return [];
  const list = Array.isArray(value) ? value : [value];
  if (list.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new UpdateError('INVALID_OPTION', `${flag} needs a rule, for example ${flag} "Read(.env.local)"`);
  }
  return list;
}

/**
 * Step 2 of FR-44: removed and unavailable flags.
 * @returns {{ keepRemoved: string[], restoreRemoved: string[] }}
 */
export function checkFlags(options = {}) {
  if (options.force !== undefined && options.force !== false) {
    throw new UpdateError('FLAG_REMOVED',
      '--force was removed in 0.17.0: it bypassed the version checks. Preview runs without it.');
  }
  if (options.apply !== undefined && options.apply !== false) {
    throw new UpdateError('APPLY_UNAVAILABLE',
      'Applying an update is not available in this version. `ais update` shows a preview only.');
  }
  const keepRemoved = toList(options.keepRemoved, '--keep-removed');
  const restoreRemoved = toList(options.restoreRemoved, '--restore-removed');
  const both = keepRemoved.filter((rule) => restoreRemoved.includes(rule));
  if (both.length > 0) {
    throw new UpdateError('FLAG_CONFLICT', `A rule cannot be both kept removed and restored: ${both.join(', ')}`);
  }
  return { keepRemoved, restoreRemoved };
}

/**
 * Step 3 of FR-44: the installed version, the CLI version and an optional
 * --target-version.
 * @returns {{ from: string, to: string, current: boolean }}
 */
export function checkVersions({ installed, cli, targetVersion }) {
  if (targetVersion !== undefined && (typeof targetVersion !== 'string' || !semver.valid(targetVersion))) {
    throw new UpdateError('INVALID_OPTION', '--target-version needs a version such as 1.2.3');
  }
  if (!semver.valid(installed)) {
    throw new UpdateError('MANIFEST_INVALID', `The installed version in .ai-scaffold.json is not valid: ${installed}`);
  }
  if (targetVersion !== undefined && targetVersion !== cli) {
    throw new UpdateError('TARGET_VERSION_MISMATCH',
      `This CLI updates to ${cli} only. To update to ${targetVersion}, run: npx ${PACKAGE_NAME}@${targetVersion} update`);
  }
  if (semver.lt(cli, installed)) {
    throw new UpdateError('DOWNGRADE',
      `The project is at ${installed}, newer than this CLI (${cli}). Downgrades are not supported.`);
  }
  return { from: installed, to: cli, current: semver.eq(cli, installed) };
}

/**
 * Step 6 of FR-44: exception flags only take effect during an update, so at
 * the installed version they are an error rather than silently discarded.
 */
export function checkExceptionsAtCurrent({ keepRemoved, restoreRemoved }) {
  if (keepRemoved.length + restoreRemoved.length > 0) {
    throw new UpdateError('EXCEPTIONS_AT_CURRENT',
      '--keep-removed and --restore-removed take effect only during an update; the project is already at this version.');
  }
}
