/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EDGE_STRETCH, releaseTarget, rubberBand } from './swipePaging.ts';

const PITCH = 400;

test('a long enough drag moves one page either way', () => {
  assert.equal(releaseTarget(0.3, -1, 1, -100, 0, PITCH), 1);
  assert.equal(releaseTarget(-0.3, -1, 1, 100, 0, PITCH), -1);
});

test('a short drag at speed moves one page either way', () => {
  assert.equal(releaseTarget(0.02, -1, 1, -10, -800, PITCH), 1);
  assert.equal(releaseTarget(-0.02, -1, 1, 10, 800, PITCH), -1);
});

test('a short, slow drag settles back on the nearest page', () => {
  assert.ok(releaseTarget(0.1, -1, 1, -40, -100, PITCH) === 0);
  // === because this one is -0, which is the same page.
  assert.ok(releaseTarget(-0.1, -1, 1, 40, 100, PITCH) === 0);
});

test('a swipe never goes past the pages that can be reached', () => {
  // The calendar's latest month: forward is the page it's already on.
  assert.equal(releaseTarget(0.2, -1, 0, -100, -800, PITCH), 0);
});

test('a repeat flick while the last one is still landing moves on a page', () => {
  // On its way to page 1, so page 1 is the base even though the pages are short of it.
  assert.equal(releaseTarget(0.4, 0, 2, -80, -800, PITCH), 2);
});

test('a card caught mid-rotation lands on one of the two it was between', () => {
  // Rotating from page 0 to 1: forward finishes the slide, back returns to page 0.
  assert.equal(releaseTarget(0.6, 0, 1, -100, 0, PITCH), 1);
  assert.equal(releaseTarget(0.4, 0, 1, 100, 0, PITCH), 0);
  // Caught and let go, it settles on the nearer one.
  assert.equal(releaseTarget(0.6, 0, 1, -5, 0, PITCH), 1);
  assert.equal(releaseTarget(0.4, 0, 1, 5, 0, PITCH), 0);
});

test('the rubber band leaves values in range alone', () => {
  assert.equal(rubberBand(50, 0, 100, 300), 50);
});

test('the rubber band gives ever less, and never reaches its limit', () => {
  const limit = PITCH * EDGE_STRETCH;
  const near = rubberBand(100 + 50, 0, 100, limit) - 100;
  const far = rubberBand(100 + 100, 0, 100, limit) - 100;
  assert.ok(near > 0 && near < 50);
  assert.ok(far > near && far - near < near);
  assert.ok(rubberBand(1e9, 0, 100, limit) - 100 < limit);
  assert.ok(rubberBand(-1e9, 0, 100, limit) > -limit);
});
