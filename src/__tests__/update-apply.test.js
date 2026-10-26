/**
 * Item 25 slice 4: the apply transaction and the lock (FR-16 to FR-19,
 * FR-40, FR-41, FR-48, FR-49, FR-52; NFR-09 parts 1 and 2).
 */
import diagnosticsChannel from 'diagnostics_channel';
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveProjectRoot } from '../cli/core/containment.js';
import { hashRaw } from '../cli/core/hashing.js';
import { applyTransaction } from '../cli/core/update-apply.js';
import { acquireLock, describeLock, LOCK_REL, releaseLock } from '../cli/core/update-lock.js';
import { nativeFs } from '../cli/core/write-ops.js';

let tmpDir;
let counter = 0;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-apply-'));
});

afterAll(async () => {
  await fse.remove(tmpDir);
});

const ORIGINAL = {
  'CLAUDE.md': 'claude v1\n',
  '.claude/rules/a.md': 'rule a v1\n',
  '.claude/rules/old.md': 'old rule\n',
  'CLAUDE.md.ais-new': null,
  'README.md': 'adopter readme\n',
  '.ai-scaffold/README.md': 'scaffold readme\n',
  '.ai-scaffold.json': '{"version":"0.1.0"}\n',
};

async function project() {
  const dir = path.join(tmpDir, `p${counter++}`);
  for (const [rel, content] of Object.entries(ORIGINAL)) {
    if (content !== null) fse.outputFileSync(path.join(dir, rel), content);
  }
  return resolveProjectRoot(dir);
}

function op(rel, action, content) {
  const pre = ORIGINAL[rel] === undefined || ORIGINAL[rel] === null ? null : hashRaw(ORIGINAL[rel]);
  if (action === 'remove') return { rel, action, pre, final: null };
  const data = Buffer.from(content);
  return { rel, action, data, pre, final: hashRaw(data) };
}

function plan() {
  return {
    dirs: ['.claude/new'],
    ops: [
      op('.claude/rules/a.md', 'write', 'rule a v2\n'),
      op('.claude/new/b.md', 'write', 'new rule b\n'),
      op('.claude/rules/old.md', 'remove'),
      op('CLAUDE.md.ais-new', 'write', 'claude v2\n'),
      op('.ai-scaffold.json', 'write', '{"version":"0.2.0"}\n'),
    ],
  };
}

function snapshot(root) {
  const out = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (child === '.ai-scaffold/backups') continue;
      if (entry.isDirectory()) walk(child);
      else out[child] = fs.readFileSync(path.join(root, child), 'utf-8');
    }
  };
  walk('');
  return out;
}

const backupDirOf = (root, result) => path.join(root, ...result.backupDir.split('/'));

