/**
 * Item 66 slice d: `ais update --apply` activates the git hooks it delivers,
 * and doctor reports a hook committed without the executable bit.
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
import { templatePath } from '../cli/core/paths.js';
import { resolveOnPath } from '../cli/core/exec-path.js';
import { hashRaw } from '../cli/core/hashing.js';
import { runApply } from '../cli/core/update-apply-run.js';
import { activateGitHooks, committedNonExecutable, isExecutableHook, readHookSources } from '../cli/core/git-hooks.js';
import { checkCommitMsgHook } from '../cli/core/governance-checks.js';

const GIT = resolveOnPath('git');
const NOW = new Date(Date.UTC(2026, 9, 29, 12));
const POSIX = process.platform !== 'win32';
let tmpDir;
let counter = 0;

function git(cwd, ...args) {
  const result = spawnSync(GIT, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

const at = (target, rel) => path.join(target, ...rel.split('/'));
const read = (target, rel) => fs.readFileSync(at(target, rel), 'utf-8');
const manifestOf = (target) => JSON.parse(read(target, '.ai-scaffold.json'));
const editManifest = (target, change) => fs.writeFileSync(at(target, '.ai-scaffold.json'), `${JSON.stringify(change(manifestOf(target)), null, 2)}\n`);

function commit(target) {
  git(target, 'add', '-A');
  git(target, 'commit', '-q', '--no-verify', '-m', 'state');
}

/** A git-backed install with no hooks in .git/hooks, one version behind. */
async function install() {
  const target = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, `h${counter++}-`)));
  const bootstrap = resolveWithDefaults({ projectName: 'hooks', purpose: 'Hooks', ownerEmail: 'a@example.com', profile: 'node' });
  const plan = await buildFilePlan(templatePath('node'), target, {});
  await copyFiles(plan, bootstrap, { targetDir: target, yes: true, now: NOW, installMode: 'create' });
  git(target, 'init', '-q');
  git(target, 'config', 'user.email', 't@example.com');
  git(target, 'config', 'user.name', 'Test');
  git(target, 'config', 'core.autocrlf', 'false');
  makeOlderPristine(target, 'CLAUDE.md', 'older scaffold claude\n');
  commit(target);
  return target;
}

function makeOlderPristine(target, rel, content) {
  fs.writeFileSync(at(target, rel), content);
  editManifest(target, (m) => ({ ...m, managedFiles: m.managedFiles.map((r) => (r.path === rel ? { ...r, hash: hashRaw(content) } : r)) }));
}

/** Simulate a release that did not ship .claude/hooks/commit-msg yet. */
function dropCommitMsg(target) {
  fs.rmSync(at(target, '.claude/hooks/commit-msg'));
  editManifest(target, (m) => ({ ...m, managedFiles: m.managedFiles.filter((r) => r.path !== '.claude/hooks/commit-msg') }));
}

const apply = (target) => runApply({ target, options: { apply: true }, cliVersion: '99.0.0', today: NOW, now: NOW });
const isExecutable = (file) => (fs.statSync(file).mode & 0o111) !== 0;

beforeAll(async () => {
  tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), 'ais-git-hooks-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await fse.remove(tmpDir);
});

describe('isExecutableHook', () => {
  it('marks extensionless and shell hooks executable, never the Python helpers or other paths', () => {
    expect(isExecutableHook('.claude/hooks/commit-msg')).toBe(true);
    expect(isExecutableHook('.claude/hooks/pre-secret-guard.sh')).toBe(true);
    expect(isExecutableHook('.claude/hooks/jira-sync.py')).toBe(false);
    expect(isExecutableHook('.claude/hooks/sub/x.sh')).toBe(false);
    expect(isExecutableHook('scripts/install-hooks.sh')).toBe(false);
  });
});

