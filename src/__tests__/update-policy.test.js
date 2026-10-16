/**
 * Item 25 slice 3: flag and version policy (FR-01, FR-02, FR-04, FR-44, FR-46).
 */
import { describe, expect, it } from 'vitest';
import { checkExceptionsAtCurrent, checkFlags, checkVersions, UpdateError } from '../cli/core/update-policy.js';

function codeOf(fn) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(UpdateError);
    return error.code;
  }
  return null;
}

describe('checkFlags', () => {
  it('rejects --force with an explanation, never ignoring it', () => {
    expect(codeOf(() => checkFlags({ force: true }))).toBe('FLAG_REMOVED');
    expect(() => checkFlags({ force: true })).toThrow(/removed in 0\.17\.0/);
  });

  it('rejects --apply while applying is unavailable', () => {
    expect(codeOf(() => checkFlags({ apply: true }))).toBe('APPLY_UNAVAILABLE');
  });

  it('normalises single and repeated exception flags to arrays', () => {
    expect(checkFlags({})).toEqual({ keepRemoved: [], restoreRemoved: [] });
    expect(checkFlags({ keepRemoved: 'Read(.env.local)' })).toEqual({ keepRemoved: ['Read(.env.local)'], restoreRemoved: [] });
    expect(checkFlags({ keepRemoved: ['a', 'b'], restoreRemoved: 'c' })).toEqual({ keepRemoved: ['a', 'b'], restoreRemoved: ['c'] });
  });

  it.each([[true], [['a', true]], [['']]])('rejects an exception flag without a rule: %j', (value) => {
    expect(codeOf(() => checkFlags({ keepRemoved: value }))).toBe('INVALID_OPTION');
  });

  it('rejects the same rule in both exception flags', () => {
    expect(codeOf(() => checkFlags({ keepRemoved: 'a', restoreRemoved: ['a'] }))).toBe('FLAG_CONFLICT');
  });

  it('treats explicit false flags as absent', () => {
    expect(checkFlags({ force: false, apply: false })).toEqual({ keepRemoved: [], restoreRemoved: [] });
  });
});

describe('checkVersions', () => {
  it('targets the running CLI version', () => {
    expect(checkVersions({ installed: '0.16.1', cli: '0.17.0' })).toEqual({ from: '0.16.1', to: '0.17.0', current: false });
  });

  it('reports the installed version as current (FR-04)', () => {
    expect(checkVersions({ installed: '0.17.0', cli: '0.17.0' }).current).toBe(true);
  });

  it('accepts a --target-version equal to the CLI version', () => {
    expect(checkVersions({ installed: '0.16.1', cli: '0.17.0', targetVersion: '0.17.0' }).to).toBe('0.17.0');
  });

  it('rejects another --target-version and names the npx form (FR-01)', () => {
    expect(codeOf(() => checkVersions({ installed: '0.16.1', cli: '0.17.0', targetVersion: '0.18.0' })))
      .toBe('TARGET_VERSION_MISMATCH');
    expect(() => checkVersions({ installed: '0.16.1', cli: '0.17.0', targetVersion: '0.18.0' }))
      .toThrow('npx @lajin.m/ai-scaffold@0.18.0 update');
  });

  it('rejects a downgrade (FR-02)', () => {
    expect(codeOf(() => checkVersions({ installed: '0.18.0', cli: '0.17.0' }))).toBe('DOWNGRADE');
  });

  it.each([undefined, '', 'latest', '1.0'])('rejects an invalid installed version %s', (installed) => {
    expect(codeOf(() => checkVersions({ installed, cli: '0.17.0' }))).toBe('MANIFEST_INVALID');
  });
});

describe('checkExceptionsAtCurrent', () => {
  it('passes with no exception flags', () => {
    expect(() => checkExceptionsAtCurrent({ keepRemoved: [], restoreRemoved: [] })).not.toThrow();
  });

  it('rejects exception flags at the installed version instead of discarding them', () => {
    expect(codeOf(() => checkExceptionsAtCurrent({ keepRemoved: ['a'], restoreRemoved: [] }))).toBe('EXCEPTIONS_AT_CURRENT');
    expect(codeOf(() => checkExceptionsAtCurrent({ keepRemoved: [], restoreRemoved: ['a'] }))).toBe('EXCEPTIONS_AT_CURRENT');
  });
});
