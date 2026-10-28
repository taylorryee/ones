/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitBadgeGrid } from './badgeGrid.ts';

// About the card's content size on the reference phone.
const CARD = { width: 330, height: 130 };

function fits(count: number, box: { width: number; height: number }) {
  const grid = fitBadgeGrid(count, box);
  assert.ok(grid.columns * grid.rows >= count, `${count}: every badge has a cell`);
  assert.ok(grid.rows - 1 < count / grid.columns, `${count}: no empty row`);
  const width = grid.columns * grid.badge + (grid.columns - 1) * grid.gap;
  const height = grid.rows * grid.badge + (grid.rows - 1) * grid.gap;
  assert.ok(width <= box.width, `${count}: fits the width`);
  assert.ok(height <= box.height, `${count}: fits the height`);
  return grid;
}

test('nothing to fit gives an empty grid', () => {
  assert.deepEqual(fitBadgeGrid(0, CARD), { columns: 0, rows: 0, badge: 0, gap: 0 });
  assert.deepEqual(fitBadgeGrid(3, { width: 0, height: 100 }), {
    columns: 0,
    rows: 0,
    badge: 0,
    gap: 0,
  });
});

test('every count fits inside the card', () => {
  for (let count = 1; count <= 60; count++) {
    fits(count, CARD);
    fits(count, { width: 120, height: 300 });
  }
});

test('one badge fills the shorter side', () => {
  assert.equal(fits(1, CARD).badge, CARD.height);
});

test('badges shrink as more are added, and never grow', () => {
  let last = Infinity;
  for (let count = 1; count <= 60; count++) {
    const { badge } = fits(count, CARD);
    assert.ok(badge <= last, `${count}: ${badge} > ${last}`);
    last = badge;
  }
});

test('a wide card lays a few badges out in one row', () => {
  const grid = fits(3, CARD);
  assert.equal(grid.rows, 1);
  assert.equal(grid.columns, 3);
});

test('badges scale with the card', () => {
  const small = fits(8, CARD);
  const large = fits(8, { width: CARD.width * 1.25, height: CARD.height * 1.25 });
  assert.ok(large.badge > small.badge);
});
