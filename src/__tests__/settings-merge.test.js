/**
 * Item 25 slice 3: settings.json merge preview (HLD §5; FR-20 to FR-24,
 * FR-34 to FR-36, FR-39) and hook identity.
 */
import { describe, expect, it } from 'vitest';
import { entryJson, extractHooks, hookScript } from '../cli/core/settings-hooks.js';
import { effectiveExceptions, previewSettingsMerge, scaffoldSubset } from '../cli/core/settings-merge.js';
import { UpdateError } from '../cli/core/update-policy.js';

function settings({ allow = [], deny = [], ask = [], hooks = {} } = {}) {
  return { permissions: { allow, deny, ask }, hooks };
}

function hook(command, matcher = 'Bash', extra = {}) {
  return { matcher, hooks: [{ type: 'command', command, timeout: 10, ...extra }] };
}

const GUARD = 'bash .claude/hooks/guard.sh';

function preview({ local, scaffold, base, baseState = base ? 'recorded' : 'unknown', exceptions = new Set(), retired }) {
  return previewSettingsMerge({ local, localValid: true, scaffold, baseState, recordedBase: base, exceptions, retired });
}

describe('hookScript', () => {
  it.each([
    ['bash .claude/hooks/a.sh', '.claude/hooks/a.sh'],
    ['PRE_REVIEW_ALLOW_UNCONFIGURED=1 bash .claude/hooks/pre-review.sh', '.claude/hooks/pre-review.sh'],
    ['A=1 B=2 sh "./.claude/hooks/a.sh" --flag', '.claude/hooks/a.sh'],
    ['bash $CLAUDE_PROJECT_DIR/.claude/hooks/a.sh', '.claude/hooks/a.sh'],
    ["bash '${CLAUDE_PROJECT_DIR}/.claude/hooks/a.sh'", '.claude/hooks/a.sh'],
  ])('%s → %s', (command, script) => {
    expect(hookScript(command)).toBe(script);
  });

  it.each(['node tools/lint.js', 'bash .claude/hooks/', '', undefined, 42])('%s is an adopter hook', (command) => {
    expect(hookScript(command)).toBeNull();
  });
});

describe('extractHooks', () => {
  it('keys by (event, script) and keeps the matcher in the entry', () => {
    const [h] = extractHooks(settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } }));
    expect(h.key).toBe('PreToolUse .claude/hooks/guard.sh');
    expect(h.entry.matcher).toBe('Edit');
  });

  it('compares entries independent of key order', () => {
    expect(entryJson({ a: 1, b: { c: 2, d: 3 } })).toBe(entryJson({ b: { d: 3, c: 2 }, a: 1 }));
  });
});

describe('rules (FR-20, FR-21, FR-35)', () => {
  const scaffold = settings({ allow: ['A1', 'A2'], deny: ['D1', 'D2'], ask: ['K1'] });

  it('with a recorded base: new rules added, removed deny/ask restored, removed allow not re-added', () => {
    const base = scaffoldSubset(settings({ allow: ['A1'], deny: ['D1'], ask: ['K1'] }));
    const local = settings({ allow: [], deny: [], ask: ['K1', 'mine'] });
    const g = preview({ local, scaffold, base });
    expect(g.added).toEqual(['allow: A2', 'deny: D2']);
    expect(g.restored).toEqual(['deny: D1']);
    expect(g.suggestions).toEqual([]);
  });

  it('an exception keeps a removed deny rule absent and is reported', () => {
    const base = scaffoldSubset(scaffold);
    const local = settings({ allow: ['A1', 'A2'], deny: ['D2'], ask: ['K1'] });
    const g = preview({ local, scaffold, base, exceptions: new Set(['D1']) });
    expect(g.restored).toEqual([]);
    expect(g.exceptions).toEqual(['deny: D1']);
  });

  it('an unknown base is never treated as empty: allow only as suggestions, deny/ask as missing', () => {
    const local = settings({ allow: [], deny: ['D1'], ask: [] });
    const g = preview({ local, scaffold });
    expect(g.base).toBe('unknown');
    expect(g.added).toEqual([]);
    expect(g.restored).toEqual([]);
    expect(g.missingNoBase).toEqual(['ask: K1', 'deny: D2']);
    expect(g.suggestions).toEqual(['allow: A1', 'allow: A2']);
  });

  it('a derived base (unedited settings.json) treats every missing rule as new', () => {
    const local = settings({ allow: ['A1'], deny: ['D1'], ask: ['K1'] });
    const g = preview({ local, scaffold, baseState: 'derived' });
    expect(g.added).toEqual(['allow: A2', 'deny: D2']);
  });

  it('retired rules are removed; base rules no longer shipped are reported and kept', () => {
    const base = scaffoldSubset(settings({ deny: ['OLD', 'GONE'] }));
    const local = settings({ deny: ['OLD', 'GONE'] });
    const g = preview({ local, scaffold: settings(), base, retired: { rules: ['OLD'] } });
    expect(g.removed).toEqual(['deny: OLD']);
    expect(g.reported).toEqual(['deny: GONE (no longer shipped)']);
  });
});

