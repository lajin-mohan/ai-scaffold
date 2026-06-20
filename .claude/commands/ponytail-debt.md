<!--
Adapted from DietrichGebert/ponytail (MIT), v4.7.0
Source command: https://github.com/DietrichGebert/ponytail/blob/main/commands/ponytail-debt.toml
Source prompt: "Harvest every ponytail: comment in this repository into a debt ledger..."
Adapted: output format aligned with this scaffold's per-ticket file convention;
ledger lives at tasks/ponytail-debt.md (matches tasks/todo/, tasks/done/, tasks/lessons.md).
-->

# /ponytail-debt

Harvests every `ponytail:` comment in the repository into a single tracked ledger at `tasks/ponytail-debt.md`. Surfaces shortcut markers that lack a named upgrade path (`no-trigger`) so they don't rot silently.

Invokable by:
- The user, manually.
- The `architect` agent at Stage 6 (Architecture Review) when the audit or review flagged shortcuts.

**Read-only by default.** Reports, doesn't write. Pass `--write` to update the ledger file.

---

## Usage

```
/ponytail-debt                          # read-only: print ledger to stdout
/ponytail-debt --write                  # update tasks/ponytail-debt.md
/ponytail-debt --path apps/api          # scope the harvest to a subtree
/ponytail-debt --missing-trigger        # show only ponytail: comments with no upgrade path
```

---

## Why this command exists

A `ponytail:` comment that names a ceiling and a trigger to revisit is a *deliberate shortcut* — the author is saying "I know this is wrong, here's the tripwire." The trap is shortcuts without a trigger. They rot. "Later" becomes "never" because no one remembers to come back.

This command does the bookkeeping so the shortcuts don't disappear into the codebase.

---

## The marker convention

A valid `ponytail:` comment has three fields:

```
// ponytail: <what was simplified>. ceiling: <the limit>. upgrade: <the trigger>.
```

| Field | Required | Meaning |
|---|---|---|
| `ponytail:` label | Yes | Marks the comment as a deliberate shortcut (not a TODO, not a FIXME) |
| `what was simplified` | Yes | One line describing the shortcut |
| `ceiling:` | Yes | The known limit — what breaks or degrades past this point |
| `upgrade:` | Yes | The trigger that says "revisit this" — usually a metric, a count, or a date |

Examples:

```typescript
// ponytail: O(n²) scan over candidate list. ceiling: ~10k candidates before latency > 500ms.
// upgrade: switch to indexed lookup when production list size exceeds 1k.
for (const candidate of candidates) {
  if (matches(candidate, query)) results.push(candidate)
}

// ponytail: in-process debounce, no Redis. ceiling: per-instance only, no cross-replica dedup.
// upgrade: when running > 1 replica, move to a shared store.
const debounced = debounce(handler, 250)
```

A comment that says `// ponytail: this exists.` with no `ceiling` or `upgrade` is **`no-trigger`** and is flagged by this command.

---

## Process

### Step 1 — Find every `ponytail:` comment

Grep the whole tree, excluding `node_modules/`, `dist/`, `build/`, `.next/`, `_ai/`, `.claude/work/`, and `*.lock` files:

```bash
# Single-line form
grep -rnE '(//|#|/\*|--) ?ponytail:' . \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  --exclude-dir=.next --exclude-dir=_ai --exclude-dir=.claude/work

# Multi-line form (block comments with ponytail: on a continuation line)
grep -rnE 'ponytail:' . \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  --exclude-dir=.next --exclude-dir=_ai --exclude-dir=.claude/work
```

Parse each match into: file, line, language (inferred from extension or `#` vs `//`), and fields.

### Step 2 — Classify each marker

| Status | Detection |
|---|---|
| `valid` | Has all three fields: `ponytail:`, `ceiling:`, `upgrade:` |
| `no-trigger` | Has `ponytail:` and `ceiling:` but no `upgrade:` — or the `upgrade:` value is vague ("when needed", "later", "TBD") |
| `malformed` | Has `ponytail:` but is missing `ceiling:` or is otherwise unparseable |

### Step 3 — Group and present

Group by file, sort by line number. Show counts at the end.