describe('applyTransaction', { timeout: 60_000 }, () => {
  it('applies writes, a new directory, a removal and a sidecar, then marks complete', async () => {
    const root = await project();
    const result = await applyTransaction({ root, ...plan() });
    expect(result.status).toBe('applied');
    const after = snapshot(root);
    expect(after['.claude/rules/a.md']).toBe('rule a v2\n');
    expect(after['.claude/new/b.md']).toBe('new rule b\n');
    expect(after['.claude/rules/old.md']).toBeUndefined();
    expect(after['CLAUDE.md']).toBe('claude v1\n');
    expect(after['CLAUDE.md.ais-new']).toBe('claude v2\n');
    expect(after['README.md']).toBe('adopter readme\n');
    const backup = backupDirOf(root, result);
    expect(fs.existsSync(path.join(backup, 'complete'))).toBe(true);
    expect(fs.readFileSync(path.join(backup, 'files', '.claude', 'rules', 'old.md'), 'utf-8')).toBe('old rule\n');
    const journal = JSON.parse(fs.readFileSync(path.join(backup, 'journal.json'), 'utf-8'));
    expect(journal.entries.map((e) => e.rel)).toEqual(plan().ops.map((o) => o.rel));
    expect(Object.keys(after).some((rel) => rel.includes('.ais-tmp'))).toBe(false);
  });

  for (let failAt = 1; failAt <= 5; failAt++) {
    it(`a failure at write step ${failAt} rolls the project back to its exact pre-run bytes`, async () => {
      const root = await project();
      const before = snapshot(root);
      let writes = 0;
      const faulty = {
        ...nativeFs,
        rename: async (from, to) => {
          if (!from.includes(`${path.sep}backups${path.sep}`) && !to.endsWith('rolled-back') && ++writes === failAt) {
            throw Object.assign(new Error('injected'), { code: 'EIO' });
          }
          return nativeFs.rename(from, to);
        },
        unlink: async (p) => {
          if (p.endsWith('old.md') && ++writes === failAt) throw Object.assign(new Error('injected'), { code: 'EIO' });
          return nativeFs.unlink(p);
        },
      };
      const result = await applyTransaction({ root, ...plan(), fsApi: faulty });
      expect(result).toMatchObject({ status: 'rolled-back', error: { code: 'EIO' } });
      expect(snapshot(root)).toEqual(before);
      expect(fs.existsSync(path.join(root, '.claude', 'new'))).toBe(false);
      expect(fs.existsSync(path.join(backupDirOf(root, result), 'rolled-back'))).toBe(true);
    });
  }

  it('a file edited between plan and backup abandons the run with no project write', async () => {
    const root = await project();
    fs.writeFileSync(path.join(root, '.claude', 'rules', 'a.md'), 'edited by adopter\n');
    const before = snapshot(root);
    await expect(applyTransaction({ root, ...plan() })).rejects.toMatchObject({ code: 'BACKUP_MISMATCH' });
    expect(snapshot(root)).toEqual(before);
    const backups = fs.readdirSync(path.join(root, '.ai-scaffold', 'backups'));
    expect(fs.existsSync(path.join(root, '.ai-scaffold', 'backups', backups[0], 'abandoned'))).toBe(true);
  });

  it('a concurrent edit before its write stops the run, is never overwritten, and the rollback is complete (FR-41, FR-48)', async () => {
    const root = await project();
    const listener = (event) => {
      if (event.stage === 'write-done' && event.index === 0) {
        fs.writeFileSync(path.join(root, '.claude', 'rules', 'old.md'), 'adopter edit\n');
      }
    };
    diagnosticsChannel.subscribe('ais:update:apply', listener);
    let result;
    try {
      result = await applyTransaction({ root, ...plan() });
    } finally {
      diagnosticsChannel.unsubscribe('ais:update:apply', listener);
    }
    expect(fs.readFileSync(path.join(root, '.claude', 'rules', 'old.md'), 'utf-8')).toBe('adopter edit\n');
    expect(fs.readFileSync(path.join(root, '.claude', 'rules', 'a.md'), 'utf-8')).toBe('rule a v1\n');
    // FR-48: the refused path never held this run's bytes, so nothing of the
    // run remains and the rollback completes with the FR-41 code.
    expect(result).toMatchObject({ status: 'rolled-back', error: { code: 'CONCURRENT_EDIT' } });
    expect(result.rollback.find((s) => s.rel === '.claude/rules/old.md').state).toBe('not-written');
    expect(fs.existsSync(path.join(backupDirOf(root, result), 'rolled-back'))).toBe(true);
  });

  it('rollback leaves an adopter edit to an already-written file and reports it (FR-48)', async () => {
    const root = await project();
    let writes = 0;
    const faulty = {
      ...nativeFs,
      rename: async (from, to) => {
        if (!from.includes(`${path.sep}backups${path.sep}`) && !to.includes('backups') && ++writes === 3) {
          fs.writeFileSync(path.join(root, '.claude', 'rules', 'a.md'), 'adopter after write\n');
          throw Object.assign(new Error('injected'), { code: 'EIO' });
        }
        return nativeFs.rename(from, to);
      },
    };
    const result = await applyTransaction({ root, ...plan(), fsApi: faulty });
    expect(result).toMatchObject({ status: 'rollback-incomplete', error: { code: 'ROLLBACK_INCOMPLETE' } });
    expect(fs.readFileSync(path.join(root, '.claude', 'rules', 'a.md'), 'utf-8')).toBe('adopter after write\n');
    expect(result.rollback.find((s) => s.rel === '.claude/rules/a.md').state).toBe('conflict');
  });

  it('writes only inside the journaled write set (FR-49)', async () => {
    const root = await project();
    const touched = [];
    const record = (p) => touched.push(path.relative(root, p).split(path.sep).join('/'));
    const recording = {
      ...nativeFs,
      open: async (p, flags) => { if (/[wa+]/.test(flags)) record(p); return nativeFs.open(p, flags); },
      rename: async (from, to) => { record(to); return nativeFs.rename(from, to); },
      unlink: async (p) => { record(p); return nativeFs.unlink(p); },
      mkdir: async (p) => { record(p); return nativeFs.mkdir(p); },
      rmdir: async (p) => { record(p); return nativeFs.rmdir(p); },
    };
    const result = await applyTransaction({ root, ...plan(), fsApi: recording });
    const journal = JSON.parse(fs.readFileSync(path.join(backupDirOf(root, result), 'journal.json'), 'utf-8'));
    const allowed = new Set([...journal.dirs, ...journal.entries.flatMap((e) => [e.rel, e.tmp, e.rollbackTmp])]);
    const outside = touched.filter((rel) => !allowed.has(rel) && !rel.startsWith('.ai-scaffold/backups'));
    expect(outside).toEqual([]);
  });
});

