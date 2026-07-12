---
description: Compatibility alias for /ux-analysis.
---

# /ux-analyze

Compatibility alias for `/ux-analysis`.

Use the new canonical command:

```text
/ux-analysis {module-or-task-id}
```

`/ux-analysis` now covers the old `/ux-analyze` output plus the old `/ux-flow` output:

- requirements
- assumptions
- open questions
- scope
- roles and permissions
- user journeys and flows
- screen/task candidates
- risks and ambiguity

Do not continue to `/ux-flow`. The next command after approved analysis is:

```text
/ux-design-prompt {task-id}
```