describe('hooks (FR-22, FR-36)', () => {
  const base = scaffoldSubset(settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } }));

  it('a matcher change replaces an unmodified hook rather than duplicating it (AC-20)', () => {
    const local = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit|MultiEdit')] } });
    const g = preview({ local, scaffold, base });
    expect(g.replaced).toEqual(['hook: PreToolUse .claude/hooks/guard.sh']);
    expect(g.added).toEqual([]);
  });

  it('a locally modified hook is reported, not replaced (AC-12)', () => {
    const local = settings({ hooks: { PreToolUse: [hook(`ECC_FACT_CHECK_STRICT=1 ${GUARD}`, 'Edit')] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit|MultiEdit')] } });
    const g = preview({ local, scaffold, base });
    expect(g.replaced).toEqual([]);
    expect(g.reported).toEqual(['hook: PreToolUse .claude/hooks/guard.sh (locally modified)']);
  });

  it('two local hooks with the same key are ambiguous and left alone (AC-20)', () => {
    const local = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit'), hook(GUARD, 'Write')] } });
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit|MultiEdit')] } });
    const g = preview({ local, scaffold, base });
    expect(g.ambiguous).toEqual(['PreToolUse .claude/hooks/guard.sh']);
    expect(g.replaced).toEqual([]);
  });

  it('a hook the adopter removed is not re-added; a new one is added', () => {
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit'), hook('bash .claude/hooks/new.sh')] } });
    const g = preview({ local: settings(), scaffold, base });
    expect(g.added).toEqual(['hook: PreToolUse .claude/hooks/new.sh']);
  });

  it('no-op when the scaffold entry did not change, whatever the local state', () => {
    const scaffold = settings({ hooks: { PreToolUse: [hook(GUARD, 'Edit')] } });
    const local = settings({ hooks: { PreToolUse: [hook(`X=1 ${GUARD}`, 'Edit')] } });
    expect(preview({ local, scaffold, base }).reported).toEqual([]);
  });

  it('adopter hooks with no scaffold script are never touched', () => {
    const local = settings({ hooks: { PreToolUse: [hook('node tools/check.js')] } });
    const g = preview({ local, scaffold: settings(), base });
    expect([...g.removed, ...g.reported, ...g.ambiguous]).toEqual([]);
  });
});

describe('invalid local settings (FR-24)', () => {
  it('returns null so the planner reports a conflict', () => {
    expect(previewSettingsMerge({ local: null, localValid: false, scaffold: settings(), baseState: 'unknown', exceptions: new Set() })).toBeNull();
  });
});

describe('effectiveExceptions (FR-39)', () => {
  const scaffold = settings({ deny: ['D1', 'D2'], ask: ['K1'], allow: ['A1'] });

  it('adds --keep-removed and drops --restore-removed', () => {
    const { exceptions } = effectiveExceptions({ recorded: { deny: ['D2'] }, keepRemoved: ['D1'], restoreRemoved: ['D2'], scaffold });
    expect([...exceptions]).toEqual(['D1']);
  });

  it('drops recorded exceptions for rules no longer shipped', () => {
    const { exceptions, dropped } = effectiveExceptions({ recorded: { deny: ['OLD', 'D1'] }, scaffold });
    expect([...exceptions]).toEqual(['D1']);
    expect(dropped).toEqual(['OLD']);
  });

  it.each([['A1'], ['nonexistent']])('rejects a flag naming %s, which is not a shipped deny/ask rule', (rule) => {
    expect(() => effectiveExceptions({ keepRemoved: [rule], scaffold })).toThrow(UpdateError);
  });
});
