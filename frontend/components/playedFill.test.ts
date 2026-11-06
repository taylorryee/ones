/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DayFill } from '@/hooks/useDayFills';

import { playedFill } from './playedFill.ts';

const HOOPED: DayFill = { color: '#EF4444', animate: false, kind: 'rows' };

test('a colored-in day keeps its scribble underneath and draws in over it', () => {
  assert.deepEqual(playedFill(HOOPED, '#22C55E', 'spiral', false), {
    color: '#22C55E',
    kind: 'spiral',
    animate: true,
    played: true,
    under: { color: '#EF4444', kind: 'rows' },
  });
});

test('an empty day has nothing underneath', () => {
  assert.equal(playedFill(undefined, '#22C55E', 'spiral', true).under, undefined);
});

test('an empty day only draws in when asked to', () => {
  assert.equal(playedFill(undefined, '#22C55E', 'spiral', true).animate, true);
  assert.equal(playedFill(undefined, '#22C55E', 'spiral', false).animate, false);
});

test('a day that already has a game stays as it is', () => {
  const played = playedFill(HOOPED, '#22C55E', 'spiral', false);
  assert.equal(playedFill(played, '#3B82F6', 'rows', true), played);
});
