# AI Commands — What They Do and How to Use Them

These are the slash commands AI Scaffold installs in your project. Type them in
Claude Code (for example `/ais-plan`). Every scaffold command starts with
`ais-`, so it never clashes with your own commands or a plugin's.

You do not need all of them. **Start with the six everyday commands**; reach
for the others when the work calls for them.

> Codex, Cursor and Copilot do not run Claude slash commands. In those tools,
> ask the assistant to read and follow the command file instead, for example:
> "Read `.claude/commands/ais-plan.md` and follow it for this task."

## At a glance

| When you want to… | Run |
|---|---|
| Know what to do next | `/ais-what-next` |
| Build or change something | `/ais-plan` |
| Fix a bug | `/ais-debug` |
| Get a review before opening a PR | `/ais-review` |
| Commit safely | `/ais-commit` |
| Avoid repeating a past mistake | `/ais-lessons` |
| Write tests | `/ais-gen-tests` |
| Check code quality | `/ais-health` |
| Fill in project details after install | `/ais-bootstrap` |
| Write requirements | `/ais-create-brd` |
| Design an API | `/ais-api-spec` |
| Estimate effort | `/ais-estimate` |
| Check readiness before building | `/ais-kickoff` |
| Review an architecture | `/ais-architecture-review` |
| Plan QA or auth testing | `/ais-qa-plan` |
| Test a feature in a real browser | `/ais-qa` |
| Design UX from requirements | `/ais-ux-analysis` → `/ais-ux-design-prompt` → `/ais-ux-review` → `/ais-ux-handoff` |
| Check a release is ready | `/ais-deployment-review` |

Arguments in quotes are plain-language descriptions. Paths are files in your
project. Commands that change code show you a plan first and wait for your
approval.

---

## Everyday commands

### `/ais-what-next` — what should I do now?

Reads the project's state and tells you the single next action, plus anything
blocking it.

```text
/ais-what-next                          # full status and next step
/ais-what-next "Invoice export"         # for one feature or sprint
/ais-what-next --brief                  # one-line status
```

**Example:** you come back after a week away. Run `/ais-what-next --brief` to
see the current stage and next action without reading the whole history.

### `/ais-plan` — build or change something

For any task with more than three steps or touching several files. It reads
the spec and nearby code, proposes a numbered plan, **waits for your "go"**,
then implements and verifies it without further prompts.

```text
/ais-plan "Add CSV export to the invoices page"
/ais-plan --ticket PROJ-142                       # work from a ticket
/ais-plan --spec docs/brd/PROJ-142-csv-import.md  # work from a spec file
/ais-plan --resume                                # continue a paused task
/ais-plan                                         # it asks what to build
```

**Example:** `/ais-plan "Add a discount code field to checkout"`. Read the
plan, correct anything wrong, reply `go`. You get a verification report at the
end (lint, tests, each acceptance criterion).

### `/ais-debug` — fix a bug properly

Reproduces the bug, finds the root cause, fixes it with a regression test and
shows the evidence. It shows a short debugging plan first and waits for one
approval. Use it for errors, failing tests, broken UI, auth/CORS problems,
Docker or database issues, and failed CI.

Describe the bug in plain words. Include what you expected, what happened,
where (URL, endpoint, screen) and any error output you have.

```text
/ais-debug "Login redirects back to /login after a correct password"
/ais-debug "CI fails: users.service.test.ts times out on Windows"
```

**Example:** paste the stack trace after the description. The fix is not
reported as done until the original failure no longer reproduces.

### `/ais-review` — AI review before a pull request

Reviews the changes on your branch with backend, frontend, security, QA and
architecture reviewers, and returns BLOCK / WARN / NIT findings.

```text
/ais-review                         # everything on this branch vs dev
/ais-review src/services/users.ts   # one file
/ais-review --lite                  # one reviewer; for small, low-risk changes
/ais-review --security-only         # just security
/ais-review --skip-architect        # all reviewers except architecture
```

Also: `--frontend-only`, `--backend-only`, `--qa-only`, `--architect-only`.

**Example:** a typo fix gets `/ais-review --lite`; a new payment endpoint gets
the full `/ais-review`. Fix every BLOCK before asking a human to review.

### `/ais-commit` — commit with the project's git rules

Checks you are not on a protected branch, flags unrelated changes and asks for
verification evidence before committing.

```text
/ais-commit              # guided commit
/ais-commit --dry-run    # show what would happen, change nothing
```

`--dev` and `--main` exist for promoting branches; most teams merge through
pull requests instead.

### `/ais-lessons` — remember what went wrong before

Searches `tasks/lessons.md` for past root causes, or records a new one.

```text
/ais-lessons                    # latest 10 lessons
/ais-lessons "race condition"   # search
/ais-lessons --tag security     # by tag (security, architecture, workflow, testing, git, debugging)
/ais-lessons --write            # record a lesson from this session
/ais-lessons --write --quick    # one-line lesson
```

**Example:** before touching the session code, run `/ais-lessons "session"`.
After fixing a tricky bug, run `/ais-lessons --write` so the next person finds
it.

---

## Quality and testing

### `/ais-gen-tests` — write runnable tests

Writes complete tests with real assertions next to the source file.

```text
/ais-gen-tests                              # for the current feature
/ais-gen-tests src/services/applications.ts # for one file
/ais-gen-tests --unit                       # or --integration, --e2e, --snapshot
```

