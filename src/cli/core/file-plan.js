/**
 * File plan module — builds the list of files to copy from a profile template.
 * Respects protected files and generates per-project files from templates.
 * See docs/cli/placeholder-resolution.md §3.
 */

import path from 'path';
import fs from 'fs-extra';
import picomatch from 'picomatch';

/**
 * Files always managed by the scaffold (relative to project root).
 * @type {string[]}
 */
export const MANAGED_PATHS = [
  '.claude/**',
  '.cursor/**',
  '.github/copilot-instructions.md',
  '_ai/**',
  'docs/**',
  'tasks/**',
  'AGENTS.md',
  'CLAUDE.md',
  'HOW-TO-USE.md',
  'CONTRIBUTING.md',
];

/**
 * Files that must never be overwritten without explicit confirmation.
 * @type {string[]}
 */
export const PROTECTED_PATHS = [
  '.env',
  'README.md',
  'package.json',
  'composer.json',
  'pyproject.toml',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  '*.csproj',
  '.github/workflows/**',
];

/**
 * Application source directories to never touch.
 * @type {string[]}
 */
export const APP_SOURCE_PATHS = [
  'apps/**',
  'packages/**',
  'src/**',
  'lib/**',
  'app/**',
  'resources/**',
  'database/**',
];

import { TEMPLATES_DIR } from './paths.js';

/**
 * Build a staged file plan from a source profile directory.
 * Returns files grouped by action: copy, generate, skip (protected), skip (app-source).
 */
export async function buildFilePlan(sourceDir, targetDir) {
  const plan = {
    copy: [],
    generate: [],
    skipProtected: [],
    skipAppSource: [],
    missing: [],
  };

  const sourceExists = await fs.pathExists(sourceDir);
  if (!sourceExists) {
    throw new Error(`Template profile not found: ${sourceDir}`);
  }

  const sourceFiles = await expandGlobs(sourceDir, MANAGED_PATHS);

  for (const srcFile of sourceFiles) {
    const relPath = path.relative(sourceDir, srcFile);
    const targetFile = path.join(targetDir, relPath);

    // Per-project generated files (never copied verbatim)
    if (isGeneratedFile(relPath)) {
      plan.generate.push({ src: srcFile, rel: relPath, target: targetFile });
      continue;
    }

    // Protected files — never overwrite without confirmation
    if (matchesAny(relPath, PROTECTED_PATHS)) {
      const targetExists = await fs.pathExists(targetFile);
      plan.skipProtected.push({ src: srcFile, rel: relPath, target: targetFile, exists: targetExists });
      continue;
    }

    // App source — never touch
    if (matchesAny(relPath, APP_SOURCE_PATHS)) {
      plan.skipAppSource.push({ src: srcFile, rel: relPath });
      continue;
    }

    // Copy normally
    plan.copy.push({ src: srcFile, rel: relPath, target: targetFile });
  }

  return plan;
}

/**
 * Check if a file should be generated (not copied verbatim).
 * These files exist as templates in the profile but are generated per-project.
 */
function isGeneratedFile(relPath) {
  return relPath === '.claude/MEMORY.md'
    || relPath === '.claude/settings-overrides.json'
    || relPath === '.ai-scaffold.json';
}

/**
 * Expand glob patterns relative to a base directory.
 */
async function expandGlobs(baseDir, patterns) {
  const files = [];
  for (const pattern of patterns) {
    const matcher = picomatch(path.join(baseDir, pattern));
    const matches = await walkDir(baseDir, matcher);
    files.push(...matches);
  }
  return [...new Set(files)].sort();
}

/**
 * Walk a directory and return files matching a picomatch matcher.
 */
async function walkDir(dir, matcher) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await walkDir(fullPath, matcher);
      results.push(...subResults);
    } else if (matcher(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if a path matches any of the given picomatch patterns.
 */
function matchesAny(pathStr, patterns) {
  return patterns.some((p) => picomatch(p)(pathStr));
}