#!/usr/bin/env node
/**
 * Validate gitleaks allowlist path patterns.
 *
 * Gitleaks treats allowlist paths as regular expressions, not shell globs.
 * This check catches accidental glob syntax before CI's gitleaks action does.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPaths = [
  '.gitleaks.toml',
  'templates/generic/.gitleaks.toml',
  'templates/laravel/.gitleaks.toml',
  'templates/node/.gitleaks.toml',
];

function extractAllowlistPaths(source) {
  const match = source.match(/paths\s*=\s*\[([\s\S]*?)\]/m);
  if (!match) {
    return [];
  }

  return match[1]
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((line) => line.replace(/,$/, '').trim())
    .filter((line) => line.startsWith('"') && line.endsWith('"'))
    .map((line) => line.slice(1, -1));
}

let failed = false;

for (const configPath of configPaths) {
  const absolutePath = path.join(repoRoot, configPath);
  const source = await fs.readFile(absolutePath, 'utf8');
  const patterns = extractAllowlistPaths(source);

  for (const pattern of patterns) {
    if (pattern.includes('**')) {
      failed = true;
      console.error(`${configPath}: "${pattern}" uses glob syntax; use a regex path pattern.`);
      continue;
    }

    try {
      new RegExp(pattern);
    } catch (error) {
      failed = true;
      console.error(`${configPath}: "${pattern}" is not a valid JavaScript regex: ${error.message}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${configPaths.length} gitleaks config files.`);
