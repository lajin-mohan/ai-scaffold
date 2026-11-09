import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.js';

test('lowercases and joins words with single dashes', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('collapses runs of punctuation and spaces into one dash', () => {
  assert.equal(slugify('Hello,   World!!'), 'hello-world');
});

test('trims leading and trailing dashes', () => {
  assert.equal(slugify('  --Draft Post--  '), 'draft-post');
});
