# 103 — Non-GitHub hosts and non-default branch models

## Status

Proposed, P1, 2026-10-28. Found while two adopter projects were upgraded to
0.17.1. Not designed; no implementation approved.

## Problem

The shipped governance assumes GitHub and a `feature/* → dev → main` model.
Real adopters differ, and the upgrade agents had to decline or hand-narrow the
scaffold's version:

- **GitLab-hosted project (eventory360 workspace).** 0.17.1's branch-protection
  material is GitHub-only: `setup-branch-protection.sh` drives `gh`, the
  branch-flow workflow is GitHub Actions, and `doctor`'s remote checks read the
  GitHub API. The agent asked whether to write GitLab equivalents itself.
- **`qa → main` flow.** That project merges hotfixes from `main` back into
  `qa`. The scaffold's cross-tier guard blocks `main → dev` and knows no `qa`
  tier, so the agent did not adopt it.
- **Branch pattern narrowed by hand (engyne).** The 0.17.1 `pre-commit`
  branch rule was narrowed to `feature|fix|chore` to match the project, an
  edit the next update will see as a conflict.
- Related, already tracked: item 77 D3 hardcodes `CICD_PLATFORM` to GitHub
  Actions; item 75 covers rulesets on GitHub.

## Scope and acceptance (to design)

- [ ] Record the hosting platform and the branch model (integration and
  release branch names, allowed prefixes, back-merge paths) as install answers,
  and render shipped rules, hooks and CI from them rather than from constants.
- [ ] Decide GitLab support: protected-branch and merge-request settings
  script, `.gitlab-ci.yml` branch-flow check, `doctor` remote checks; or state
  plainly that only GitHub's server controls ship and the local hooks are all
  a GitLab project gets.
- [ ] Projects without `dev` (`main` only, or `qa → main`) generate hooks and
  guards that allow their real flow; tested from the packed artifact.
- [ ] `ais update` keeps a project's recorded model, so a project-specific
  branch rule is not re-flagged as a conflict on every update.

## Interim guidance for adopters

Keep the project's own branch model when merging an update; configure GitLab
protected branches and merge-request approvals in the GitLab UI. Do not write
ad hoc GitLab versions of the scaffold scripts inside the project.
