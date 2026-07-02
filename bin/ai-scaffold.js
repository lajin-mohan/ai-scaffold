#!/usr/bin/env node

/**
 * ai-scaffold CLI entry point.
 * Usage: npx ai-scaffold <command> [options]
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
  npx ai-scaffold my-project    Create a new project from the scaffold
  npx ai-scaffold init          Install scaffold into the current directory
  npx ai-scaffold status        Show installed scaffold version and status
  npx ai-scaffold doctor        Diagnose scaffold installation health
  npx ai-scaffold update        Update scaffold to the latest version

Examples:
  npx ai-scaffold my-project
  npx ai-scaffold my-project --profile laravel
  npx ai-scaffold init --profile laravel
  npx ai-scaffold status
  npx ai-scaffold doctor
  npx ai-scaffold update
  npx ai-scaffold update --version 1.2.0`,
  });
});

createCommand(cli);
initCommand(cli);
statusCommand(cli);
doctorCommand(cli);
updateCommand(cli);

cli.parse();
