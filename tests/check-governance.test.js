import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkBudget, checkCommandGuide, checkObsoleteNames, checkReferences, checkRuleManifest, checkUserDocs,
} from '../scripts/governance/checks.js';

let dir;
const write = (rel, text) => {
  const full = path.join(dir, ...rel.split('/'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-govcheck-'));
  write('CLAUDE.md', '# CLAUDE.md\n\n@AGENTS.md\n');
  write('AGENTS.md', '# AGENTS.md\n\nPlan with `/ais-plan`.\n');
  write('.claude/commands/ais-plan.md', '# /ais-plan\n');
  write('.claude/hooks/pre-commit', '#!/bin/sh\n');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('checkReferences', () => {
  it('passes when every named command and hook exists', () => {
    write('.claude/rules/x.md', 'Run `/ais-plan`. The gate is `.claude/hooks/pre-commit`.\n');
    expect(checkReferences(dir).errors).toEqual([]);
  });

  it('fails on a command with no file and a hook that does not exist', () => {
    write('.claude/rules/x.md', 'Run `/ais-ship`. See `.claude/hooks/pre-push`.\n');
    expect(checkReferences(dir).errors).toEqual([
      '.claude/rules/x.md: /ais-ship has no .claude/commands/ais-ship.md',
      '.claude/rules/x.md: .claude/hooks/pre-push does not exist',
    ]);
  });

  it('does not treat permission patterns in settings as instructions', () => {
    write('.claude/settings.json', '{"allow":["Bash(rm .claude/hooks/old.sh)"]}\n');
    expect(checkReferences(dir).errors).toEqual([]);
  });
});

describe('checkObsoleteNames', () => {
  it('fails on a retired command and a pinned model name', () => {
    write('.claude/agents/a.md', 'Use `/start-task`, then `/settings --list`. Prefer Claude Opus 4+.\n');
    expect(checkObsoleteNames(dir).errors).toEqual([
      '.claude/agents/a.md: retired command /start-task',
      '.claude/agents/a.md: retired command /settings',
      '.claude/agents/a.md: pinned model name "Opus 4+" (goes stale; describe the capability instead)',
    ]);
  });

  it('ignores history files, paths and the new names', () => {
    write('CHANGELOG.md', 'Renamed /start-task to /ais-plan.\n');
    write('tasks/lessons.md', 'We used /reflect then.\n');
    write('.claude/rules/x.md', 'Edit `.claude/settings-overrides.json`; see docs/qa/ and `/ais-review`.\n');
    expect(checkObsoleteNames(dir).errors).toEqual([]);
  });
});

describe('checkCommandGuide', () => {
  it('passes when every installed command is in the guide', () => {
    write('.ai-scaffold/commands.md', '# Commands\n\n### `/ais-plan`\n');
    expect(checkCommandGuide(dir).errors).toEqual([]);
  });

  it('fails when the guide is missing', () => {
    expect(checkCommandGuide(dir).errors).toEqual(['.ai-scaffold/commands.md is not installed']);
  });

  it('fails when an installed command is not documented', () => {
    write('.claude/commands/ais-ship.md', '# /ais-ship\n');
    write('.ai-scaffold/commands.md', '# Commands\n\n### `/ais-plan`\n');
    expect(checkCommandGuide(dir).errors).toEqual(['.ai-scaffold/commands.md: /ais-ship is installed but not documented']);
  });
});

describe('checkUserDocs', () => {
  it('fails on an old-name table in a user doc and on a missing doc', () => {
    write('README.md', '| Old | Now |\n|---|---|\n| `/start-task` | `/ais-plan` |\n');
    expect(checkUserDocs(dir, ['README.md', 'docs/commands.md']).errors).toEqual([
      'README.md: retired command /start-task',
      'docs/commands.md: user doc is missing',
    ]);
  });

  it('passes on current names and leaves the CHANGELOG alone', () => {
    write('README.md', 'Run `/ais-plan`; see the CHANGELOG for renamed commands.\n');
    write('CHANGELOG.md', 'Renamed /start-task to /ais-plan.\n');
    expect(checkUserDocs(dir, ['README.md']).errors).toEqual([]);
  });
});

describe('checkRuleManifest', () => {
  const entry = (extra = {}) => ({ prevents: 'p', appliesWhen: 'a', enforcedBy: [], ...extra });

  it('passes when every rule is listed and each hook claim has a probe', () => {
    write('.claude/rules/security-rules.md', '# s\n');
    const manifest = { rules: { 'security-rules.md': entry({ enforcedBy: [{ hook: 'pre-commit', probe: 'package.json' }] }) } };
    expect(checkRuleManifest(dir, manifest, process.cwd())).toEqual({ errors: [], warnings: [] });
  });

  it('fails on an unlisted rule, a stale entry, a missing hook and a missing probe', () => {
    write('.claude/rules/new-rules.md', '# n\n');
    const manifest = { rules: {
      'gone.md': entry(),
      'new-rules.md': entry({ enforcedBy: [{ hook: 'pre-push', probe: 'no/such.test.js' }, { hook: 'pre-commit' }] }),
    } };
    expect(checkRuleManifest(dir, manifest, process.cwd()).errors).toEqual([
      'rule-manifest: gone.md is not shipped',
      'rule-manifest: new-rules.md claims missing hook pre-push',
      'rule-manifest: new-rules.md probe no/such.test.js does not exist',
      'rule-manifest: new-rules.md claims pre-commit with neither a probe nor a stated gap',
    ]);
  });

  it('reports a stated gap as a warning, not an error', () => {
    write('.claude/rules/r.md', '# r\n');
    const result = checkRuleManifest(dir, { rules: { 'r.md': entry({ enforcedBy: [{ hook: 'pre-commit', gap: 'item 98' }] }) } }, process.cwd());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(['rule-manifest: r.md claims pre-commit without a probe: item 98']);
  });
});

describe('checkBudget', () => {
  it('passes for a small startup set', () => {
    expect(checkBudget(dir).errors).toEqual([]);
  });

  it('fails when the always-loaded files exceed the budget', () => {
    write('AGENTS.md', `# AGENTS.md\n\n${'word '.repeat(5000)}\n`);
    expect(checkBudget(dir).errors.some((line) => line.includes('est-tokens at startup'))).toBe(true);
  });
});
