/**
 * token-report — measures the scaffold's own context footprint so the
 * token-efficiency workstream (T0) has a baseline to optimize against.
 *
 * Token counts are a model-agnostic estimate (chars / CHARS_PER_TOKEN). The
 * absolute number is approximate; what matters is that it is CONSISTENT, so a
 * before/after diff on an optimization is meaningful. Show-only — never mutates.
 */

import fs from 'fs';
import path from 'path';

// Rough industry heuristic for English prose/markdown. Not exact per model;
// held constant so before/after comparisons stay honest.
const CHARS_PER_TOKEN = 4;
const TOP_FILES_LIMIT = 10;

// The five pure reviewers that fan out on a full `/review` (T1 targets this).
const REVIEW_FANOUT_AGENTS = [
  'backend-reviewer',
  'frontend-reviewer',
  'security-reviewer',
  'qa-reviewer',
  'critic-agent',
];

function estTokens(chars) {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function listMarkdown(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'worktrees' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdown(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function measureFiles(files, rootDir) {
  let chars = 0;
  const perFile = [];
  for (const file of files) {
    const size = fs.statSync(file).size;
    chars += size;
    perFile.push({ path: path.relative(rootDir, file), tokens: estTokens(size) });
  }
  return { files: files.length, chars, tokens: estTokens(chars), perFile };
}

function measureCategory(rootDir, dir) {
  return measureFiles(listMarkdown(path.join(rootDir, dir)), rootDir);
}

function measureAlwaysLoaded(rootDir) {
  const file = path.join(rootDir, 'CLAUDE.md');
  const chars = fs.existsSync(file) ? fs.statSync(file).size : 0;
  return { files: chars ? 1 : 0, chars, tokens: estTokens(chars) };
}

function reviewFanoutCost(rootDir) {
  let chars = 0;
  const present = [];
  for (const name of REVIEW_FANOUT_AGENTS) {
    const file = path.join(rootDir, '.claude/agents', `${name}.md`);
    if (!fs.existsSync(file)) continue;
    chars += fs.statSync(file).size;
    present.push(name);
  }
  // Definition cost only — the real fan-out also re-loads rules + the diff into
  // each of the N separate subagent contexts, so this is a floor, not a ceiling.
  return { agents: present, tokens: estTokens(chars) };
}

/**
 * Build the token report for a scaffold root. Returns structured data; the CLI
 * wrapper is responsible for presentation.
 */
export function buildTokenReport(rootDir = process.cwd()) {
  const categories = [
    { key: 'always', label: 'Always-loaded (CLAUDE.md)', loading: 'every session', ...measureAlwaysLoaded(rootDir) },
    { key: 'rules', label: 'Rules (.claude/rules)', loading: 'on reference', ...measureCategory(rootDir, '.claude/rules') },
    { key: 'commands', label: 'Commands (.claude/commands)', loading: 'on invoke', ...measureCategory(rootDir, '.claude/commands') },
    { key: 'agents', label: 'Agents (.claude/agents)', loading: 'on invoke (own context)', ...measureCategory(rootDir, '.claude/agents') },
    { key: 'skills', label: 'Skills (.claude/skills)', loading: 'on invoke', ...measureCategory(rootDir, '.claude/skills') },
  ];

  const total = {
    files: categories.reduce((n, c) => n + c.files, 0),
    tokens: categories.reduce((n, c) => n + c.tokens, 0),
  };

  const onDemand = total.tokens - categories[0].tokens;

  const topFiles = categories
    .flatMap((c) => c.perFile ?? [])
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, TOP_FILES_LIMIT);

  return {
    charsPerToken: CHARS_PER_TOKEN,
    categories: categories.map(({ perFile: _perFile, chars: _chars, ...rest }) => rest),
    total,
    alwaysLoadedTokens: categories[0].tokens,
    onDemandTokens: onDemand,
    topFiles,
    reviewFanout: reviewFanoutCost(rootDir),
  };
}
