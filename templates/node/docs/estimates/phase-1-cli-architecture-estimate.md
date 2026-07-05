# Phase 1 — CLI Architecture Estimate

**Epic:** AI Scaffold CLI Development  
**Target:** CLI MVP with `create`, `init`, `status`, `doctor` commands  
**Version:** v0.6.2 scaffolding baseline  
**Date:** 2026-06-30  
**Estimator:** Techversant Team Lead  

---

## Executive Summary

| Phase | Estimated Days | Confidence | Risk Buffer |
|---|---|---|---|
| Phase 1 | **6-8 days** | HIGH | 1 day buffer |
| **Total** | **6-8 days** | | |

**✅ HIGH CONFIDENCE:** Clear requirements, scaffold already built, strong development model in place. CLI projects have well-defined inputs/outputs.

---

## Task Breakdown

| Task | Description | Optimistic | Realistic | Pessimistic | Risk Multiplier | Notes |
|---|---|---|---|---|---|---|
| **CLI Project Setup** | Configure `package.json`, `bin/ai-scaffold.js`, dependencies, structure | 1 day | 1.5 days | 2 days | 1.0 | Straightforward, just configuration |
| **Placeholder Resolution** | Build pipeline to scan/replace `{{...}}` tokens in any text file | 1.5 days | 2 days | 3 days | 1.2 | Token matching complexity |
| **`create` Command** | New project creation: template copy, prompt flow, directory creation | 1 day | 1.5 days | 2 days | 1.1 | Simple file operations |
| **`init` Command** | Install into existing project: conflict detection, diff display, safe overwrite | 2 days | 2.5 days | 4 days | 1.3 | Edge cases with existing `.claude/` |
| **`status` Command** | Report installed version, profile, managed files, modifications | 0.5 days | 1 day | 1.5 days | 1.2 | File hash calculation |
| **`doctor` Command** | Validate installation: missing files, modified files, settings issues | 0.5 days | 1 day | 1.5 days | 1.1 | Diagnostic logic |
| **Conflict Handling** | Implement `--dry-run`, `--force`, confirmation prompts, safe overwrite | 1 day | 1.5 days | 2 days | 1.0 | Core safety feature |
| **generic Profile** | Build complete `templates/generic/` package with all base files | 1 day | 1.5 days | 2 days | 1.0 | Existing scaffold structure |
| **laravel Profile** | Build complete `templates/laravel/` with PHP stack overlays | 1 day | 1.5 days | 2 days | 1.1 | Overlay integration |
| **Tests** | Unit tests, integration tests, CLI end-to-end tests | 1 day | 1.5 days | 2.5 days | 1.2 | Test coverage needed |
| **Documentation** | CLI usage, commands, profiles, examples, installation guide | 0.5 days | 1 day | 1.5 days | 1.0 | User docs required |
| **Code Review & QA** | Review, fix blockers, verification, adjustments | 1 day | 1.5 days | 2 days | 1.0 | Final polish pass |

**Realistic Total (with risk buffer): 16.5 days → 18 days (rounded)**

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| File overwrite edge cases | Medium | High | Test scenarios: existing `.vscode/`, legacy `.claude/` conflicts |
| Placeholder resolution complexity | Medium | Medium | Use token mapping table, test with special characters/strings |
| Profile inheritance model | Low | Medium | Pre-merged profiles are simpler than dynamic merging |
| Unknown file format conflicts | Low | High | Plan for binary files (images, compiled assets) exclusion |
| CLI dependency conflicts | Low | Low | Use dependency version constraints early |
| Scaffold structure changes | Low | Medium | Use relative paths, don't hardcode absolute paths |
| Cross-platform path issues | Low | Medium | Test on Windows, macOS, Linux with path.normalize() |

---

## Assumptions

1. **Existing Scaffold Structure** — The ai-scaffold repo structure (`.claude/`, `docs/`, `templates/`, `apps/`, `packages/`) is final and won't change significantly during CLI development
2. **Node.js Target** — CLI will be distributed as a Node.js package via npm, targeting Node 16+
3. **Command-Line Interface** — Output will be terminal-friendly (ANSI colors, tables, progress bars) not web UI
4. **Synchronous Design** — CLI operations will be synchronous, not Promise-based
5. **No External API Calls** — CLI works offline, no network dependency beyond npm registry
6. **Git Integration** — CLI will work with `git` for version control (add/commit suggestions)
7. **Template Profiles** — `generic` and `laravel` profiles will be pre-merged complete packages
8. **Interactive/Non-Interactive** — Commands support both `--yes` flags and interactive prompts
9. **No Real-time Processing** — No long-running tasks (everything completes in <5s)

---

## Exclusions

1. **CLI Packaging and Release** — Publishing to npm, version tagging, release automation is a separate Phase 4 task
2. **Profile Development** — Other profiles (Next.js, Go, Python, Java, .NET, Flutter) are Phase 4/5 work
3. **Web UI Companion** — No web-based CLI management or monitoring
4. **Plugin Architecture** — CLI won't support plugin extensions in Phase 1
5. **Advanced Update Logic** — Delta updates, rollback, migration strategies are Phase 3+ work
6. **Windows/macOS/Linux Specifics** — Basic cross-platform support, no OS-specific features
7. **CI/CD Integration** — No integration with external CI systems (GitHub Actions, etc.)
8. **Performance Optimization** — Focus on correctness over speed optimization

---

## Recommended Phasing

**Single Phase:** All tasks in this estimate should be completed in Phase 1 since they represent a cohesive CLI MVP. No logical break points exist in the flow.

---

## Confidence Assessment: HIGH

**Why HIGH confidence:**
- ✅ Clear specification with detailed flow diagrams and examples
- ✅ No architectural unknowns (scaffold already exists)
- ✅ Well-defined inputs/outputs (CLI commands)
- ✅ Straightforward file operations and template copying
- ✅ Predictable risk patterns (file conflicts, edge cases)
- ✅ No third-party integrations or dependencies
- ✅ Small scope (2 commands initially, expandable in Phase 3)

---

## Timeline Estimate

- **Optimistic:** 16 days → **6 weeks sprint + 2 weeks buffer**
- **Realistic:** 18 days → **8 days per week + 1 buffer day**
- **Pessimistic:** 24 days → **4 weeks stretch + QA overlap**

**Recommended Sprint Cadence:** 18 days of focused development → **Phase 1 launch expected within 4 weeks**.

---

## Sign-off Required

Tech Lead sign-off must be documented in this file before Phase 1 work begins. Use the template format below:

```
=== Tech Lead Sign-off ===

Reviewer: [Tech Lead Name]
Date: 2026-06-30
Confidence: HIGH
Assessment: Estimate covers all required CLI MVP tasks with appropriate risk buffer. HIGH confidence due to clear specification, existing scaffold, and well-defined scope.
Decision: APPROVED

[Tech Lead Signature]

---

## Post-Sign-off

✅ **Phase 1 estimate approved** → Ready to proceed with CLI architecture development.
📋 **Next milestone:** Phase 1 completion estimated for within 4 weeks.
🔄 **Sprint planning:** Use the 18-day total estimate for sprint capacity planning.
```
