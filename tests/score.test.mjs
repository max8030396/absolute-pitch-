import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { starsFor, fmt, rank } = require('../js/score.js');

test('starsFor: every 0.3s costs half a star', () => {
  assert.equal(starsFor(0), 5);
  assert.equal(starsFor(0.29), 5);
  assert.equal(starsFor(0.3), 4.5);
  assert.equal(starsFor(0.6), 4);
  assert.equal(starsFor(0.9), 3.5);
  assert.equal(starsFor(1.32), 3);
  assert.equal(starsFor(2.99), 0.5);
  assert.equal(starsFor(3), 0);
  assert.equal(starsFor(9), 0);
});

test('starsFor: no press scores zero', () => {
  assert.equal(starsFor(null), 0);
});

test('starsFor: float noise does not grant an extra half star', () => {
  assert.equal(starsFor(22.41 - 22.11), 4.5);   // 0.30000000000000071
  assert.equal(starsFor(Math.abs(21.51 - 22.11)), 4);
});

test('fmt: two decimals', () => {
  assert.equal(fmt(5), '5.00');
  assert.equal(fmt(22.111), '22.11');
  assert.equal(fmt(0), '0.00');
});

test('rank: smallest diff first, misses last, ties keep play order', () => {
  const e = [
    { name: 'A', diff: 0.5, at: 1 },
    { name: 'B', diff: null, at: 2 },
    { name: 'C', diff: 0.1, at: 3 },
    { name: 'D', diff: 0.5, at: 4 },
  ];
  assert.deepEqual(rank(e).map((x) => x.name), ['C', 'A', 'D', 'B']);
});