describe.runIf(GIT)('ais update --apply activates delivered git hooks', { timeout: 120_000 }, () => {
  it('installs a newly delivered commit-msg hook, which then rejects an AI attribution trailer', async () => {
    const target = await install();
    dropCommitMsg(target);
    commit(target);

    const doc = await apply(target);

    expect(doc.status).toBe('applied');
    expect(doc.notices).toContain('Installed the commit-msg git hook.');
    expect(read(target, '.git/hooks/commit-msg')).toBe(read(target, '.claude/hooks/commit-msg'));
    if (POSIX) {
      expect(isExecutable(at(target, '.claude/hooks/commit-msg'))).toBe(true);
      expect(isExecutable(at(target, '.git/hooks/commit-msg'))).toBe(true);
    }
    fs.writeFileSync(at(target, 'note.txt'), 'x\n');
    git(target, 'add', 'note.txt');
    const rejected = spawnSync(GIT, ['commit', '-q', '-m', 'feat: x\n\nCo-Authored-By: Bot <bot@example.com>'], { cwd: target, encoding: 'utf-8' });
    expect(rejected.status).not.toBe(0);
  });

  it('refreshes a copy of the previous scaffold hook to the new version', async () => {
    const target = await install();
    const current = read(target, '.claude/hooks/pre-commit');
    makeOlderPristine(target, '.claude/hooks/pre-commit', '#!/bin/sh\necho older\n');
    fse.outputFileSync(at(target, '.git/hooks/pre-commit'), '#!/bin/sh\necho older\n');
    commit(target);

    const doc = await apply(target);

    expect(doc.notices).toContain('Updated the pre-commit git hook to the new version.');
    expect(read(target, '.git/hooks/pre-commit')).toBe(current);
  });

  it("leaves the project's own hook in place and says so", async () => {
    const target = await install();
    fse.outputFileSync(at(target, '.git/hooks/pre-commit'), '#!/bin/sh\necho ours\n');

    const doc = await apply(target);

    expect(read(target, '.git/hooks/pre-commit')).toBe('#!/bin/sh\necho ours\n');
    expect(doc.notices.some((n) => n.startsWith('Left pre-commit in the git hooks directory unchanged'))).toBe(true);
  });

  it('writes nothing when core.hooksPath already points at .claude/hooks', async () => {
    const target = await install();
    git(target, 'config', 'core.hooksPath', '.claude/hooks');

    const doc = await apply(target);

    expect(fs.existsSync(at(target, '.git/hooks/commit-msg'))).toBe(false);
    expect(doc.notices.some((n) => n.includes('git hook') || n.includes('core.hooksPath'))).toBe(false);
  });

  it('warns and writes nothing when core.hooksPath points elsewhere', async () => {
    const target = await install();
    git(target, 'config', 'core.hooksPath', '.husky');

    const doc = await apply(target);

    expect(fs.existsSync(at(target, '.husky/commit-msg'))).toBe(false);
    expect(fs.existsSync(at(target, '.git/hooks/commit-msg'))).toBe(false);
    expect(doc.notices.some((n) => n.startsWith('core.hooksPath is set to .husky'))).toBe(true);
  });

  it('reports a hook committed without the executable bit, in the apply report and in doctor C-05', async () => {
    const target = await install();
    git(target, 'update-index', '--chmod=-x', '.claude/hooks/commit-msg');
    git(target, 'commit', '-q', '--no-verify', '--allow-empty', '-m', 'lose the bit');

    const doc = await apply(target);
    expect(doc.notices).toContain(
      '.claude/hooks/commit-msg is committed without the executable bit, so Linux and macOS clones skip it. Run `git update-index --chmod=+x .claude/hooks/commit-msg` and commit.',
    );

    const result = await checkCommitMsgHook(target);
    expect(result).toMatchObject({ state: 'fail', remedy: 'Run git update-index --chmod=+x .claude/hooks/commit-msg and commit' });

    git(target, 'update-index', '--chmod=+x', '.claude/hooks/commit-msg');
    expect((await checkCommitMsgHook(target)).state).toBe('pass');
  });
});

