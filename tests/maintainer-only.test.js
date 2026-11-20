/**
 * Maintainer-only tooling must never reach an adopter (0.20.1). The
 * /ais-effectiveness command and the effectiveness reports describe this
 * repository, not a generated project: they live at the repository root only.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const MAINTAINER_ONLY = /ais-effectiveness|effectiveness-(metrics|review|baseline)/;

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe('maintainer-only tooling stays out of what ships', { timeout: 120_000 }, () => {
  it('no template file is named after or mentions it', () => {
    const hits = filesUnder(path.join(ROOT, 'templates')).filter((file) => (
      MAINTAINER_ONLY.test(file) || MAINTAINER_ONLY.test(fs.readFileSync(file, 'latin1'))
    ));
    expect(hits).toEqual([]);
  });

  it('the packed tarball does not contain it', () => {
    const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
      cwd: ROOT, shell: true, encoding: 'utf-8', timeout: 100_000,
    });
    expect(result.status, result.stderr).toBe(0);
    const files = JSON.parse(result.stdout)[0].files.map((f) => f.path);
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((file) => MAINTAINER_ONLY.test(file))).toEqual([]);
  });
});
