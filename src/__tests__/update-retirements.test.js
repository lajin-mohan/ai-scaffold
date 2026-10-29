/**
 * Wave A removals reach existing projects through `ais update --apply`:
 * item 80 retires the per-prompt pre-review hook.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { SUPPORTED_PROFILES, templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { hashRaw } from '../cli/core/hashing.js';
import { runApply } from '../cli/core/update-apply-run.js';

const GIT = resolveOnPath('git');
const NOW = new Date(Date.UTC(2026, 9, 29, 12));
const PRE_REVIEW = '.claude/hooks/pre-review.sh';
let tmpDir;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
}

const at = (target, rel) => path.join(target, ...rel.split('/'));
const readJson = (target, rel) => JSON.parse(fs.readFileSync(at(target, rel), 'utf-8'));
const writeJson = (target, rel, value) => fs.writeFileSync(at(target, rel), `${JSON.stringify(value, null, 2)}\n`);

/** A 0.17-era install: pre-review.sh present, recorded, and wired to every prompt. */
async function olderInstall() {
  const target = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, 'r-')));
  const bootstrap = resolveWithDefaults({ projectName: 'retire', purpose: 'Retire', ownerEmail: 'a@example.com', profile: 'golang' });
  const plan = await buildFilePlan(templatePath('golang'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  const script = '#!/bin/bash\ngo test ./...\n';
  fs.writeFileSync(at(target, PRE_REVIEW), script);
  const settings = readJson(target, '.claude/settings.json');
  settings.hooks = {
    UserPromptSubmit: [{ matcher: '/review', hooks: [{ type: 'command', command: `PRE_REVIEW_ALLOW_UNCONFIGURED=1 bash ${PRE_REVIEW}`, timeout: 300 }] }],
    ...settings.hooks,
  };
  settings.permissions.allow.push(`Bash(${PRE_REVIEW})`);
  writeJson(target, '.claude/settings.json', settings);
  const manifest = readJson(target, '.ai-scaffold.json');
  manifest.version = '0.17.1';
  manifest.managedFiles.push({ path: PRE_REVIEW, hash: hashRaw(script), class: 'managed' });
  writeJson(target, '.ai-scaffold.json', manifest);
  git(target, 'init', '-q');
  git(target, 'config', 'core.autocrlf', 'false');
  git(target, 'add', '-A');
  git(target, '-c', 'user.name=T', '-c', 'user.email=t@example.com', 'commit', '-q', '--no-verify', '-m', 'older');
  return target;
}

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-retire-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe('item 80: no per-prompt hook ships', () => {
  it.each(SUPPORTED_PROFILES)('%s settings.json has no UserPromptSubmit hook and no pre-review.sh', (profile) => {
    const settings = JSON.parse(fs.readFileSync(templatePath(profile, '.claude/settings.json'), 'utf-8'));
    expect(settings.hooks.UserPromptSubmit).toBeUndefined();
    expect(fs.existsSync(templatePath(profile, PRE_REVIEW))).toBe(false);
  });
});

describe.runIf(GIT)('item 80: ais update retires the pre-review hook', { timeout: 120_000 }, () => {
  it('removes the hook from settings.json and the pristine script from the project', async () => {
    const target = await olderInstall();

    const doc = await runApply({ target, options: { apply: true }, cliVersion: '0.18.0', today: NOW, now: NOW });

    expect(doc.status).toBe('applied');
    expect(doc.migrations).toContain('0.18.0');
    expect(doc.settings.removed).toContain(`hook: UserPromptSubmit ${PRE_REVIEW}`);
    const after = readJson(target, '.claude/settings.json');
    expect(after.hooks.UserPromptSubmit).toBeUndefined();
    expect(after.permissions.allow).not.toContain(`Bash(${PRE_REVIEW})`);
    expect(fs.existsSync(at(target, PRE_REVIEW))).toBe(false);
  });
});
