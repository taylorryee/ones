/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FLOW_RATES, pace, START_PACING, type FlowPacing } from './flowPacing.ts';

// The pacing after `seconds` of frames that each took `frameMs`.
function run(frameMs: number, seconds: number, pacing: FlowPacing = START_PACING) {
  let current = pacing;
  for (let frame = 0; frame < (seconds * 1000) / frameMs; frame++) {
    current = pace(current, frameMs);
  }
  return current;
}

test('a phone keeping up stays at the best rate', () => {
  assert.equal(run(1000 / 60, 60).level, 0);
  assert.equal(run(1000 / 120, 60).level, 0);
});

test('a slow phone steps down, then ends up still', () => {
  assert.equal(FLOW_RATES[run(50, 5).level], 15);
  assert.equal(FLOW_RATES[run(50, 10).level], 0);
});

test('one slow moment does not slow it down', () => {
  const afterHitch = run(50, 3);
  assert.equal(run(1000 / 60, 60, afterHitch).level, 0);
});

test('the app pausing does not count as a slow frame', () => {
  assert.deepEqual(pace(START_PACING, 5000), START_PACING);
});

test('it never speeds back up', () => {
  const slowed = run(50, 5);
  assert.equal(run(1000 / 60, 60, slowed).level, slowed.level);
});
