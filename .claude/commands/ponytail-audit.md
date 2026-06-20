<!--
Adapted from DietrichGebert/ponytail (MIT), v4.7.0
Source command: https://github.com/DietrichGebert/ponytail/blob/main/commands/ponytail-audit.toml
Source prompt: "Audit the entire repository for over-engineering only..."
Adapted: severity labels merged with this scaffold's BLOCK/WARN/NIT system;
tag taxonomy preserved from upstream.
-->

# /ponytail-audit

Whole-repo scan for over-engineering. Identifies what can be **deleted**, replaced by **stdlib**, replaced by a **native platform feature**, or shrunk to **fewer lines**. Does not check correctness, security, or tests — that's `/review`.

Invokable by:
- The user, manually.
- The `architect` agent at Stage 6 (Architecture Review) **only when over-engineering is suspected** — not on every review.

---

## Usage

```
/ponytail-audit                                # scan the whole tree
/ponytail-audit --path apps/api                # scan a subtree
/ponytail-audit --top 20                       # limit findings to top 20 by cut size
/ponytail-audit --since main                   # only files changed since the main branch
```

---

## What this command does

Walks the whole repository, ranks each finding by the size of the cut it suggests, and produces a report. The report is the deliverable. **The command does not modify code.**

This complements `/review` (which finds what is wrong) by finding what is **unnecessary**. Different lens, same discipline.

---

## Process

### Step 1 — Scope the scan

| Flag | Effect |
|---|---|
| *(no flag)* | Whole tree, excluding `node_modules/`, `dist/`, `build/`, `.next/`, `_ai/`, `.claude/work/` |
| `--path <dir>` | Limit to `<dir>` and its descendants |
| `--top <N>` | Show only the top N findings, ranked by estimated lines removable |
| `--since <ref>` | Limit to files changed since `<ref>` (e.g., `main`, `HEAD~10`, a tag) |

### Step 2 — Apply the cut-tag taxonomy

For each candidate finding, assign one tag. The tags describe *what kind of cut*, not *what's wrong with the code*.

| Tag | Meaning | Example |
|---|---|---|
| `delete` | Dead code, speculative feature, "for later" scaffolding with no current consumer | An unused export, a config knob for a value that never changes, an interface with one implementation |
| `stdlib` | Reinvented what the standard library already does | A custom `camelCase` helper when `String.prototype` covers it; a hand-rolled debounce when `requestIdleCallback` is fine |
| `native` | A dependency doing what the platform does | A date-picker library when `<input type="date">` suffices; a UUID lib when `crypto.randomUUID()` is available |
| `yagni` | Abstraction with one implementation, or one-call-site helper | An interface with one concrete; a factory for a single product; a config layer for values that are constant |
| `shrink` | Same logic, fewer lines, no behavior change | A 30-line function that does what a 10-line function does; a class that should be a function |

Severity is reported alongside the tag using this scaffold's existing labels:

| Severity | When to use |
|---|---|
| `BLOCK` | The finding must be addressed before the next commit lands on `dev`. Speculative feature scaffolding, dead code with no path forward. |
| `WARN` | Should be addressed in the current sprint. YAGNI abstractions, stdlib reinvention. |
| `NIT` | Optional. Shrink opportunities, one-liner opportunities. |

### Step 3 — Rank findings

Rank by `(estimated_lines_removed × severity_weight)`, descending. Severity weights:

```
BLOCK = 10
WARN  = 3
NIT   = 1
```

Top of the list = biggest reduction in code, most worth doing first.

### Step 4 — Output the report

```
## Ponytail Audit — <branch> @ <sha>
Scanned: <N> files, <M> LOC (excluded: node_modules, dist, .claude/work)
Findings: <count> (<block> BLOCK, <warn> WARN, <nit> NIT)
Estimated cuttable: <LOC> lines, <N> dependencies

─── Findings (ranked by cut × severity) ───

[BLOCK-01] yagni — apps/api/src/services/interfaces/IUserService.ts:1-12
  Interface with one implementation (UserService.ts). Delete the interface, keep the concrete, inject the concrete via DI.
  Estimated cut: ~15 lines, 1 file

[WARN-02] stdlib — packages/shared/src/utils/camelCase.ts:1-20
  Hand-rolled camelCase helper. Use built-in string ops or import a vetted utility (we already have `lodash`).
  Estimated cut: ~20 lines, 1 file (or replaced with 1-line import)

[NIT-03] shrink — apps/web/src/components/Button.tsx:30-58
  28-line styled component that does what a 6-line token-driven class does. See design-system tokens.
  Estimated cut: ~22 lines, 1 file

─── Summary ───
BLOCK: 1
WARN:  1
NIT:   1
Total cuttable: ~57 lines across 3 files (plus 0 dependencies)

─── Recommendation ───
[BLOCK-01] is the only finding that blocks. Fix in the next commit.
[WARN-02] and [NIT-03] are backlog candidates — add tickets or address in current sprint.
If findings < 3: 'Lean already. Ship.'
```

### Step 5 — Stop

The command ends with the report. No code changes, no commit suggestions, no auto-fixes. The team decides what to address.

---

## What this command does NOT do

- Does not check correctness. A finding of `stdlib` means "stdlib also works here" — it does not mean "this code is buggy."
- Does not check security. SQL injection, tenant isolation, and auth are out of scope. Use `/review` for those.
- Does not check tests. Test coverage is `/health` and `/qa-review`. This command does not flag missing tests.
- Does not modify any file. Report only.

---

## When to invoke

| Trigger | Who invokes |
|---|---|
| Periodic repo health check (monthly or pre-release) | User, manually |
| `/review` produced a `WARN` about over-engineering | `architect` agent may run `/ponytail-audit` to confirm scope |
| Architecture Review (Stage 6) finds abstract-for-abstractness | `architect` agent may run `/ponytail-audit` on the affected module |
| PR description cites this command | Either party |

Do not run on every review by default — the scan is repo-wide and adds minutes. Use when there's signal.

---

## Rules

- Report only. Never modify code from this command.
- Rank by cut × severity. Don't dump findings unsorted.
- When no findings exist, say so explicitly: "Lean already. Ship."
- Each finding cites `file:line` per [ai-coding-rules.md H2](./../rules/ai-coding-rules.md).
- Severity labels follow this scaffold's BLOCK / WARN / NIT convention, **not** ponytail's upstream language.
- The `ponytail:` shortcut markers found during the scan are reported separately as input to `/ponytail-debt`.

---

## Verification

```
# Empty repo (no findings)
/ponytail-audit → "Lean already. Ship." (0 findings)

# Repo with deliberate over-engineering
/ponytail-audit → 3 findings ranked, top one BLOCK, summary with cuttable LOC

# Path-scoped
/ponytail-audit --path packages/shared → only flags in that subtree
```

---

## Related Commands

- `/review` — correctness, security, performance, code quality (parallel agents)
- `/health` — code quality dashboard (composite score)
- `/ponytail-debt` — shortcut debt ledger (companion to this audit)
- `/start-task --intensity ultra` — runs the ladder during plan+execute (per-task, not session-wide)

---

## Attribution

Command adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) `ponytail-audit.toml` (MIT). Tag taxonomy (`delete` / `stdlib` / `native` / `yagni` / `shrink`) preserved from upstream. Severity labels added on top to match this scaffold's review system.
