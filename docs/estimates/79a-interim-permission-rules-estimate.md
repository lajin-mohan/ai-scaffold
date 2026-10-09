# Effort Estimate — Interim permission rules (backlog item 79a, slice C0)

**Date:** 2026-10-09
**Estimated By:** Claude (Code session)
**Reviewed By:** Lajin M J gave the instruction to proceed on 2026-10-09
("commit and do others in a loop"). The figures below have not been reviewed
separately.
**Confidence:** **HIGH.** The change is one JSON block, applied identically to 5
byte-identical files. The rule syntax was checked against the Claude Code
permissions documentation on 2026-10-09.
**Source spec:** `tasks/todo/79-corrective-phase.md` → C0 / 79a

> **Size note.** This is an S item under `docs/process/task-size-policy.md` and
> needs no BRD or architecture stage. The estimate is in hours.

## Scope

**Included:**
- `permissions.deny` (secret reads) and `permissions.ask` (destructive git and
  `rm`) added to `templates/*/.claude/settings.json`;
- a unit test asserting that every profile ships the same rules, the rules are
  well-formed, and the safe templates (`.env.example`) are carved out;
- paste-ready guidance for existing adopters in `docs/setup/`;
- a CHANGELOG `[Unreleased]` entry.

**Excluded:**
- deleting or changing any hook (C1, after item 25);
- narrowing `allow` rules such as `Bash(composer*)` and `Read(**)` (item 79,
  after item 25);
- the scaffold's own root `.claude/settings.json` (D-Q5: templates only);
- triggering the Release Action, which needs an explicit maintainer instruction.

## Estimate

| Work item | Optimistic | Realistic | Pessimistic | PERT |
|---|---|---|---|---|
| Rule set from the documented syntax | 0.5 h | 1 h | 2 h | 1.08 h |
| Apply to 5 profiles + parity test | 0.5 h | 1 h | 2 h | 1.08 h |
| Packed-tarball verification (generate a profile, check the rules land) | 0.5 h | 1 h | 2 h | 1.08 h |
| Live behaviour check in Claude Code (deny and ask actually fire) | 0.5 h | 1 h | 3 h | 1.25 h |
| Adopter guidance + CHANGELOG | 0.5 h | 0.5 h | 1 h | 0.58 h |
| **Total** | **2.5 h** | **4.5 h** | **10 h** | **5.08 h** |

PERT = (O + 4R + P) / 6 per row; the total is the sum of the row values.

## Risks

- **Bash rules match the command text, not the program.** The docs state that a
  Bash deny or ask rule "isn't a security boundary around the program". This
  patch narrows the exposure; sandboxing is the stronger control, and C1
  documents it.
- **Existing adopters do not receive settings changes** until `ais update`
  exists (item 25). They apply the documented block by hand.
- **Over-asking.** `ask` rules on `rm -r…` will prompt on routine cleanup such as
  `node_modules`. That is accepted: asking is cheaper than the regex guard,
  which blocks the same commands outright today.