### `/ais-health` — code quality score

Detects your tools (type checker, linter, tests), runs them and reports a 0–10
score with a breakdown.

```text
/ais-health                # run everything detected
/ais-health --tool lint    # one category
/ais-health --trend        # history, without running anything
```

### `/ais-qa-plan` — plan the tests for a feature

Produces a coverage matrix: requirement → scenario → test → result.

```text
/ais-qa-plan "PROJ-142 CSV import"
/ais-qa-plan --ticket PROJ-142
/ais-qa-plan --auth "login and sessions"   # login, sessions, tokens, tenant isolation
```

### `/ais-qa` — test a feature in a real browser

Walks the feature in a headless browser and reports **every** rendering,
interaction, console and network problem at once. Each finding gets an ID,
a severity (impact), a priority (fix order), a root cause (Confirmed or
Suspected, with `file:line`) and a fix plan. **It changes nothing until you
choose.** Use it after `/ais-review` flags UI issues, or to hand a report to a
QA engineer.

```text
/ais-qa "checkout flow"
/ais-qa                    # it asks what to test
```

Then reply with what to fix:

```text
fix all                    # every finding
fix QA-1, QA-3             # only the ones you choose
none                       # keep the report, change nothing
```

It fixes only what you chose, tests again in the browser, and hands back the
results with the changed files **uncommitted**. Review the diff, then commit with
`/ais-commit`. With three or more findings the report is also saved to
`docs/qa/qa-report-<feature>-<date>.md`.

---

## Requirements, planning and design

### `/ais-create-brd` — business requirements document

```text
/ais-create-brd "Bulk import of candidates via CSV with duplicate detection"
/ais-create-brd --from-notes meeting-notes.md
/ais-create-brd --update docs/brd/candidate-import-brd.md
```

Writes `docs/brd/<feature>-brd.md`.

### `/ais-api-spec` — REST API contract

Endpoints, request and response shapes, errors, async jobs and migrations.

```text
/ais-api-spec "User management — CRUD with role assignment"
/ais-api-spec docs/brd/user-management-brd.md
/ais-api-spec --resource users
```

Writes `docs/api/<resource>-contract.md`.

### `/ais-estimate` — effort estimate

Three-point estimate with risk weighting and a suggested phasing.

```text
/ais-estimate "Add candidate bulk import via CSV"
/ais-estimate docs/brd/candidate-import-brd.md
/ais-estimate --epic "Requisition Management"
/ais-estimate --sprint
```

### `/ais-kickoff` — ready to start?

A go / no-go check across requirements, UX, architecture, estimate, QA and
governance before building starts.

```text
/ais-kickoff
/ais-kickoff "Requisition Management"
```

### `/ais-architecture-review` — critique a design

```text
/ais-architecture-review docs/architecture/import-design.md
/ais-architecture-review           # the current branch's changes
/ais-architecture-review --adr     # also write ADRs for key decisions
```

---

## UX design

Run these in order for a new screen or flow. For a single small screen or
component, `/ais-ux-analysis --quick` is enough.

```text
/ais-ux-analysis --spec docs/brd/reporting-brd.md --module reporting
/ais-ux-analysis --quick "improve the sprint dashboard filters"
/ais-ux-design-prompt UX-REP-001-main-table   # a prompt for Figma or Claude
/ais-ux-review review apps/web/src/pages/DashboardPage.tsx
/ais-ux-handoff UX-REP-001-main-table         # developer-ready package
```

| Step | Command | Produces |
|---|---|---|
| 1 | `/ais-ux-analysis` | Roles, flows, states, risks and open questions under `docs/ux/<module>/` |
| 2 | `/ais-ux-design-prompt` | A complete design prompt to paste into Figma or Claude |
| 3 | (you) | Build and adjust the design; the UX lead approves it |
| 4 | `/ais-ux-review` | A check of the design or the built screen: desktop and mobile (390px), light and dark |
| 5 | `/ais-ux-handoff` | `docs/ux/<module>/tasks/<task>/06-dev-handoff.md` for developers |

---

## Release

### `/ais-deployment-review` — is it ready to ship?

Readiness checklist, migration plan, smoke tests and rollback procedure.

```text
/ais-deployment-review                     # the current branch
/ais-deployment-review --env staging
/ais-deployment-review --env production
/ais-deployment-review --release v1.2.0
```

---

## Setup

### `/ais-bootstrap` — fill in project details

Asks a few questions (name, purpose, stack, tenancy, compliance) and writes the
answers into the project files. Run it once after installing, or whenever those
details change.

```text
/ais-bootstrap            # guided questions
/ais-bootstrap --check    # is everything filled in?
/ais-bootstrap --resume   # continue an interrupted run
```

Feature flags (GDPR, accessibility, audit log and so on) live in
`.claude/settings-overrides.json`; edit that file to switch one on or off.

---

## Terminal commands (`ais`)

The `ais` CLI installs, checks and updates the scaffold itself; it runs in your
terminal, not in the AI chat.

```bash
ais create my-app --profile node   # new project
ais init --profile python          # add to an existing repository
ais doctor                         # check the install
ais update                         # preview an update; add --apply to apply it
ais list commands                  # what is installed
```

Every flag: `.ai-scaffold/cli-reference.md` in your project (`ais doctor`
details) and `docs/cli-reference.md` in the AI Scaffold repository.
