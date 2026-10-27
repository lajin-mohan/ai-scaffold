/**
 * Render a planned file to the exact bytes `create`/`init` write (item 25).
 *
 * Shared by copy.js (which writes the result) and, later, `ais update` (which
 * compares it). A render depends only on the template, the values and the
 * injected clock `now` (BRD NFR-07).
 */

import fs from 'fs-extra';
import {
  buildConstitution,
  buildContextFile,
  buildMemoryFile,
  buildCliReference,
  buildScaffoldGitignore,
  buildScaffoldReadme,
  buildStarterChangelog,
  buildStarterLessons,
  resolvePlaceholders,
} from './content-templates.js';
import { buildManifestData, buildSettingsOverridesData } from './manifest.js';

export const RENDER_KINDS = ['copy', 'generate'];

function toJson(data) {
  // Byte-identical to fs-extra writeJson(..., { spaces: 2 }).
  return `${JSON.stringify(data, null, 2)}\n`;
}

function generatedContent(relPath, values, now) {
  if (relPath === '.ai-scaffold/README.md') return buildScaffoldReadme(values);
  if (relPath === '.ai-scaffold/cli-reference.md') return buildCliReference(values);
  if (relPath === '.ai-scaffold/.gitignore') return buildScaffoldGitignore();
  if (relPath === '.ai-scaffold/context.md') return buildContextFile(values);
  if (relPath === '.ai-scaffold.json') return toJson(buildManifestData(values, { now }));
  if (relPath === '.claude/settings-overrides.json') return toJson(buildSettingsOverridesData(values));
  if (relPath === '.claude/MEMORY.md') return buildMemoryFile(values, { now });
  if (relPath === 'constitution.md') return buildConstitution(values);
  if (relPath.endsWith('CHANGELOG.md')) return buildStarterChangelog(values);
  if (relPath.endsWith('tasks/lessons.md')) return buildStarterLessons(values);
  if (relPath.endsWith('.gitkeep')) return '';
  return null;
}

/**
 * @param {{ src: string|null, rel: string }} file  a buildFilePlan() entry
 * @param {object} values  resolved bootstrap values
 * @param {{ kind: 'copy'|'generate', now?: Date }} options
 *   `kind` is the plan group the entry came from.
 * @returns {Promise<Buffer|null>} the bytes, or null when nothing is written
 */
export async function renderPlannedFile(file, values, { kind, now = new Date() } = {}) {
  if (!RENDER_KINDS.includes(kind)) {
    throw new TypeError(`renderPlannedFile: kind must be one of ${RENDER_KINDS.join(', ')}`);
  }
  const { src, rel } = file;
  const templated = kind === 'copy' || (rel.endsWith('README.md') && src);
  if (templated) {
    const content = await fs.readFile(src, 'utf-8');
    return Buffer.from(resolvePlaceholders(content, values, { now }), 'utf-8');
  }
  const content = generatedContent(rel, values, now);
  return content === null ? null : Buffer.from(content, 'utf-8');
}
