// The runtime audit gate (scripts/audit-gate.js) and the condition that
// justifies its one exception: picomatch only ever sees fixed patterns from
// our own source, none with extglob syntax (GHSA-fc5q-39xc-vjpf).
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { blockingAdvisories, evaluateAudit } from '../scripts/audit-gate.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PICO = 'GHSA-fc5q-39xc-vjpf';

const advisory = (overrides = {}) => ({
  source: 1247710,
  name: 'picomatch',
  title: 'picomatch vulnerable to ReDoS',
  url: `https://github.com/advisories/${PICO}`,
  severity: 'high',
  ...overrides,
});
const report = (vias, counts = { high: vias.length, critical: 0 }) => ({
  vulnerabilities: { picomatch: { name: 'picomatch', severity: 'high', via: vias } },
  metadata: { vulnerabilities: counts },
});
const exception = (overrides = {}) => ({ id: PICO, reason: 'fixed patterns only', reviewBy: '2026-12-18', ...overrides });
const TODAY = '2026-11-18';

describe('audit gate: decisions', () => {
  it('passes a clean report', () => {
    const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { high: 0, critical: 0 } } };
    expect(evaluateAudit(clean, [], TODAY).ok).toBe(true);
  });

  it('blocks a high advisory with no exception', () => {
    const result = evaluateAudit(report([advisory()]), [], TODAY);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain(PICO);
  });

  it('accepts a listed advisory until its review date, and says so', () => {
    const result = evaluateAudit(report([advisory()]), [exception()], TODAY);
    expect(result.ok).toBe(true);
    expect(result.notices[0]).toContain('Accepted until 2026-12-18');
    expect(evaluateAudit(report([advisory()]), [exception()], '2026-12-18').ok).toBe(true);
  });

  it('blocks once the exception has expired', () => {
    const result = evaluateAudit(report([advisory()]), [exception()], '2026-12-19');
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain('expired');
  });

  it('still blocks a different advisory on the same package', () => {
    const other = advisory({ url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc', severity: 'critical' });
    const result = evaluateAudit(report([advisory(), other]), [exception()], TODAY);
    expect(result.ok).toBe(false);
    expect(result.failures.join()).toContain('GHSA-aaaa-bbbb-cccc');
  });

  it('ignores moderate advisories and transitive string references', () => {
    expect(blockingAdvisories(report([advisory({ severity: 'moderate' }), 'other-package']))).toEqual([]);
  });

  it('fails closed on an unreadable report, a malformed exception, or counts without advisories', () => {
    expect(evaluateAudit(null, [], TODAY).ok).toBe(false);
    expect(evaluateAudit(report([advisory()]), [exception({ reviewBy: 'soon' })], TODAY).ok).toBe(false);
    expect(evaluateAudit(report([], { high: 1, critical: 0 }), [], TODAY).ok).toBe(false);
  });

  it('flags an exception that no longer matches anything', () => {
    const clean = { vulnerabilities: {}, metadata: { vulnerabilities: {} } };
    const result = evaluateAudit(clean, [exception()], TODAY);
    expect(result.ok).toBe(true);
    expect(result.notices[0]).toContain('no longer matches');
  });

  it('ships a valid exceptions file', async () => {
    const entries = await fs.readJson(path.join(REPO_ROOT, 'scripts', 'audit-exceptions.json'));
    expect(evaluateAudit(report([advisory()]), entries, TODAY).failures).toEqual([]);
  });
});

// The exception holds only while every picomatch pattern is a fixed string
// in these files with no extglob. A new call site needs a fresh review.
describe('audit gate: picomatch exception stays justified', () => {
  const KNOWN_CALLERS = [
    'src/cli/core/file-plan.js',
    'src/cli/core/migrations/schema-2.js',
    'src/cli/core/ownership.js',
  ];

  const sourceFiles = async (dir) => {
    const out = [];
    for (const name of await fs.readdir(dir)) {
      const full = path.join(dir, name);
      if ((await fs.stat(full)).isDirectory()) out.push(...(await sourceFiles(full)));
      else if (name.endsWith('.js')) out.push(full);
    }
    return out;
  };

  it('only the known files import picomatch', async () => {
    const files = await sourceFiles(path.join(REPO_ROOT, 'src', 'cli'));
    const callers = [];
    for (const file of files) {
      if (/from ['"]picomatch['"]/.test(await fs.readFile(file, 'utf-8'))) {
        callers.push(path.relative(REPO_ROOT, file).split(path.sep).join('/'));
      }
    }
    expect(callers.sort()).toEqual(KNOWN_CALLERS);
  });

  it('no string literal in those files uses extglob syntax', async () => {
    for (const rel of KNOWN_CALLERS) {
      const text = await fs.readFile(path.join(REPO_ROOT, rel), 'utf-8');
      const literals = text.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
      // Extglob is one of + * ? @ ! followed by an opening parenthesis.
      const extglobs = literals.filter((literal) => /[+*?@!]\(/.test(literal));
      expect(extglobs, rel).toEqual([]);
    }
  });
});
