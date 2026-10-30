/**
 * Item 81 with item 97's probes: the shipped guards still decide correctly on a
 * machine with no working jq and the Microsoft Store python3 stub on PATH, the
 * stock Windows setup where they used to allow everything.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SUPPORTED_PROFILES, templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';

const BASH = resolveOnPath('bash');
const GUARDS = ['pre-secret-guard.sh', 'pre-dangerous-bash-guard.sh', 'governance-file-guard.sh'];
let stubDir;

// Both stubs are found on PATH but fail, as the Store python3 alias does.
beforeAll(() => {
  stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-stub-'));
  for (const name of ['jq', 'python3']) {
    const file = path.join(stubDir, name);
    fs.writeFileSync(file, '#!/bin/sh\nexit 49\n');
    fs.chmodSync(file, 0o755);
  }
});

afterAll(() => fs.rmSync(stubDir, { recursive: true, force: true }));

function runGuard(guard, payload) {
  const env = { ...process.env, PATH: `${stubDir}${path.delimiter}${process.env.PATH}` };
  return spawnSync(BASH, [templatePath('node', `.claude/hooks/${guard}`)], { input: JSON.stringify(payload), encoding: 'utf-8', env }).status;
}

const read = (file) => ({ tool_name: 'Read', tool_input: { file_path: file } });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

describe('guard scripts are shared', () => {
  it.each(GUARDS)('%s is byte-identical across profiles', (guard) => {
    const node = fs.readFileSync(templatePath('node', `.claude/hooks/${guard}`), 'utf-8');
    for (const profile of SUPPORTED_PROFILES) {
      expect(fs.readFileSync(templatePath(profile, `.claude/hooks/${guard}`), 'utf-8')).toBe(node);
    }
  });
});

describe.runIf(BASH)('guards with no working jq and a python3 stub (items 81, 97)', { timeout: 30_000 }, () => {
  it.each([
    ['.env', 2],
    ['config/.env.production', 2],
    ['id_rsa', 2],
    ['.env.example', 0],
    ['src/index.js', 0],
  ])('secret guard: Read %s exits %i', (file, status) => {
    expect(runGuard('pre-secret-guard.sh', read(file))).toBe(status);
  });

  it('secret guard: a Bash command reading .env is blocked', () => {
    expect(runGuard('pre-secret-guard.sh', bash('cat .env'))).toBe(2);
  });

  it('secret guard fails closed on a tool call it cannot read', () => {
    expect(runGuard('pre-secret-guard.sh', { tool_name: 7, tool_input: { file_path: 'src/index.js' } })).toBe(2);
  });

  it.each([
    ['git reset --hard', 2],
    ['npm test', 0],
  ])('dangerous-command guard: %s exits %i', (command, status) => {
    expect(runGuard('pre-dangerous-bash-guard.sh', bash(command))).toBe(status);
  });

  it('settings.json runs every hook from the project directory, not the working directory', () => {
    const settings = JSON.parse(fs.readFileSync(templatePath('node', '.claude/settings.json'), 'utf-8'));
    const commands = Object.values(settings.hooks).flat().flatMap((group) => group.hooks.map((h) => h.command));
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) expect(command).toMatch(/^bash "\$\{CLAUDE_PROJECT_DIR\}\/\.claude\/hooks\/[\w.-]+"$/);
  });
});
