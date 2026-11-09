/**
 * Governance checks on a generated project (item 105). Each returns
 * `{ errors: string[], warnings: string[] }`; nothing here writes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { measureStartupContext } from '../../src/cli/core/startup-context.js';

// History files may name retired commands; they record what happened.
const HISTORY = new Set(['CHANGELOG.md', 'tasks/lessons.md']);
// Retired before 0.19 (HOW-TO-USE "Command names before 0.19").
export const RETIRED_COMMANDS = [
  'start-task', 'debug-fix', 'review', 'commit-changes', 'gen-tests', 'lessons', 'bootstrap', 'health',
  'what-next', 'kickoff', 'create-brd', 'create-api', 'estimate', 'architecture-review', 'deployment-review',
  'ux-analysis', 'ux-design-prompt', 'ux-handoff', 'ux-review', 'qa', 'qa-plan', 'investigate', 'reflect',
  'settings', 'ux-create', 'ux-analyze', 'ux-flow', 'ux-screen-spec', 'ux-figma-spec', 'qa-review', 'qa-auth',
  'ponytail-audit', 'ponytail-debt',
];
// A slash command: not part of a path or URL, not followed by a path or extension.
const commandRe = (names) => new RegExp(`(?<![A-Za-z0-9_./*~@-])/(${names})(?![A-Za-z0-9_./-])`, 'g');
const RETIRED_RE = commandRe(RETIRED_COMMANDS.map((n) => n.replace(/-/g, '\\-')).join('|'));
const AIS_RE = commandRe('ais-[a-z][a-z-]*[a-z]');
const HOOK_RE = /\.claude\/hooks\/([A-Za-z0-9_.-]+)/g;
const MODEL_RE = /\b(?:claude-(?:opus|sonnet|haiku|fable)-\d[\w.-]*|(?:Opus|Sonnet|Haiku|Fable) \d(?:\.\d)?\+?)/g;
const TEXT = /\.(md|mdc|json|ya?ml|toml|txt|sh|py|ts|js)$/;

const result = () => ({ errors: [], warnings: [] });
const toPosix = (rel) => rel.split(path.sep).join('/');

/** Shipped text files, relative and POSIX, skipping .git and node_modules. */
export function shippedTextFiles(projectDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (TEXT.test(entry.name) || ['pre-commit', 'commit-msg'].includes(entry.name)) out.push(toPosix(path.relative(projectDir, full)));
    }
  };
  walk(projectDir);
  return out.sort();
}

const read = (projectDir, rel) => fs.readFileSync(path.join(projectDir, ...rel.split('/')), 'utf-8');
const matches = (re, text) => [...text.matchAll(re)].map((m) => m[1] ?? m[0]);

/**
 * Every /ais-* command and .claude/hooks/* path named in shipped instructions
 * (Markdown) exists. Settings and manifests hold permission patterns, not
 * instructions, and are not checked here.
 */
export function checkReferences(projectDir) {
  const out = result();
  for (const rel of shippedTextFiles(projectDir).filter((r) => !HISTORY.has(r) && /\.mdc?$/.test(r))) {
    const text = read(projectDir, rel);
    for (const name of new Set(matches(AIS_RE, text))) {
      if (!fs.existsSync(path.join(projectDir, '.claude', 'commands', `${name}.md`))) out.errors.push(`${rel}: /${name} has no .claude/commands/${name}.md`);
    }
    for (const hook of new Set(matches(HOOK_RE, text))) {
      if (!fs.existsSync(path.join(projectDir, '.claude', 'hooks', hook))) out.errors.push(`${rel}: .claude/hooks/${hook} does not exist`);
    }
  }
  return out;
}

/** No retired command name or pinned model name outside history files. */
export function checkObsoleteNames(projectDir) {
  const out = result();
  for (const rel of shippedTextFiles(projectDir).filter((r) => !HISTORY.has(r))) {
    const text = read(projectDir, rel);
    for (const name of new Set(matches(RETIRED_RE, text))) out.errors.push(`${rel}: retired command /${name}`);
    for (const model of new Set(matches(MODEL_RE, text))) out.errors.push(`${rel}: pinned model name "${model}" (goes stale; describe the capability instead)`);
  }
  return out;
}

/** Each shipped rule has a manifest entry; each hook claim exists and has a probe or a stated gap. */
export function checkRuleManifest(projectDir, manifest, repoRoot) {
  const out = result();
  const rulesDir = path.join(projectDir, '.claude', 'rules');
  const shipped = fs.existsSync(rulesDir)
    ? shippedTextFiles(rulesDir).filter((rel) => rel.endsWith('.md'))
    : [];
  const entries = manifest?.rules ?? {};
  for (const rel of shipped) if (!entries[rel]) out.errors.push(`.claude/rules/${rel}: no entry in docs/governance/rule-manifest.json`);
  for (const [rel, entry] of Object.entries(entries)) {
    if (!shipped.includes(rel)) out.errors.push(`rule-manifest: ${rel} is not shipped`);
    for (const field of ['prevents', 'appliesWhen']) if (!entry[field]) out.errors.push(`rule-manifest: ${rel} has no ${field}`);
    for (const claim of entry.enforcedBy ?? []) {
      if (!fs.existsSync(path.join(projectDir, '.claude', 'hooks', claim.hook))) out.errors.push(`rule-manifest: ${rel} claims missing hook ${claim.hook}`);
      if (claim.probe) {
        if (!fs.existsSync(path.join(repoRoot, ...claim.probe.split('/')))) out.errors.push(`rule-manifest: ${rel} probe ${claim.probe} does not exist`);
      } else if (claim.gap) {
        out.warnings.push(`rule-manifest: ${rel} claims ${claim.hook} without a probe: ${claim.gap}`);
      } else {
        out.errors.push(`rule-manifest: ${rel} claims ${claim.hook} with neither a probe nor a stated gap`);
      }
    }
  }
  return out;
}

/** Each tool's startup context is within budget; Codex is also within its byte limit. */
export function checkBudget(projectDir) {
  const out = result();
  for (const surface of measureStartupContext(projectDir).surfaces) {
    if (surface.overBudget) out.errors.push(`${surface.label}: ${surface.tokens} est-tokens at startup, budget ${surface.budgetTokens}`);
    if (surface.byteLimit && surface.bytes > surface.byteLimit) out.errors.push(`${surface.label}: ${surface.bytes} B, over the ${surface.byteLimit} B default limit`);
  }
  return out;
}
