import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from '../src/cart.js';

const cart = [{ priceCents: 1999, quantity: 3 }, { priceCents: 5, quantity: 1 }];

test('hidden: SAVE10 takes 10% off the subtotal, rounded down to whole cents', () => {
  assert.equal(applyDiscount(cart, 'SAVE10'), 5402);
});
test('hidden: an empty cart stays at zero', () => assert.equal(applyDiscount([], 'SAVE10'), 0));
test('hidden: an unknown code throws', () => {
  assert.throws(() => applyDiscount(cart, 'FREE'), { message: 'Unknown discount code' });
});
