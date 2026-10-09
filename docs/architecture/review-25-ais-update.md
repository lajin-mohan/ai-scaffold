# Architecture Review: Safe `ais update` (item 25)

**Date:** 2026-10-09
**Reviewer:** independent `architect` agent. It did not write the documents under review.
**Under review:** `hld-25-ais-update.md` (Draft) and `adr/007-update-classification-and-apply-semantics.md` (Proposed)
**Spec:** `docs/brd/25-ais-update-brd.md` (Approved v1.1)
**Verdict:** **REVISE.** There are 5 BLOCK, 9 WARN and 7 NIT findings. **Two BLOCKs (B1, B5) cannot be fixed without amending the approved BRD**, so they go back to the maintainer before the HLD is revised.

---

## How this review was done

Every claim about the code was checked against `src/` on this branch. Findings marked
**[verified]** were reproduced by running the code, not just by reading it:
- `npm ci`;
- `ais create lv --profile laravel --yes --no-git`;
- `ais init . --profile laravel --yes` into a directory holding a `package.json`;
- a script that runs the shipped `buildFilePlan` the way HLD §5 does (`existingTarget: false`) against the `init` manifest.

---

## BLOCK findings

### B1. The classifier's fallback pulls protected application files into replace and delete [verified]. Needs a BRD amendment.

BRD §3 (`25-ais-update-brd.md:78-80`) says a path that matches no rule "defaults to **managed** if it was written by the scaffold". The manifest records **every** file `create` writes:
- `copy.js:80-91` pushes all of `plan.copy` and `plan.generate` into `writtenFiles`;
- `manifest.js:111-129` hashes them all and drops only `.ai-scaffold.json`.

This includes the profile root files from `file-plan.js:83-96` and `:165-167`. A fresh laravel project records **30** such paths:
- `README.md`, `.gitignore`, `.gitattributes`, `composer.json`, `package.json`;
- `artisan`, `routes/web.php`, `public/index.php`;
- `app/Providers/AppServiceProvider.php`;
- all three `database/migrations/*.php`, among others.

Under HLD §4 (`hld-25-ais-update.md:97-107`), every one of them is:
- **replaced** when pristine and the template changed. `README.template.md` has changed since v0.14.0 (new `{{TYPECHECK_COMMAND}}`, `{{SEED_COMMAND}}`, `{{UNSUPPORTED_CAPABILITIES}}` tokens), so this happens on the very first real update;
- **deleted** (FR-07 `remove`) when pristine and a later version drops it. That would delete an adopter's untouched database migration or route file.

This contradicts three documents:
- ADR-002 category 4 (`002-managed-file-ownership-contract.md:37-40`: root READMEs and package manifests "must not overwrite these by default");
- ADR-007 Decision 1 (`007-…:38-39`, "protected application … unchanged");
- the HLD itself at `hld-25-ais-update.md:142-143` ("the protected root `.gitignore` is never edited"). Under the table it is edited whenever it is pristine.

The BRD contradicts itself too: `:75-76` says protected application files are "unchanged and out of scope", but `:78-80` brings them into scope.

**Recommended change:**
- Amend BRD §3 so that a path matching no OC-01..OC-04 rule is `ignored`. Update never writes, replaces or deletes it, and reports it as `skip-unowned`.
- `classifyPath` then only needs explicit rules. Update's universe is `MANAGED_PATHS` (`file-plan.js:18-23`) + `constitution.md` + OC-02.
- Add a §4 test that a pristine `routes/web.php` dropped upstream is **not** deleted.

### B2. `init`-installed projects are re-planned as if they were `create`d [verified]

HLD §5 (`hld-25-ais-update.md:125`) always calls `buildFilePlan(…, { existingTarget: false })`. `init` installs with `existingTarget: true` (`init.js:126`), which produces a different file set and different target paths (`file-plan.js:165-167, 206-214, 357-379`). The manifest does not record which mode was used (`manifest.js:11-55`).

Against a real `init` manifest, the HLD's plan contains 26 paths the install never wrote:
- under the §4 table, 25 of them are absent locally and absent from the manifest, so they become **`add`**. That writes the Laravel skeleton (`app/**`, `database/**`, `routes/**`, `artisan`, …) plus `.gitignore` and `.gitattributes` into the adopter's existing repository;
- the adopter's own `package.json` becomes a conflict with `package.json.ais-new`.

