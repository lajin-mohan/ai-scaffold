import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    // The scaffold's own suite is src/ and tests/. Never scan templates/ —
    // profile templates ship their own starter test files (e.g. the node
    // profile's `node:test` smoke test) that are meant to run inside a
    // GENERATED project, not as part of this package's vitest run.
    exclude: [...configDefaults.exclude, 'templates/**'],
  },
});
