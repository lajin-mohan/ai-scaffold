# Smoke run — baseline-2026-11-26

Claude Code 2.1.328 (Claude Code) · model claude-sonnet-5-5 · win32-x64 · Node v24.20.0
Tarball lajin.m-ai-scaffold-0.20.1.tgz (sha256 4662e66790cf…) · 2 repeats · budget $1/run
Setups native, minimal, full · native none · minimal ccdae303c783 · full tarball

| Task [setup] | Passes / valid | Invalid | Median uncached in | Cache read | Cache write | Output | Turns | Seconds | Cost $ | Restricted denials |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| bugfix-slugify [native] | 2/2 | 0 | 38807 | 0 | 0 | 1096.5 | 7.5 | 14 | 0.091834 | 0 |
| bugfix-slugify [minimal] | 2/2 | 0 | 40332 | 0 | 0 | 1043 | 7 | 16 | 0.094334 | 0 |
| bugfix-slugify [full] | 2/2 | 0 | 101812.5 | 0 | 0 | 1454 | 6 | 28.5 | 0.22139999999999999 | 0 |
| feature-discount [minimal] | 1/2 | 0 | 51279.5 | 0 | 0 | 2836.5 | 8 | 20.5 | 0.134264 | 0 |
| feature-discount [full] | 2/2 | 0 | 137047 | 0 | 0 | 2080.5 | 8.5 | 39 | 0.298249 | 0 |
| feature-discount [native] | 2/2 | 0 | 44035.5 | 0 | 0 | 2057 | 7.5 | 17.5 | 0.111991 | 0 |

## Failures (T3)

- feature-discount [minimal] r1: no test under test/ calls applyDiscount; hidden applyDiscount tests fail

## Invalid runs (harness failures, not agent results)

None.
