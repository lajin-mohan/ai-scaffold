# High-Level Design — Safe `ais update` (item 25)

**Date:** 2026-10-09 · **Revised:** 2026-10-15 (v2.2, round-3 consistency reconciliation)
**Author:** Claude (Code session)
**Status:** **Draft v2.2.**
- Round 1 (`docs/architecture/review-25-ais-update.md`): REVISE; all
  findings addressed in v2.
- Round 2: APPROVE WITH CHANGES (1 BLOCK, 4 WARN, NITs); all applied in
  v2.1.
- Round 3 (2026-10-15, maintainer-supplied review): BRD/ADR/HLD
  contradictions, preview writing during recovery, the unspecified FR-20
  opt-out, and concurrent runs. Reconciled in v2.2 (documentation only).
- Awaiting maintainer approval. The FR-20 decision is made: restore by
  default, with persisted per-rule exceptions (FR-39).
**Spec:** `docs/brd/25-ais-update-brd.md` v1.3. B1 and B5 were approved
2026-10-12; the *(C)* and v1.3 clarifications are pending re-confirmation.
**Decisions:** ADR-002 (ownership contract, accepted); **ADR-007** (update
classification and apply semantics, proposed, revised with this HLD).
**Estimate:** `docs/estimates/25-ais-update-estimate.md` (re-cut for v2).

---

## 1. Overview

`ais update` turns the running CLI's templates and the project's
`.ai-scaffold.json` into a per-file plan. It previews the plan by default and,
with `--apply`, executes it transactionally.

Five properties carry the design:
1. **It only touches what it owns (B1).** The universe is the managed set:
   `.claude/**`, `.ai-scaffold/**`, `CLAUDE.md`, `AGENTS.md` and
   `constitution.md`, minus user-data. Every other path is `skip-unowned`,
   even when `create` recorded it in `managedFiles`.
2. **Rendering is shared with `create`, in the original install mode (B2).**
   The update render of a file is exactly what that project's `create` or
   `init` wrote, so "pristine" means "equals what we wrote".
3. **Classification is pure.** Ownership comes from a rule table, and the
   action from three contents: recorded (R), current (C) and new render (N).
4. **What is recorded after apply never erases an edit (B3).**
5. **Apply is a persisted journal (B4).** If the process dies, the next run
   reports it instead of misclassifying. **Preview never writes**, in any
   state; only `--apply` holds the single-writer lock and mutates anything.

## 2. Module breakdown

New modules live in `src/cli/core/`. Each is ≤300 lines and depends only on
modules listed above it in this table.