`.ai-scaffold/README.md` is also rendered from a different source in each mode:
- `init`: the project `README.template.md`, via `resolveGeneratedTargetRel` (`file-plan.js:376-378`);
- `create`: `buildScaffoldReadme` (`copy.js:149-150`).

So a pristine `init` copy would be "replaced" with a file of a different kind.

The spike explicitly did not cover `init` (`25-render-roundtrip-spike.md:68`), so the "0 mismatches" evidence does not extend to these projects.

**Recommended change:**
- Record `install.mode: 'create' | 'init'` in the manifest.
- Have the FR-26 migration infer it for existing manifests: any `CREATE_ROOT_FILES_BY_PROFILE` path or root `.gitattributes` in `managedFiles` means `create`, otherwise `init`.
- Pass the recorded mode to `buildFilePlan`.
- Extend the FR-29 round-trip test and the AC suite with one `init` fixture per profile.
- B1's fix limits the damage on its own, but B2 is still needed so that `.ai-scaffold/README.md` and the root/namespace placement render correctly.

### B3. The hash recorded after apply is unspecified, and the obvious implementation overwrites adopter edits on the *next* update

FR-30 (`brd:161`) and HLD §5 (`hld-25-ais-update.md:135`) say only "write manifest (… hashes …)". The existing helper, `buildManagedFileRecords` (`manifest.js:111-129`), hashes **what is on disk**.

If apply reuses it, three things go wrong:
1. **Conflict files are recorded with the hash of the adopter's edited file.** On the next update that file is "pristine", so it is **replaced**. The edit is lost on the second run, against BR-01 and OBJ-02. The pre-0.8.6 all-conflict path (FR-03) re-baselines the same way, so old installs lose every pre-existing edit on their second update.
2. **User-data files would be re-hashed by reading them**, which breaks FR-10 ("never read for content").
3. **A `user-deleted` path whose record is dropped** becomes absent and not in the manifest on the next run, so §4 row 5 makes it **`add`**. The file is recreated, against BR-05 and Q-03.

**Recommended change:** add a per-action "recorded after apply" column to the §4 table, and cover each row in the unit tests:

| Action | Hash recorded after apply |
|---|---|
| `add`, `replace`, `unchanged`, adopted | hash of N, the content written |
| `conflict` | hash of **N** (the latest scaffold version is the new base, so the file stays a conflict until the adopter takes N), never hash of C |
| `user-deleted` | keep the record (hash of N), so it is not re-added |
| `remove` | drop the record |
| `orphan-kept` | drop the record, or keep the old one. Either is safe; choose one |
| `user-data`, `seeded` | carry the old record forward unchanged, without reading the file |

### B4. The crash-safety claim is false as designed

HLD §5 (`hld-25-ais-update.md:133, 138-140`) keeps the journal in memory (`journal = []`) and says: "A crash before [the manifest write] leaves the old manifest … and the journal rollback has restored the files."

Rollback only runs inside the process. After a kill, power loss or terminal close, nothing has been restored. Under the §4 table the next run then:
- classifies every already-replaced file as **conflict** (C no longer matches R), producing spurious `.ais-new` files on every later update;
- classifies every already-removed file as `user-deleted`.

ADR-007 Decision 6 (`007-…:53-54`) depends on this property.

**Recommended change:** both parts are small.
- (a) Give "N equals C" precedence over pristine (see W1). A re-run after a crash then converges: replaced and added files read as `unchanged` or adopted, and removed files drop out.
- (b) Write the journal to `.ai-scaffold/backups/<ts>/journal.json` before the first write, and write a `complete` marker last. If a later run finds a backup without the marker, it reports the interrupted apply and the backup path, and does not plan over it.
- Then fix the §5 text. AC-05 (in-process injection) is unaffected.

### B5. The `settings.json` merge can silently widen permissions and revert adopter hook edits. Needs a BRD amendment.

