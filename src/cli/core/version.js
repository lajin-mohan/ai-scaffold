/**
 * Returns the current CLI version.
 * Reads from package.json in the installed or source location.
 */
export function getVersion() {
  return '0.7.0';
}

export const version = getVersion();