| Module | Responsibility | Pure? |
|---|---|---|
| `ownership.js` | OC rule table (BRD §3), context-aware (FR-42). `classifyPath(rel, { installMode, recorded }) → 'user-data' \| 'seeded' \| 'managed' \| 'merged' \| 'unowned' \| 'excluded'` (`excluded`: `.ai-scaffold.json`, `.ai-scaffold/backups/**`, `.ai-scaffold/update.lock`, N3) | Yes |
| `hashing.js` | `hashRaw(buf)`, `hashLf(buf)`, `recordFor(buf) → { hash, hashLf? }`, `isPristine(buf, record)` per the bidirectional contract below (FR-09). `doctor` adopts it in a later slice | Yes |
| `render.js` | `renderPlannedFile(file, values, { now }) → Buffer`, **extracted from** `copy.js` `copySingle`/`generateFile`; `copy.js` writes what it returns. `now` is the injected clock (NFR-07) | Reads template |
| `manifest-values.js` | `valuesFromManifest(manifest) → values`, the inverse of `buildManifestData`. It maps `requirements.paths: []` back to `''` (`prompts.js:302`), the read-side fix for spike F1 (N6) | Yes |
| `settings-merge.js` | `mergeSettings({ local, scaffold, base, retired }) → { merged, changes, suggestions }` (§5) | Yes |
| `update-plan.js` | `buildUpdatePlan({ target, manifest, templateDir, renders }) → UpdatePlan` (§4) | Reads only |
| `file-plan.js` (changed) | New planning option `{ ignoreDisk: true }`. It skips every `pathExists` probe (`file-plan.js:230-240`, `:302-313`), so the plan is what the install mode **would** write, independent of what is on disk now (round 2, #1) | Reads templates |
| `migrations/index.js` + `migrations/<version>.js` | Ordered, idempotent migrations returning intents. The first one classifies, infers `install.mode`, seeds missing render inputs (W3) and records `settingsBase` (FR-26, FR-35) | Yes |
| `update-apply.js` | Lock, pre-flight, backup, persisted journal, pre-write re-check, temp-and-rename, rollback, `.ais-new`, manifest last, verified recovery (§6) | I/O |
| `git-state.js` | `dirtyPaths(target)` via the PATH-resolved `git` (item 94): `git -C <target> status --porcelain -z -- .`, with rename pairs and the subdirectory prefix handled (W4) | I/O |

`src/cli/commands/update.js` becomes thin orchestration: version policy, plan,
report or `--json`, apply, exit code.
- `--force` is **removed** (W6): it bypassed both version checks
  (`update.js:16,82,88`) and contradicted BR-01.
- `doctor.js` switches to `hashing.js` and adds the `.ais-new` warning (FR-31).

## 3. Data model

### Manifest additions (written by the first migration, `create`/`init`, and every apply)

```json
{
  "manifestSchema": 2,
  "install": { "mode": "create" },
  "managedFiles": [
    { "path": ".claude/rules/security-rules.md", "hash": "sha256:…", "class": "managed" }
  ],
  "settingsBase": {
    "permissions": { "allow": ["…"], "deny": ["…"], "ask": ["…"] },
    "hooks": [{ "event": "PreToolUse", "script": ".claude/hooks/pre-bash-quality-gate.sh", "entry": { "matcher": "Bash", "command": "bash .claude/hooks/pre-bash-quality-gate.sh", "timeout": 60 } }]
  },
  "settingsExceptions": { "deny": ["Read(.env.local)"], "ask": [] },
  "appliedMigrations": ["0.17.0"]
}
```

- **`class` precedence (N2):** a stored `class` wins; `classifyPath` applies
  only when it is absent, and only migrations rewrite it.
- **`install.mode` (B2):** written by `create` and `init` (FR-37), and inferred
  for older manifests by the first migration (FR-26). It is distinct from the
  existing `commands.install`.
  - **Inference (round 2, #4):** with `managedFiles`, a profile root file or a
    root `.gitattributes` among the records means `create` (true from 0.8.3,
    commit 09d3918); otherwise `init`.
  - **Without `managedFiles`** (pre-0.8.6) the mode is recorded as
    `unknown`. It plans as `init` with `ignoreDisk`, the narrower set. That is
    harmless, because such installs have no hashes, so nothing is replaced or
    removed anyway (§4).
- **`settingsBase` (B5):** the scaffold-contributed subset of `settings.json`
  at the last install or apply (FR-34).
- **`settingsExceptions` (FR-39, v2.2):** exact `deny`/`ask` rule strings the
  adopter chose to keep removed. Written only by a successful `--apply` that
  carried `--keep-removed` / `--restore-removed`. An exception whose rule the
  scaffold no longer ships, or a migration retires, is dropped at that apply
  and reported.
- **Hashing contract (FR-09, bidirectional):** sha256 over raw bytes;
  normalisation is CRLF → LF only, one non-overlapping pass (`\r\r\n` →
  `\r\n`; lone CR untouched). A line-ending-only change is pristine by design.
  When content has no CRLF, `hashLf` would equal `hash`, so it is omitted. Records keep `hash` (raw, as `create`
  writes today at `manifest.js:123-127`) and add `hashLf` **only when the
  content contains CRLF**, so manifests for today's LF-only templates are
  unchanged.

  | Recorded content | Current checkout | Matches via |
  |---|---|---|
  | LF | LF | raw = `hash` |
  | LF | CRLF | normalised(C) = `hash` |
  | CRLF | CRLF | raw = `hash` |
  | CRLF | LF | normalised(C) = `hashLf` (new records only) |
  | CRLF, legacy record without `hashLf` | LF | **no match → edited → never overwritten** (fails safe) |

- **Clock (NFR-07):** one injected `now`, every stamp in **UTC**. The clock
  call sites today:
  - `content-templates.js:67` `{{YEAR}}` (local `getFullYear()` → becomes
    `getUTCFullYear()`); it appears in `README.template.md`, which `init`
    renders to the managed `.ai-scaffold/README.md`;
  - `content-templates.js:303` MEMORY.md "Last updated" (user-data, never
    re-rendered by update);
  - `manifest.js:137` `today()` for `bootstrapCompletedAt`, `installedAt`,
    `updatedAt`.

  Install uses the real clock. **Update renders with the date in the
  manifest's `installedAt`**, falling back to `bootstrapCompletedAt`, then
  `updatedAt`, then today; the date chosen is persisted at apply so preview
  and apply agree. Slice 2 implements the injection; slice 3 applies the rule.
  The UTC switch changes `{{YEAR}}` only for installs made within the local
  offset of New Year.

### UpdatePlan

```ts
type Action = 'add' | 'replace' | 'unchanged' | 'conflict' | 'user-deleted'
            | 'remove' | 'orphan-kept' | 'drop-record'
            | 'skip-user-data' | 'skip-seeded' | 'skip-unowned' | 'merge'
interface PlanEntry { path: string; class: Class; action: Action; recordAfter: Hash | 'drop' | 'carry'; reason?: string }
interface UpdatePlan {
  from: string; to: string; profile: string; installMode: 'create' | 'init'
  hashed: boolean               // false before 0.8.6 (FR-03)
  entries: PlanEntry[]; migrations: string[]
  settings?: { added: string[]; restored: string[]; missingNoBase: string[]; exceptions: string[]
              removed: string[]; reported: string[]; ambiguous: string[]; suggestions: string[] }
  dirty: string[]; locked?: string; interrupted?: { backup: string; verifiable: boolean }   // FR-32, FR-38, FR-40
}
```

`--json` serialises `UpdatePlan` inside `buildDryRunPlan`'s envelope, with
`command: 'update'`.

## 4. Classification (decision table)

**Context-aware ownership (FR-42; round 2, #1):** ownership is computed from (path, install mode, recorded?) and never from the disk. In `init` and `unknown` modes, a path in `PROTECTED_PATHS` (`file-plan.js:104-126`) whose class is managed, **computed from that constant** (today `CLAUDE.md`, `AGENTS.md`, `constitution.md`), with **no** `managedFiles` record means `init` skipped a file the adopter already had. In `unknown` mode nothing is recorded, so those files are never updated; the slice 3 preview reports this. It is `unowned`: never planned, never `.ais-new`. One **with** a record is classified normally. User-data and seeded paths keep their class in every mode (they are never overwritten anyway). In `create` mode the table alone applies. Without `ignoreDisk`, the files `init` itself wrote (`CLAUDE.md`, `AGENTS.md`, `constitution.md`) would drop out of the plan and §4 row 7 would delete them; that was reproduced in review.

The class is resolved first: `excluded` → drop from the plan entirely;
`unowned` → `skip-unowned`; `user-data` → `skip-user-data` (record carried,
**file never read**); `seeded` → `add` if absent, else `skip-seeded` (**seeded
wins over user-deleted**, W1). For `managed`, with R = recorded hash, C =
current file and N = new render:

| # | C exists | R exists | In new plan | Condition | Action | Recorded after apply (B3) |
|---|---|---|---|---|---|---|
| 1 | yes | — | yes | **N equals C (evaluated first, W1)** | `unchanged` | hash(N) |
| 2 | yes | yes | yes | pristine(C, R) | `replace` | hash(N) |
| 3 | yes | yes | yes | not pristine | `conflict` → `.ais-new` | **hash(N)** (stays a conflict until the adopter takes N) |
| 4 | no | yes | yes | — | `user-deleted` | hash(N) (keeps the record, so not re-added; BR-05) |
| 5 | no | no | yes | — | `add` | hash(N) |
| 6 | yes | no | yes | (N ≠ C) | `conflict` (FR-08) | hash(N) |
| 7 | yes | yes | no | pristine | `remove` | drop |
| 8 | yes | yes | no | not pristine | `orphan-kept` | drop |
| 9 | no | yes | no | — | `drop-record` | drop |

- **pristine(C, R)** is `hashRaw(C) = R` or `hashLf(C) = R`.
- **Pre-0.8.6** (no `managedFiles`): every R is absent. Rows 1, 5 and 6 still
  apply, so a file already equal to N is `unchanged` and every other existing
  file is a `conflict`. **Nothing is ever replaced or removed**, which is what
  AC-07 asserts (W1).
- **Crash re-run (B4):** a file replaced or added before a crash now equals N,
  so row 1 applies, and a removed file is absent, so row 9 applies. The re-run
  converges without spurious conflicts. The journal check (FR-38) still
  reports the interruption first.
- `merged` (`settings.json`) goes through §5. Invalid JSON becomes a
  `conflict` with `.ais-new` (FR-24). After apply, the recorded hash is that
  of the merged file as written. A seeded `add` records hash(N).
- **`.ais-new` lifecycle:** a new conflict overwrites an existing
  `<file>.ais-new`. When the adopter has taken N (row 1), a leftover
  `.ais-new` is **reported as stale, never deleted**. `doctor` warns while any
  remain (FR-31).

## 5. `settings.json` merge (B5)

The **key** is (event, script) per **inner hook** (round 2, #3a; BRD FR-36
and ADR-007 aligned in v1.3 / revision 3). The matcher is part of the
compared entry, not the key, so a scaffold matcher change (e.g. adding
`MultiEdit`) replaces the hook instead of duplicating it.

**Ambiguity (v2.2):** if the local file, the base or the new scaffold holds
more than one inner hook with the same key, that key is **ambiguous**. Every
local entry with it is kept unchanged, nothing is added or removed for it,
and it is reported under `ambiguous` as a conflict (exit 2).

**Script parsing (FR-36, #3d):**
- strip leading `VAR=value` tokens, a leading `bash`/`sh`, surrounding quotes,
  `./` and `$CLAUDE_PROJECT_DIR/` (or `${CLAUDE_PROJECT_DIR}/`);
- the script is the first token naming a path under `.claude/hooks/`;
- example: `PRE_REVIEW_ALLOW_UNCONFIGURED=1 bash .claude/hooks/pre-review.sh`
  has the script `.claude/hooks/pre-review.sh`;
- a command that cannot be parsed is an **adopter hook** and is never touched.

**Entries and placement:**
- entries are compared as canonical JSON, with keys sorted (#3f);
- matcher groups are never replaced as a whole, so an adopter hook in the same
  group survives;
- an added hook goes into the existing group with the same event and matcher,
  otherwise into a new group (#3e).

| Item | In base? | In new scaffold? | Local state | Result |
|---|---|---|---|---|
| rule (deny/ask/allow) | no | yes | absent | **add** (FR-20, FR-21) |
| allow rule | yes | yes | absent | **not re-added**: the adopter removed it (FR-21) |
| deny/ask rule | yes | yes | absent, no exception | **restored**, listed in the report's `restored` group (FR-20) |
| deny/ask rule | yes | yes | absent, exception recorded | **kept absent**, listed under `exceptions` (FR-39) |
| deny/ask rule | no base recorded | yes | absent | **added**, listed under `missingNoBase` (FR-35) |
| any rule | — | retired by migration | present | **remove** (FR-23) |
| allow rule | yes | no | present | **kept** (no allow is ever removed) |
| hook | — | yes | base entry = new scaffold entry | **no-op**, whatever the local state (#3b) |
| hook | — | yes | local entry = base entry | **replace** with the new scaffold entry |
| hook | — | yes | local entry ≠ base entry | **report**, keep local (FR-22) |
| hook | no | yes | absent | **add** |
| hook | yes | yes | absent | **not re-added** (adopter removed it) |
| hook | — | retired | present | **remove** (FR-23) |
| rule or hook | yes | no, and not retired | present | **kept and reported** (#3c) |

**No base yet (FR-35):** if `settings.json` is hash-pristine, local is the base.
Otherwise only `deny`/`ask` are added, and new `allow` rules go to
`suggestions`.

The merge never touches keys it does not own (`env`, `model`, …). After apply,
`settingsBase` is rewritten from the new scaffold subset.

> **FR-20 decision (maintainer, 2026-10-15):** missing `deny`/`ask` rules are
> restored by default and every restoration is listed, separately from rules
> that are new in this version. An adopter who removed one deliberately records
> a **persisted per-rule exception** (FR-39): `--keep-removed "<rule>"`,
> undone with `--restore-removed "<rule>"`. A one-time skip flag was
> rejected, because it would re-prompt on every update or silently imply a
> permanent exemption. These rules are best-effort tool permissions, not a
> sandbox; documentation must not claim otherwise.

## 6. Apply sequence

```
update.js
 ├─ read manifest ─ version policy (FR-01, FR-02, FR-04)
 ├─ interrupted?  backup dir without `complete` marker:                         FR-38, r2#2, v2.2
 │     no --apply → report it (and whether it is verifiable) and exit 1. NO WRITES
 │     --apply → take the lock (below), then verify: the manifest hash and EVERY journaled
 │       path equal the journal's expected final state (hash or absence)
 │         all match → the apply finished: write the marker, report it, continue
 │         any mismatch → print the backup path and recovery steps (restore, or move the
 │           backup aside and re-run; row 1 makes the re-run converge) and exit 1
 ├─ migrations (from..to) → intents: classes, install.mode, defaults (W3), settingsBase
 ├─ values  = valuesFromManifest(manifest + migration defaults)
 ├─ plan0   = buildFilePlan(templatePath(profile), target, { existingTarget: install.mode === 'init', ignoreDisk: true })   B2, r2#1
 ├─ renders = plan0 files → renderPlannedFile(file, values)                  (in memory)
 ├─ plan    = buildUpdatePlan(...) + mergeSettings(...) + dirtyPaths()
 ├─ no --apply → report (§8) | --json → exit 0 / 2
 └─ --apply
     ├─ lock: create .ai-scaffold/update.lock exclusively (pid, time); exists → exit 1 naming it  FR-40
     │     (never broken automatically; released in `finally`; preview only reports a lock)
     ├─ refuse if dirty ∩ (writes ∪ deletes ∪ settings) ≠ ∅, .ais-new exempt   FR-32
     ├─ pre-flight: every target writable, containment checked (§7)           W7
     ├─ backup → .ai-scaffold/backups/<ts>/ (self-ignoring .gitignore, path printed)
     ├─ journal.json written to the backup dir BEFORE the first write          FR-38
     │     records from/to, every path with its expected final hash or absence, and the
     │     new manifest's hash (all computed before the first write)
     ├─ each write/delete: re-check the target equals what the plan classified   FR-41
     │     (hash or absence; settings.json against the content merged from); else stop → rollback
     ├─ then <file>.ais-tmp → fs-extra rename (graceful-fs retries EBUSY/EPERM on win32)
     ├─ on error: replay the journal in reverse from backup; exit 1, listing every path on rollback failure
     ├─ manifest → temp → rename (written last)
     ├─ `complete` marker written; stale `*.ais-tmp` swept on the next --apply
     └─ lock removed (finally)
```

- **Concurrency limits (v2.2):** the lock serialises `ais update` processes
  only. Editors and other tools are covered by the FR-41 re-check, which
  narrows but cannot close the window between check and rename; that residual
  race is accepted and documented. A stale lock (crashed run) is reported
  with its pid and time; the adopter removes it.

- **Backups:** the last 5 **completed** backups are kept (N4). A backup without a marker is never pruned (round 2, #2). Backups only ever contain files the
  plan writes or deletes, never user-data.
- **Exit codes:** 0 = clean or already current; 1 = error, downgrade or
  interrupted apply; 2 = conflicts present (FR-15, W6).

## 7. Security

- **No network** (BR-04). `git` is resolved through `PATH` only, via
  `exec-path.js` (item 94, which closes review N7). It runs as an array-form
  spawn with fixed arguments.
- **Containment (NFR-06, W5):** every path from templates, `managedFiles`
  and migrations is resolved and must stay inside the target. Absolute paths,
  `..`, anything under `.git/`, and any symlinked ancestor are rejected; the
  realpath of each parent is checked, not only the leaf.
- **User-data is never read** (FR-10), so it can't leak into reports, hashes or
  backups.
- **The merge cannot widen permissions silently (B5):** a removed `allow` is
  never re-added, and new `allow` rules without a base are suggestions only.
  A restored `deny`/`ask` (§5) only narrows permissions; keeping one removed
  requires an explicit, persisted, reported exception (FR-39).
- **Not a sandbox:** `permissions` rules are best-effort tool-level controls.
  A `Read(...)` deny does not stop shell access to the same file. The report,
  CLI help and docs describe them that way and never as an isolation boundary.
- **Single writer (FR-40) and pre-write re-check (FR-41)**, §6.
- `--force` is removed (W6).

## 8. Report (FR-13, N5)

Entries are grouped by action, in a fixed order: conflicts first, then
replace, add, remove, then the skips. Each group shows a count. The report ends
with one next-step line, for example: "Run `ais update --apply`" or "Resolve 3
`.ais-new` files, then re-run". `update` never commits, branches or tags
(FR-33).

## 9. Testing

| Layer | What |
|---|---|
| Unit | `classifyPath` in each install mode, recorded and unrecorded, including unowned profile root files; `isPristine` for all five rows of the §3 hashing table plus lone CR, `\r\r\n` and BOM; **each row of §4**, including the recorded-after column; each row of §5, including ambiguous keys and exceptions; migration idempotence; containment rejects; journal verification (match, each kind of mismatch) |
| Round-trip | Every profile × {`create`, `init`} plus a non-default value set: re-render from the manifest gives 0 mismatches (FR-29, extended for B2) |
| Refactor guard | A project generated before and after the `render.js` extraction is byte-identical, for all five profiles × {`create`, `init`} |
| Determinism (NFR-07) | Fixed clock; byte-exact comparison over a sorted file list; a self-reproduction control first. Packed tarball vs published 0.16.1, both run as child processes under a fixed-date preload (`NODE_OPTIONS=--import <shim>`): identical sorted file set; every file byte-identical except `.ai-scaffold.json`, compared as parsed JSON where only `$.install` (new) and `$.version` (if the versions differ) may differ, and everything else, including the three dates and `managedFiles` order, deep-equals. `managedFiles[].hashLf` must be absent on both sides (guard: `.gitattributes` forces CRLF for `.ps1`/`.bat`/`.cmd`, none shipped today) |
| E2E | AC-01 to AC-21. Update a **0.14.0 project from npm** with the packed tarball; `init` fixtures (AC-14); a second-update edit survives (AC-15); kill mid-apply and before the marker (AC-16, AC-17, via an injected fs layer, the ADR-004 pattern); a held lock (AC-18); an edit between plan and write (AC-19, via the fs layer); hook keying (AC-20); exceptions (AC-21). Every preview test asserts the project and backup directories are byte-identical before and after |
| Platform | All of the above on Ubuntu and on **Windows CI** (item 60, now live); AC-10 CRLF runs for real on Windows |

## 10. What this HLD does not decide

- The **pack** class (ADR-002 category 3): item 90.
- Three-way merge, interactive resolution, `--restore`: later slices.
- How the slice 3 preview reports a legacy CRLF record that fails the LF
  direction (it is a conflict; the wording is open).
- The concrete retired-entry lists. Each Corrective release adds its own
  migration file; this HLD only fixes the format.
