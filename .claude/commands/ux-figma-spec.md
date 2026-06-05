# /ux-figma-spec

Legacy alias. Figma-ready design instruction now belongs inside `/ux-design-prompt`.

Use:

```text
/ux-design-prompt {task-id}
```

`/ux-design-prompt` replaces the old Figma-spec stage and must produce a self-contained prompt for Figma Make, Claude Design, or a similar tool. It must include:

- design tokens
- component references
- frame/output expectations
- viewports
- light/dark themes
- states
- exclusions
- acceptance checklist

After the prompt is ready, the next step is manual:

```text
Paste prompt -> generate design -> human adjustment -> UX Lead approval -> /ux-review -> /ux-handoff
```
