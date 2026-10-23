/**
 * Item 25 slice 4, S3: classification and resolution of interrupted applies
 * (FR-38; HLD §10b). States are reconstructed from a real apply's journal.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveProjectRoot } from '../cli/core/containment.js';
import { hashRaw } from '../cli/core/hashing.js';
import { applyTransaction } from '../cli/core/update-apply.js';
import { resolveInterrupted } from '../cli/core/update-recovery.js';
import { classifyBackup, defaultIo, findInterrupted, interruptedNotice } from '../cli/core/update-state.js';
import { nativeFs } from '../cli/core/write-ops.js';

const io = defaultIo({ ...nativeFs, readdir: (p, o) => fs.promises.readdir(p, o) });
const ORIGINAL = {
  '.claude/rules/a.md': 'a v1\n',
  '.claude/rules/b.md': 'b v1\n',
  '.ai-scaffold/README.md': 'scaffold\n',
  '.ai-scaffold.json': '{"version":"0.1.0"}\n',
};
let tmpDir;
let counter = 0;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-recovery-'));
});

afterAll(async () => {
  await fse.remove(tmpDir);
});

function write(rel, content) {
  const data = Buffer.from(content);
  return { rel, action: 'write', data, pre: ORIGINAL[rel] ? hashRaw(ORIGINAL[rel]) : null, final: hashRaw(data) };
}

/** A completed apply whose marker is then removed: the all-final state. */
async function appliedThenUnmarked() {
  const dir = path.join(tmpDir, `p${counter++}`);
  for (const [rel, content] of Object.entries(ORIGINAL)) fse.outputFileSync(path.join(dir, rel), content);
  const root = await resolveProjectRoot(dir);
  const ops = [write('.claude/rules/a.md', 'a v2\n'), write('.claude/new/c.md', 'c\n'), write('.ai-scaffold.json', '{"version":"0.2.0"}\n')];
  const result = await applyTransaction({ root, ops, dirs: ['.claude/new'] });
  fs.rmSync(path.join(root, ...result.backupDir.split('/'), 'complete'));
  return { root, backup: result.backupDir };
}

const at = (root, rel) => path.join(root, ...rel.split('/'));

function restore(root, rels) {
  for (const rel of rels) {
    if (ORIGINAL[rel]) fs.writeFileSync(at(root, rel), ORIGINAL[rel]);
    else fs.rmSync(at(root, rel), { force: true });
  }
}

describe('classifyBackup and resolveInterrupted (FR-38)', { timeout: 60_000 }, () => {
  it('all-final: the apply finished; --apply writes complete', async () => {
    const { root, backup } = await appliedThenUnmarked();
    const classified = await classifyBackup(root, backup, io);
    expect(classified.state).toBe('all-final');
    expect(await resolveInterrupted(root, classified)).toBe('completed');
    expect(fs.existsSync(at(root, `${backup}/complete`))).toBe(true);
    expect(await findInterrupted(root, io)).toEqual([]);
  });

  it('all-pre-run: nothing changed; journaled temporaries and empty directories are removed, then abandoned', async () => {
    const { root, backup } = await appliedThenUnmarked();
    restore(root, ['.claude/rules/a.md', '.claude/new/c.md', '.ai-scaffold.json']);
    const classified = await classifyBackup(root, backup, io);
    expect(classified.state).toBe('all-pre-run');
    const orphan = classified.journal.entries[0].tmp;
    fs.writeFileSync(at(root, orphan), 'half written');
    fs.writeFileSync(at(root, '.claude/keep.md'), 'adopter file, not journaled');
    expect(await resolveInterrupted(root, classified)).toBe('abandoned');
    expect(fs.existsSync(at(root, orphan))).toBe(false);
    expect(fs.existsSync(at(root, '.claude/new'))).toBe(false);
    expect(fs.readFileSync(at(root, '.claude/keep.md'), 'utf-8')).toBe('adopter file, not journaled');
    expect(fs.existsSync(at(root, `${backup}/abandoned`))).toBe(true);
  });

  it('mixed: reported path by path, and nothing is changed', async () => {
    const { root, backup } = await appliedThenUnmarked();
    restore(root, ['.claude/rules/a.md']);
    const classified = await classifyBackup(root, backup, io);
    expect(classified.state).toBe('mixed');
    expect(interruptedNotice(classified)).toContain('.claude/rules/a.md (pre-run)');
    await expect(resolveInterrupted(root, classified)).rejects.toMatchObject({ code: 'INTERRUPTED_APPLY' });
    expect(fs.readFileSync(at(root, '.claude/new/c.md'), 'utf-8')).toBe('c\n');
    expect(fs.existsSync(at(root, `${backup}/complete`))).toBe(false);
  });

  it('a path edited by the adopter after the crash makes the backup mixed', async () => {
    const { root, backup } = await appliedThenUnmarked();
    fs.writeFileSync(at(root, '.claude/rules/a.md'), 'adopter edit\n');
    const classified = await classifyBackup(root, backup, io);
    expect(classified.state).toBe('mixed');
    expect(classified.paths.find((p) => p.rel === '.claude/rules/a.md').state).toBe('other');
  });

  it('no-journal: nothing changed; --apply marks it abandoned', async () => {
    const { root } = await appliedThenUnmarked();
    const empty = '.ai-scaffold/backups/0000-empty';
    fs.mkdirSync(at(root, empty));
    const classified = await classifyBackup(root, empty, io);
    expect(classified.state).toBe('no-journal');
    expect(await resolveInterrupted(root, classified)).toBe('abandoned');
  });

  it('rollback-incomplete and malformed journals need the adopter', async () => {
    const { root, backup } = await appliedThenUnmarked();
    fs.writeFileSync(at(root, `${backup}/rollback.json`), '[]');
    const incomplete = await classifyBackup(root, backup, io);
    expect(incomplete.state).toBe('rollback-incomplete');
    await expect(resolveInterrupted(root, incomplete)).rejects.toMatchObject({ code: 'INTERRUPTED_APPLY' });
    fs.rmSync(at(root, `${backup}/rollback.json`));
    fs.writeFileSync(at(root, `${backup}/journal.json`), '{"entries":"nope"}');
    expect((await classifyBackup(root, backup, io)).state).toBe('malformed');
  });
});
