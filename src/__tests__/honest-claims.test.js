/**
 * Items 87 and 102 part A: shipped guidance never tells a generated project to
 * run a command it does not have, and the browser gates disclose a missing
 * E2E harness instead of demanding evidence nobody can produce.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_PROFILES, templatePath } from '../cli/core/paths.js';

const NO_HARNESS = 'not verified: no E2E harness';

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

describe.each(SUPPORTED_PROFILES)('%s profile', (profile) => {
  it('mentions npm run test:e2e only as conditional on the project adding it', () => {
    const unconditional = markdownFiles(templatePath(profile, '.claude'))
      .flatMap((file) => fs.readFileSync(file, 'utf-8').split('\n').map((line) => ({ file, line })))
      .filter(({ line }) => line.includes('npm run test:e2e') && !/only once the project adds it|if the project has added it/.test(line));
    expect(unconditional).toEqual([]);
  });

  it('/qa checks for its browser daemon before walking a flow', () => {
    const qa = fs.readFileSync(templatePath(profile, '.claude/commands/qa.md'), 'utf-8');
    expect(qa).toContain('command -v gstack-browse');
    expect(qa).toContain(NO_HARNESS);
  });

  it.each([
    '.claude/commands/review.md',
    '.claude/commands/start-task.md',
    '.claude/commands/debug-fix.md',
    '.claude/commands/ux-review.md',
    '.claude/agents/debugging-agent.md',
    '.claude/skills/systematic-debugging/SKILL.md',
    '.claude/skills/ux-review/SKILL.md',
    '.claude/rules/governance.md',
  ])('%s accepts the no-harness disclosure the DoD allows', (rel) => {
    expect(fs.readFileSync(templatePath(profile, rel), 'utf-8')).toContain(NO_HARNESS);
  });

  it('the DoD browser checks are conditional on an E2E harness', () => {
    const dod = fs.readFileSync(templatePath(profile, '.claude/rules/dod-rules.md'), 'utf-8');
    expect(dod).toContain(`Without one, the PR lists each as \`${NO_HARNESS}\``);
  });
});
