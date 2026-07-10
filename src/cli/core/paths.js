/**
 * Path utilities — resolves paths relative to the CLI package root.
 * Templates, configs, and other package resources are resolved from here.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * The directory of this core module.
 * All package resources are relative to the package root.
 */
export const CLI_ROOT = dirname(fileURLToPath(import.meta.url));
// => .../src/cli/core

/**
 * The root directory of the ai-scaffold package.
 * src/cli/core/.. = src/cli/
 * src/cli/../.. = src/
 * src/../.. = repo root
 */
export const PKG_ROOT = path.resolve(CLI_ROOT, '..', '..', '..');
// => repo root (ai-scaffold/)

/**
 * Directory containing scaffold templates (generic, laravel, etc.).
 */
export const TEMPLATES_DIR = path.resolve(PKG_ROOT, 'templates');

export const PROFILE_ALIASES = {
  js: 'node',
  javascript: 'node',
  nodejs: 'node',
  py: 'python',
  python3: 'python',
  go: 'golang',
};

export const SUPPORTED_PROFILES = ['generic', 'laravel', 'node', 'python', 'golang'];

export const PROFILE_CHOICES = [...SUPPORTED_PROFILES, 'javascript', 'js'];

export function normalizeProfile(profile = 'generic') {
  const normalized = String(profile).toLowerCase();
  return PROFILE_ALIASES[normalized] ?? normalized;
}

/**
 * Directory containing scaffold managed files (used for `init` into same repo).
 */
export const SCAFFOLD_DIR = PKG_ROOT;

/**
 * Resolve a path relative to the package root.
 */
export function pkgPath(...segments) {
  return path.resolve(PKG_ROOT, ...segments);
}

/**
 * Resolve a path relative to the templates directory.
 */
export function templatePath(profile, ...segments) {
  return path.resolve(TEMPLATES_DIR, normalizeProfile(profile), ...segments);
}

/**
 * Normalize a relative path to posix separators so manifests are portable.
 * On Windows, path.join/path.relative emit backslashes; a manifest written on
 * one OS must resolve on another.
 */
export function toPosixPath(relPath) {
  return relPath.replace(/\\/g, '/');
}
