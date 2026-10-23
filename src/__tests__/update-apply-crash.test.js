/**
 * Item 25 slice 4, NFR-09 part 3: genuine process death. A child process runs
 * a real apply and is killed with SIGKILL at each stage (no finally, no
 * rollback, no lock release). Every journaled path must be wholly pre-run or
 * wholly final, nothing outside the write set may change, and only
 * journal-named temporary files may remain.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashRaw } from '../cli/core/hashing.js';
import { LOCK_REL } from '../cli/core/update-lock.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '..');
const DRIVER = path.join(here, 'fixtures', 'apply-driver.mjs');
const HOOK = pathToFileURL(path.join(here, 'fixtures', 'crash-hook.mjs')).href;

const ORIGINAL = {
  'CLAUDE.md': 'claude v1\n',
  '.claude/rules/a.md': 'rule a v1\n',
  '.claude/rules/b.md': 'rule b v1\n',
  '.claude/rules/old.md': 'old rule\n',
  'README.md': 'adopter readme\n',
  '.ai-scaffold/README.md': 'scaffold readme\n',
  '.ai-scaffold.json': '{"version":"0.1.0"}\n',
};
const CHANGES = [
  ['.claude/rules/a.md', 'rule a v2\n'],
  ['.claude/new/c.md', 'new rule c\n'],
  ['.claude/rules/old.md', null],
  ['.claude/rules/b.md', 'rule b v2\n'],
  ['.ai-scaffold.json', '{"version":"0.2.0"}\n'],
];
const WRITE_SET = new Set(CHANGES.map(([rel]) => rel));

let tmpDir;
let counter = 0;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-crash-'));
});

afterAll(async () => {
  await fse.remove(tmpDir);
});

function prepare(extra = {}) {
  const root = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, `p${counter++}-`)));
  for (const [rel, content] of Object.entries(ORIGINAL)) fse.outputFileSync(path.join(root, rel), content);
  const ops = CHANGES.map(([rel, content]) => {
    const pre = ORIGINAL[rel] === undefined ? null : hashRaw(ORIGINAL[rel]);
    if (content === null) return { rel, action: 'remove', pre, final: null };
    return { rel, action: 'write', data: Buffer.from(content).toString('base64'), pre, final: hashRaw(content) };
  });
  const specPath = path.join(tmpDir, `spec-${counter}.json`);
  fs.writeFileSync(specPath, JSON.stringify({ ops, dirs: ['.claude/new'], ...extra }));
  return { root, ops, specPath };
}

function files(root) {
  const out = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.ai-scaffold/backups' || child === LOCK_REL) continue;
      if (entry.isDirectory()) walk(child);
      else out[child] = fs.readFileSync(path.join(root, child));
    }
  };
  walk('');
  return out;
}

function journalOf(root) {
  const backups = path.join(root, '.ai-scaffold', 'backups');
  if (!fs.existsSync(backups)) return { dir: null, journal: null };
  const [name] = fs.readdirSync(backups);
  const dir = path.join(backups, name);
  const file = path.join(dir, 'journal.json');
  return { dir, journal: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null };
}

function crashAt(stage, index, extra) {
  const { root, ops, specPath } = prepare(extra);
  const env = { ...process.env, AIS_TEST_CRASH_STAGE: stage, AIS_TEST_CRASH_INDEX: index ?? '' };
  const child = spawnSync(process.execPath, ['--import', HOOK, DRIVER, SRC, root, specPath], { env, encoding: 'utf-8', timeout: 60_000 });
  return { root, ops, child };
}

function expectConsistent(root, ops) {
  const now = files(root);
  const { journal, dir } = journalOf(root);
  for (const op of ops) {
    const hash = now[op.rel] ? hashRaw(now[op.rel]) : null;
    expect([op.pre, op.final], `${op.rel} is wholly pre-run or final`).toContain(hash);
  }
  const stray = Object.keys(now).filter((rel) => !WRITE_SET.has(rel) && !(rel in ORIGINAL));
  const allowedTemps = new Set(journal ? journal.entries.flatMap((e) => [e.tmp, e.rollbackTmp]) : []);
  expect(stray.filter((rel) => !allowedTemps.has(rel))).toEqual([]);
  for (const [rel, content] of Object.entries(ORIGINAL)) {
    if (!WRITE_SET.has(rel)) expect(now[rel].toString(), `${rel} outside the write set`).toBe(content);
  }
  return { journal, dir };
}

const STAGES = [
  ['backup-dir-created', undefined],
  ['journal-written', undefined],
  ['backup-copied', '0'],
  ['dir-created', undefined],
  ['write-done', '0'],
  ['write-done', '2'],
  ['write-done', '4'],
  ['before-marker', undefined],
];

describe('genuine process death at each apply stage (NFR-09)', { timeout: 120_000 }, () => {
  it.each(STAGES)('SIGKILL at %s %s', (stage, index) => {
    const { root, ops, child } = crashAt(stage, index);
    expect(child.stdout, child.stderr).toBe('');
    expect(child.status === 0, 'the driver must not finish normally').toBe(false);
    expect(fs.existsSync(path.join(root, ...LOCK_REL.split('/'))), 'a killed run leaves its lock').toBe(true);
    const { journal, dir } = expectConsistent(root, ops);
    if (stage === 'backup-dir-created') expect(journal).toBeNull();
    else expect(journal).not.toBeNull();
    if (dir) {
      for (const marker of ['complete', 'rolled-back', 'abandoned']) {
        expect(fs.existsSync(path.join(dir, marker)), `no ${marker} marker after a kill`).toBe(false);
      }
    }
  });

  it('SIGKILL during rollback leaves every path pre-run or final', () => {
    const { root, ops, child } = crashAt('rollback-step', '3', { failAtRename: 4 });
    expect(child.stdout, child.stderr).toBe('');
    expect(fs.existsSync(path.join(root, ...LOCK_REL.split('/')))).toBe(true);
    expectConsistent(root, ops);
  });

  it('control: without a crash point the same driver completes and releases the lock', () => {
    const { root, ops, specPath } = prepare();
    const child = spawnSync(process.execPath, ['--import', HOOK, DRIVER, SRC, root, specPath],
      { env: { ...process.env, AIS_TEST_CRASH_STAGE: 'never' }, encoding: 'utf-8', timeout: 60_000 });
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout).status).toBe('applied');
    expect(fs.existsSync(path.join(root, ...LOCK_REL.split('/')))).toBe(false);
    for (const op of ops) {
      const content = files(root)[op.rel];
      expect(content ? hashRaw(content) : null).toBe(op.final);
    }
  });
});
