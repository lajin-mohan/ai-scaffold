/**
 * Render what the current CLI would write for an installed project, from its
 * manifest alone (item 25, HLD §6 and the clock rule in §3).
 */

import { buildFilePlan } from './file-plan.js';
import { valuesFromManifest } from './manifest-values.js';
import { templatePath } from './paths.js';
import { renderPlannedFile } from './render.js';

const DATE_FIELDS = ['installedAt', 'bootstrapCompletedAt', 'updatedAt'];

/**
 * The clock a re-render uses: the install date, so a re-render reproduces
 * what was installed (HLD §3). Falls back to `today`.
 */
export function renderClock(manifest, today = new Date()) {
  for (const field of DATE_FIELDS) {
    const value = manifest?.[field];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) return { now: date, source: field };
    }
  }
  return { now: today, source: 'today' };
}

/**
 * @param {object} manifest  migrated manifest (install.mode set)
 * @param {string} root      project real path (targets only; nothing is read)
 * @returns {Promise<{ renders: Map<string, Buffer>, clock: string }>}
 */
export async function renderManagedSet(manifest, root, { today } = {}) {
  const values = valuesFromManifest(manifest);
  const { now, source } = renderClock(manifest, today);
  const plan = await buildFilePlan(templatePath(manifest.profile), root, {
    existingTarget: values.installMode !== 'create',
    ignoreDisk: true,
  });
  const groups = [
    ...plan.copy.map((file) => [file, 'copy']),
    ...plan.generate.map((file) => [file, 'generate']),
    ...plan.skipProtected.map((file) => [file, file.src ? 'copy' : 'generate']),
  ];
  const renders = new Map();
  for (const [file, kind] of groups) {
    const bytes = await renderPlannedFile(file, values, { kind, now });
    if (bytes !== null) renders.set(file.rel, bytes);
  }
  return { renders, clock: source };
}
