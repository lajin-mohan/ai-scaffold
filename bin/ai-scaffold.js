#!/usr/bin/env node

/**
 * ai-scaffold CLI entry point.
 * Usage: npx ai-scaffold <command> [options]
 *        npx ai-scaffold <project-name>        # same as `create`
 *
 * Bare command routing: CAC v6 does not accept positional args without a
 * matching subcommand, so we detect `ai-scaffold <name>` before calling
 * cli.parse() and inject the `create` subcommand into argv.
 */

import { CAC } from 'cac';
import { createCommand } from '../src/cli/commands/create.js';
import { initCommand } from '../src/cli/commands/init.js';
import { statusCommand } from '../src/cli/commands/status.js';
import { doctorCommand } from '../src/cli/commands/doctor.js';
import { updateCommand } from '../src/cli/commands/update.js';
import { version } from '../src/cli/core/version.js';

const cli = new CAC('ai-scaffold');

cli.version(version);

cli.help((sections) => {
  sections.unshift({
    title: 'AI Scaffold CLI — Reusable AI engineering scaffold',
    body: `Usage:
  npx ai-scaffold my-project              Create a new project from the scaffold
  npx ai-scaffold create my-project       Create a new project from the scaffold
  npx ai-scaffold init                    Install scaffold into the current directory
  npx ai-scaffold status                  Show installed scaffold version and status
  npx ai-scaffold doctor                  Diagnose scaffold installation health
  npx ai-scaffold update                  Update scaffold to the latest version

Examples:
  npx ai-scaffold my-project
  npx ai-scaffold create my-project
  npx ai-scaffold create my-project --profile node
  npx ai-scaffold init --profile laravel
  npx ai-scaffold init --profile javascript
  npx ai-scaffold status
  npx ai-scaffold doctor
  npx ai-scaffold update
  npx ai-scaffold update --version 1.2.0`,
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
//   ai-scaffold <name>          → create <name>   (new project)
//   ai-scaffold . / ./here      → init             (existing directory)
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

cli.parse();
