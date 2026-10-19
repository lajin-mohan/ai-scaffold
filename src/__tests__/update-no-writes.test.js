/**
 * Item 25 slice 3, BRD NFR-08: the preview makes no write attempts. Every
 * write-capable fs, fs.promises and fs-extra method is wrapped to record
 * calls, so a file created and then deleted is caught, not only a changed
 * end state.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { copyFiles } from '../cli/core/copy.js';
import { resolveWithDefaults } from '../cli/core/prompts.js';
import { templatePath } from '../cli/core/paths.js';
import { runPreview } from '../cli/core/update-preview.js';

const NOW = new Date(Date.UTC(2026, 9, 15, 12));
const WRITE_METHODS = [
  'writeFile', 'appendFile', 'mkdir', 'mkdtemp', 'rm', 'rmdir', 'unlink', 'rename', 'copyFile', 'cp',
  'symlink', 'link', 'truncate', 'chmod', 'chown', 'utimes', 'createWriteStream',
];
const FSE_METHODS = ['outputFile', 'outputJson', 'writeJson', 'ensureDir', 'ensureFile', 'mkdirs', 'mkdirp',
  'remove', 'emptyDir', 'move', 'copy', 'ensureLink', 'ensureSymlink'];
const WRITE_FLAG = /[wa+]/;

let tmpDir;

function wrap(target, name, label, calls, isWrite = () => true) {
  if (typeof target[name] !== 'function') return null;
  return vi.spyOn(target, name).mockImplementation(function recorded(...args) {
    if (isWrite(args)) {
      calls.push(`${label}.${name}(${String(args[0])})`);
      throw new Error(`write attempt: ${label}.${name}`);
    }
    return recorded.original.apply(this, args);
  });
}

function recordWrites() {
  const calls = [];
  const spies = [];
  const openIsWrite = (args) => typeof args[1] === 'string' && WRITE_FLAG.test(args[1]);
  for (const name of WRITE_METHODS) {
    for (const [target, label] of [[fs, 'fs'], [fs.promises, 'fs.promises'], [fse, 'fs-extra']]) {
      for (const variant of [name, `${name}Sync`]) {
        const original = target[variant];
        const spy = wrap(target, variant, label, calls);
        if (spy) {
          spy.getMockImplementation().original = original;
          spies.push(spy);
        }
      }
    }
  }
  for (const name of FSE_METHODS) {
    for (const variant of [name, `${name}Sync`]) {
      const original = fse[variant];
      const spy = wrap(fse, variant, 'fs-extra', calls);
      if (spy) {
        spy.getMockImplementation().original = original;
        spies.push(spy);
      }
    }
  }
  for (const [target, label, name] of [[fs, 'fs', 'open'], [fs, 'fs', 'openSync'], [fs.promises, 'fs.promises', 'open']]) {
    const original = target[name];
    const spy = wrap(target, name, label, calls, openIsWrite);
    spy.getMockImplementation().original = original;
    spies.push(spy);
  }
  return { calls, restore: () => spies.forEach((spy) => spy.mockRestore()) };
}

async function install(name) {
  const target = path.join(tmpDir, name);
  const bootstrap = resolveWithDefaults({ projectName: name, purpose: 'No writes', ownerEmail: 'n@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, { existingTarget: false });
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  return target;
}

const FIXTURES = {
  'planned with conflicts and edited settings': async (dir) => {
    fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nedit\n');
    fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), '{ "permissions": {} }');
    fs.rmSync(path.join(dir, 'CHANGELOG.md'));
    return {};
  },
  current: async () => ({ cliVersion: 'installed' }),
  'error (--force)': async () => ({ options: { force: true } }),
  'error (invalid manifest)': async (dir) => {
    fs.writeFileSync(path.join(dir, '.ai-scaffold.json'), '{');
    return {};
  },
  locked: async (dir) => {
    fse.outputFileSync(path.join(dir, '.ai-scaffold', 'update.lock'), '1');
    return {};
  },
  interrupted: async (dir) => {
    fse.outputFileSync(path.join(dir, '.ai-scaffold', 'backups', 'b1', 'journal.json'), '{ broken');
    return {};
  },
  'rejected link': async (dir) => {
    const outside = path.join(tmpDir, `outside-${Date.now()}`);
    fse.outputFileSync(path.join(outside, 'x.md'), 'x\n');
    fs.rmSync(path.join(dir, '.claude', 'rules'), { recursive: true });
    fs.symlinkSync(outside, path.join(dir, '.claude', 'rules'), process.platform === 'win32' ? 'junction' : 'dir');
    return {};
  },
};

describe('preview makes no write attempts (NFR-08)', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-nowrite-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fse.remove(tmpDir);
  });

  for (const [name, prepare] of Object.entries(FIXTURES)) {
    it(name, async () => {
      const dir = await install(name.replace(/[^a-z]+/gi, '-'));
      const setup = await prepare(dir);
      const installed = fse.readJsonSync(path.join(dir, '.ai-scaffold.json'), { throws: false })?.version;
      const cliVersion = setup.cliVersion === 'installed' ? installed : '99.0.0';
      const recorder = recordWrites();
      let doc;
      try {
        doc = await runPreview({ target: dir, options: setup.options ?? {}, cliVersion, today: NOW });
      } finally {
        recorder.restore();
      }
      expect(recorder.calls).toEqual([]);
      expect(doc.schema).toBe('ais-update-preview/1');
      expect(doc.error?.code).not.toBe('INTERNAL');
    });
  }

  it('the recorder itself catches a write (positive control)', () => {
    const recorder = recordWrites();
    try {
      expect(() => fs.writeFileSync(path.join(tmpDir, 'control.txt'), 'x')).toThrow('write attempt');
    } finally {
      recorder.restore();
    }
    expect(recorder.calls).toHaveLength(1);
    expect(fs.existsSync(path.join(tmpDir, 'control.txt'))).toBe(false);
  });
});
