/**
 * update command — preview what updating the scaffold would change.
 * Usage: ais update [target-dir] [options]
 *
 * Read-only in this version (item 25 slice 3): applying is not available yet.
 */

import path from 'path';
import { getVersion } from '../core/version.js';
import { runPreview } from '../core/update-preview.js';
import { formatReport } from '../core/update-report.js';

export function updateCommand(cli) {
  cli.command('update [target-dir]', 'Preview what updating the scaffold to this CLI version would change')
    .option('--target-version [version]', 'Must equal this CLI version; other versions run through npx')
    .option('--dry-run', 'Accepted for compatibility; update is always a preview in this version')
    .option('--json', 'Print exactly one JSON document to stdout')
    .option('--keep-removed [rule]', 'Show the effect of keeping a removed scaffold deny/ask rule removed (repeatable)')
    .option('--restore-removed [rule]', 'Show the effect of restoring a kept-removed rule (repeatable)')
    .option('--force', 'Removed in 0.17.0')
    .option('--apply', 'Not available in this version')
    // Values are optional and unknown options allowed so that every mistake
    // reaches runPreview and still yields one JSON document (FR-45).
    .allowUnknownOptions()
    .example('ais update')
    .example('ais update ./my-project --json')
    .action(async (targetDir, options) => {
      process.exitCode = await runUpdate(targetDir, options);
    });
}

/** @returns {Promise<number>} the exit code */
export async function runUpdate(targetDir, options = {}) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const doc = await runPreview({ target, options, cliVersion: getVersion() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  } else {
    const stream = doc.exitCode === 0 || doc.exitCode === 2 ? process.stdout : process.stderr;
    stream.write(`${formatReport(doc)}\n`);
  }
  return doc.exitCode;
}
