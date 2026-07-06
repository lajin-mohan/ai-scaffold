import path from 'path';
import fs from 'fs-extra';
import { PKG_ROOT } from './paths.js';

/**
 * Returns the current CLI version.
 * Reads from package.json in the installed or source location.
 */
export function getVersion() {
  try {
    return fs.readJsonSync(path.join(PKG_ROOT, 'package.json')).version;
  } catch {
    return '0.7.1';
  }
}

export const version = getVersion();
