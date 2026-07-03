# _ai/

AI-generated content staging area. Nothing here goes directly to production code.

```
_ai/
├── generated/    ← AI output to review before promotion to apps/ or packages/
├── drafts/       ← Work-in-progress generations, iterations, experiments
└── experiments/  ← Proof-of-concepts and spike outputs
```

## Rules

- **Nothing in `_ai/` is production code.** Review before promoting to `apps/` or `packages/`.
- Generated code in `generated/` has been reviewed at least once.
- `drafts/` and `experiments/` are ephemeral — clean up regularly.
- This folder is excluded from coverage reports and linting.
- **All `_ai/` subdirectories are gitignored.** Promote vetted output into `apps/` or `packages/` and commit it from there. Treat `_ai/` as ephemeral — if it isn't worth promoting, delete it.

## Workflow

```
AI generates → _ai/drafts/
         ↓ review
         → _ai/generated/      (vetted, still ephemeral)
         ↓ promote + commit
         → apps/ or packages/  (production code, tracked in git)
```
