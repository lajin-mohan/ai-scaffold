/**
 * File plan module — builds the list of files to copy from a profile template.
 * Respects protected files and generates per-project files from templates.
 * See docs/cli/placeholder-resolution.md §3.
 */

import path from 'path';
import fs from 'fs-extra';
import picomatch from 'picomatch';

/**
 * Files managed by the scaffold (relative to project root).
 * Default installs keep the visible surface small; larger docs/tasks/examples
 * are future optional packs.
 * @type {string[]}
 */
export const MANAGED_PATHS = [
  '.ai-scaffold/**',
  '.claude/**',
  'AGENTS.md',
  'CLAUDE.md',
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

const EXCLUDED_DEFAULT_PATTERNS = [
  '.vscode/**',
  '.cursor/**',
  '.github/**',
  '_ai/**',
  'apps/**',
  'docs/**',
  'packages/**',
  'infra/**',
  'scripts/**',
  'src/**',
  'tasks/**',
  'templates/**',
  '.cursorrules',
  '.editorconfig',
  '.env.example',
  '.gitleaks.toml',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'HOW-TO-USE.md',
  'LICENSE',
  'SECURITY.md',
];

const ROOT_FILES = [
  '.claude/**',
  'AGENTS.md',
  'CLAUDE.md',
];

const CREATE_ROOT_FILES_BY_PROFILE = {
  generic: ['.gitignore'],
  node: ['package.json'],
  laravel: ['composer.json', 'package.json'],
  python: ['pyproject.toml', 'test_smoke.py'],
  golang: ['go.mod', 'main.go', 'main_test.go'],
};

/**
 * Files that must never be overwritten without explicit confirmation.
 * These protect an existing project's files during `init` — the scaffold will
 * never overwrite a pre-existing file in these paths without --force.
 * @type {string[]}
 */
export const PROTECTED_PATHS = [
  '.env',
  '.ai-scaffold.json',
  '.gitignore',
  // Project root files that existing projects will have customized:
  'AGENTS.md',
  'CLAUDE.md',
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

  const profileName = path.basename(sourceDir);
  const profileRootFiles = existingTarget
    ? []
    : ['.gitignore', '.gitattributes', ...(CREATE_ROOT_FILES_BY_PROFILE[profileName] ?? [])];

  // Always-generate files: these have no template source; they are built
  // programmatically by copy.js generateFile().
  const alwaysGenerate = ['.ai-scaffold.json', '.ai-scaffold/README.md', '.ai-scaffold/context.md'];

  // Governance skeleton — generated (not copied) so fresh projects get a clean
  // starter rather than the scaffold's own lessons/changelog, and so the shipped
  // CLAUDE.md workflow references resolve. Only for `create`: existing repos
  // (`init`) manage their own tasks/CHANGELOG and must not have them imposed.
  if (!existingTarget) {
    alwaysGenerate.push('tasks/lessons.md', 'tasks/todo/.gitkeep', 'tasks/done/.gitkeep', 'CHANGELOG.md');
  }

  // Collect all source files from the template directory
  const sourceFiles = await collectSourceFiles(sourceDir);

  for (const srcFile of sourceFiles) {
    const relPath = path.relative(sourceDir, srcFile);
    if (EXCLUDED_TEMPLATE_FILES.includes(relPath)) {
      continue;
    }

    if (existingTarget && ['.gitignore', '.gitattributes'].includes(relPath)) {
      plan.skipAppSource.push({ src: srcFile, rel: relPath, reason: 'existing-project-root-file' });
      continue;
    }

    if (['composer.json', 'package.json'].includes(relPath) && !profileRootFiles.includes(relPath)) {
      plan.skipAppSource.push({ src: srcFile, rel: relPath, reason: 'profile-root-file' });
      continue;
    }

    if (matchesAny(relPath, EXCLUDED_DEFAULT_PATTERNS)) {
      plan.skipAppSource.push({ src: srcFile, rel: relPath });
      continue;
    }

    const isRootFile = matchesAny(relPath, [...ROOT_FILES, ...profileRootFiles]);
    const targetRel = isRootFile ? relPath : path.join('.ai-scaffold', relPath);
    const targetFile = path.join(targetDir, targetRel);

    // Check if this file maps to a generated output (e.g. .template.md → .md)
    const generatedRel = GENERATED_FILE_MAP[relPath];
    if (generatedRel) {
      const generatedRoot = generatedRel === 'README.md' && !existingTarget;
      const genTargetRel = resolveGeneratedTargetRel(generatedRel, existingTarget, generatedRoot);
      if (existingTarget && genTargetRel === generatedRel && matchesAny(generatedRel, PROTECTED_PATHS)) {
        const targetExists = await fs.pathExists(path.join(targetDir, genTargetRel));
        if (targetExists) {
          plan.skipProtected.push({
            src: srcFile,
            rel: genTargetRel,
            target: path.join(targetDir, genTargetRel),
            exists: targetExists,
            templateRel: relPath,
          });
          continue;
        }
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
      if (targetRel !== relPath || targetExists) {
        plan.skipProtected.push({
          src: srcFile,
          rel: targetRel,
          target: targetFile,
          exists: targetExists,
        });
        continue;
      }
    }

    // Existing projects should not receive project-owned files under the
    // scaffold namespace just because the template has a source copy.
    if (existingTarget && targetRel !== relPath && matchesAny(relPath, PROTECTED_PATHS)) {
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
    const genTargetRel = resolveGeneratedTargetRel(genRel, existingTarget, false);
    const target = path.join(targetDir, genTargetRel);
    if (existingTarget && matchesAny(genRel, PROTECTED_PATHS)) {
      const targetExists = await fs.pathExists(target);
      if (targetExists) {
        plan.skipProtected.push({
          src: null,
          rel: genTargetRel,
          target,
          exists: targetExists,
          templateRel: null,
        });
        continue;
      }
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
  return patterns.some((p) => picomatch(p, { dot: true })(pathStr));
}

function resolveGeneratedTargetRel(generatedRel, existingTarget, forceRoot) {
  if (
    forceRoot ||
    generatedRel === '.ai-scaffold.json' ||
    generatedRel.startsWith('.ai-scaffold/') ||
    generatedRel.startsWith('.claude/')
  ) {
    return generatedRel;
  }

  return existingTarget
    ? path.join('.ai-scaffold', generatedRel)
    : generatedRel;
}
