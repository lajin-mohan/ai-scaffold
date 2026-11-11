/**
 * Item 97 D5: `ais doctor` reports the Claude Code version against 2.1.295,
 * the first version that honours `onFailure: "block"` on the security hooks.
 */
import { describe, expect, it } from 'vitest';
import {
  MIN_CLAUDE_CODE,
  checkClaudeCodeVersion,
  isAtLeast,
  parseClaudeVersion,
} from '../cli/core/claude-version.js';

const withOutput = (output) => checkClaudeCodeVersion({ readOutput: () => output });

describe('parseClaudeVersion', () => {
  it('reads the version from `claude --version` output', () => {
    expect(parseClaudeVersion('2.1.319 (Claude Code)\n')).toEqual([2, 1, 319]);
  });

  it.each([null, '', 'command not found', undefined])('returns null for %j', (output) => {
    expect(parseClaudeVersion(output)).toBeNull();
  });
});

describe('isAtLeast compares numerically, not as text', () => {
  it.each([
    ['2.1.295', true],
    ['2.1.1000', true],
    ['2.2.0', true],
    ['3.0.0', true],
    ['2.1.294', false],
    ['2.1.29', false],
    ['1.9.999', false],
  ])('%s against the minimum → %s', (version, expected) => {
    expect(isAtLeast(parseClaudeVersion(version), parseClaudeVersion(MIN_CLAUDE_CODE))).toBe(expected);
  });
});

describe('checkClaudeCodeVersion', () => {
  it('passes at or above the minimum and names the version', () => {
    const result = withOutput('2.1.319 (Claude Code)');
    expect(result).toMatchObject({ state: 'pass', passed: true, note: 'Claude Code 2.1.319' });
  });

  it('fails at medium severity below the minimum, so the exit code is unchanged', () => {
    const result = withOutput('2.1.294 (Claude Code)');
    expect(result).toMatchObject({ state: 'fail', passed: false, severity: 'medium' });
    expect(result.message).toContain(MIN_CLAUDE_CODE);
  });

  it('is unavailable, never a pass, when claude is missing or gives no version', () => {
    for (const output of [null, 'garbage']) {
      const result = withOutput(output);
      expect(result).toMatchObject({ state: 'unavailable', passed: false, reason: 'claude-unavailable' });
      expect(result.remedy).toContain(MIN_CLAUDE_CODE);
    }
  });
});
