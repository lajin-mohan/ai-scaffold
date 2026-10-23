/**
 * update command — preview, or with --apply perform, an update of the
 * scaffold to this CLI's version.
 * Usage: ais update [target-dir] [options]
 */

import path from 'path';
import { getVersion } from '../core/version.js';
import { runPreview } from '../core/update-preview.js';
import { runApply } from '../core/update-apply-run.js';
import { formatReport } from '../core/update-report.js';

export function updateCommand(cli) {
  cli.command('update [target-dir]', 'Preview, or with --apply perform, an update of the scaffold to this CLI version')
    .option('--apply', 'Apply the update: back up, write, roll back on failure')
    .option('--allow-dirty', 'With --apply, proceed although files the update changes have uncommitted git changes')
    .option('--allow-no-git', 'With --apply, proceed although git safety cannot be checked (no repository or no git)')
    .option('--target-version [version]', 'Must equal this CLI version; other versions run through npx')
    .option('--dry-run', 'Preview only (the default without --apply)')
    .option('--json', 'Print exactly one JSON document to stdout')
    .option('--keep-removed [rule]', 'Keep a removed scaffold deny/ask rule removed; saved by --apply (repeatable)')
    .option('--restore-removed [rule]', 'Restore a kept-removed rule; saved by --apply (repeatable)')
    .option('--force', 'Removed in 0.17.0')
    // Values are optional and unknown options allowed so that every mistake
    // reaches the command and still yields one JSON document (FR-45).
    .allowUnknownOptions()
    .example('ais update')
    .example('ais update --apply')
    .example('ais update ./my-project --json')
    .action(async (targetDir, options) => {
      process.exitCode = await runUpdate(targetDir, options);
    });
}

/** @returns {Promise<number>} the exit code */
export async function runUpdate(targetDir, options = {}) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const apply = options.apply === true && options.dryRun !== true;
  const run = apply ? runApply : runPreview;
  const doc = await run({ target, options, cliVersion: getVersion() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  } else {
    const stream = doc.exitCode === 0 || doc.exitCode === 2 ? process.stdout : process.stderr;
    stream.write(`${formatReport(doc)}\n`);
  }
  return doc.exitCode;
}
