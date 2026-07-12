import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    // The scaffold's own suite is src/ and tests/. Never scan templates/ —
    // profile templates ship their own starter test files (e.g. the node
    // profile's `node:test` smoke test) that are meant to run inside a
    // GENERATED project, not as part of this package's vitest run. Use a
    // recursive glob so nested copies are excluded too. Also skip .claude/ —
    // the scaffold's own worktree feature (spawn_task) checks out full repo
    // copies under .claude/worktrees/, and their nested templates + duplicate
    // suites would otherwise be scanned and fail `npm test` locally.
    exclude: [...configDefaults.exclude, '**/templates/**', '**/.claude/**'],
  },
});
