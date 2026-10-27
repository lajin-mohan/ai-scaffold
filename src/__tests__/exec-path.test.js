/**
 * Item 94: external tools are resolved through PATH only.
 *
 * On Windows, Node's spawnSync('gh') searches the working directory before
 * PATH, so a gh.exe or git.exe planted in a cloned project would run. The
 * regression tests plant copies of node.exe and detect execution with a
 * sentinel. NODE_OPTIONS makes every node load a marker script, and the
 * marker writes the sentinel only when the running binary is a planted copy.
 * A positive control proves the plant fires when spawned naively, so the
 * tests cannot pass vacuously on a Node that stops searching the cwd.
 */
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { REASONS, runGhApi, runGhRepoView } from '../cli/core/gh-runner.js';
import { checkCommitMsgHook } from '../cli/core/governance-checks.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const isWindows = process.platform === 'win32';

let tmp;
beforeEach(async () => { tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-path-')); });
afterEach(async () => { await fs.remove(tmp); });

describe('resolveOnPath', () => {
  it('rejects a name containing a path separator', () => {
    expect(resolveOnPath('../gh')).toBeNull();
    expect(resolveOnPath('dir\\gh')).toBeNull();
  });

  it('never resolves from ".", empty or relative PATH entries', async () => {
    const name = isWindows ? 'tool.exe' : 'tool';
    await fs.writeFile(path.join(tmp, name), '', { mode: 0o755 });
    const prev = process.cwd();
    process.chdir(tmp);
    try {
      const env = { PATH: ['.', '', 'relative/dir'].join(path.delimiter) };
      expect(resolveOnPath('tool', { env })).toBeNull();
    } finally {
      process.chdir(prev);
    }
  });

  it('returns null when the program is not on PATH', () => {
    expect(resolveOnPath('definitely-not-a-real-tool', { env: { PATH: tmp } })).toBeNull();
  });

  it('does not accept a directory that has the program name', async () => {
    await fs.ensureDir(path.join(tmp, isWindows ? 'tool.exe' : 'tool'));
    expect(resolveOnPath('tool', { env: { PATH: tmp } })).toBeNull();
  });

  it.skipIf(isWindows)('requires the executable bit on POSIX', async () => {
    await fs.writeFile(path.join(tmp, 'tool'), '#!/bin/sh\n', { mode: 0o644 });
    expect(resolveOnPath('tool', { env: { PATH: tmp } })).toBeNull();
    await fs.chmod(path.join(tmp, 'tool'), 0o755);
    expect(resolveOnPath('tool', { env: { PATH: tmp } })).toBe(path.join(tmp, 'tool'));
  });

  it.skipIf(!isWindows)('finds .exe, reads a `Path` key and strips quotes on Windows', async () => {
    await fs.writeFile(path.join(tmp, 'tool.exe'), '');
    expect(resolveOnPath('tool', { env: { Path: `"${tmp}"` } })).toBe(path.join(tmp, 'tool.exe'));
  });
});

// ------------------------------------------------- planted binaries (Windows)

// The first launch of each freshly copied node.exe (~90 MB, unsigned) waits on
// the antivirus scan of a new executable: 3–7s idle, more under suite load,
// against ~0.25s for a second launch. A hard link would skip the scan, but
// Windows refuses one into Program Files. So vitest's 5s default is too tight.
describe.skipIf(!isWindows)('a planted gh.exe / git.exe never runs (item 94)', { timeout: 30_000 }, () => {
  let plant;
  let sentinel;
  let savedEnv;

  beforeEach(async () => {
    plant = path.join(tmp, 'project');
    await fs.ensureDir(path.join(plant, '.git', 'hooks'));
    await fs.copy(process.execPath, path.join(plant, 'gh.exe'));
    await fs.copy(process.execPath, path.join(plant, 'git.exe'));
    sentinel = path.join(tmp, 'planted-binary-ran');
    const marker = path.join(tmp, 'marker.cjs');
    await fs.writeFile(marker,
      "const path = require('path'); const fs = require('fs');\n"
      // The plants are gh.exe / git.exe; the real runtime is node.exe. (Comparing
      // directories fails: os.tmpdir() can be an 8.3 short name on Windows.)
      + "if (/^(gh|git)\\.exe$/i.test(path.basename(process.execPath))) {\n"
      + "  fs.writeFileSync(process.env.SENTINEL, 'ran');\n"
      + '}\n');
    savedEnv = { ...process.env };
    // Forward slashes: inside quotes NODE_OPTIONS treats backslashes as escapes.
    process.env.NODE_OPTIONS = `--require "${marker.replace(/\\/g, '/')}"`;
    process.env.SENTINEL = sentinel;
  });

  afterEach(() => {
    for (const key of ['NODE_OPTIONS', 'SENTINEL']) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  // `gh api …` like the real calls: a node binary started with `--version`
  // exits before loading --require preloads, so it would never write the sentinel.
  it('positive control: a naive spawnSync does run the plant', () => {
    spawnSync('gh', ['api'], { cwd: plant, env: process.env });
    expect(fs.existsSync(sentinel), 'plant did not run; the regression tests below would be vacuous').toBe(true);
  });

  // PATH holds no gh here: the old code would then certainly have run the
  // plant, and the real gh (which calls the network) is never reached.
  const withoutGhOnPath = (fn) => {
    const prevPath = process.env.PATH;
    process.env.PATH = path.join(tmp, 'empty-bin');
    try {
      return fn();
    } finally {
      process.env.PATH = prevPath;
    }
  };

  it('runGhApi does not run it', () => {
    const result = withoutGhOnPath(() => runGhApi('repos/o/r', { cwd: plant }));
    expect(result).toMatchObject({ ok: false, reason: REASONS.GH_MISSING });
    expect(fs.existsSync(sentinel)).toBe(false);
  });

  it('runGhRepoView does not run it', () => {
    const result = withoutGhOnPath(() => runGhRepoView({ cwd: plant }));
    expect(result).toMatchObject({ ok: false, reason: REASONS.GH_MISSING });
    expect(fs.existsSync(sentinel)).toBe(false);
  });

  it('the doctor commit-msg check (git rev-parse) does not run it', async () => {
    await checkCommitMsgHook(plant);
    expect(fs.existsSync(sentinel)).toBe(false);
  });

  it('still runs the real gh from an absolute PATH entry', async () => {
    const bin = path.join(tmp, 'bin');
    await fs.copy(process.execPath, path.join(bin, 'gh.exe'));
    // node.exe run as `gh api …` executes the script named `api` in its cwd.
    const cwd = path.join(tmp, 'work');
    await fs.outputFile(path.join(cwd, 'api'), "process.stdout.write(JSON.stringify({ ok: 1 }));\n");
    const prevPath = process.env.PATH;
    process.env.PATH = bin;
    try {
      expect(runGhApi('repos/o/r', { cwd })).toEqual({ ok: true, json: { ok: 1 } });
    } finally {
      process.env.PATH = prevPath;
    }
  });
});

// `create`'s probe is `git --version`, which a planted node exits on before any
// preload runs, so the sentinel cannot observe it. This guard covers create and
// every future call site: no shipped code may spawn a bare program name.
describe('no shipped code spawns a bare program name', () => {
  it('every spawn in src/cli and bin uses a resolved path', async () => {
    const files = [];
    const walk = async (dir) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') await walk(full);
        } else if (entry.name.endsWith('.js')) {
          files.push(full);
        }
      }
    };
    await walk(path.join(REPO_ROOT, 'src', 'cli'));
    await walk(path.join(REPO_ROOT, 'bin'));

    const offenders = [];
    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const bare = source.match(/\b(?:spawnSync|spawn|execFileSync|execFile|execSync|exec)\(\s*['"`][^'"`]+['"`]/g);
      if (bare) offenders.push(`${path.relative(REPO_ROOT, file)}: ${bare.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('not found keeps the GH_MISSING contract', () => {
  it('returns the same shape as before when gh is not on PATH', () => {
    const prevPath = process.env.PATH;
    process.env.PATH = tmp;
    try {
      expect(runGhApi('repos/o/r', { cwd: tmp })).toMatchObject({ ok: false, reason: REASONS.GH_MISSING });
      expect(runGhRepoView({ cwd: tmp })).toMatchObject({ ok: false, reason: REASONS.GH_MISSING });
    } finally {
      process.env.PATH = prevPath;
    }
  });
});
