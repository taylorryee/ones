/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAY_COLORS, DAY_GRADIENTS } from '../constants/theme.ts';
import { dayColor, dayGradient } from './dayColors.ts';

// Every day for 40 years, so all month ends, leap days and clock changes are covered.
const DAYS = Array.from({ length: 366 * 40 }, (_, index) => new Date(2024, 0, 1 + index));

test('no two days in a row share a color', () => {
  DAYS.slice(1).forEach((date, index) => {
    assert.notEqual(dayColor(date), dayColor(DAYS[index]), date.toDateString());
  });
});

test('every day is one of the palette colors', () => {
  for (const date of DAYS) {
    assert.ok(DAY_COLORS.includes(dayColor(date)), date.toDateString());
  }
});

test('no two days in a row share a gradient', () => {
  DAYS.slice(1).forEach((date, index) => {
    assert.notEqual(dayGradient(date), dayGradient(DAYS[index]), date.toDateString());
  });
});

test('every gradient gets used', () => {
  const used = new Set(DAYS.map((date) => dayGradient(date)));
  assert.equal(used.size, DAY_GRADIENTS.length);
});

test('a day always gets the same color', () => {
  assert.equal(dayColor(new Date(2026, 10, 6)), dayColor(new Date(2026, 10, 6, 23, 59)));
});

test('the colors come up about equally often', () => {
  const fairShare = DAYS.length / DAY_COLORS.length;
  for (const color of DAY_COLORS) {
    const count = DAYS.filter((date) => dayColor(date) === color).length;
    assert.ok(Math.abs(count - fairShare) < fairShare * 0.1, `${color}: ${count}`);
  }
});
