/**
 * Hook identity and extraction for the settings merge (item 25, HLD §5,
 * BRD FR-36). A scaffold hook is keyed by (event, script); the matcher is
 * part of the compared entry, not the key.
 */

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SHELLS = new Set(['bash', 'sh']);
const PROJECT_DIR_PREFIX = /^(\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\})\//;

function unquote(token) {
  return token.replace(/^(['"])(.*)\1$/, '$2');
}

/**
 * The scaffold script a hook command runs, or null for an adopter hook
 * whose command cannot be parsed.
 */
export function hookScript(command) {
  if (typeof command !== 'string') return null;
  const tokens = command.trim().split(/\s+/).map(unquote);
  let i = 0;
  while (i < tokens.length && ENV_ASSIGNMENT.test(tokens[i])) i++;
  if (SHELLS.has(tokens[i])) i++;
  for (; i < tokens.length; i++) {
    const candidate = tokens[i].replace(PROJECT_DIR_PREFIX, '').replace(/^\.\//, '');
    if (candidate.startsWith('.claude/hooks/') && candidate.length > '.claude/hooks/'.length) return candidate;
  }
  return null;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

/** Canonical JSON of a hook entry (matcher plus the inner hook), for equality. */
export function entryJson(entry) {
  return JSON.stringify(canonical(entry));
}

/**
 * Inner hooks of a settings object that name a scaffold script.
 * @returns {Array<{ key: string, event: string, script: string, entry: object }>}
 */
export function extractHooks(settings) {
  const hooks = [];
  const events = settings?.hooks;
  if (!events || typeof events !== 'object') return hooks;
  for (const [event, groups] of Object.entries(events)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      for (const inner of Array.isArray(group?.hooks) ? group.hooks : []) {
        const script = hookScript(inner?.command);
        if (!script) continue;
        const entry = group.matcher === undefined ? { ...inner } : { matcher: group.matcher, ...inner };
        hooks.push({ key: `${event} ${script}`, event, script, entry });
      }
    }
  }
  return hooks;
}

/** Group extracted hooks by key; a key held more than once is ambiguous. */
export function indexHooks(hooks) {
  const index = new Map();
  for (const hook of hooks) {
    const list = index.get(hook.key) ?? [];
    list.push(hook);
    index.set(hook.key, list);
  }
  return index;
}
