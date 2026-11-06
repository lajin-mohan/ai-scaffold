/**
 * startup-context — static estimate of the scaffold-controlled context each
 * supported AI tool loads at session start in a generated project (item 74
 * M-08, item 84 budget). Show-only: reads files, never mutates.
 *
 * Every figure is a STATIC ESTIMATE (bytes / CHARS_PER_TOKEN over files we
 * ship). Observed context and billed cost cannot be derived from files; they
 * are reported as unavailable here and recorded by hand with the tool version.
 */

import fs from 'fs';
import path from 'path';
import { toPosixPath } from './paths.js';
import { hasPathsFrontmatter } from './token-report.js';

export const CHARS_PER_TOKEN = 4;
export const STARTUP_BUDGET_TOKENS = 5000;
export const CODEX_DEFAULT_MAX_BYTES = 32 * 1024;
const MAX_IMPORT_HOPS = 4;
const MIN_DUPLICATE_LINE_CHARS = 20;

const DOCS = {
  claude: 'https://code.claude.com/docs/en/memory',
  claudeSkills: 'https://code.claude.com/docs/en/skills',
  claudeAgents: 'https://code.claude.com/docs/en/sub-agents',
  codex: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md',
  cursor: 'https://cursor.com/help/customization/rules',
  cursorSkills: 'https://cursor.com/docs/context/skills',
  copilotCli: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
};

const estTokens = (bytes) => Math.round(bytes / CHARS_PER_TOKEN);
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function walk(dir, accept) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, accept));
    else if (accept(entry.name)) out.push(full);
  }
  return out.sort();
}

/** Leading `---` front matter as a flat key → raw string map. */
export function frontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return {};
  const fields = {};
  for (let i = 1; i < lines.length && lines[i] !== '---'; i++) {
    const match = /^([A-Za-z_-]+)\s*:\s*(.*)$/.exec(lines[i]);
    if (match) fields[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return fields;
}

/** `@path` imports outside code spans and fenced blocks (Claude memory docs). */
export function importTargets(text) {
  const targets = [];
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const prose = line.replace(/`[^`]*`/g, '');
    for (const match of prose.matchAll(/(?:^|\s)@([^\s`]+)/g)) targets.push(match[1]);
  }
  return targets;
}

function withImports(file, root, hops = 0, seen = new Set()) {
  if (!fs.existsSync(file) || seen.has(file)) return [];
  seen.add(file);
  const files = [{ file, kind: hops === 0 ? 'instructions' : 'import' }];
  if (hops >= MAX_IMPORT_HOPS) return files;
  for (const target of importTargets(readText(file))) {
    const resolved = path.resolve(path.dirname(file), target);
    if (resolved.startsWith(root)) files.push(...withImports(resolved, root, hops + 1, seen));
  }
  return files;
}

/** Bytes a tool injects for one skill/command/agent listing entry. */
function descriptionEntry(file, root, kind) {
  const fields = frontmatter(readText(file));
  if (fields['disable-model-invocation'] === 'true') return null;
  const text = [fields.name, fields.description, fields.when_to_use].filter(Boolean).join(' ');
  return { file, kind, bytes: Buffer.byteLength(text, 'utf8') };
}

function descriptions(root, dirs, kind) {
  const accept = kind === 'skill-description' ? (name) => name === 'SKILL.md' : (name) => name.endsWith('.md');
  return dirs.flatMap((dir) => walk(path.join(root, dir), accept))
    .map((file) => descriptionEntry(file, root, kind)).filter(Boolean);
}

function unscopedRules(root) {
  return walk(path.join(root, '.claude/rules'), (name) => name.endsWith('.md'))
    .filter((file) => !hasPathsFrontmatter(readText(file)))
    .map((file) => ({ file, kind: 'unscoped-rule' }));
}

function alwaysApplyMdc(root) {
  return walk(path.join(root, '.cursor/rules'), (name) => name.endsWith('.mdc'))
    .filter((file) => frontmatter(readText(file)).alwaysApply === 'true')
    .map((file) => ({ file, kind: 'always-apply-rule' }));
}

const existing = (root, rel, kind) => (fs.existsSync(path.join(root, rel)) ? [{ file: path.join(root, rel), kind }] : []);

/** Codex reads AGENTS.override.md instead of AGENTS.md when both exist in a directory. */
function codexRootInstructions(root) {
  const override = existing(root, 'AGENTS.override.md', 'instructions');
  return override.length ? override : existing(root, 'AGENTS.md', 'instructions');
}