**The documents disagree.**
- HLD §7 (`hld-25-ais-update.md:167-169`): the merge "only adds `deny`/`ask` rules … so an update cannot silently weaken an adopter's permissions".
- FR-21 (`brd:142`) and ADR-007 Decision 5 (`007-…:49`) **add `allow` rules**.
- The HLD's claim is false against its own spec.

**The spec is unsafe.** The merge has no base, so it cannot tell "added upstream" from "deleted by the adopter".
- FR-21 re-adds every scaffold `allow` rule an adopter deliberately removed, **on every update**. That turns a prompt back into an auto-approval, which is a permission widening.
- FR-22 ("changed entries SHALL be replaced") reverts an adopter-modified scaffold hook. For example, an adopter who prefixed `ECC_FACT_CHECK_STRICT=1`, the strict mode documented in `ai-coding-rules.md` §1 Hook Enforcement, loses it. That is an overwrite of an adopter edit inside a merged file, which goes against BR-01's intent.

**The matching rule is underspecified.** "Script path in their command" has to be parsed out of shell strings. The scaffold's own entries already carry env prefixes, e.g. `PRE_REVIEW_ALLOW_UNCONFIGURED=1 bash .claude/hooks/pre-review.sh` (`templates/node/.claude/settings.json:97`). The HLD does not say:
- whether matching happens at the matcher-group level or the inner-hook level. At group level, replacing the group drops any adopter hook added to it;
- which top-level keys the scaffold owns.

**Recommended change:**
- Record the scaffold-contributed subset of `settings.json` in the manifest (`settingsBase`) at create and at every apply.
- Add only entries in (new scaffold − base).
- Replace a scaffold hook only where local equals base. Otherwise report it.
- Remove only migration-retired entries (FR-23 unchanged).
- First update from a manifest with no base:
  - if `settings.json` is hash-pristine, local *is* the base;
  - otherwise add `deny`/`ask` only, and list new `allow` rules as suggestions.
- Define matching at the inner-hook level as (event, matcher, script path), with a parsing rule and the env-prefix case as a test.
- This changes FR-21 and FR-22. **The maintainer must amend the BRD, or explicitly accept the widening risk.**

---

## WARN findings

**W1. Gaps in the decision table.**
- Row 3 (`hld:101`) makes an edited file a `conflict` even when C equals N. That happens when the adopter applied the fix by hand, or on a re-run after a crash (B4). The result is an `.ais-new` identical to the file. FR-06 (`brd:112`) defines `unchanged` as "new render equals local" with no pristine condition. Make N equals C win first.
- Missing rows:
  - absent, in manifest, not in the new plan: drop the record;
  - `merged` absent locally;
  - **class precedence**. A deleted seeded file (FR-11 `add`) clashes with BR-05 and Q-03 (`user-deleted`). State that the class is resolved before the table, and that seeded wins.
- Pre-0.8.6 manifests have no `managedFiles`, so every row is "In manifest? = no". Rows 6 and 7 then yield `unchanged` for files equal to N, while AC-07 (`brd:207`) says "every managed file reported as conflict". State the intended expectation: never `replace`; files that differ are `conflict`.

**W2. The hash written by update is unspecified, and it diverges from FR-09.**
- FR-09 (`brd:115`) requires hashes written by update to be LF-normalised.
- HLD §4 (`hld:109-113`) and ADR-007 Decision 2 accept a raw *or* LF match, but never say what update writes.
- Recommended: keep writing raw hashes (the same as `create` and `manifest.js:122-126`), accept either on read, and record that FR-09's second sentence is deliberately not followed, or else follow it.
- `doctor.js:374-378` compares raw hashes only. The planned switch to `hashing.js` (HLD §2) is needed for AC-10 parity.

**W3. A new render input makes update impossible for every older project.**
- HLD §6 (`hld:151`) exits 1 when `valuesFromManifest` lacks a value. Every future release that adds a placeholder input would therefore block update for all existing projects.
- The pattern already exists: `values.seedCommand` is read at `content-templates.js:46` but is not stored in the manifest (`manifest.js:43-51`). It is harmless today only because nothing ever sets it.
- Recommended: migrations supply the same default `--yes` would, and append the key to `defaultedValues`. Exit 1 only for a missing value with no default.

