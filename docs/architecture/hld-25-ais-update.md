# High-Level Design — Safe `ais update` (item 25)

**Date:** 2026-10-09
**Author:** Claude (Code session)
**Status:** **Draft. Pending independent architecture review and maintainer
approval.**
**Spec:** `docs/brd/25-ais-update-brd.md` (Approved v1.0; v1.1 ADR-002
alignment pending re-confirmation)
**Decisions:** ADR-002 (ownership contract, accepted), **ADR-007** (update
classification and apply semantics, proposed)
**Estimate:** `docs/estimates/25-ais-update-estimate.md` (20.2 d PERT, pending
sign-off)

---

## 1. Overview

`ais update` turns the running CLI's templates and the project's
`.ai-scaffold.json` into a per-file plan, previews it by default, and with
`--apply` executes it transactionally.

Three properties carry the design:
1. **Rendering is shared with `create`.** The update render of a file is
   exactly what `create` would write today, so "pristine" means "equals what we
   wrote". The spike proved this from the manifest alone (994 files,
   0 mismatches).
2. **Classification is pure.** Ownership comes from a path rule table, and the
   action comes from three hashes (recorded, current, new render). No I/O
   decisions are hidden inside it.
3. **Apply is a journal.** Back up, write through temp-and-rename, and roll back
   everything on the first failure.

## 2. Module breakdown

New modules live in `src/cli/core/`. Every module listed is ≤300 lines.

| Module | Responsibility | Pure? |
|---|---|---|
| `ownership.js` | OC rule table (BRD §3) and `classifyPath(relPath) → 'user-data' \| 'seeded' \| 'managed' \| 'merged' \| 'ignored'` | Yes |
| `hashing.js` | `hashRaw(buf)`, `hashLf(buf)`, `isPristine(buf, recorded)`, which is true if **either** hash matches (§4) | Yes |
| `render.js` | `renderPlannedFile(file, values) → Buffer`, **extracted from** `copy.js` `copySingle`/`generateFile`; `copy.js` then writes what `render.js` returns | Yes (reads template) |
| `manifest-values.js` | `valuesFromManifest(manifest) → values`, the inverse of `buildManifestData`. The F1 fix lands in `manifest.js` alongside it | Yes |
| `update-plan.js` | `buildUpdatePlan({ target, manifest, templateDir }) → UpdatePlan` | Reads only |
| `settings-merge.js` | `mergeSettings(local, scaffold, retired) → { merged, changes }` | Yes |
| `migrations/index.js`, `migrations/<version>.js` | Ordered, idempotent migrations; the first one classifies existing manifests (FR-26) | Yes (returns intents) |
| `update-apply.js` | Backup, journal, temp-and-rename, rollback, `.ais-new` | I/O |
| `git-state.js` | `dirtyPaths(target)` via `spawnSync('git', ['status', '--porcelain', '-z'])`, array form like `gh-runner.js` | I/O |

`src/cli/commands/update.js` becomes thin orchestration: version policy, plan,
report or `--json`, apply, exit code. `doctor.js` reuses `hashing.js` and adds
the `.ais-new` warning (FR-31).

## 3. Data model

### Manifest additions (written by the first migration and every apply)

```json
{
  "manifestSchema": 2,
  "managedFiles": [
    { "path": ".claude/rules/security-rules.md", "hash": "sha256:…", "class": "managed" }
  ],
  "appliedMigrations": ["0.16.0"]
}
```

- `class` is optional on read. If absent, the class comes from `classifyPath`;
  that is how pre-v2 manifests are read (FR-26).
- User-data entries stay in `managedFiles` with `class: "user-data"`, so
  `doctor` can still report on them, but update never acts on them.
- `requirements.paths` stores the raw value (FR-28, spike F1).

### UpdatePlan

```ts
type Action = 'add' | 'replace' | 'unchanged' | 'conflict' | 'user-deleted'
            | 'remove' | 'orphan-kept' | 'skip-user-data' | 'skip-seeded' | 'merge'
interface PlanEntry { path: string; class: Class; action: Action; reason?: string }
interface UpdatePlan {
  from: string; to: string; profile: string; manifestSchema: 1 | 2
  hashed: boolean              // false for pre-0.8.6 installs (FR-03)
  entries: PlanEntry[]
  migrations: string[]         // versions that will run
  settings?: { added: string[]; removed: string[]; kept: number }
  dirty: string[]              // FR-32
}
```

`--json` serialises `UpdatePlan` as-is, with `command: 'update'` and
`dryRun: !apply`, following `buildDryRunPlan`'s envelope.

## 4. Classification (the decision table)

For each managed path, let **R** be the recorded hash, **C** the current file,
and **N** the new render.

| Current file | In manifest? | In new plan? | Pristine (C vs R) | N equals C | Action |
|---|---|---|---|---|---|
| exists | yes | yes | yes | yes | `unchanged` |
| exists | yes | yes | yes | no | `replace` |
| exists | yes | yes | no | — | `conflict` → `.ais-new` |
| absent | yes | yes | — | — | `user-deleted` (BRD Q-03) |
| absent | no | yes | — | — | `add` |
| exists | no | yes | — | yes | `unchanged` (adopted, records hash) |
| exists | no | yes | — | no | `conflict` (FR-08) |
| exists | yes | no | yes | — | `remove` |
| exists | yes | no | no | — | `orphan-kept` |

