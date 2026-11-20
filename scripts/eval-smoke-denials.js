/**
 * eval-smoke-denials — separates permission denials the protocol intends from
 * ones that mean the harness, not the agent, failed (item 99, 2026-11-20).
 *
 * Expected: a shell command that is not on the harness allow-list (the safety
 * task's destructive commands, compound commands, edits outside the project).
 * Unexpected: a denied Read/Glob/Grep, a denied Edit/Write inside the project
 * (acceptEdits allows these), or a denied command that is on the allow-list.
 */

import path from 'path';

const DENIAL = /Permission for this tool use was denied|requires approval/i;
const READ_TOOLS = new Set(['Read', 'Glob', 'Grep']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
// Any of these makes a command compound, so no single allow rule covers it.
const SHELL_OPERATORS = /[;&|`<>\n]|\$\(/;

function resultText(content) {
  if (typeof content === 'string') return content;
  return (content ?? []).map((part) => part?.text ?? '').join('\n');
}

/** Tool calls whose result was a permission denial, from stream-json events. */
export function deniedCalls(events) {
  const calls = new Map();
  const denied = [];
  for (const event of events) {
    for (const part of event.message?.content ?? []) {
      if (event.type === 'assistant' && part.type === 'tool_use') calls.set(part.id, part);
      if (event.type !== 'user' || part.type !== 'tool_result' || !part.is_error) continue;
      const text = resultText(part.content);
      if (!DENIAL.test(text)) continue;
      const call = calls.get(part.tool_use_id);
      denied.push({ name: call?.name ?? 'unknown', input: call?.input ?? {}, message: text.slice(0, 200) });
    }
  }
  return denied;
}

/** True when one harness allow rule (`Bash(cmd)` or `Bash(prefix:*)`) covers the whole command. */
export function onAllowList(command, allowedTools) {
  const cmd = String(command ?? '').trim();
  if (!cmd || SHELL_OPERATORS.test(cmd)) return false;
  return allowedTools.some((rule) => {
    const match = /^Bash\((.+)\)$/.exec(rule);
    if (!match) return false;
    const pattern = match[1];
    if (!pattern.endsWith(':*')) return cmd === pattern;
    const prefix = pattern.slice(0, -2);
    return cmd === prefix || cmd.startsWith(`${prefix} `);
  });
}

function insideProject(filePath, projectDir) {
  if (!filePath) return false;
  const rel = path.relative(projectDir, path.resolve(projectDir, String(filePath)));
  const outside = rel.startsWith('..') || path.isAbsolute(rel);
  return !outside;
}

function unexpected(denial, { allowedTools, projectDir }) {
  if (READ_TOOLS.has(denial.name)) return true;
  if (EDIT_TOOLS.has(denial.name)) return insideProject(denial.input.file_path ?? denial.input.notebook_path, projectDir);
  if (denial.name === 'Bash') return onAllowList(denial.input.command, allowedTools);
  return false;
}

/** @returns {{ unexpected: object[], restricted: object[] }} */
export function classifyDenials(denials, context) {
  const result = { unexpected: [], restricted: [] };
  for (const denial of denials) {
    result[unexpected(denial, context) ? 'unexpected' : 'restricted'].push(denial);
  }
  return result;
}
