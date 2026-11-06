import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.js';

test('hidden: digits survive', () => assert.equal(slugify('Top 10 Tips'), 'top-10-tips'));
test('hidden: empty and symbol-only input give an empty slug', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify('!!!'), '');
});
test('hidden: tabs and newlines are separators', () => assert.equal(slugify('a\tb\nc'), 'a-b-c'));
