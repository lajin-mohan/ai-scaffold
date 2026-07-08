# ai-scaffold Build History

This file preserves historical context from the scaffold's own `.claude/MEMORY.md` before that memory file was cleaned for reuse in adopted applications.

Application repositories should not copy these entries into their project memory. Use `.claude/MEMORY.template.md` as the starting point instead.

---

## 2026-05-28 06:55 - Publish-ready Final Pass

**Stage:** ai-scaffold Phase 1-5 complete, publish-ready on `dev`

### Decisions Made
- Removed the uppercase `.Claude/` duplicate directory; lowercase `.claude/` is the canonical path.
- Replaced active `qa-automation-engineer` references with `qa-reviewer` in scaffold commands/docs.
- Confirmed VS Code task `-p` flag and ESLint settings were already correct.
- Deferred deeper QA automation expansion to a later phase.

### Files Touched
- `.claude/commands/qa-plan.md`
- `CLAUDE.md`
- `HOW-TO-USE.md`

### Current State at the Time
- `dev` was four commits ahead of `main`.
- Publish-readiness score was approximately 9.3/10.
- PR to `main` was ready via GitHub UI.

### Lesson
- Windows can preserve case while Git tracks lowercase paths. Avoid creating case-conflicting `.Claude` and `.claude` directories.

---

## 2026-05-25 14:30 - Phase 2 Complete and Revised Roadmap Adopted

**Stage:** ai-scaffold Phase 2 complete; revised six-phase roadmap adopted

### Decisions Made
- Skipped `tokenBudget` hooks in `settings.json` because that field is not in the Claude Code settings schema.
- Kept `/bootstrap` as one command instead of splitting it, because the flow is stateful and interdependent.
- Deferred stack-aware scripts as useful but not core OS work.
- Added Phase 4.5 for supervisor and critic agents as the highest-priority orchestration gap.
- Capped Phase 5 skill files around 200 lines for token efficiency.

### Files Touched
- `.claude/commands/compact.md`
- `.claude/MEMORY.md`
- `.claude/commands/what-next.md`
- `.claude/rules/governance.md`
- `CLAUDE.md`

### Current State at the Time
- Phase 1: governance and anti-hallucination complete.
- Phase 2: token and memory hygiene complete.
- Phase 3 queued: audit log, `/reflect`, and `/health` session metrics.
- Phase 4 queued: enhanced rules and agent handoff protocol.
- Phase 4.5 queued: supervisor and critic agents.
- Phase 5 deferred: UX system, systematic debugging, UX review, design system update.
- Phase 6 deferred indefinitely.

### Lesson
- Do not add unsupported governance fields to Claude Code settings. Operationalize governance thresholds through commands and output instead.

---

## 2026-06-08 — v0.6.0 / v0.6.1: Agent-Side Enforcement Hooks

**Stage:** H1-H8 hallucination guard hooks shipped

### Key Changes
- Added 3 pre/post hooks: `pre-write-fact-check.sh`, `post-write-console-warn.sh`, `pre-bash-quality-gate.sh`
- Pre-review hook (`pre-review.sh`) enforces lint + typecheck + tests before `/review`
- Template mode settings keep fresh scaffold clones working without configuration
- Bug fix: exact canonical-path match in fact-check bypass detection

### Decision
- Hooks fail open in template state (exit 0 with no checks run) so the scaffold stays CI-green before `/bootstrap`
- Downstream projects must keep their own pre-commit hooks and gate configuration up to date

---

## 2026-06-29 — v0.6.2 (Current Work): AI Scaffold CLI Development

**Stage:** Phase 0 stabilize + Phase 1 planning complete; CLI implementation next

### Key Changes (Planned)
- Create distributable CLI tool (`npx @lajin.m/ai-scaffold`)
- Commands: `create`, `init`, `status`, `doctor`, `update`
- Profiles: generic, laravel, nextjs, golang, flutter, python, java, dotnet
- Placeholder-resolution pipeline prevents `{{...}}` tokens from reaching adopted projects
- Version tracking via `.ai-scaffold.json`

