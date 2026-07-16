# Release flow

One button. `dev → main → tag → publish`, no post-release sync, no
version/CHANGELOG drift.

```
feature/* → dev        (squash PR, CI + review — unchanged)
Actions → "Release"     (one click: enter the version)
  ├─ gates: audit, lint, typecheck, tests, smoke
  ├─ stamp version + date CHANGELOG on dev
  ├─ commit + push dev
  ├─ fast-forward main to dev          ← main is always a past state of dev
  └─ tag vX.Y.Z → "Publish to npm" fires
```

## Why fast-forward

Every GitHub PR merge method — squash, merge commit, rebase — creates a commit
on `main` that isn't on `dev`. That divergence is what used to force the
`main→dev` sync-back. A **fast-forward** promotion makes `main` point at the
exact `dev` commit, so `main` is always a true ancestor of `dev`: the next
release's readiness check passes trivially and there is nothing to sync.

Because the version bump and CHANGELOG dating happen **on `dev`** (then `main`
fast-forwards to that commit), both branches always agree — the drift that used
to need a hand-fix every release (backlog item 57) cannot occur.

Trade-off: `main`'s history becomes the same commits as `dev` (you no longer get
one squash commit per release on `main`; releases are marked by tags). For a
CLI/library this is normal and arguably clearer.

## Required one-time setup

The workflow pushes to `dev` and `main` and pushes a tag. Two things must be in
place, both on the GitHub side:

### 1. `RELEASE_PAT` secret (mandatory)

A PAT is required because **pushes and tags made with the default
`GITHUB_TOKEN` do not trigger other workflows** — the tag would never fire
`publish.yml`.

1. Create a fine-grained PAT (or GitHub App token) scoped to **this repo only**
   with **Contents: read/write**.
2. Add it as the repo secret **`RELEASE_PAT`**
   (Settings → Secrets and variables → Actions).

The workflow fails fast with a clear message if `RELEASE_PAT` is missing.

### 2. Branch protection allows the release identity to push

`dev` and `main` are protected (PR required). The release workflow pushes
directly, so the PAT's identity must be allowed to **bypass the PR requirement**
on both branches:

- Settings → Branches → branch protection for `dev` and `main` →
  **Allow specified actors to bypass required pull requests** → add the PAT's
  user (or the GitHub App).
- Keep the allowance **restricted to the release identity only** — no one else.

`main` should keep: no force pushes, no deletions, required status checks. The
fast-forward push is not a force push, so those stay intact.

## Cutting a release

1. Land all feature work on `dev` through normal PRs (CI + review). Each PR adds
   its entry under `## [Unreleased]` in `CHANGELOG.md`.
2. Actions → **Release** → **Run workflow** → enter the version (`X.Y.Z`, no
   leading `v`) → Run.
3. Watch it: gates → stamp → push dev → fast-forward main → tag. The tag then
   triggers **Publish to npm**.

That's it. No release branch, no promotion PR, no sync PR, no merge-method
switching.

## Guards

`scripts/prepare-release.sh` (run inside the workflow) refuses to proceed if:

- the version isn't strictly greater than the current one,
- a CHANGELOG heading for that version already exists, or
- there are no entries under `[Unreleased]` (nothing to release).

The workflow additionally re-runs the full gate suite before promoting and
verifies `main` is an ancestor of `dev` (catches an out-of-band push to `main`).

## Rollback

The flow is defined entirely by `.github/workflows/release.yml` and
`scripts/prepare-release.sh`. Reverting the PR that introduced them restores the
previous manual release process. A partially-completed run is safe to re-drive:
the guards make `prepare-release.sh` idempotent, and a fast-forward never
rewrites history.