describe('review of #159: permissions and failed-write residue', { timeout: 60_000 }, () => {
  it.runIf(process.platform !== 'win32')('replacing an executable keeps its mode; rollback restores it', async () => {
    const root = await project();
    const hook = path.join(root, '.claude', 'rules', 'a.md');
    fs.chmodSync(hook, 0o755);
    const applied = await applyTransaction({ root, ...plan() });
    expect(applied.status).toBe('applied');
    expect(fs.statSync(hook).mode & 0o777).toBe(0o755);

    const again = await project();
    const againHook = path.join(again, '.claude', 'rules', 'a.md');
    fs.chmodSync(againHook, 0o750);
    let writes = 0;
    const faulty = {
      ...nativeFs,
      rename: async (from, to) => {
        if (!to.includes(`${path.sep}backups${path.sep}`) && ++writes === 2) throw Object.assign(new Error('x'), { code: 'EIO' });
        return nativeFs.rename(from, to);
      },
    };
    const rolled = await applyTransaction({ root: again, ...plan(), fsApi: faulty });
    expect(rolled.status).toBe('rolled-back');
    expect(fs.statSync(againHook).mode & 0o777).toBe(0o750);
  });

  it.runIf(process.platform !== 'win32')('an added file takes the mode the operation asks for', async () => {
    const root = await project();
    const { ops, dirs } = plan();
    ops[1] = { ...ops[1], mode: 0o755 };
    await applyTransaction({ root, ops, dirs });
    expect(fs.statSync(path.join(root, '.claude', 'new', 'b.md')).mode & 0o777).toBe(0o755);
  });

  function partialWriteFs(failOn, { unlinkFails = false } = {}) {
    return {
      ...nativeFs,
      open: async (p, flags) => {
        const handle = await nativeFs.open(p, flags);
        if (!p.includes(failOn) || !p.includes('.ais-tmp')) return handle;
        return new Proxy(handle, {
          get(target, prop) {
            if (prop === 'writeFile') {
              return async (data) => {
                await target.writeFile(Buffer.from(data).subarray(0, 3));
                throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
              };
            }
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      },
      unlink: async (p) => {
        if (unlinkFails && p.includes('.ais-tmp')) throw Object.assign(new Error('locked'), { code: 'EBUSY' });
        return nativeFs.unlink(p);
      },
    };
  }

  it('a partial write (ENOSPC) leaves no temporary file or created directory behind', async () => {
    const root = await project();
    const before = snapshot(root);
    const result = await applyTransaction({ root, ...plan(), fsApi: partialWriteFs('b.md') });
    expect(result).toMatchObject({ status: 'rolled-back', error: { code: 'ENOSPC' } });
    expect(snapshot(root)).toEqual(before);
    expect(fs.existsSync(path.join(root, '.claude', 'new'))).toBe(false);
  });

  it('when cleanup itself fails, rollback is reported incomplete with the leftover paths', async () => {
    const root = await project();
    const result = await applyTransaction({ root, ...plan(), fsApi: partialWriteFs('b.md', { unlinkFails: true }) });
    expect(result).toMatchObject({ status: 'rollback-incomplete', error: { code: 'ROLLBACK_INCOMPLETE' } });
    const leftovers = result.rollback.filter((s) => s.state !== 'restored' && s.state !== 'untouched');
    expect(leftovers.map((s) => s.rel)).toEqual(expect.arrayContaining(['.claude/new']));
    expect(leftovers.some((s) => s.rel.includes('.ais-tmp'))).toBe(true);
    expect(fs.existsSync(path.join(backupDirOf(root, result), 'rolled-back'))).toBe(false);
  });
});

describe('the update lock (FR-40, FR-52)', () => {
  it('refuses a directory that is not a scaffold installation', async () => {
    const bare = await resolveProjectRoot(fse.mkdtempSync(path.join(tmpDir, 'bare-')));
    await expect(acquireLock(bare)).rejects.toMatchObject({ code: 'MANIFEST_MISSING' });
    expect(fs.readdirSync(bare)).toEqual([]);
  });

  it('is exclusive and released only with its token', async () => {
    const root = await project();
    const { token } = await acquireLock(root);
    await expect(acquireLock(root)).rejects.toMatchObject({ code: 'LOCKED' });
    expect(await releaseLock(root, 'not-the-token')).toBe(false);
    expect(fs.existsSync(path.join(root, ...LOCK_REL.split('/')))).toBe(true);
    expect(await releaseLock(root, token)).toBe(true);
    expect(await describeLock(root)).toBeNull();
  });

  it('reports pid, host, age and three-valued liveness', async () => {
    const root = await project();
    await acquireLock(root, { now: new Date(Date.UTC(2026, 9, 23, 10)) });
    const now = new Date(Date.UTC(2026, 9, 23, 10, 1));
    expect(await describeLock(root, { now })).toMatchObject({ pid: process.pid, ageSeconds: 60, liveness: 'running' });
    const dead = () => { throw Object.assign(new Error('x'), { code: 'ESRCH' }); };
    expect((await describeLock(root, { now, probe: dead })).liveness).toBe('not-running');
  });

  it('a lock from another host or a malformed lock is unknown', async () => {
    const root = await project();
    const lockPath = path.join(root, ...LOCK_REL.split('/'));
    fse.outputFileSync(lockPath, JSON.stringify({ pid: 1, host: 'elsewhere', startedAt: '2026-10-23T00:00:00Z', token: 't' }));
    expect((await describeLock(root)).liveness).toBe('unknown');
    fs.writeFileSync(lockPath, '');
    expect(await describeLock(root)).toMatchObject({ pid: null, liveness: 'unknown' });
  });
});
