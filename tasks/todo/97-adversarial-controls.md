# 97 — Adversarial controls and failure-mode validation

## Status

Proposed, P0, 2026-10-13. Added by the maintainer-requested roadmap review.
Validation companion to items 79–89 and 94, not a second security framework.
Design/estimate required before implementation; no security guarantees inferred
from the presence of configuration files.

**2026-11-11 — design proposed (Wave C, C1a):**
`docs/architecture/hld-97-control-matrix.md`. It records the claimed boundary
per control, measured current behaviour (open bypasses, fail-open on
malformed input, Windows latency of 3–4.8 s against a 5 s timeout with its
root cause), the fail-closed design and the L1/L2/L3 probe plan. Implementation
(C1b) waits for maintainer approval of its section 7 decisions.

**2026-11-11 — C1b implemented (branch `feature/97-guards-fail-closed`).**
Decisions approved and D6 kept (shell reads documented as a gap). Guards fail
closed, parse once (p95 0.5–0.8 s on Windows), close the item 81 bypasses;
`onFailure: "block"` plus 15 s on the two security guards; `ais doctor`
version check. L1 fixtures pass locally; L2 passed on Windows 2.1.319 with
controls; L3 shows 2.1.294 ignores the field. Open after merge: CI on Ubuntu
(first `jq` run) and Linux L2 (unverified). Results: HLD section 8.

## Scope and dependencies

Define the claimed trust boundary per tool/platform, then create repeatable
allow/block probes against projects generated from the packed artifact.
Additive controls can be tested/shipped before 25. Removing managed files in
existing adopters still depends on 25. Reuse 94's planted-binary positive control.
Never use real secrets or destructive production targets in fixtures.

## Acceptance and validation

- [ ] Matrix records tool/runtime/platform versions, permission mode and exact
  claimed control; unsupported cases say unsupported rather than protected.
- [ ] Allowed benign operations pass; prohibited operations are blocked at the
  claimed boundary. Test secret reads through tools AND shell/file-copy paths;
  document what read-deny rules alone cannot protect.
- [ ] Include nested secret paths, injection text in untrusted files/tool output,
  destructive command variants and planted executable lookup. Use disposable
  fixtures and sentinel files to observe execution, not guessed output strings.
- [ ] Missing parser/dependency, timeout, malformed hook input and denied spawn
  never become a successful enforcement result; false-positive blocks recorded.
- [ ] Positive controls prove each exploit/failure fixture would be observable
  without the protection; negative checks cannot pass vacuously.
- [ ] Windows and Linux probes run without optional jq/python assumptions;
  record shell/native-tool differences rather than asserting universal parity.
- [ ] Packed new installs and supported prior-version upgrades carry effective
  controls. Evidence includes command, result and artifact/tool versions.

## Exit

Required probes pass for claimed supported configurations. Any unsupported or
unverified boundary has a clear disclosure/remedy. Connect results to doctor and
CI where mechanically possible; behavioral injection resistance is an evaluation
result, not a claim of absolute immunity.
