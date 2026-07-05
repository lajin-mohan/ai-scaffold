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
 * During init, these are installed under .ai-scaffold/ namespace.
 * During create, these are at project root.
 * @type {string[]}
 */
export const MANAGED_PATHS = [
  // Scaffold-owned directories (namespaced in init, root in create)
  '.ai-scaffold/**',
  '.claude/**',
  '.cursor/**',
  '_ai/**',
  // Root-level scaffold files
  '.github/copilot-instructions.md',
  'AGENTS.md',
  'CLAUDE.md',
  'HOW-TO-USE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
];

/**
 * Template file → generated file mapping.
 * When a `*.template.*` file is found, it is used as the source for the
 * generated output path (stripping `.template` from the filename).
 * @type {Record<string, string>}
 */
const GENERATED_FILE_MAP = {
  'README.template.md': 'README.md',
  '.claude/MEMORY.template.md': '.claude/MEMORY.md',
  '.claude/settings-overrides.template.json': '.claude/settings-overrides.json',
};

const EXCLUDED_TEMPLATE_FILES = [
  '.claude/settings.local.json',
  '.DS_Store',
];

/**
 * Files that must never be overwritten without explicit confirmation.
 * These protect an existing project's files during `init` — the scaffold will
 * never overwrite a pre-existing file in these paths without --force.
 * @type {string[]}
 */
export const PROTECTED_PATHS = [
  '.env',
  '.ai-scaffold.json',
  // Project root files that existing projects will have customized:
  'README.md',
  'package.json',
  'composer.json',
  'pyproject.toml',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  '*.csproj',
  // CI workflows — existing projects have their own:
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
  'infra/**',
  'scripts/**',
];

import { TEMPLATES_DIR } from './paths.js';

/**
 * Build a staged file plan from a source profile directory.
 * Returns files grouped by action: copy, generate, skip (protected), skip (app-source).
 * Discovers `*.template.*` files and maps them to generated output paths.
 */
export async function buildFilePlan(sourceDir, targetDir, options = {}) {
  const { existingTarget = false } = options;
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

  // Namespace prefix for init (existing project). During create, prefix is empty.
  // Scaffold-owned files install under .ai-scaffold/ to avoid polluting project root.
  const NAMESPACE_PREFIX = existingTarget ? '.ai-scaffold' : '';

  // Files that always go to project root (never namespaced).
  const ROOT_FILES = [
    '.github/copilot-instructions.md',
    'LICENSE',
    'SECURITY.md',
    'CHANGELOG.md',
  ];

  // Always-generate files: these have no template source; they are built
  // programmatically by copy.js generateFile().
  const alwaysGenerate = ['.ai-scaffold.json'];

  // Collect all source files from the template directory
  const sourceFiles = await collectSourceFiles(sourceDir);

  for (const srcFile of sourceFiles) {
    const relPath = path.relative(sourceDir, srcFile);
    if (EXCLUDED_TEMPLATE_FILES.includes(relPath)) {
      continue;
    }
    const isRootFile = ROOT_FILES.some((rf) => picomatch(rf)(relPath));
    const namespace = isRootFile ? '' : NAMESPACE_PREFIX;
    const targetRel = namespace ? path.join(namespace, relPath) : relPath;
    const targetFile = path.join(targetDir, targetRel);

    // Check if this file maps to a generated output (e.g. .template.md → .md)
    const generatedRel = GENERATED_FILE_MAP[relPath];
    if (generatedRel) {
      const genTargetRel = existingTarget && !generatedRel.startsWith('.claude/') && !generatedRel.startsWith('.ai-scaffold.json')
        ? path.join('.ai-scaffold', generatedRel)
        : generatedRel;
      if (existingTarget && matchesAny(generatedRel, PROTECTED_PATHS)) {
        const targetExists = await fs.pathExists(path.join(targetDir, genTargetRel));
        plan.skipProtected.push({
          src: srcFile,
          rel: genTargetRel,
          target: path.join(targetDir, genTargetRel),
          exists: targetExists,
          templateRel: relPath,
        });
        continue;
      }

      plan.generate.push({
        src: srcFile,
        rel: genTargetRel,
        target: path.join(targetDir, genTargetRel),
        templateRel: relPath,
      });
      continue;
    }

    // Skip raw template marker files that no generated counterpart
    if (relPath.includes('.template.')) {
      continue;
    }

    // Protected files — never overwrite without confirmation
    if (existingTarget && matchesAny(relPath, PROTECTED_PATHS)) {
      const targetExists = await fs.pathExists(targetFile);
      plan.skipProtected.push({
        src: srcFile,
        rel: targetRel,
        target: targetFile,
        exists: targetExists,
      });
      continue;
    }

    // App source — never touch
    if (matchesAny(relPath, APP_SOURCE_PATHS)) {
      plan.skipAppSource.push({ src: srcFile, rel: relPath });
      continue;
    }

    // Copy normally
    plan.copy.push({ src: srcFile, rel: targetRel, target: targetFile });
  }

  // Add always-generate files (no template source; built programmatically)
  for (const genRel of alwaysGenerate) {
    if (plan.generate.some(g => g.rel === genRel) || plan.skipProtected.some(f => f.rel === genRel)) {
      continue;
    }

    // .ai-scaffold.json stays at project root for both create and init —
    // it is the discovery entry point for status/doctor.
    const genTargetRel = (existingTarget && genRel !== '.ai-scaffold.json')
      ? path.join('.ai-scaffold', genRel)
      : genRel;
    const target = path.join(targetDir, genTargetRel);
    if (existingTarget && matchesAny(genRel, PROTECTED_PATHS)) {
      const targetExists = await fs.pathExists(target);
      plan.skipProtected.push({
        src: null,
        rel: genTargetRel,
        target,
        exists: targetExists,
        templateRel: null,
      });
      continue;
    }

    plan.generate.push({
      src: null,
      rel: genTargetRel,
      target,
      templateRel: null,
    });
  }

  return plan;
}

/**
 * Collect all files under a directory, including `*.template.*` marker files.
 */
async function collectSourceFiles(dir) {
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
      const subResults = await collectSourceFiles(fullPath);
      results.push(...subResults);
    } else {
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