**W4. Edge cases in the dirty-tree check (FR-32).**
- (a) An unresolved `.ais-new` from the previous run is untracked (`??` in porcelain). The next `--apply` would refuse because of its own artefact. Exempt `.ais-new` paths.
- (b) When the project is a subdirectory of a repository, porcelain paths are relative to the repo root. Use `git -C <target> status --porcelain -z -- .` and map the paths through `rev-parse --show-prefix`.
- (c) The set checked must cover deletes, `settings.json` and `.ais-new` writes, not only "writes" (`hld:131`).
- (d) `-z` rename records carry two paths.

**W5. Path containment covers only template renders.**
- HLD §6 (`hld:152`) applies the guard to rendered targets. But `managedFiles[].path` comes from a repo-controlled file, and it feeds `remove` (deletes) and backups.
- Apply containment to every path from every source. Reject absolute paths, `..` and anything under `.git/`.
- Check symlinks on every ancestor (the realpath of the parent directory), not only the leaf (`hld:161-162`). A symlinked `.claude/hooks/` directory otherwise escapes the project.

**W6. The version-policy flags are not addressed.**
- `update.js:16` defines `--force`, which bypasses the already-current and downgrade checks (`update.js:82, 88`). It contradicts BR-01 and ADR-007 Decision 3 ("no override flag"). The HLD should say that `--force` is removed.
- The downgrade refusal currently `return`s with exit 0 (`update.js:88-91`). State the exit code.
- `--target-version` currently accepts any valid semver (`update.js:61-67`). FR-01 needs the HLD to say this becomes an error.

**W7. Windows apply mechanics.**
- Use fs-extra's `rename`. It wraps graceful-fs, which on win32 retries `EACCES`/`EPERM`/`EBUSY` for up to 60 s (`graceful-fs/polyfills.js:96-105`, v4.2.11). `node:fs` does not retry.
- Add a pre-flight writability check on every target, so a file locked by an editor fails **before** the first write, not 60 s into the apply when rollback hits the same lock.
- Write the manifest itself through temp-and-rename.
- Give temp files a recognisable suffix, and sweep them up on the next run.

**W8. The boundary between ADR-007 and ADR-002 is not stated.**
- ADR-002 defines generated project context as files "generated from setup inputs" (`002-…:26-30`). It lists `.ai-scaffold.json`, which update must write, and by that definition `constitution.md` (`buildConstitution(values)`, `copy.js:161-162`) also qualifies. ADR-007 maps that category to user-data, but classes `constitution.md` as managed.
- That is defensible, since `.ais-new` keeps it safe, but ADR-007 should state its criterion: user-data is content the project is expected to evolve. It should also carve out `.ai-scaffold.json` as the manifest.
- The follow-up note (`007-…:78-80`) should say how ADR-002's v0.7.x re-baselining requirement (`002-…:49-51`) is met: through the pre-0.8.6 all-conflict path.
- With B1 fixed this is a refinement, not a contradiction. Without B1 fixed, ADR-007 contradicts ADR-002 category 4.

**W9. The estimate does not cover the revised design.**
- New work from B2, B4, B5 and W3: install-mode record, migration inference and `init` round-trip fixtures (about 1–1.5 d); settings base (0.5–1 d); persisted journal and interrupted-apply detection (about 0.5 d); default-supplying migrations (about 0.25 d).
- That is +2.5–3.5 d on 20.2 d, close to the 20% re-estimate trigger.
- Re-cut the estimate after the revision, as the item-65b review did.
- The estimate header still cites BRD "Approved v1.0" (`25-ais-update-estimate.md:10`).

---

## NIT findings

- **N1.** The HLD header (`hld:7-8`) says BRD "v1.1 … pending re-confirmation". The BRD is Approved v1.1 (`brd:6`).
- **N2.** State the precedence between stored `class` and `classifyPath`: stored wins, and only migrations rewrite it.
- **N3.** `.ai-scaffold.json` is in `plan.generate` (`file-plan.js:172`). Exclude it from classification explicitly, as `manifest.js:113` does.
- **N4.** Backups accumulate with no retention, and backed-up `settings.json` files can hold `env` secrets. The self-ignoring `.gitignore` is correct. Print the backup path and consider keeping only the last N.
- **N5.** The FR-13 report layout (groups, counts, next-step line) and FR-33 (never commit) each deserve one explicit line in the HLD.
- **N6.** F1 can be fixed on the read side: map `[]` to `''`, the default at `prompts.js:302`. That avoids changing the manifest shape and still satisfies FR-28 and FR-29.
- **N7.** [unverified] On Windows, Node may resolve an unqualified `git` from the working directory before `PATH`. If so, a `git.exe` planted in a cloned project would run. Verify, and if it holds, resolve `git` from `PATH` explicitly.

