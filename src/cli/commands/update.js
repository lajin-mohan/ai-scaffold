/**
 * update command — preview, or with --apply perform, an update of the
 * scaffold to this CLI's version.
 * Usage: ais update [target-dir] [options]
 */

import path from 'path';
import { getVersion } from '../core/version.js';
import { emptyDocument, runPreview } from '../core/update-preview.js';
import { emptyApplyDocument, runApply } from '../core/update-apply-run.js';
import { formatReport } from '../core/update-report.js';

// Switches take no value. The parser turns `--apply=foo` into true and keeps
// `--allow-no-git=yes` as a string, so both are caught here, from the raw
// arguments, before anything runs or is written (#159 review).
const SWITCHES = ['apply', 'allow-dirty', 'allow-no-git', 'dry-run', 'json'];
const optionKey = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function valuedSwitch(argv, options) {
  for (const name of SWITCHES) {
    if (argv.some((arg) => arg.startsWith(`--${name}=`))) return name;
    const value = options[optionKey(name)];
    if (value !== undefined && typeof value !== 'boolean') return name;
  }
  return null;
}

function invalidSwitchDocument(name, applying) {
  const doc = applying ? emptyApplyDocument() : emptyDocument();
  const message = `--${name} takes no value; pass --${name} on its own. Nothing was changed.`;
  return Object.assign(doc, { status: 'error', exitCode: 1, error: { code: 'INVALID_OPTION', message } });
}

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
export async function runUpdate(targetDir, options = {}, argv = process.argv.slice(2)) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();
  const invalid = valuedSwitch(argv, options);
  const apply = options.apply === true && options.dryRun !== true;
  const run = apply ? runApply : runPreview;
  const doc = invalid
    ? invalidSwitchDocument(invalid, options.apply !== undefined)
    : await run({ target, options, cliVersion: getVersion() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  } else {
    const stream = doc.exitCode === 0 || doc.exitCode === 2 ? process.stdout : process.stderr;
    stream.write(`${formatReport(doc)}\n`);
  }
  return doc.exitCode;
}
