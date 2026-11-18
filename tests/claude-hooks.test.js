// Probes for the three Claude Code tool hooks that had none (item 98, Wave C
// C1c): pre-bash-quality-gate.sh, pre-write-fact-check.sh and
// post-write-console-warn.sh. Each case feeds the shipped hook a payload on
// stdin and checks the exit code. On PreToolUse, 2 blocks the tool call; on
// PostToolUse (the console warning), 2 only reports back after the edit
// (code.claude.com/docs/en/hooks, "Exit code output").
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { templatePath } from '../src/cli/core/paths.js';
import { resolveOnPath } from '../src/cli/core/exec-path.js';

const BASH = resolveOnPath('bash');
const PROFILES = ['generic', 'golang', 'laravel', 'node', 'python'];
const HOOKS = ['pre-bash-quality-gate.sh', 'pre-write-fact-check.sh', 'post-write-console-warn.sh'];

let dir;

const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf-8' });
const write = (rel, content, mode) => {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mode) fs.chmodSync(file, mode);
  return file;
};
// The path bash itself uses for the fixture, so payload paths match what the
// hook computes on every platform (Git Bash reports /c/... on Windows).
const bashPath = (rel = '') => {
  const root = spawnSync(BASH, ['-c', 'pwd'], { cwd: dir, encoding: 'utf-8' }).stdout.trim();
  return rel ? `${root}/${rel}` : root;
};

