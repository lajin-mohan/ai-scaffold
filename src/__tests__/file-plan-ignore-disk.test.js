/**
 * Item 25 slice 2: buildFilePlan({ ignoreDisk }) plans what an install mode
 * writes, independent of the target's current files (HLD §2, round 2 #1).
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFilePlan } from '../cli/core/file-plan.js';
import { templatePath } from '../cli/core/paths.js';

const PROFILES = ['generic', 'node', 'python', 'laravel', 'golang'];
const GROUPS = ['copy', 'generate', 'skipProtected', 'skipAppSource', 'missing'];

// Files an adopter (or a previous install) may already have.
const EXISTING = ['CLAUDE.md', 'AGENTS.md', 'constitution.md', 'README.md', 'CHANGELOG.md',
  'tasks/lessons.md', '.gitignore', 'package.json', '.env'];

function shape(plan, targetDir) {
  const strip = (file) => ({
    rel: file.rel,
    src: file.src ?? null,
    target: file.target ? path.relative(targetDir, file.target) : null,
  });
  return Object.fromEntries(GROUPS.map((group) => [group, plan[group].map(strip)]));
}

describe('buildFilePlan ignoreDisk', () => {
  let tmpDir;
  let emptyDir;
  let populatedDir;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-ignore-disk-'));
    emptyDir = path.join(tmpDir, 'empty');
    populatedDir = path.join(tmpDir, 'populated');
    await fs.ensureDir(emptyDir);
    for (const rel of EXISTING) {
      await fs.outputFile(path.join(populatedDir, rel), 'adopter content\n');
    }
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  for (const profile of PROFILES) {
    for (const existingTarget of [false, true]) {
      const mode = existingTarget ? 'init' : 'create';
      it(`${profile} ${mode}: the plan does not depend on what is on disk`, async () => {
        const options = { existingTarget, ignoreDisk: true };
        const onPopulated = await buildFilePlan(templatePath(profile), populatedDir, options);
        const onEmpty = await buildFilePlan(templatePath(profile), emptyDir, options);
        expect(shape(onPopulated, populatedDir)).toEqual(shape(onEmpty, emptyDir));
      });
    }
  }

  it('init with ignoreDisk keeps the files init itself writes in the plan', async () => {
    const plan = await buildFilePlan(templatePath('node'), populatedDir, { existingTarget: true, ignoreDisk: true });
    const planned = [...plan.copy, ...plan.generate].map((file) => file.rel);
    expect(planned).toEqual(expect.arrayContaining(['CLAUDE.md', 'AGENTS.md', 'constitution.md']));
    expect(plan.skipProtected.filter((file) => file.exists)).toEqual([]);
  });

  it('control: without ignoreDisk, an existing CLAUDE.md in init is skipped as protected', async () => {
    const plan = await buildFilePlan(templatePath('node'), populatedDir, { existingTarget: true });
    expect(plan.skipProtected.map((file) => file.rel)).toContain('CLAUDE.md');
    expect([...plan.copy, ...plan.generate].map((file) => file.rel)).not.toContain('CLAUDE.md');
  });

  it('a target directory that does not exist plans the same as an empty one', async () => {
    const missing = path.join(tmpDir, 'not-created');
    const options = { existingTarget: true, ignoreDisk: true };
    const onMissing = await buildFilePlan(templatePath('generic'), missing, options);
    const onEmpty = await buildFilePlan(templatePath('generic'), emptyDir, options);
    expect(shape(onMissing, missing)).toEqual(shape(onEmpty, emptyDir));
  });
});