describe.runIf(GIT)('hook activation cannot be turned against the machine (#168 review)', { timeout: 120_000 }, () => {
  const posixPath = (p) => p.split(path.sep).join('/');

  it('a core.fsmonitor command in the project repository never runs, in activation or in doctor', async () => {
    const target = await install();
    const marker = at(target, 'fsmonitor-ran');
    const monitor = at(target, 'fsmonitor.sh');
    fs.writeFileSync(monitor, `#!/bin/sh\ntouch "${posixPath(marker)}"\n`, { mode: 0o755 });
    git(target, 'config', 'core.fsmonitor', posixPath(monitor));
    git(target, 'status', '--short');
    // Plain git runs the configured command (the positive control).
    expect(fs.existsSync(marker)).toBe(true);
    fs.rmSync(marker);

    activateGitHooks(target, readHookSources(target));
    committedNonExecutable(target, 'commit-msg');
    await checkCommitMsgHook(target);

    expect(fs.existsSync(marker)).toBe(false);
  });

  it('refuses a hooks directory that links outside the repository', async () => {
    const target = await install();
    const outside = fs.mkdtempSync(path.join(tmpDir, 'outside-'));
    fs.writeFileSync(path.join(outside, 'pre-commit'), 'theirs\n');
    fs.rmSync(at(target, '.git/hooks'), { recursive: true, force: true });
    fs.symlinkSync(outside, at(target, '.git/hooks'), 'junction');

    const notices = activateGitHooks(target, readHookSources(target));

    expect(fs.readFileSync(path.join(outside, 'pre-commit'), 'utf-8')).toBe('theirs\n');
    expect(fs.existsSync(path.join(outside, 'commit-msg'))).toBe(false);
    expect(notices.some((n) => n.startsWith('Did not install git hooks:'))).toBe(true);
  });

  it('installs into the shared hooks directory from a linked worktree', async () => {
    const target = await install();
    const worktree = path.join(fs.mkdtempSync(path.join(tmpDir, 'wt-')), 'linked');
    git(target, 'worktree', 'add', '-q', worktree);

    const notices = activateGitHooks(worktree, readHookSources(worktree));

    expect(notices).toContain('Installed the commit-msg git hook.');
    expect(fs.readFileSync(at(target, '.git/hooks/commit-msg'), 'utf-8')).toBe(read(worktree, '.claude/hooks/commit-msg'));
  });
});

describe.runIf(GIT)('hook activation reaches the hooks it should (#168 review 2)', { timeout: 120_000 }, () => {
  it('refreshes a copy older than the version just replaced, keeping it as a backup', async () => {
    const target = await install();
    const source = read(target, '.claude/hooks/pre-commit');
    const header = source.split('\n', 2).join('\n');
    const older = `${header}\necho 0.14-era gate\n`;
    fse.outputFileSync(at(target, '.git/hooks/pre-commit'), older);

    const notices = activateGitHooks(target, readHookSources(target));

    expect(read(target, '.git/hooks/pre-commit')).toBe(source);
    expect(read(target, '.git/hooks/pre-commit.ais-backup')).toBe(older);
    expect(notices.some((n) => n.startsWith('Updated the pre-commit git hook from an older scaffold copy'))).toBe(true);
  });

  it('activates hooks for a project in a subdirectory of its repository', async () => {
    const project = await install();
    const parent = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, 'mono-')));
    const app = path.join(parent, 'apps', 'web');
    fse.moveSync(project, app);
    fs.rmSync(path.join(app, '.git'), { recursive: true, force: true });
    git(parent, 'init', '-q');

    const notices = activateGitHooks(app, readHookSources(app));

    expect(notices).toContain('Installed the commit-msg git hook.');
    expect(read(parent, '.git/hooks/commit-msg')).toBe(read(app, '.claude/hooks/commit-msg'));
  });

  it('ignores a GIT_DIR inherited from the caller', async () => {
    const target = await install();
    const other = fs.realpathSync(fse.mkdtempSync(path.join(tmpDir, 'other-')));
    git(other, 'init', '-q');
    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = path.join(other, '.git');
    try {
      activateGitHooks(target, readHookSources(target));
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = saved;
    }

    expect(fs.existsSync(path.join(other, '.git', 'hooks', 'commit-msg'))).toBe(false);
    expect(fs.existsSync(at(target, '.git/hooks/commit-msg'))).toBe(true);
  });
});
