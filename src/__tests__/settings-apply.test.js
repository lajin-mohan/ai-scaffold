/**
 * Item 25 slice 4, S5: the settings write (criterion 5.1) and the manifest
 * after apply (criterion 5.2).
 */
import { describe, expect, it } from 'vitest';
import { decideSettingsMerge, scaffoldSubset } from '../cli/core/settings-merge.js';
import { applySettingsChanges, serializeSettings } from '../cli/core/settings-apply.js';
import { buildManifestAfter } from '../cli/core/update-manifest-after.js';
import { hashRaw, recordFor } from '../cli/core/hashing.js';
import { extractHooks } from '../cli/core/settings-hooks.js';

const GUARD = 'bash .claude/hooks/guard.sh';
const hook = (command, matcher) => ({ ...(matcher === undefined ? {} : { matcher }), hooks: [{ type: 'command', command, timeout: 10 }] });

function settings({ allow = [], deny = [], ask = [], hooks = {}, ...rest } = {}) {
  return { ...rest, permissions: { allow, deny, ask }, hooks };
}

function merge({ local, scaffold, base, baseState = base ? 'recorded' : 'unknown', exceptions = new Set(), retired }) {
  const decided = decideSettingsMerge({ local, localValid: true, scaffold, baseState, recordedBase: base, exceptions, retired });
  return { ...decided, merged: applySettingsChanges(local, decided.changes) };
}

describe('applySettingsChanges equals the preview decisions (5.1)', () => {
  const scaffold = settings({ allow: ['A1', 'A2'], deny: ['D1', 'D2', 'D3'], ask: ['K1'] });

  it('writes added and restored rules, never suggestions or excepted rules, and keeps adopter rules', () => {
    const base = scaffoldSubset(settings({ allow: ['A1'], deny: ['D1', 'D3'], ask: ['K1'] }));
    const local = settings({ allow: ['mine'], deny: ['D1'], ask: [] });
    const { groups, merged } = merge({ local, scaffold, base, exceptions: new Set(['D3']) });
    expect(groups.added).toEqual(['allow: A2', 'deny: D2']);
    expect(groups.restored).toEqual(['ask: K1']);
    expect(groups.exceptions).toEqual(['deny: D3']);
    expect(merged.permissions).toEqual({ allow: ['mine', 'A2'], deny: ['D1', 'D2'], ask: ['K1'] });
  });

  it('with an unknown base adds only deny/ask; allow stays a suggestion (FR-35)', () => {
    const local = settings({ allow: [], deny: [], ask: [] });
    const { groups, merged } = merge({ local, scaffold });
    expect(groups.suggestions).toEqual(['allow: A1', 'allow: A2']);
    expect(merged.permissions).toEqual({ allow: [], deny: ['D1', 'D2', 'D3'], ask: ['K1'] });
  });

  it('every write group is present after apply and every non-write group absent', () => {
    const base = scaffoldSubset(settings({ deny: ['D1'] }));
    const local = settings({ allow: [], deny: [], ask: [] });
    const { groups, merged } = merge({ local, scaffold, base, exceptions: new Set(['D1']) });
    const present = (label) => {
      const [type, rule] = label.split(': ');
      return merged.permissions[type].includes(rule);
    };
    for (const label of [...groups.added, ...groups.restored, ...groups.missingNoBase]) expect(present(label), label).toBe(true);
    for (const label of [...groups.suggestions, ...groups.exceptions]) expect(present(label), label).toBe(false);
  });

  it('removes only retired rules', () => {
    const base = scaffoldSubset(settings({ deny: ['OLD', 'GONE'] }));
    const local = settings({ deny: ['OLD', 'GONE', 'mine'] });
    const { merged } = merge({ local, scaffold: settings(), base, retired: { rules: ['OLD'] } });
    expect(merged.permissions.deny).toEqual(['GONE', 'mine']);
  });

  it('keeps keys the scaffold does not own, in their order', () => {
    const base = scaffoldSubset(settings());
    const local = { model: 'x', permissions: { allow: [], deny: [], ask: [] }, env: { A: '1' }, hooks: {}, extra: [1] };
    const { merged } = merge({ local, scaffold: settings({ deny: ['D1'] }), base });
    expect(Object.keys(merged)).toEqual(['model', 'permissions', 'env', 'hooks', 'extra']);
    expect(merged.env).toEqual({ A: '1' });
  });

  it('does not modify its input and writes 2-space JSON with a final newline', () => {
    const local = settings({ deny: [] });
    const before = JSON.stringify(local);
    merge({ local, scaffold: settings({ deny: ['D1'] }) });
    expect(JSON.stringify(local)).toBe(before);
    expect(serializeSettings({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}\n');
  });
});

describe('hooks', () => {
  const base = scaffoldSubset(settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } }));

  it('a matcher change moves the hook to its new group, once, keeping an adopter hook', () => {
    const local = settings({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [hook(GUARD).hooks[0], { type: 'command', command: 'node mine.js' }] }] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit|MultiEdit')] } });
    const { merged } = merge({ local, scaffold, base });
    const hooks = extractHooks(merged);
    expect(hooks).toHaveLength(1);
    expect(hooks[0].entry.matcher).toBe('Edit|MultiEdit');
    expect(merged.hooks.PreToolUse.find((g) => g.matcher === 'Edit').hooks).toEqual([{ type: 'command', command: 'node mine.js' }]);
  });

  it('a new hook joins the existing group with the same matcher', () => {
    const local = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit'), hook('bash .claude/hooks/new.sh', 'Edit')] } });
    const { merged } = merge({ local, scaffold, base });
    expect(merged.hooks.PreToolUse).toHaveLength(1);
    expect(merged.hooks.PreToolUse[0].hooks.map((h) => h.command)).toEqual([GUARD, 'bash .claude/hooks/new.sh']);
  });

  it('an ambiguous key and a locally modified hook are left exactly as they are', () => {
    const local = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit'), hook(`X=1 ${GUARD}`, 'Write')] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit|MultiEdit')] } });
    const { merged } = merge({ local, scaffold, base });
    expect(merged.hooks).toEqual(local.hooks);
  });

  it('a retired hook is removed, dropping its empty group and event', () => {
    const local = settings({ hooks: { UserPromptSubmit: [hook('bash .claude/hooks/pre-review.sh', '/review')] } });
    const oldBase = scaffoldSubset(local);
    const { merged } = merge({ local, scaffold: settings(), base: oldBase, retired: { hooks: ['UserPromptSubmit .claude/hooks/pre-review.sh'] } });
    expect(merged.hooks).toEqual({});
  });
});

