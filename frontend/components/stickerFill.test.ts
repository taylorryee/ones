/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stickerFills } from './stickerFill.ts';

const CANVAS = 512;

test('a line whose ends meet is filled as one closed shape', () => {
  const fills = stickerFills(['M100 100L300 100L300 300L100 300L100 110'], CANVAS);
  assert.equal(fills.length, 1);
  assert.ok(fills[0].endsWith('Z'));
});

test('two halves of an outline are joined into one shape', () => {
  // Left and right halves, each open, whose ends nearly meet at the top and bottom.
  const fills = stickerFills(
    ['M200 100L100 200L200 400', 'M205 105L300 200L205 395'],
    CANVAS
  );
  assert.equal(fills.length, 1);
});

test('a small open line is a detail and is not filled', () => {
  assert.deepEqual(stickerFills(['M100 100L120 100L130 140'], CANVAS), []);
});
