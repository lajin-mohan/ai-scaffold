/**
 * `settings.json` merge (item 25, HLD §5, BRD FR-20 to FR-24, FR-34 to
 * FR-36, FR-39). Pure. One decision function feeds both the preview (groups
 * of rule strings and hook keys, never file contents) and the apply (the
 * concrete changes), so the two cannot disagree (criterion 5.1).
 */

import { UpdateError } from './update-policy.js';
import { entryJson, extractHooks, indexHooks } from './settings-hooks.js';

const RULE_TYPES = ['allow', 'deny', 'ask'];
const PROTECTIVE = new Set(['deny', 'ask']);
// Groups whose rules an apply writes. Under an unknown base only deny/ask
// are added (FR-35); allow rules stay suggestions.
const WRITES = new Set(['added', 'restored', 'missingNoBase']);

function emptyGroups(base) {
  return {
    base, added: [], replaced: [], restored: [], missingNoBase: [], exceptions: [],
    removed: [], reported: [], ambiguous: [], suggestions: [],
  };
}

function rulesOf(settings, type) {
  const list = settings?.permissions?.[type];
  return Array.isArray(list) ? list.filter((rule) => typeof rule === 'string') : [];
}

/** The scaffold-contributed subset recorded as settingsBase (FR-34). */
export function scaffoldSubset(settings) {
  return {
    permissions: Object.fromEntries(RULE_TYPES.map((type) => [type, rulesOf(settings, type)])),
    hooks: extractHooks(settings).map(({ event, script, entry }) => ({ event, script, entry })),
  };
}

/**
 * Exceptions after this run's flags: recorded ones, plus --keep-removed,
 * minus --restore-removed. Flags must name a shipped deny/ask rule (FR-39).
 */
export function effectiveExceptions({ recorded = {}, keepRemoved = [], restoreRemoved = [], scaffold }) {
  const shipped = new Set(['deny', 'ask'].flatMap((type) => rulesOf(scaffold, type)));
  const unknown = [...keepRemoved, ...restoreRemoved].filter((rule) => !shipped.has(rule));
  if (unknown.length > 0) {
    throw new UpdateError('EXCEPTION_UNKNOWN_RULE', `Not a deny or ask rule the scaffold ships: ${unknown.join(', ')}`);
  }
  const exceptions = new Set(['deny', 'ask'].flatMap((type) => (Array.isArray(recorded[type]) ? recorded[type] : [])));
  for (const rule of keepRemoved) exceptions.add(rule);
  for (const rule of restoreRemoved) exceptions.delete(rule);
  const dropped = [...exceptions].filter((rule) => !shipped.has(rule)).sort();
  for (const rule of dropped) exceptions.delete(rule);
  return { exceptions, dropped };
}

function mergeRules({ groups, changes }, { local, scaffold, base, exceptions, retired }) {
  for (const type of RULE_TYPES) {
    const have = new Set(rulesOf(local, type));
    const ship = new Set(rulesOf(scaffold, type));
    const was = base ? new Set(base.permissions?.[type] ?? []) : null;
    for (const rule of ship) {
      if (have.has(rule)) continue;
      const label = `${type}: ${rule}`;
      let group = null;
      if (PROTECTIVE.has(type) && exceptions.has(rule)) group = 'exceptions';
      else if (!was) group = PROTECTIVE.has(type) ? 'missingNoBase' : 'suggestions';
      else if (!was.has(rule)) group = 'added';
      else if (PROTECTIVE.has(type)) group = 'restored';
      if (!group) continue;
      groups[group].push(label);
      if (WRITES.has(group)) changes.push({ kind: 'rule', op: 'add', type, rule });
    }
    for (const rule of have) {
      if (ship.has(rule)) continue;
      if (retired.has(rule)) {
        groups.removed.push(`${type}: ${rule}`);
        changes.push({ kind: 'rule', op: 'remove', type, rule });
      }
      else if (was?.has(rule)) groups.reported.push(`${type}: ${rule} (no longer shipped)`);
    }
  }
}

function mergeHook({ groups, changes }, key, { local, base, ship, baseKnown }) {
  if (local.length > 1 || base.length > 1 || ship.length > 1) {
    groups.ambiguous.push(`hook: ${key}`);
    return;
  }
  const [mine, was, next] = [local[0], base[0], ship[0]].map((h) => (h ? entryJson(h.entry) : null));
  if (!baseKnown) {
    if (!mine) groups.suggestions.push(`hook: ${key}`);
    else if (mine !== next) groups.reported.push(`hook: ${key} (differs from the scaffold)`);
    return;
  }
  if (was === next || mine === next) return;
  if (!mine) {
    if (!was) {
      groups.added.push(`hook: ${key}`);
      changes.push({ kind: 'hook', op: 'add', key, event: ship[0].event, entry: ship[0].entry });
    }
    return;
  }
  if (mine === was) {
    groups.replaced.push(`hook: ${key}`);
    changes.push({ kind: 'hook', op: 'replace', key, event: ship[0].event, entry: ship[0].entry });
  } else {
    groups.reported.push(`hook: ${key} (locally modified)`);
  }
}

function mergeHooks(out, { local, scaffold, base, retired }) {
  const { groups, changes } = out;
  const mine = indexHooks(extractHooks(local));
  const ship = indexHooks(extractHooks(scaffold));
  const baseHooks = Array.isArray(base?.hooks) ? base.hooks : [];
  const was = indexHooks(baseHooks.map((h) => ({ ...h, key: `${h.event} ${h.script}` })));
  for (const key of ship.keys()) {
    mergeHook(out, key, { local: mine.get(key) ?? [], base: was.get(key) ?? [], ship: ship.get(key), baseKnown: Boolean(base) });
  }
  for (const key of mine.keys()) {
    if (ship.has(key)) continue;
    if (retired.has(key)) {
      groups.removed.push(`hook: ${key}`);
      changes.push({ kind: 'hook', op: 'remove', key, event: mine.get(key)[0].event });
    }
    else if (was.has(key)) groups.reported.push(`hook: ${key} (no longer shipped)`);
  }
}

/**
 * @param {{ local: object|null, localValid: boolean, scaffold: object,
 *   baseState: 'recorded'|'derived'|'unknown', recordedBase?: object,
 *   exceptions: Set<string>, retired?: { rules?: string[], hooks?: string[] } }} input
 * @returns {{ groups: object, changes: object[] }|null} null when local
 *   settings.json is not valid JSON
 */
export function decideSettingsMerge({ local, localValid, scaffold, baseState, recordedBase, exceptions, retired = {} }) {
  if (!localValid) return null;
  let base = null;
  if (baseState === 'recorded') base = recordedBase;
  if (baseState === 'derived') base = scaffoldSubset(local);
  const out = { groups: emptyGroups(baseState), changes: [] };
  mergeRules(out, { local, scaffold, base, exceptions, retired: new Set(retired.rules ?? []) });
  mergeHooks(out, { local, scaffold, base, retired: new Set(retired.hooks ?? []) });
  for (const key of Object.keys(out.groups)) {
    if (Array.isArray(out.groups[key])) out.groups[key].sort();
  }
  return out;
}

/** The preview's view: groups only. */
export function previewSettingsMerge(input) {
  return decideSettingsMerge(input)?.groups ?? null;
}
