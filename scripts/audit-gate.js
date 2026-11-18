#!/usr/bin/env node
// Runtime dependency audit gate for CI, release and publish.
//
// Fails on any high or critical advisory in the published dependencies
// (`npm audit --omit=dev`), except advisories listed in
// scripts/audit-exceptions.json with a reason and an unexpired review date.
// Anything it cannot parse fails closed.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);
const GHSA = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// GitHub writes advisory ids as GHSA- followed by lowercase groups.
const canonical = (id) => `GHSA-${id.slice(5).toLowerCase()}`;

function advisoryId(via) {
  const match = String(via.url ?? '').match(GHSA);
  return match ? canonical(match[0]) : `npm-${via.source}`;
}

/** Every blocking advisory in an `npm audit --json` (v2) report, one per id. */
export function blockingAdvisories(report) {
  const found = new Map();
  for (const entry of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      // A string names another vulnerable package, whose own entry carries the advisory.
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = advisoryId(via);
      if (!found.has(id)) found.set(id, { id, package: via.name, severity: via.severity, title: via.title });
    }
  }
  return [...found.values()];
}

function validException(item) {
  return item && GHSA.test(item.id ?? '') && typeof item.reason === 'string' && item.reason.trim() !== ''
    && ISO_DATE.test(item.reviewBy ?? '');
}

/**
 * @param {object} report  parsed `npm audit --omit=dev --json`
 * @param {object[]} exceptions  entries of scripts/audit-exceptions.json
 * @param {string} today  YYYY-MM-DD
 * @returns {{ ok: boolean, failures: string[], notices: string[] }}
 */
export function evaluateAudit(report, exceptions, today) {
  const failures = [];
  const notices = [];
  if (!report || typeof report !== 'object' || !('vulnerabilities' in report)) {
    return { ok: false, failures: ['npm audit did not return a report this gate understands'], notices };
  }
  const usable = new Map();
  for (const item of exceptions ?? []) {
    if (!validException(item)) {
      failures.push(`Invalid exception entry (needs id, reason, reviewBy YYYY-MM-DD): ${JSON.stringify(item)}`);
      continue;
    }
    usable.set(canonical(item.id), item);
  }
  const advisories = blockingAdvisories(report);
  const counts = report.metadata?.vulnerabilities ?? {};
  if (advisories.length === 0 && ((counts.high ?? 0) > 0 || (counts.critical ?? 0) > 0)) {
    failures.push('npm audit counts high/critical vulnerabilities but no advisory could be identified');
  }
  for (const advisory of advisories) {
    const exception = usable.get(advisory.id);
    const label = `${advisory.id} (${advisory.severity}, ${advisory.package}): ${advisory.title}`;
    if (!exception) failures.push(label);
    else if (exception.reviewBy < today) failures.push(`${label} — exception expired on ${exception.reviewBy}; review it`);
    else notices.push(`Accepted until ${exception.reviewBy}: ${label}`);
  }
  const reported = new Set(advisories.map((a) => a.id));
  for (const id of usable.keys()) {
    if (!reported.has(id)) notices.push(`Exception ${id} no longer matches any advisory; remove it from scripts/audit-exceptions.json`);
  }
  return { ok: failures.length === 0, failures, notices };
}

function runAudit() {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  // npm audit exits 1 whenever it finds anything, so the exit code is not the verdict.
  try {
    return JSON.parse(result.stdout);
  } catch {
    process.stderr.write(result.stderr ?? '');
    return null;
  }
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const exceptions = JSON.parse(readFileSync(path.join(root, 'scripts', 'audit-exceptions.json'), 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  const { ok, failures, notices } = evaluateAudit(runAudit(), exceptions, today);
  for (const notice of notices) console.log(`audit-gate: ${notice}`);
  for (const failure of failures) console.error(`audit-gate: BLOCKED ${failure}`);
  console.log(ok ? 'audit-gate: OK' : 'audit-gate: FAILED');
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
