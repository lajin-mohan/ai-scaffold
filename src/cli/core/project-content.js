/**
 * Item 112: project content that survives upgrades.
 *
 * - `PROJECT.md` at the root is the project's own context. The scaffold adds a
 *   starter only when it is absent and never changes it afterwards (ownership
 *   class `seeded`). `CLAUDE.md` imports it; `AGENTS.md` points to it.
 * - `.claude/rules/project/` holds project rules; `ais update` never lists them
 *   (ownership class `excluded`).
 * - A scaffold rule is replaced with Claude Code's own `claudeMdExcludes`
 *   setting. `doctor` fails when it excludes a rule on the security floor.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';

export const PROJECT_FILE = 'PROJECT.md';
export const PROJECT_IMPORT_LINE = '@PROJECT.md';
const PROJECT_IMPORT = /^@(\.\/)?PROJECT\.md[ \t]*$/m;

// Rules that carry the security floor: secrets, approval before destructive
// or outward actions, tenant isolation, commit identity. They may be added to,
// never excluded.
export const FLOOR_FILES = [
  'AGENTS.md',
  '.ai-scaffold/AGENTS.md',
  '.claude/rules/security-rules.md',
  '.claude/rules/branching-rules.md',
];

export function hasProjectImport(text) {
  return PROJECT_IMPORT.test(String(text ?? ''));
}

export function buildStarterProject(values) {
  return `# ${values.displayName} — project context

This file is yours. AI Scaffold created it once and never changes it;
\`ais update\` leaves it alone. Claude Code loads it through \`@PROJECT.md\` in
\`CLAUDE.md\`; other tools find it through \`AGENTS.md\`. Keep it short: it is
read at the start of every session.

## What this project is

<!-- One paragraph: users, purpose, the parts that matter most. -->

## Terms

<!-- Domain words an assistant would otherwise guess at. -->

## Local conventions

<!-- Anything that differs from the scaffold's rules, and why. -->

Project rules go in \`.claude/rules/project/\`; \`ais update\` never touches
them. To replace a scaffold rule, see "Where project content goes" in
\`.ai-scaffold/commands.md\`.
`;
}

// Glob to RegExp for claudeMdExcludes patterns: ** spans directories, * and ?
// stay within one path segment. Everything else matches literally.
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      out += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (char === '*') {
      out += '[^/]*';
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`, process.platform === 'win32' ? 'i' : '');
}

/** Whether a claudeMdExcludes pattern matches an absolute path. */
export function excludes(pattern, absolutePath) {
  if (typeof pattern !== 'string' || pattern === '') return false;
  const forward = absolutePath.split(path.sep).join('/');
  const regex = globToRegExp(pattern.split('\\').join('/'));
  return regex.test(forward);
}

async function readExcludes(file) {
  try {
    const settings = await fs.readJson(file);
    return Array.isArray(settings?.claudeMdExcludes) ? settings.claudeMdExcludes : [];
  } catch {
    return [];
  }
}

/** Every claudeMdExcludes pattern from the settings layers doctor can read. */
export async function collectExcludes(target, { homeDir = os.homedir() } = {}) {
  const layers = [
    path.join(target, '.claude', 'settings.json'),
    path.join(target, '.claude', 'settings.local.json'),
    path.join(homeDir, '.claude', 'settings.json'),
  ];
  const patterns = [];
  for (const file of layers) patterns.push(...(await readExcludes(file)));
  return patterns;
}

async function scaffoldInstructionFiles(target) {
  const files = ['CLAUDE.md', ...FLOOR_FILES, 'constitution.md'];
  const rulesDir = path.join(target, '.claude', 'rules');
  const walk = async (dir, rel) => {
    if (!(await fs.pathExists(dir))) return;
    for (const name of await fs.readdir(dir)) {
      const childRel = `${rel}/${name}`;
      if (childRel === '.claude/rules/project') continue;
      const full = path.join(dir, name);
      if ((await fs.stat(full)).isDirectory()) await walk(full, childRel);
      else if (name.endsWith('.md')) files.push(childRel);
    }
  };
  await walk(rulesDir, '.claude/rules');
  const present = [];
  for (const rel of new Set(files)) {
    if (await fs.pathExists(path.join(target, ...rel.split('/')))) present.push(rel);
  }
  return present;
}

/** Scaffold files a claudeMdExcludes pattern removes, split into floor and other. */
export async function findExcludedScaffoldFiles(target, options = {}) {
  const patterns = await collectExcludes(target, options);
  const floor = [];
  const other = [];
  if (patterns.length === 0) return { floor, other };
  const root = path.resolve(target);
  for (const rel of await scaffoldInstructionFiles(target)) {
    const absolute = path.join(root, ...rel.split('/'));
    if (!patterns.some((pattern) => excludes(pattern, absolute))) continue;
    (FLOOR_FILES.includes(rel) ? floor : other).push(rel);
  }
  return { floor, other };
}

/** Doctor checks for item 112. Each returns the doctor's local check shape. */
export async function checkProjectContent(target, options = {}) {
  const checks = [];
  const claudeFile = path.join(target, 'CLAUDE.md');
  if (await fs.pathExists(claudeFile)) {
    const imported = hasProjectImport(await fs.readFile(claudeFile, 'utf-8'));
    const present = await fs.pathExists(path.join(target, PROJECT_FILE));
    let message;
    if (!imported) message = `CLAUDE.md does not load PROJECT.md. Add this line to CLAUDE.md: ${PROJECT_IMPORT_LINE}`;
    else if (!present) message = 'CLAUDE.md imports PROJECT.md, which is missing. `ais update --apply` adds a starter.';
    checks.push({
      name: 'Project context loaded (PROJECT.md)',
      passed: imported && present,
      severity: 'medium',
      message,
    });
  }

  const { floor, other } = await findExcludedScaffoldFiles(target, options);
  checks.push({
    name: 'Security floor rules not excluded (claudeMdExcludes)',
    passed: floor.length === 0,
    severity: 'high',
    message: floor.length > 0
      ? `claudeMdExcludes removes ${floor.join(', ')}. These carry the security floor; add project rules instead of excluding them.`
      : undefined,
  });
  checks.push({
    name: 'Scaffold rules replaced by the project',
    passed: other.length === 0,
    severity: 'medium',
    message: other.length > 0
      ? `claudeMdExcludes removes ${other.join(', ')}. Check that PROJECT.md or .claude/rules/project/ covers what they said.`
      : undefined,
  });
  return checks;
}