### Scaffold Stabilization Actions (Phase 0)
- Untracked `.claude/MEMORY.md` from git — was leaking build history to adopted projects
- Split `.claude/settings-overrides.json` into template + generated
- Marked Vue/Nuxt as "planned, not ready" until overlay exists
- Created `docs/cli/placeholder-resolution.md` spec
- Set `PRE_REVIEW_ALLOW_UNCONFIGURED` for template mode

### Architectural Decisions
- Pre-merged complete profiles (no runtime profile merging)
- `.ai-scaffold.json` tracks version, profile, bootstrap state, and file hashes
- Generated per-project files: `.claude/MEMORY.md`, `.claude/settings-overrides.json`, `.ai-scaffold.json`

### Lesson (Pending)
- Placeholder propagation is the #1 risk for CLI adoption — template files must never ship unresolved tokens

---

## 2026-07-08 — v0.8.0 Manual npm Publish and Governance Follow-up

**Stage:** v0.8.0 published; post-release hardening opened

### What Happened
- `@lajin.m/ai-scaffold@0.8.0` was published to npm with the `ais` bin.
- The GitHub Actions publish workflow reached npm provenance signing but failed
  at the final npm publish step because npm trusted publishing was not fully
  configured for the package.
- The package was published manually after the workflow failure.
- The `v0.8.0` tag was moved during release recovery.
- Branch protection was not active on `main` during the release.

### Follow-up Required
- Configure and prove npm trusted publishing before the next tag.
- Enable branch protection for `main`.
- Treat failed publish attempts as a new patch tag instead of moving an existing
  release tag.
- Keep release bypasses documented when the project cannot follow its normal
  governance path.

### Lesson
- Governance products must model their own governance. Manual release recovery
  is acceptable only when documented and followed by controls that prevent a
  repeat.

---

## 2026-07-08 — v0.8.1 Trusted Publishing Proven

**Stage:** v0.8.1 published through GitHub Actions trusted publishing

### What Shipped
- Hardened CI with real ESLint, syntax checks, npm audit, and gitleaks.
- Made `ais update` a safe placeholder that refuses to mutate metadata until a
  real update engine exists.
- Added setup-value validation and `doctor` reporting for invalid stored
  context values.
- Added ADR-002 for managed-file ownership.
- Removed the stale `.github/BRANCH-PROTECTION.yml` policy file.
- Corrected branch protection to require the real `CI passed` check.
- Reduced the `main` branch approval requirement to one approval while keeping
  CI, stale-review dismissal, latest-push approval, admin enforcement, no force
  pushes, no deletions, conversation resolution, and linear history.

### Release Outcome
- Tag: `v0.8.1`
- npm package: `@lajin.m/ai-scaffold@0.8.1`
- Publish method: GitHub Actions with npm provenance
- Trusted publishing: verified after npm package trusted-publisher settings were
  configured for `lajin-mohan/ai-scaffold` and `publish.yml`

### Lesson
- The tag workflow can be correct while npm still rejects the publish if the
  package-level trusted publisher is missing. Prove trusted publishing with one
  patch tag before relying on it for larger releases.

---

## 2026-07-08 — v0.8.2 Housekeeping and Package Surface Cleanup

**Stage:** v0.8.2 cleanup prepared

### Decisions Made
- Keep template `docs/`, `tasks/`, and `_ai/` source files in the repository for
  future optional packs and reference work.
- Stop publishing those template folders in the npm package until optional pack
  installation exists.
- Enforce the cleaner package surface in `scripts/pre-publish-smoke.sh`.

### Verification
- `npm pack --dry-run` produced `@lajin.m/ai-scaffold@0.8.2` with no
  `templates/*/docs/`, `templates/*/tasks/`, or `templates/*/_ai/` entries.
- `scripts/pre-publish-smoke.sh` passed all 75 gates.

### Lesson
- Default install cleanup and npm package cleanup are separate concerns. Even
  when the CLI does not install noisy folders, the package allowlist can still
  expose them unless it is tested explicitly.
