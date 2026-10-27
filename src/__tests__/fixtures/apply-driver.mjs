// Test-only driver: take the lock, run one apply transaction, release the
// lock. Usage: node [--import crash-hook] apply-driver.mjs <srcDir> <root> <spec.json>
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const [srcDir, target, specPath] = process.argv.slice(2);
const load = (rel) => import(pathToFileURL(path.join(srcDir, rel)).href);
const { applyTransaction } = await load('cli/core/update-apply.js');
const { acquireLock, releaseLock } = await load('cli/core/update-lock.js');
const { nativeFs } = await load('cli/core/write-ops.js');
const { resolveProjectRoot } = await load('cli/core/containment.js');
// The CLI resolves the native real path first; containment compares against it.
const root = await resolveProjectRoot(target);

const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
const ops = spec.ops.map((op) => ({ ...op, data: op.data === undefined ? undefined : Buffer.from(op.data, 'base64') }));

// Optional injected failure on the Nth project rename, to drive a rollback.
let renames = 0;
const fsApi = spec.failAtRename
  ? {
    ...nativeFs,
    rename: async (from, to) => {
      if (!to.includes(`${path.sep}backups${path.sep}`) && ++renames === spec.failAtRename) {
        throw Object.assign(new Error('injected'), { code: 'EIO' });
      }
      return nativeFs.rename(from, to);
    },
  }
  : nativeFs;

const { token } = await acquireLock(root);
try {
  const result = await applyTransaction({ root, ops, dirs: spec.dirs, fsApi });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await releaseLock(root, token);
}
