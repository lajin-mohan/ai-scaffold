/**
 * Rebase relative Markdown links when a document is written somewhere other
 * than the folder its links were authored against.
 *
 * The profile README template links project-root files (`./constitution.md`,
 * `./AGENTS.md`). On `init` the template lands at `.ai-scaffold/README.md`
 * because the adopter's README is protected, and those links would resolve
 * inside `.ai-scaffold/`, where the files do not exist.
 */

import path from 'path';

// Inline link or image: [text](target) / ![alt](target). Captures the target.
const INLINE_LINK = /(!?\[[^\]]*\]\()([^)\s]+)(\))/g;
const NOT_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i;
const FENCE = /^\s{0,3}(```|~~~)/;

function rebaseTarget(target, fromDir) {
  if (NOT_RELATIVE.test(target)) return target;
  const cut = target.search(/[?#]/);
  const filePart = cut === -1 ? target : target.slice(0, cut);
  const suffix = cut === -1 ? '' : target.slice(cut);
  if (!filePart) return target;
  const rebased = path.posix.relative(fromDir, path.posix.normalize(filePart));
  return `${rebased || '.'}${suffix}`;
}

/**
 * @param {string} content  Markdown whose relative links are rooted at the project root
 * @param {string} fromDir  POSIX directory, relative to the project root, the file is written to
 * @returns {string} content with every relative inline link rewritten to resolve from `fromDir`
 */
export function rebaseRelativeLinks(content, fromDir) {
  if (!content || !fromDir || fromDir === '.') return content ?? '';
  let fence = null;
  return content
    .split('\n')
    .map((line) => {
      const opener = line.match(FENCE);
      if (opener) {
        if (fence === null) fence = opener[1];
        else if (opener[1] === fence) fence = null;
        return line;
      }
      if (fence !== null) return line;
      return line.replace(INLINE_LINK, (_, open, target, close) => `${open}${rebaseTarget(target, fromDir)}${close}`);
    })
    .join('\n');
}
