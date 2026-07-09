/**
 * list command — shows the scaffold assets installed in a project so the 35+
 * commands/agents/skills/rules are discoverable without opening .claude/.
 * Usage: ais list [commands|agents|skills|rules] [target-dir]
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

const CATEGORIES = ['commands', 'agents', 'skills', 'rules'];

export function listCommand(cli) {
  cli
    .command('list [category] [target-dir]', 'List installed scaffold commands, agents, skills, or rules')
    .option('--json', 'Output as JSON')
    .example('ais list')
    .example('ais list commands')
    .example('ais list rules ./my-project')
    .action(async (category, targetDir, options) => {
      await runList(category, targetDir, options);
    });
}

async function runList(category, targetDir, options) {
  const target = targetDir ? path.resolve(targetDir) : process.cwd();

  if (category && !CATEGORIES.includes(category)) {
    console.error(chalk.red(`Unknown category "${category}". Use one of: ${CATEGORIES.join(', ')}`));
    process.exitCode = 1;
    return;
  }

  const cats = category ? [category] : CATEGORIES;
  const result = {};
  for (const cat of cats) {
    result[cat] = await collectEntries(path.join(target, '.claude', cat));
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  printList(result, target);
}

async function collectEntries(dir) {
  if (!(await fs.pathExists(dir))) {
    return [];
  }
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const entries = [];
  for (const dirent of dirents) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      const skillFile = path.join(full, 'SKILL.md');
      if (await fs.pathExists(skillFile)) {
        entries.push({ name: dirent.name, description: await firstDescription(skillFile) });
      }
    } else if (dirent.name.endsWith('.md')) {
      entries.push({ name: dirent.name.replace(/\.md$/, ''), description: await firstDescription(full) });
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

// Pull a one-line summary: frontmatter `description:` if present, else the first
// markdown heading, else the first non-empty line.
async function firstDescription(file) {
  const content = await fs.readFile(file, 'utf-8');
  const lines = content.split('\n').slice(0, 40);
  const fromFrontmatter = lines.find((line) => /^description:\s*\S/.test(line));
  if (fromFrontmatter) {
    return truncate(fromFrontmatter.replace(/^description:\s*/, '').replace(/^["']|["']$/g, ''));
  }
  const heading = lines.find((line) => /^#{1,3}\s+\S/.test(line));
  if (heading) {
    return truncate(heading.replace(/^#{1,3}\s+/, ''));
  }
  const firstText = lines.find((line) => line.trim() && !line.startsWith('---') && !line.startsWith('<!--'));
  return firstText ? truncate(firstText.trim()) : '';
}

function truncate(text) {
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function printList(result, target) {
  console.log(chalk.bold(`\nAI Scaffold assets — ${target}\n`));
  for (const [category, entries] of Object.entries(result)) {
    console.log(chalk.cyan(`${category} (${entries.length})`));
    if (entries.length === 0) {
      console.log(chalk.gray('  none installed'));
    }
    for (const entry of entries) {
      const label = category === 'commands' ? `/${entry.name}` : entry.name;
      console.log(`  ${chalk.green(label.padEnd(22))} ${chalk.gray(entry.description)}`);
    }
    console.log('');
  }
}