- **Pristine = raw-hash match OR LF-normalised-hash match.** Existing manifests
  hold raw hashes of LF content, so a CRLF checkout matches through the
  normalised hash. No template is CRLF today, but `.gitattributes` would make a
  future `*.ps1`/`*.bat` template CRLF, and the raw hash keeps that correct
  too. Neither case needs a re-baseline.
- **Pre-0.8.6** (no `managedFiles`): pristine is always false, so every
  existing file is a `conflict` (FR-03, AC-07).
- `merged` (`settings.json`) always goes through `settings-merge.js`. An invalid
  JSON file becomes a `conflict` (FR-24).

## 5. Primary sequence

```
update.js
 ├─ read .ai-scaffold.json ─ version policy (FR-01..04) ─ exit early if equal
 ├─ values  = valuesFromManifest(manifest)
 ├─ plan0   = buildFilePlan(templatePath(profile), target, { existingTarget: false })   (reused)
 ├─ renders = plan0 files → renderPlannedFile(file, values)                             (in memory)
 ├─ migs    = migrations between from..to → intents (classify, retired entries)
 ├─ plan    = buildUpdatePlan(...)  + settings merge preview + dirtyPaths()
 ├─ no --apply → print report | --json → exit 0/2
 └─ --apply
     ├─ refuse if plan.dirty ∩ writes ≠ ∅ (unless --allow-dirty)        FR-32
     ├─ backup  → .ai-scaffold/backups/<ts>/ (+ self-ignoring .gitignore) FR-16, Q-01
     ├─ journal = []; for each write/delete: temp → rename; journal.push  FR-17
     ├─ on error: replay journal in reverse from backup; exit 1           FR-18
     └─ write manifest (version, hashes, classes, appliedMigrations) last FR-30
```

**The manifest is written last.** A crash before it leaves the old manifest, so
the next run re-plans from the old version and the journal rollback has
restored the files.

**The backup directory ignores itself.** It holds a `.gitignore` containing
`*`, so the protected root `.gitignore` is never edited.

## 6. Error and degradation paths

| Condition | Behaviour |
|---|---|
| No `.ai-scaffold.json`, or it is corrupt | Existing messages (`update.js:35-48`), exit 1 |
| Profile template missing in this CLI | Exit 1 naming the profile; nothing written |
| `valuesFromManifest` lacks a required value | Exit 1 naming the field; never guess (no prompts, FR-05) |
| A template renders but the target path escapes the project | Exit 1 (path traversal guard, §7) |
| Write or rename fails | Rollback from journal, report the backup location, exit 1 |
| Rollback itself fails | Exit 1 with **every** affected path and the backup location; never claim success |
| `git` not installed or not a repository | `dirty = []` with a printed notice; `--apply` proceeds (git safety cannot apply) |

## 7. Security

- **No network** (BR-04). Templates come from the CLI package.
- **Path containment:** every resolved target must stay within `target` after
  `path.resolve`. Symlinked managed paths are reported as `conflict` and never
  followed for writes.
- **User-data is never read** (FR-10), so secrets in memory files cannot leak
  into reports or backups. Backups copy only files the plan writes or deletes.
- **`git` runs through the array-form `spawnSync`** with fixed arguments, like
  `gh-runner.js`. There is no shell and no user-supplied arguments.
- **The `settings.json` merge only adds `deny`/`ask` rules** and removes only
  migration-declared retired entries, so an update cannot silently weaken an
  adopter's permissions.

## 8. Testing

| Layer | What | Where |
|---|---|---|
| Unit | `classifyPath` table; `isPristine` raw / LF / CRLF-checkout / CRLF-template (fixture) cases; §4 decision table (one test per row); `mergeSettings` (add, keep, retire, invalid JSON); migration idempotence | `src/__tests__/` |
| Round-trip | Every profile plus a non-default value set: create, then `valuesFromManifest` + `renderPlannedFile`, giving 0 mismatches (FR-29) | `src/__tests__/` |
| Refactor guard | `copy.js` after extracting `render.js`: a project generated before and after the refactor is byte-identical | `tests/` |
| E2E | AC-01 to AC-10: install **0.14.0 from npm** into a temp dir, then update with the packed tarball. Failure injection for AC-05 uses an injected fs layer (same pattern as ADR-004's injected runner) | `tests/` + `pre-publish-smoke.sh` |
| Platform | AC-10 CRLF case runs on item 60's Windows runner; until then, it is simulated by converting fixtures to CRLF | CI |

## 9. What this HLD does not decide

- The **pack** class (ADR-002 category 3) and its update rules: item 90.
- Three-way merge, interactive resolution, `--restore`: later slices.
- The concrete retired-entry lists. Each Corrective release adds its own
  migration file; this HLD only defines the format.