---

## FR / AC coverage

| ID | Covered by | Status |
|---|---|---|
| FR-01 | §5 "version policy" | Partial: `--target-version` behaviour not designed (W6) |
| FR-02 | §5 | Partial: `--force` bypass and exit code (W6) |
| FR-03 | §3 `hashed`, §4 | Partial: row mapping vs AC-07 (W1); re-baseline hash (B3) |
| FR-04 | §5 early exit | Covered |
| FR-05 | §2 `manifest-values.js`, §6 | Covered; future inputs (W3) |
| FR-06 | §4 | Partial: N equals C precedence (W1) |
| FR-07 | §4 rows 8–9 | Covered, but unsafe without B1 |
| FR-08 | §4 row 7 | Covered |
| FR-09 | §4 | Partial: written hash unspecified (W2) |
| FR-10 | §7 | At risk: hash refresh (B3) |
| FR-11 | §3 action list | Partial: precedence vs BR-05 (W1) |
| FR-12, FR-13 | §5 | FR-13 layout not designed (N5) |
| FR-14 | §3 | Covered |
| FR-15 | §5 | Covered |
| FR-16 to FR-19 | §5 | Covered in-process; crash case (B4); Windows (W7) |
| FR-20 | §2, §7 | Covered |
| FR-21 | §7 contradicts it | **Gap and unsafe (B5)** |
| FR-22 | §2 interface only | **Underspecified and unsafe (B5)** |
| FR-23 | §2, §9 | Covered |
| FR-24 | §4, §2 | Covered; owned keys undefined (B5) |
| FR-25, FR-27 | §2, §3 `appliedMigrations` | Covered |
| FR-26 | §3 | Covered; should also infer install mode (B2) |
| FR-28, FR-29 | §3, §8 | Covered for `create` only (B2) |
| FR-30 | §5 | **Unsafe as written (B3)** |
| FR-31 | §2 | Covered |
| FR-32 | §5 | Partial (W4) |
| FR-33 | none | Implicit only (N5) |
| AC-01 | §8 E2E | Covered; at risk from B1 (README and root files replaced) |
| AC-02 | §8 | Covered |
| AC-03 | §8 | Covered |
| AC-04 | §8 | Covered; passes only for an *unmodified* scaffold hook (B5) |
| AC-05 | §8 injected fs | Covered |
| AC-06 | §5 | Covered |
| AC-07 | §8 | Expectation ambiguous (W1) |
| AC-08 | §5 | Covered |
| AC-09 | §5 | Covered |
| AC-10 | §8 | Covered (simulated until item 60) |

---

## What the design gets right

- **The update render is the create render.** Extracting `render.js` from `copy.js` and guarding the extraction with a byte-identical refactor test (§8) is the right foundation, and the spike's evidence for it is real (for `create` projects).
- **The classifier is pure: three hashes in, one action out.** It can be tested row by row, and its §4 table is the right artefact to review. The findings above amend the table; they do not replace it.
- **Never overwriting, with `.ais-new` beside the file.** This was rightly chosen over three-way merge (ADR-007 alternatives). It keeps the slice small without giving up safety.
- **The manifest is written last, and preview is the default.** These are the right two invariants. B4 only corrects the claim made for them.
- **The self-ignoring backup directory** avoids touching the protected root `.gitignore`.
- **AC-05 failure injection uses an injected fs layer, following ADR-004.** Real evidence, not a mock of the thing under test.
- **No network, and array-form `git`.** These match BR-04 and the `gh-runner.js` precedent.
- **The design is not over-engineered.** Nine small modules, one per responsibility; no base-content store; no interactive mode. The only addition this review asks for is one small JSON object (`settingsBase`, B5), and it replaces a guess with a fact.
