/**
 * Apply the `settings.json` merge decisions (item 25, FR-20 to FR-24,
 * criterion 5.1). Works on a copy of the local settings: keys the scaffold
 * does not own, and the order of everything, are kept; only the decided
 * rules and hook entries change.
 */

import { hookScript } from './settings-hooks.js';

function hookKeyOf(event, inner) {
  const script = hookScript(inner?.command);
  return script ? `${event} ${script}` : null;
}

function splitEntry(entry) {
  const { matcher, ...inner } = entry;
  return { matcher, inner };
}

function addRule(settings, type, rule) {
  settings.permissions ??= {};
  settings.permissions[type] ??= [];
  if (!settings.permissions[type].includes(rule)) settings.permissions[type].push(rule);
}

function removeRule(settings, type, rule) {
  const list = settings.permissions?.[type];
  if (Array.isArray(list)) settings.permissions[type] = list.filter((r) => r !== rule);
}

function removeHook(settings, event, key) {
  const groups = settings.hooks?.[event];
  if (!Array.isArray(groups)) return;
  for (const group of groups) {
    if (Array.isArray(group?.hooks)) group.hooks = group.hooks.filter((inner) => hookKeyOf(event, inner) !== key);
  }
  settings.hooks[event] = groups.filter((group) => !Array.isArray(group?.hooks) || group.hooks.length > 0);
  if (settings.hooks[event].length === 0) delete settings.hooks[event];
}

function addHook(settings, event, entry) {
  const { matcher, inner } = splitEntry(entry);
  settings.hooks ??= {};
  settings.hooks[event] ??= [];
  const group = settings.hooks[event].find((g) => Array.isArray(g?.hooks) && g.matcher === matcher);
  if (group) group.hooks.push(inner);
  else settings.hooks[event].push(matcher === undefined ? { hooks: [inner] } : { matcher, hooks: [inner] });
}

function replaceHook(settings, event, key, entry) {
  const { matcher, inner } = splitEntry(entry);
  const groups = settings.hooks?.[event] ?? [];
  for (const group of groups) {
    const index = Array.isArray(group?.hooks) ? group.hooks.findIndex((h) => hookKeyOf(event, h) === key) : -1;
    if (index === -1) continue;
    if (group.matcher === matcher) {
      group.hooks[index] = inner;
      return;
    }
    // The matcher changed: the hook moves to the group for its new matcher.
    removeHook(settings, event, key);
    addHook(settings, event, entry);
    return;
  }
  addHook(settings, event, entry);
}

/**
 * @param {object} local    parsed local settings.json (not modified)
 * @param {object[]} changes  from decideSettingsMerge
 * @returns {object} the merged settings
 */
export function applySettingsChanges(local, changes) {
  const settings = JSON.parse(JSON.stringify(local ?? {}));
  for (const change of changes) {
    if (change.kind === 'rule' && change.op === 'add') addRule(settings, change.type, change.rule);
    if (change.kind === 'rule' && change.op === 'remove') removeRule(settings, change.type, change.rule);
    if (change.kind === 'hook' && change.op === 'add') addHook(settings, change.event, change.entry);
    if (change.kind === 'hook' && change.op === 'replace') replaceHook(settings, change.event, change.key, change.entry);
    if (change.kind === 'hook' && change.op === 'remove') removeHook(settings, change.event, change.key);
  }
  return settings;
}

/** 2-space JSON with a final newline, as `create` writes it (FR-24). */
export function serializeSettings(settings) {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
