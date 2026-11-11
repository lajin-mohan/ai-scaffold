import { describe, expect, it } from 'vitest';
import { rebaseRelativeLinks } from '../cli/core/markdown-links.js';

describe('rebaseRelativeLinks', () => {
  it('rebases root-relative links to the target folder', () => {
    const text = 'Read [`constitution.md`](constitution.md), [AGENTS](./AGENTS.md) and [rules](.claude/rules/x.md).';
    expect(rebaseRelativeLinks(text, '.ai-scaffold')).toBe(
      'Read [`constitution.md`](../constitution.md), [AGENTS](../AGENTS.md) and [rules](../.claude/rules/x.md).',
    );
  });

  it('keeps anchors and query strings and handles images', () => {
    expect(rebaseRelativeLinks('![logo](docs/logo.png) [s](AGENTS.md#security)', '.ai-scaffold'))
      .toBe('![logo](../docs/logo.png) [s](../AGENTS.md#security)');
  });

  it('leaves URLs, mailto, in-page anchors and rooted paths alone', () => {
    const text = '[a](https://x.dev/a.md) [b](mailto:a@b.c) [c](#setup) [d](/abs.md)';
    expect(rebaseRelativeLinks(text, '.ai-scaffold')).toBe(text);
  });

  it('does not touch links inside fenced code blocks', () => {
    const text = '```md\n[x](AGENTS.md)\n```\n[y](AGENTS.md)';
    expect(rebaseRelativeLinks(text, '.ai-scaffold')).toBe('```md\n[x](AGENTS.md)\n```\n[y](../AGENTS.md)');
  });

  it('is a no-op at the project root and safe on empty input', () => {
    expect(rebaseRelativeLinks('[a](AGENTS.md)', '.')).toBe('[a](AGENTS.md)');
    expect(rebaseRelativeLinks('', '.ai-scaffold')).toBe('');
    expect(rebaseRelativeLinks(undefined, '.ai-scaffold')).toBe('');
  });

  it('resolves links that point inside the target folder itself', () => {
    expect(rebaseRelativeLinks('[g](.ai-scaffold/commands.md)', '.ai-scaffold')).toBe('[g](commands.md)');
  });
});
