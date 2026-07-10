#!/usr/bin/env node
/**
 * Post-install doc checker for a generated scaffold project.
 *
 * Fails (exit 1) if a generated project contains:
 *   - a broken relative markdown link (target file does not exist), or
 *   - an unresolved scaffold *identity* placeholder in an identity-resolved file.
 *
 * It deliberately ignores `{{...}}` fill-in stubs inside shipped templates,
 * agents, commands, rules, and skills — those are intentional author-fill tokens,
 * not scaffold-resolved identity tokens.
 *
 * Usage: node scripts/check-generated-links.mjs <projectDir>
 */
import fs from 'fs';
import path from 'path';

const root = process.argv[2];
if (!root || !fs.existsSync(root)) {
  console.error('usage: node scripts/check-generated-links.mjs <projectDir>');
  process.exit(2);
}

// Files where scaffold identity tokens MUST be fully resolved.
const IDENTITY_FILES = [
  'README.md',
  'CLAUDE.md',
  'AGENTS.md',
  '.claude/MEMORY.md',
  '.ai-scaffold/context.md',
  '.ai-scaffold/README.md',
];

// Identity tokens the scaffold resolves at install time (mirror of the
// tokenMap in src/cli/core/content-templates.js). Any of these left in an
// identity file is an unresolved-placeholder bug.
const IDENTITY_TOKENS = [
  'PROJECT_NAME', 'PROJECT_DISPLAY_NAME', 'PROJECT_DESCRIPTION', 'ONE_LINE_PURPOSE',
  'IS_MULTI_TENANT', 'COMPLIANCE_SCOPE', 'OWNER_EMAIL', 'EPIC_NAME', 'BACKEND_STACK',
  'FRONTEND_STACK', 'DATABASE', 'RUNTIME', 'REPO_URL', 'INSTALL_COMMAND',
  'MIGRATION_COMMAND', 'MIGRATE_COMMAND', 'DEV_COMMAND', 'BUILD_COMMAND',
  'TEST_COMMAND', 'LINT_COMMAND', 'SEED_COMMAND', 'CACHE_QUEUE', 'AUTH_STRATEGY',
  'EMAIL_PROVIDER', 'STORAGE', 'CLOUD_PROVIDER', 'IAC_TOOL', 'CICD_PLATFORM',
  'PM_TOOL', 'LICENSE', 'YEAR',
];

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(root);
const mdFiles = files.filter((f) => f.endsWith('.md'));
const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
const problems = [];

for (const f of mdFiles) {
  const txt = fs.readFileSync(f, 'utf-8');
  let m;
  while ((m = linkRe.exec(txt)) !== null) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|tel:|#|data:)/i.test(target)) continue;
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    target = target.split('#')[0].split('?')[0].trim();
    if (!target || target.startsWith('//')) continue;
    const resolved = target.startsWith('/')
      ? path.join(root, target.slice(1))
      : path.resolve(path.dirname(f), target);
    if (!fs.existsSync(resolved)) {
      problems.push(`BROKEN LINK  ${path.relative(root, f)} -> ${m[1].trim()}`);
    }
  }
}

for (const rel of IDENTITY_FILES) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const txt = fs.readFileSync(full, 'utf-8');
  for (const token of IDENTITY_TOKENS) {
    if (txt.includes(`{{${token}}}`)) {
      problems.push(`UNRESOLVED   ${rel} -> {{${token}}}`);
    }
  }
}

if (problems.length === 0) {
  console.log(`OK: ${mdFiles.length} markdown files, no broken links or unresolved identity tokens`);
  process.exit(0);
}
console.error(`FAIL: ${problems.length} problem(s) in generated project:`);
for (const p of problems) console.error(`  ${p}`);
process.exit(1);
