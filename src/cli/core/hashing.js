/**
 * Content hashing for managed-file records (item 25, BRD FR-09).
 *
 * Hashes are sha256 over raw bytes, in the `sha256:<hex>` form the manifest
 * already uses. A record also carries `hashLf` when its content contains CRLF,
 * so a file checked out with either line ending can be proven unedited.
 */

import crypto from 'crypto';

const CR = 0x0d;
const LF = 0x0a;

function toBuffer(content) {
  return Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf-8');
}

/** @returns {string} `sha256:<hex>` of the raw bytes */
export function hashRaw(content) {
  return `sha256:${crypto.createHash('sha256').update(toBuffer(content)).digest('hex')}`;
}

/**
 * Replace each CRLF pair with LF in one non-overlapping pass. Lone CR, BOM
 * and the final newline are untouched, so `\r\r\n` becomes `\r\n`.
 * @returns {Buffer}
 */
export function normalizeCrlf(content) {
  const input = toBuffer(content);
  const out = Buffer.allocUnsafe(input.length);
  let length = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === CR && input[i + 1] === LF) continue;
    out[length++] = input[i];
  }
  return out.subarray(0, length);
}

/** @returns {string} `sha256:<hex>` of the CRLF-normalised bytes */
export function hashLf(content) {
  return hashRaw(normalizeCrlf(content));
}

/** @returns {{ hash: string, hashLf?: string }} the record for written content */
export function recordFor(content) {
  const hash = hashRaw(content);
  const lf = hashLf(content);
  return lf === hash ? { hash } : { hash, hashLf: lf };
}

/**
 * True when `content` matches `record` in either line-ending direction:
 * raw against `hash`, normalised against `hash`, or normalised against
 * `hashLf`. A missing or malformed record is never pristine.
 */
export function isPristine(content, record) {
  if (!record || typeof record.hash !== 'string') return false;
  if (hashRaw(content) === record.hash) return true;
  const normalised = hashLf(content);
  if (normalised === record.hash) return true;
  return typeof record.hashLf === 'string' && normalised === record.hashLf;
}
