/**
 * Machine-readable dry-run plan serialization.
 */

import path from 'path';
import { toPosixPath } from './paths.js';

export function buildDryRunPlan({
  command,
  targetDir,
  profile,
  plan,
  conflicts,
  values,
  defaultedValues = [],
  existingTarget,
}) {
  const files = {
    copy: plan.copy.map(serializeFile),
    generate: plan.generate.map(serializeFile),
    skipProtected: plan.skipProtected.map(serializeFile),
    skipAppSource: plan.skipAppSource.map(serializeFile),
    missing: (plan.missing ?? []).map(serializeFile),
  };

  return {
    command,
    dryRun: true,
    profile: values.profile ?? profile,
    target: toPosixPath(path.resolve(targetDir)),
    existingTarget,
    optionalPacks: [],
    defaultedValues,
    counts: {
      copy: files.copy.length,
      generate: files.generate.length,
      skipProtected: files.skipProtected.length,
      skipAppSource: files.skipAppSource.length,
      missing: files.missing.length,
      protectedConflicts: conflicts.protectedExists.length,
      modifiedManagedFiles: conflicts.managedModified.length,
      missingManagedFiles: conflicts.managedMissing.length,
    },
    files,
    conflicts: serializeConflicts(conflicts),
  };
}

export function emptyConflicts() {
  return {
    protectedExists: [],
    managedModified: [],
    managedMissing: [],
    claudDirExists: false,
  };
}

function serializeFile(file) {
  const item = {
    path: file.rel,
  };

  if (file.src) {
    item.source = toPosixPath(file.src);
  }
  if (file.target) {
    item.target = toPosixPath(file.target);
  }
  if (file.templateRel) {
    item.template = file.templateRel;
  }
  if (file.reason) {
    item.reason = file.reason;
  }
  if (file.exists !== undefined) {
    item.exists = file.exists;
  }

  return item;
}

function serializeConflicts(conflicts) {
  return {
    claudDirExists: conflicts.claudDirExists,
    protectedExists: conflicts.protectedExists,
    managedMissing: conflicts.managedMissing,
    managedModified: conflicts.managedModified.map((file) => ({
      path: file.rel,
      source: file.src ? toPosixPath(file.src) : undefined,
      target: file.target ? toPosixPath(file.target) : undefined,
    })),
  };
}