describe('buildManifestAfter (5.2)', () => {
  const N = { 'CLAUDE.md': Buffer.from('new claude\n'), '.claude/rules/a.md': Buffer.from('new a\r\n') };
  const migrated = {
    version: '0.16.1', manifestSchema: 2, appliedMigrations: ['schema-2'], defaultedValues: ['purpose'],
    managedFiles: [
      { path: './README.md', hash: 'sha256:readme', class: 'unowned' },
      { path: 'CLAUDE.md', hash: 'sha256:old', class: 'managed' },
      { path: '.claude/rules/old.md', hash: 'sha256:x', class: 'managed' },
      { path: '.claude/settings.json', hash: 'sha256:s', class: 'merged' },
    ],
  };
  const entries = [
    { path: 'README.md', class: 'unowned', action: 'skip-unowned', recordAfter: 'carry' },
    { path: 'CLAUDE.md', class: 'managed', action: 'conflict', recordAfter: hashRaw(N['CLAUDE.md']) },
    { path: '.claude/rules/a.md', class: 'managed', action: 'add', recordAfter: hashRaw(N['.claude/rules/a.md']) },
    { path: '.claude/rules/old.md', class: 'managed', action: 'remove', recordAfter: 'drop' },
    { path: '.claude/settings.json', class: 'merged', action: 'merge', recordAfter: 'merged' },
  ];
  const scaffoldSettings = settings({ deny: ['D1', 'D2'], ask: ['K1'] });
  const merged = Buffer.from('{"merged":true}\n');
  const manifest = buildManifestAfter({
    migrated, entries, renders: new Map(Object.entries(N)), mergedSettings: merged, scaffoldSettings,
    exceptions: new Set(['D2', 'not-shipped']), to: '0.17.0', now: new Date(Date.UTC(2026, 9, 23, 12)),
  });
  const byPath = Object.fromEntries(manifest.managedFiles.map((r) => [r.path, r]));

  it('refreshes version, date and schema, and keeps migrations and defaults', () => {
    expect(manifest).toMatchObject({ version: '0.17.0', updatedAt: '2026-10-23', manifestSchema: 2, appliedMigrations: ['schema-2'], defaultedValues: ['purpose'] });
  });

  it('records the new render for a conflict (B3) and an add, with hashLf for CRLF', () => {
    expect(byPath['CLAUDE.md'].hash).toBe(hashRaw(N['CLAUDE.md']));
    expect(byPath['.claude/rules/a.md']).toEqual({ path: '.claude/rules/a.md', ...recordFor(N['.claude/rules/a.md']), class: 'managed' });
  });

  it('carries unowned records found under another spelling, drops removed ones, records the merged settings', () => {
    expect(byPath['README.md'].hash).toBe('sha256:readme');
    expect(byPath['.claude/rules/old.md']).toBeUndefined();
    expect(byPath['.claude/settings.json'].hash).toBe(hashRaw(merged));
  });

  it('records settingsBase from the new scaffold and only shipped exceptions', () => {
    expect(manifest.settingsBase).toEqual(scaffoldSubset(scaffoldSettings));
    expect(manifest.settingsExceptions).toEqual({ deny: ['D2'], ask: [] });
  });

  it('lists records sorted by path', () => {
    const paths = manifest.managedFiles.map((r) => r.path);
    expect(paths).toEqual([...paths].sort());
  });
});