/** Load set per surface, from the vendor docs cited in each entry. */
export const SURFACES = [
  {
    key: 'claude-code', label: 'Claude Code', sources: [DOCS.claude, DOCS.claudeSkills, DOCS.claudeAgents],
    files: (root) => [...withImports(path.join(root, 'CLAUDE.md'), root), ...unscopedRules(root),
      ...descriptions(root, ['.claude/skills'], 'skill-description'),
      ...descriptions(root, ['.claude/commands'], 'command-description'),
      ...descriptions(root, ['.claude/agents'], 'agent-description')],
    notes: ['CLAUDE.local.md and user-level files are not scaffold-controlled and are excluded.'],
  },
  {
    key: 'codex', label: 'Codex', sources: [DOCS.codex], byteLimit: CODEX_DEFAULT_MAX_BYTES,
    files: (root) => [...codexRootInstructions(root), ...descriptions(root, ['.agents/skills'], 'skill-description')],
    notes: ['Measured with the project root as working directory; nested AGENTS.md files add to the chain.',
      'The user\'s global ~/.codex file shares the same byte limit and is not counted here.'],
  },
  {
    key: 'cursor', label: 'Cursor', sources: [DOCS.cursor, DOCS.cursorSkills],
    files: (root) => [...existing(root, 'AGENTS.md', 'instructions'), ...existing(root, 'CLAUDE.md', 'instructions'),
      ...existing(root, '.cursorrules', 'legacy-rules'), ...alwaysApplyMdc(root),
      ...descriptions(root, ['.cursor/skills', '.agents/skills', '.claude/skills'], 'skill-description')],
    notes: ['Whether Cursor follows @imports inside CLAUDE.md is undocumented; imports are not counted.',
      '.cursorrules is documented as legacy; counted while it ships.'],
  },
  {
    key: 'copilot-cli', label: 'Copilot CLI', sources: [DOCS.copilotCli],
    files: (root) => [...existing(root, '.github/copilot-instructions.md', 'instructions'),
      ...existing(root, 'AGENTS.md', 'instructions'), ...existing(root, 'CLAUDE.md', 'instructions'),
      ...existing(root, '.claude/CLAUDE.md', 'instructions'),
      ...descriptions(root, ['.github/skills', '.claude/skills', '.agents/skills'], 'skill-description')],
    notes: ['Copilot cloud agent and code review load a different set and are not measured.'],
  },
];

/** Non-trivial lines that appear in more than one loaded file. */
export function duplicatedLines(files) {
  const owners = new Map();
  for (const { file } of files) {
    for (const raw of readText(file).split(/\r?\n/)) {
      const line = raw.trim();
      if (line.length < MIN_DUPLICATE_LINE_CHARS) continue;
      if (!owners.has(line)) owners.set(line, new Set());
      owners.get(line).add(file);
    }
  }
  let count = 0;
  let bytes = 0;
  for (const [line, set] of owners) {
    if (set.size < 2) continue;
    count += 1;
    bytes += Buffer.byteLength(line, 'utf8') * (set.size - 1);
  }
  return { lines: count, tokens: estTokens(bytes) };
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${entry.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function measureSurface(surface, root) {
  const entries = uniqueEntries(surface.files(root));
  const files = entries.map((entry) => {
    const bytes = entry.bytes ?? fs.statSync(entry.file).size;
    return { path: toPosixPath(path.relative(root, entry.file)), kind: entry.kind, bytes, tokens: estTokens(bytes) };
  });
  const bytes = files.reduce((sum, f) => sum + f.bytes, 0);
  const tokens = estTokens(bytes);
  return {
    key: surface.key, label: surface.label, measure: 'static-estimate',
    files, bytes, tokens, budgetTokens: STARTUP_BUDGET_TOKENS, overBudget: tokens > STARTUP_BUDGET_TOKENS,
    byteLimit: surface.byteLimit ?? null,
    duplicated: duplicatedLines(entries.filter((entry) => entry.bytes === undefined)),
    observed: 'unavailable — record from the tool (e.g. Claude Code /context) with version and settings',
    billed: 'unavailable — record provider usage, cached and uncached separately',
    notes: surface.notes, sources: surface.sources,
  };
}

/** Measure every surface for a generated project directory. */
export function measureStartupContext(projectDir) {
  const root = path.resolve(projectDir);
  if (!fs.existsSync(root)) throw new Error(`Project directory not found: ${projectDir}`);
  return { charsPerToken: CHARS_PER_TOKEN, surfaces: SURFACES.map((surface) => measureSurface(surface, root)) };
}