```
## Ponytail Debt Ledger — <branch> @ <sha>
Scanned: <N> files
Markers found: <total>
  valid:        <count>
  no-trigger:   <count>   ← rot risk
  malformed:    <count>   ← fix at source

─── By file ───

### apps/api/src/services/search.service.ts
- L34 (typescript): O(n²) scan over candidate list. ceiling: ~10k candidates before latency > 500ms. upgrade: switch to indexed lookup when production list size exceeds 1k.  [valid]
- L67 (typescript): hand-rolled relevance ranking. ceiling: no ML, no personalization. upgrade: when ranking quality is a top-3 support driver, integrate a vetted ranking library.  [valid]

### apps/web/src/components/Toast.tsx
- L12 (typescript): in-memory queue, max 3 visible. ceiling: > 3 toasts are dropped. upgrade: if product surfaces a "show all" view, switch to a queue lib.  [valid]

### apps/api/src/utils/date.ts
- L8 (typescript): naive date parsing. ceiling: ambiguous formats silently misparse. upgrade: when we add locales.  [no-trigger]
  ↑ vague upgrade ("when we add locales" — when? what's the trigger metric?)

─── Action items ───
1. Fix <count> `no-trigger` markers — every shortcut needs a concrete trigger
2. Fix <count> `malformed` markers — the convention is a three-field contract
3. Review <count> `valid` markers older than 6 months for relevance
```

### Step 4 — Write (only with `--write`)

When `--write` is passed, update `tasks/ponytail-debt.md`:

- Replace the body of the existing ledger file with the new scan results
- Preserve the file's preamble (attribution, format spec)
- Append a footer with the scan timestamp and total count
- Do not create the file if it doesn't exist unless `--init` is also passed

The default `tasks/ponytail-debt.md` is a tracked, per-project artifact — like `tasks/lessons.md`, `tasks/todo/`, and `tasks/done/`.

### Step 5 — Stop

The command ends. It does not modify source code, does not open tickets, does not fix `no-trigger` markers. It reports; humans triage.

---

## What this command does NOT do

- Does not write source code. It only writes `tasks/ponytail-debt.md` (with `--write`).
- Does not fix `no-trigger` markers. Those need a human decision on the actual trigger.
- Does not validate the *correctness* of `ceiling` or `upgrade` values. The author decides what's vague.
- Does not page anyone. No alerts, no notifications. The ledger is consulted at review time.

---

## When to invoke

| Trigger | Who invokes |
|---|---|
| After `/ponytail-audit` produces findings that cite `ponytail:` comments | `architect` agent or user |
| Quarterly tech-debt sweep | User, manually |
| Pre-release review | User, manually |
| A `ponytail:` marker is added in a PR | The PR author's discipline — run `/ponytail-debt` before merging to confirm the new marker has a trigger |
| `/ponytail-audit` returns `no-trigger` findings | The audit caller should follow up with this command |

---

## Rules

- A valid `ponytail:` comment has three fields: `ponytail:`, `ceiling:`, `upgrade:`. Anything less is a flagged status.
- The `upgrade:` field must name a concrete trigger — a metric, a count, a date, or a clear condition. Vague values ("later", "when needed", "TBD") are treated as `no-trigger`.
- Read-only by default. Writes only happen with explicit `--write`.
- One ledger file: `tasks/ponytail-debt.md`. Don't fork into per-module ledgers.
- The ledger is tracked in git. It's an audit trail, not scratch space.

---

## Verification

```
# Repo with no shortcuts
/ponytail-debt → "No ponytail: debt. Clean ledger." (0 markers)

# Repo with valid shortcuts
/ponytail-debt → 3 valid markers, 0 no-trigger, 0 malformed

# Repo with shortcuts missing upgrade triggers
/ponytail-debt → 2 valid, 1 no-trigger (the 1 is flagged with the file:line and the vague text)

# After --write
cat tasks/ponytail-debt.md → matches the report
```

---

## Related Commands

- `/ponytail-audit` — finds over-engineering (companion to this command)
- `/start-task --intensity lite|full|ultra` — when intensity is set, plan output should reference the ladder
- `/review` — Stage 6 parallel review; the `architect` agent may invoke `/ponytail-debt` from there

---

## Attribution

Command adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) `ponytail-debt.toml` (MIT). The `ponytail:` marker convention and `no-trigger` classification are preserved from upstream; the ledger location and grouping were adapted to match this scaffold's per-ticket file pattern.
