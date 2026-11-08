/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAY_GRADIENTS } from '../constants/theme.ts';
import {
  badgeGradient,
  badgeUnlockSize,
  FRONT_END,
  FRONT_START,
  WASH_CYCLE,
  WASH_FROM,
  WASH_SOFTNESS,
  WASH_TO,
  washStops,
  type WashStop,
} from './badgeUnlockMotion.ts';

const INK = 'black';

// The stop at `along` diagonal lengths from the front, if one is placed exactly there.
function stopAt(stops: WashStop[], along: number) {
  const offset = (along - WASH_FROM) / (WASH_TO - WASH_FROM);
  return stops.find((stop) => Math.abs(stop.offset - offset) < 1e-9)?.color;
}

test('stops run from 0 to 1 in order', () => {
  for (const colors of DAY_GRADIENTS) {
    const stops = washStops(colors, INK);
    assert.equal(stops[0].offset, 0);
    assert.equal(stops.at(-1)?.offset, 1);
    stops.slice(1).forEach((stop, index) => assert.ok(stop.offset > stops[index].offset));
  }
});

test('the front is the last color, and ink starts a softness ahead of it', () => {
  for (const colors of DAY_GRADIENTS) {
    const stops = washStops(colors, INK);
    assert.equal(stopAt(stops, 0), colors.at(-1));
    assert.equal(stopAt(stops, WASH_SOFTNESS), INK);
    assert.equal(stops.at(-1)?.color, INK);
  }
});

test('once the wash is done the badge shows the colors bottom left to top right', () => {
  const colors = DAY_GRADIENTS[0];
  const stops = washStops(colors, INK);
  // With the front at FRONT_END, the top right corner is at the front and the bottom left one a
  // diagonal behind it.
  assert.equal(stopAt(stops, 0.5 - FRONT_END), colors.at(-1));
  assert.equal(stopAt(stops, -0.5 - FRONT_END), colors[0]);
});

test('the colors repeat every cycle, so the flow loops without a jump', () => {
  const stops = washStops(DAY_GRADIENTS[3], INK);
  const behind = stops.filter((stop) => stop.color !== INK);
  for (const stop of behind) {
    const along = stop.offset * (WASH_TO - WASH_FROM) + WASH_FROM;
    const earlier = stopAt(stops, along - WASH_CYCLE);
    if (earlier !== undefined) {
      assert.equal(earlier, stop.color);
    }
  }
});

test('the gradient covers the badge at every front position', () => {
  // The badge spans -0.5 to 0.5 around the middle; relative to the front that's front ± 0.5.
  assert.ok(WASH_TO >= 0.5 - FRONT_START);
  assert.ok(WASH_FROM <= -0.5 - (FRONT_END + WASH_CYCLE));
  // The badge is all ink before the wash, and all color after it.
  assert.ok(-0.5 - FRONT_START >= WASH_SOFTNESS);
  assert.ok(0.5 - FRONT_END <= 0);
});

test('the badge size grows with the screen and leaves room for its name', () => {
  // iPhone SE, the reference phone, a Pro Max and a small Android, inside the screen border.
  const screens = [
    { width: 343, height: 619 },
    { width: 370, height: 818 },
    { width: 408, height: 900 },
    { width: 328, height: 680 },
  ];
  const sizes = screens.map(badgeUnlockSize);
  screens.forEach((screen, index) => {
    assert.ok(sizes[index] <= screen.width * 0.7);
    assert.ok(sizes[index] <= screen.height * 0.4);
    assert.ok(sizes[index] >= 200);
  });
  assert.ok(sizes[2] > sizes[0]);
  // A short, wide space is limited by its height.
  assert.equal(badgeUnlockSize({ width: 800, height: 400 }), Math.round(400 * 0.38));
});

test('a badge always gets the same played-day gradient', () => {
  for (const name of ['Sniper', 'Slasher', 'Thinker', 'Goat']) {
    assert.equal(badgeGradient(name), badgeGradient(name));
    assert.ok(DAY_GRADIENTS.includes(badgeGradient(name)));
  }
});
