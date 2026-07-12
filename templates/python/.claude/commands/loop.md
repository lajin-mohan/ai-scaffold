---
description: Autonomous task queue: execute a numbered task list with one-approval contract. Generates tests via /gen-tests per task. Stop conditions…
---

# /loop

Execute an approved task queue autonomously after one plan approval.

Use this command when the user wants a set of related tasks handled one by one without repeated babysitting.

---

## Usage

```
/loop tasks/todo/phase-0-foundation-task-queue.md
/loop "complete P0-030 then run verification"
/loop --from /what-next
```

---

## One-Approval Contract

Before doing work, produce a short execution plan and wait for one explicit approval.

After approval, continue through the approved loop without asking again unless a stop condition occurs.

Approval covers:
- the listed tasks
- the listed files/modules
- the listed verification commands
- the listed branch/commit strategy
- normal implementation choices inside that scope

Approval does not cover:
- new scope
- destructive actions
- direct commits to `main` or `dev`
- secrets or `.env` access
- force pushes, resets, or history rewrites
- skipping required verification

---

## Process

1. Read the requested task source, such as:
   - `tasks/todo/*.md`
   - `/what-next` output
   - BRD/spec/module task list
   - user-provided task list
2. Check current branch and working tree.
3. Create/use the correct branch:
   - `feature/*` for features
   - `fix/*` for bugs
   - `chore/*` for workflow/docs/tooling
4. Produce a short plan:

```
## Loop Plan — {{name}}

### Goal
{{one sentence}}

### Tasks I will execute
1. {{task id / title}} — {{expected result}}
2. {{task id / title}} — {{expected result}}

### Files/modules likely touched
- {{path}} — {{reason}}

### Verification
- {{command/check}}

### Stop conditions
- Scope changes
- Missing/contradictory spec
- Failing verification that needs product/architecture decision
- Data loss/destructive action
- Branch/merge conflict needing human choice

Reply `go` once. After that I will continue through the approved loop and report progress/results.
```

5. Wait for explicit approval.
6. Execute tasks one by one:
   - mark task `in_progress`
   - implement
   - run targeted verification
   - mark task `done` only with evidence
   - continue to the next approved task
7. Commit through `/commit-changes` when a coherent unit is complete.
8. Stop only on a stop condition.
9. Final report includes completed tasks, evidence, commits, remaining tasks, and blockers.

---

## Stop Conditions

Stop and ask only when:
- the approved plan is wrong or incomplete
- an unlisted file/module must be changed
- a required verification step cannot run
- verification fails and the next fix changes scope
- a destructive operation is needed
- merge conflict resolution requires product or ownership judgment
- credentials, secrets, or private environment access is needed

Do not stop for routine implementation choices inside the approved plan.

---

## Output Format

```
Loop Status:
Branch:
Approved Scope:
Completed Tasks:
Verification Evidence:
Commits:
Remaining Tasks:
Blocked Items:
Next Step:
```
