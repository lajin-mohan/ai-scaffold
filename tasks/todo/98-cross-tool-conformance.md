# 98 — Cross-tool conformance and capability matrix

## Status

Proposed, P1, 2026-10-13. Extends item 67 with executable/manual evidence.
Depends on item 76 for maintainer/adopter separation and 87 for shared verify.
This proposal does not replace root CLAUDE.md's authority.

## Scope

Declare supported versions/configurations of Claude Code, Codex, Cursor and
Copilot. Describe each adapter's actual instruction discovery, commands, skills,
permissions and hooks; unsupported features must be explicitly marked. Shared
engineering requirements need a runnable path even without Claude slash commands.

## Acceptance and validation

- [ ] One matrix lists tool version, OS, instruction entry point, supported
  controls and gaps; document verified, unverified and unsupported separately.
- [ ] Exercise instruction discovery in actual sessions, including nested scope;
  demonstrate a rule is loaded through session evidence or a controlled task.
- [ ] All claimed adapters can locate project commands, run shared verification
  and produce evidence with failures/skips visible; no invented tool API syntax.
- [ ] Tool-native permission/sandbox probes use item 97; no claim that Claude
  hooks or deny rules automatically protect Codex/Cursor/Copilot.
- [ ] create/init/update preserve existing tool configuration and user rules;
  root maintainer files have no live adopter-identity placeholders.
- [ ] One routine fix and one high-risk scenario exercise scope, approval,
  verification and handoff behavior in each claimed supported tool.
- [ ] Record manual steps for integrations that cannot run in CI. A tool without
  an available test environment remains unverified; docs alone cannot close it.

## Exit

Publish the capability matrix and reproducible procedure. Review versions on
releases and capability changes, reusing item 50 rather than a separate refresh
process. Conformance means stated behavior, not identical tool internals.
