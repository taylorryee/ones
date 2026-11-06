/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OwnedSticker } from '@/services/stickers';

import { placeBadge, showcaseSlots } from './showcaseSlots.ts';

function badge(id: number, showcase_slot: number | null) {
  return { id, showcase_slot } as OwnedSticker;
}

function slotIds(badges: OwnedSticker[]) {
  return showcaseSlots(badges).map((owned) => owned?.id ?? null);
}

test('badges are read into their slots, with openings left empty', () => {
  assert.deepEqual(slotIds([badge(1, 2), badge(2, null), badge(3, 0)]), [3, null, 1]);
  assert.deepEqual(slotIds([]), [null, null, null]);
});

test('a badge from the collection fills an opening', () => {
  const badges = [badge(1, 0), badge(2, null)];
  assert.deepEqual(slotIds(placeBadge(badges, badges[1], 2)), [1, null, 2]);
});

test('a badge from the collection replaces the one in its slot', () => {
  const badges = [badge(1, 0), badge(2, null)];
  const placed = placeBadge(badges, badges[1], 0);
  assert.deepEqual(slotIds(placed), [2, null, null]);
  assert.equal(placed[0].showcase_slot, null);
});

test('a badge already on the wall trades places', () => {
  const badges = [badge(1, 0), badge(2, 1), badge(3, 2)];
  assert.deepEqual(slotIds(placeBadge(badges, badges[2], 0)), [3, 2, 1]);
});

test('a badge on the wall moves to an opening and leaves its slot empty', () => {
  const badges = [badge(1, 0)];
  assert.deepEqual(slotIds(placeBadge(badges, badges[0], 1)), [null, 1, null]);
});

test('placing a badge in its own slot changes nothing', () => {
  const badges = [badge(1, 0), badge(2, 1)];
  assert.deepEqual(slotIds(placeBadge(badges, badges[1], 1)), [1, 2, null]);
});
