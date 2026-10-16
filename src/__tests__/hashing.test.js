/**
 * Item 25 slice 2: the bidirectional hashing contract (BRD FR-09, HLD §3).
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { hashLf, hashRaw, isPristine, normalizeCrlf, recordFor } from '../cli/core/hashing.js';
import { buildManagedFileRecords } from '../cli/core/manifest.js';

const LF_TEXT = 'line one\nline two\n';
const CRLF_TEXT = 'line one\r\nline two\r\n';

describe('normalizeCrlf', () => {
  it('turns CRLF pairs into LF and leaves LF content untouched', () => {
    expect(normalizeCrlf(CRLF_TEXT).toString()).toBe(LF_TEXT);
    expect(normalizeCrlf(LF_TEXT).toString()).toBe(LF_TEXT);
  });

  it('leaves a lone CR alone and is a single non-overlapping pass', () => {
    expect(normalizeCrlf('a\rb\n').toString()).toBe('a\rb\n');
    expect(normalizeCrlf('a\r\r\n').toString()).toBe('a\r\n');
    expect(normalizeCrlf('a\r').toString()).toBe('a\r');
  });

  it('keeps a UTF-8 BOM and handles empty content', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a]);
    expect([...normalizeCrlf(bom)]).toEqual([0xef, 0xbb, 0xbf, 0x61, 0x0a]);
    expect(normalizeCrlf(Buffer.alloc(0)).length).toBe(0);
  });
});

describe('recordFor', () => {
  it('omits hashLf for content without CRLF', () => {
    expect(recordFor(LF_TEXT)).toEqual({ hash: hashRaw(LF_TEXT) });
  });

  it('adds hashLf for content containing CRLF', () => {
    expect(recordFor(CRLF_TEXT)).toEqual({ hash: hashRaw(CRLF_TEXT), hashLf: hashRaw(LF_TEXT) });
  });

  it('treats a string and its UTF-8 bytes identically', () => {
    expect(recordFor('héllo\r\n')).toEqual(recordFor(Buffer.from('héllo\r\n', 'utf-8')));
  });
});

describe('isPristine: the five rows of the hashing table', () => {
  it('LF recorded, LF checkout', () => {
    expect(isPristine(LF_TEXT, recordFor(LF_TEXT))).toBe(true);
  });

  it('LF recorded, CRLF checkout', () => {
    expect(isPristine(CRLF_TEXT, recordFor(LF_TEXT))).toBe(true);
  });

  it('CRLF recorded, CRLF checkout', () => {
    expect(isPristine(CRLF_TEXT, recordFor(CRLF_TEXT))).toBe(true);
  });

  it('CRLF recorded with hashLf, LF checkout', () => {
    expect(isPristine(LF_TEXT, recordFor(CRLF_TEXT))).toBe(true);
  });

  it('legacy CRLF record without hashLf, LF checkout: not provable, so edited', () => {
    expect(isPristine(LF_TEXT, { hash: hashRaw(CRLF_TEXT) })).toBe(false);
  });
});

describe('isPristine: edits and bad records', () => {
  it('reports a content edit as not pristine in every line-ending form', () => {
    const edited = 'line one\nline 2\n';
    expect(isPristine(edited, recordFor(LF_TEXT))).toBe(false);
    expect(isPristine(edited.replace(/\n/g, '\r\n'), recordFor(CRLF_TEXT))).toBe(false);
  });

  it('accepts a stray CR before CRLF as pristine (documented one-pass behaviour)', () => {
    expect(isPristine('a\r\r\n', recordFor('a\r\n'))).toBe(true);
  });

  it('is never pristine against a missing or malformed record', () => {
    expect(isPristine(LF_TEXT, undefined)).toBe(false);
    expect(isPristine(LF_TEXT, null)).toBe(false);
    expect(isPristine(LF_TEXT, {})).toBe(false);
    expect(isPristine(LF_TEXT, { hash: 42 })).toBe(false);
  });

  it('hashLf equals hashRaw for content without CRLF', () => {
    expect(hashLf(LF_TEXT)).toBe(hashRaw(LF_TEXT));
  });
});

describe('compatibility with records written by create', () => {
  it('hashRaw matches the raw hash buildManagedFileRecords stores, and new records prove both directions', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-hashing-'));
    try {
      await fs.writeFile(path.join(dir, 'a.md'), CRLF_TEXT);
      const [record] = await buildManagedFileRecords(dir, ['a.md']);
      expect(record.hash).toBe(hashRaw(CRLF_TEXT));
      expect(isPristine(CRLF_TEXT, record)).toBe(true);
      expect(isPristine(LF_TEXT, record)).toBe(true);
      expect(isPristine(LF_TEXT, { path: record.path, hash: record.hash })).toBe(false);
    } finally {
      await fs.remove(dir);
    }
  });
});