function runHook(hook, payload, env = {}) {
  const result = spawnSync(BASH, [templatePath('node', `.claude/hooks/${hook}`)], {
    cwd: dir,
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
  return { status: result.status, stderr: result.stderr };
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-claude-hook-'));
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('Claude Code tool hooks: shipping', () => {
  it.each(HOOKS)('%s is byte-identical across all five profiles', (hook) => {
    const node = fs.readFileSync(templatePath('node', `.claude/hooks/${hook}`));
    for (const profile of PROFILES) {
      expect(fs.readFileSync(templatePath(profile, `.claude/hooks/${hook}`)).equals(node), profile).toBe(true);
    }
  });

  // No onFailure: git's own pre-commit is the guarantee (hld-97 D1).
  it('wires the quality gate with a short timeout and no onFailure', () => {
    const settings = JSON.parse(fs.readFileSync(templatePath('node', '.claude/settings.json'), 'utf-8'));
    const entries = settings.hooks.PreToolUse.flatMap((group) => group.hooks);
    const gate = entries.find((hook) => hook.command.includes('pre-bash-quality-gate.sh'));
    expect(gate.timeout).toBeLessThanOrEqual(10);
    expect(gate.onFailure).toBeUndefined();
  });
});

// Each case spawns bash and git; a loaded Windows runner exceeds 5 s.
describe('pre-bash-quality-gate.sh', { timeout: 30_000 }, () => {
  const commit = { tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: x"' } };
  const HOOK = 'pre-bash-quality-gate.sh';
  const MARKER = 'pre-commit-ran';

  // A project hook that records when it runs: the gate must never run it.
  const adoptScaffold = () => {
    git('init', '-q');
    write('.claude/hooks/pre-commit', `#!/bin/bash\ntouch "${MARKER}"\nexit 1\n`, 0o755);
  };
  const installHooks = (hooksDir = '.git/hooks') => {
    write(`${hooksDir}/pre-commit`, '#!/bin/bash\nexit 0\n', 0o755);
    write(`${hooksDir}/commit-msg`, '#!/bin/bash\nexit 0\n', 0o755);
  };

  it('blocks git commit when the git hooks are not installed, and names them', () => {
    adoptScaffold();
    const { status, stderr } = runHook(HOOK, commit);
    expect(status).toBe(2);
    expect(stderr).toContain('pre-commit, commit-msg');
    expect(stderr).toContain('ais update --apply');
  });

  it('blocks when only one of the two hooks is installed', () => {
    adoptScaffold();
    write('.git/hooks/pre-commit', '#!/bin/bash\nexit 0\n', 0o755);
    const { status, stderr } = runHook(HOOK, commit);
    expect(status).toBe(2);
    expect(stderr).toContain('commit-msg');
    expect(stderr).not.toContain('pre-commit,');
  });

  it('allows git commit once both hooks are installed, without running the checks', () => {
    adoptScaffold();
    installHooks();
    expect(runHook(HOOK, commit).status).toBe(0);
    expect(fs.existsSync(path.join(dir, MARKER))).toBe(false);
  });

  it('honours a relative core.hooksPath', () => {
    adoptScaffold();
    git('config', 'core.hooksPath', '.husky');
    installHooks('.git/hooks');
    expect(runHook(HOOK, commit).status).toBe(2);
    installHooks('.husky');
    expect(runHook(HOOK, commit).status).toBe(0);
  });

  // Regression: the raw setting ~/hooks was read as <repo>/~/hooks.
  it('honours a core.hooksPath under the home directory', () => {
    adoptScaffold();
    const home = path.join(dir, 'home');
    fs.mkdirSync(home);
    git('config', 'core.hooksPath', '~/hooks');
    const env = { HOME: home, USERPROFILE: home };
    expect(runHook(HOOK, commit, env).status).toBe(2);
    installHooks('home/hooks');
    expect(runHook(HOOK, commit, env).status).toBe(0);
  });

  it('ignores commands other than git commit, including git push', () => {
    adoptScaffold();
    for (const command of ['git push origin feature/x', 'npm test', 'git status']) {
      expect(runHook(HOOK, { tool_name: 'Bash', tool_input: { command } }).status, command).toBe(0);
    }
  });

  it('allows outside a git repository and before the project ships a pre-commit hook', () => {
    expect(runHook(HOOK, commit).status).toBe(0);
    git('init', '-q');
    expect(runHook(HOOK, commit).status).toBe(0);
  });

  it('exits 0 for --no-verify, warn mode, the disable switch and an empty payload', () => {
    adoptScaffold();
    const noVerify = { tool_name: 'Bash', tool_input: { command: 'git commit --no-verify -m x' } };
    expect(runHook(HOOK, noVerify).status).toBe(0);
    const warn = runHook(HOOK, commit, { ECC_PRE_COMMIT_GATE_BLOCK: '0' });
    expect(warn.status).toBe(0);
    expect(warn.stderr).toContain('WARN');
    expect(runHook(HOOK, commit, { ECC_PRE_COMMIT_GATE_DISABLED: '1' }).status).toBe(0);
    expect(runHook(HOOK, '').status).toBe(0);
  });
});

// The fact check reads the payload and transcript with jq or python3; with
// neither it fails open by design, so these probes need one of them. Native
// Windows is excluded: Claude Code reports D:\ paths there while the hook
// compares /d/ paths, so a Read never matches (known gap, item 98).
const parserWorks = (cmd) => spawnSync(BASH, ['-c', cmd], { encoding: 'utf-8' }).status === 0;
const HAS_PARSER = parserWorks('echo "{}" | jq -e . >/dev/null')
  || parserWorks('python3 -c "import json"');
const FACT_CHECK_PROBES = HAS_PARSER && process.platform !== 'win32';

describe.skipIf(!FACT_CHECK_PROBES)('pre-write-fact-check.sh', { timeout: 30_000 }, () => {
  const HOOK = 'pre-write-fact-check.sh';
  const TARGET = 'src/a/foo.ts';

  const transcriptLine = (content) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content } });
  const setup = ({ cite = true, readPath = null } = {}) => {
    write(TARGET, 'export const a = 1;\n');
    write('src/b/foo.ts', 'export const b = 2;\n');
    const lines = [];
    if (cite) lines.push(transcriptLine([{ type: 'text', text: `The bug is at ${TARGET}:1.` }]));
    if (readPath) lines.push(transcriptLine([{ type: 'tool_use', name: 'Read', id: 't1', input: { file_path: readPath } }]));
    const transcript = write('transcript.jsonl', `${lines.join('\n')}\n`);
    return { tool_name: 'Edit', tool_input: { file_path: bashPath(TARGET) }, transcript_path: transcript };
  };

  it('warns, without blocking, when a cited file was never read', () => {
    const { status, stderr } = runHook(HOOK, setup());
    expect(status).toBe(0);
    expect(stderr).toContain('WARN');
  });

  it('blocks with exit 2 in strict mode', () => {
    const { status, stderr } = runHook(HOOK, setup(), { ECC_FACT_CHECK_STRICT: '1' });
    expect(status).toBe(2);
    expect(stderr).toContain('BLOCK');
  });

  it('is silent once the file was read', () => {
    const { status, stderr } = runHook(HOOK, setup({ readPath: bashPath(TARGET) }), { ECC_FACT_CHECK_STRICT: '1' });
    expect(status).toBe(0);
    expect(stderr).toBe('');
  });

  it('does not count a read of a different file with the same name', () => {
    const { status } = runHook(HOOK, setup({ readPath: bashPath('src/b/foo.ts') }), { ECC_FACT_CHECK_STRICT: '1' });
    expect(status).toBe(2);
  });

  it('is silent for a file that was never cited', () => {
    const { status, stderr } = runHook(HOOK, setup({ cite: false }), { ECC_FACT_CHECK_STRICT: '1' });
    expect(status).toBe(0);
    expect(stderr).toBe('');
  });

  it('fails open without a transcript, for a new file, and when disabled', () => {
    const payload = setup();
    expect(runHook(HOOK, { ...payload, transcript_path: path.join(dir, 'missing.jsonl') }, { ECC_FACT_CHECK_STRICT: '1' }).status).toBe(0);
    expect(runHook(HOOK, { ...payload, tool_input: { file_path: bashPath('src/new.ts') } }, { ECC_FACT_CHECK_STRICT: '1' }).status).toBe(0);
    expect(runHook(HOOK, payload, { ECC_FACT_CHECK_STRICT: '1', ECC_FACT_CHECK_DISABLED: '1' }).status).toBe(0);
  });
});

// PostToolUse: exit 2 reports the finding to Claude after the edit; it cannot
// prevent or undo the edit (code.claude.com/docs/en/hooks#posttooluse).
describe('post-write-console-warn.sh', { timeout: 30_000 }, () => {
  const HOOK = 'post-write-console-warn.sh';
  const edited = (rel) => ({ tool_name: 'Edit', tool_input: { file_path: rel } });

  const repoWith = (rel, committed) => {
    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Test');
    write(rel, committed);
    git('add', rel);
    git('commit', '-q', '--no-verify', '-m', 'base');
  };

  it('warns on a newly added console.log, and reports it with exit 2 in strict mode', () => {
    repoWith('app.js', 'export const a = 1;\n');
    write('app.js', 'export const a = 1;\nconsole.log(a);\n');
    const warn = runHook(HOOK, edited('app.js'));
    expect(warn.status).toBe(0);
    expect(warn.stderr).toContain('WARN');
    const strict = runHook(HOOK, edited('app.js'), { ECC_CONSOLE_WARN_STRICT: '1' });
    expect(strict.status).toBe(2);
    expect(strict.stderr).toContain('console.log');
  });

  it('ignores a console.log that was already committed', () => {
    repoWith('app.js', 'console.log(1);\n');
    write('app.js', 'console.log(1);\nexport const b = 2;\n');
    expect(runHook(HOOK, edited('app.js'), { ECC_CONSOLE_WARN_STRICT: '1' }).status).toBe(0);
  });

  it('scans a new untracked file in full', () => {
    repoWith('README.md', '# x\n');
    write('script.py', 'print("debug")\n');
    expect(runHook(HOOK, edited('script.py'), { ECC_CONSOLE_WARN_STRICT: '1' }).status).toBe(2);
  });

  it('flags var_dump once, not also as dump', () => {
    repoWith('index.php', '<?php\n');
    write('index.php', '<?php\nvar_dump($x);\n');
    const { stderr } = runHook(HOOK, edited('index.php'), { ECC_CONSOLE_WARN_STRICT: '1' });
    expect(stderr.match(/var_dump/g)).toHaveLength(1);
  });

  it('skips other file types, missing files and the disable switch', () => {
    repoWith('notes.md', 'x\n');
    write('notes.md', 'x\nconsole.log(1)\n');
    expect(runHook(HOOK, edited('notes.md'), { ECC_CONSOLE_WARN_STRICT: '1' }).status).toBe(0);
    expect(runHook(HOOK, edited('gone.js'), { ECC_CONSOLE_WARN_STRICT: '1' }).status).toBe(0);
    write('app.js', 'console.log(1);\n');
    expect(runHook(HOOK, edited('app.js'), { ECC_CONSOLE_WARN_STRICT: '1', ECC_CONSOLE_WARN_DISABLED: '1' }).status).toBe(0);
  });
});
