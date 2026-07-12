---
description: Legacy alias — screen-level specification now belongs inside /ux-design-prompt.
---

# /ux-screen-spec

Legacy alias. Screen-level specification now belongs inside `/ux-design-prompt`.

Use:

```text
/ux-design-prompt {task-id}
```

`/ux-design-prompt` must include the screen/component details that Figma Make, Claude Design, or a similar tool needs:

- layout intent
- component hierarchy
- states
- responsive behavior
- interactions
- accessibility requirements
- token requirements
- expected Figma output
- review checklist

Do not run one prompt per screen unless the task itself is intentionally scoped to one screen.
