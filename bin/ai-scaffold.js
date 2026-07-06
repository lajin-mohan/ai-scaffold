#!/usr/bin/env node

/**
 * AI Scaffold CLI entry point.
 * Usage: npx @lajin/ai-scaffold <command> [options]
 *        npx @lajin/ai-scaffold <project-name>        # same as `create`
 *
 * Bare command routing: CAC v6 does not accept positional args without a
 * matching subcommand, so we detect `ais <name>` before calling
 * cli.parse() and inject the `create` subcommand into argv.
 */

import { CAC } from 'cac';
import { createCommand } from '../src/cli/commands/create.js';
import { initCommand } from '../src/cli/commands/init.js';
import { statusCommand } from '../src/cli/commands/status.js';
import { doctorCommand } from '../src/cli/commands/doctor.js';
import { updateCommand } from '../src/cli/commands/update.js';
import { version } from '../src/cli/core/version.js';

const cli = new CAC('ais');

cli.version(version);

cli.help((sections) => {
  sections.unshift({
    title: 'AI Scaffold CLI — Reusable AI engineering scaffold',
    body: `Usage:
  npx @lajin/ai-scaffold my-project       Create a new project from the scaffold
  npx @lajin/ai-scaffold create my-project
  npx @lajin/ai-scaffold init             Install scaffold into the current directory
  ais status                              Show installed scaffold version and status
  ais doctor                              Diagnose scaffold installation health
  ais update                              Update scaffold metadata

Examples:
  npx @lajin/ai-scaffold my-project
  npx @lajin/ai-scaffold create my-project --profile node
  npx @lajin/ai-scaffold init --profile laravel
  npx @lajin/ai-scaffold init --profile javascript
  ais status
  ais doctor
  ais update
  ais update --target-version 1.2.0`,
  });
});

// Register subcommands
createCommand(cli);
initCommand(cli);
statusCommand(cli);
doctorCommand(cli);
updateCommand(cli);

// ── Bare command routing ──────────────────────────────────────────────────
// CAC v6 does not accept positional args without a matching subcommand, so
// we rewrite argv before parse. The routing rule is:
//
//   ais <name>          → create <name>   (new project)
//   ais . / ./here      → init             (existing directory)
//
// Known subcommands and flags are left untouched.
const knownSubcommands = ['create', 'init', 'status', 'doctor', 'update', '--help', '-h', '--version', '-V'];
const rawArgs = process.argv.slice(2);

if (rawArgs.length > 0 && !knownSubcommands.includes(rawArgs[0]) && !rawArgs[0].startsWith('-')) {
  const bare = rawArgs[0];
  // `.` or `./` means "operate on the current directory" → init
  const isCurrentDir = bare === '.' || bare === './';
  const injectedSub = isCurrentDir ? 'init' : 'create';
  process.argv.splice(2, 0, injectedSub);
}

try {
  cli.parse();
} catch (error) {
  const message = error?.message ?? String(error);
  console.error(`\n✗ ${message}`);
  console.error('  Run `ais --help` for usage examples.');
  process.exit(1);
}
