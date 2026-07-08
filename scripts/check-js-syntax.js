#!/usr/bin/env node
/**
 * Syntax-check every first-party JavaScript file that ships or tests the CLI.
 */

import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['bin', 'src', 'tests', 'scripts'];
const extraFiles = ['eslint.config.js'];
const ignoredDirs = new Set(['node_modules', '.git']);

async function collectJsFiles(dir) {
  const files = [];
  if (!(await fs.pathExists(dir))) {
    return files;
  }

  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = [
  ...(await Promise.all(roots.map((root) => collectJsFiles(path.join(repoRoot, root))))).flat(),
  ...extraFiles.map((file) => path.join(repoRoot, file)).filter((file) => fs.pathExistsSync(file)),
].sort();

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    cwd: repoRoot,
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${path.relative(repoRoot, file)}`);
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
