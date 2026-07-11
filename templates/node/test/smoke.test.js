// Starter smoke test — proves the test harness works day-one, with zero
// dependencies (Node's built-in `node:test` runner). Replace/extend it with
// real tests as you build. `npm test` runs `node --test`, which discovers this.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('scaffold smoke: the test runner is wired and passing', () => {
  assert.equal(1 + 1, 2);
});
