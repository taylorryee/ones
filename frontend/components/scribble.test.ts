/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SKELETONS } from './art.generated.ts';
import { buildScribble, SCRIBBLE_KINDS } from './scribble.ts';
import { boundsOf, pathLength, type Point } from './skeleton.ts';

const WIDTH = 6;
const INSET = 7;
// Spacing of the spots checked for coverage.
const GRID = 0.5;
// Smallest box on a 360dp Android, the reference phone, a Pro Max, and something much bigger.
const BOX_SIZES = [34, 40, 46, 120];
// Height as a share of width: the day boxes (wider than tall), and a box taller than wide.
const RATIOS = [SKELETONS.dayBox1.height / SKELETONS.dayBox1.width, 1.1];
// Every combination, plus in-between widths, where rounding the number of strokes changes.
const SIZES = RATIOS.flatMap((ratio) =>
  [...BOX_SIZES, 37.5, 41, 43.5].map((width) => ({ width, height: width * ratio }))
);

// Points along the drawn curve, about every 0.2pt, close enough together to measure coverage.
function sample(paths: Point[][]): Point[] {
  const points: Point[] = [];
  for (const path of paths) {
    for (let i = 0; i + 3 < path.length; i += 3) {
      const [p0, c1, c2, p1] = path.slice(i, i + 4);
      const steps = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 0.2) + 4;
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const u = 1 - t;
        points.push([
          u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
          u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
        ]);
      }
    }
  }
  return points;
}

test('pathLength measures straight and curved segments', () => {
  assert.equal(pathLength([[[0, 0], [1, 0], [2, 0], [3, 0]]]), 3);
  // A quarter circle of radius 10 as a cubic is within 0.1% of 5π.
  const k = 10 * 0.5523;
  const arc = pathLength([[[10, 0], [10, k], [k, 10], [0, 10]]]);
  assert.ok(Math.abs(arc - 5 * Math.PI) < 0.02, `${arc}`);
});

test('the same seed gives the same scribble, another seed a different one', () => {
  const size = { width: 40, height: 44 };
  for (const kind of SCRIBBLE_KINDS) {
    assert.deepEqual(
      buildScribble(size, INSET, WIDTH, 12, kind),
      buildScribble(size, INSET, WIDTH, 12, kind)
    );
    assert.notDeepEqual(
      buildScribble(size, INSET, WIDTH, 12, kind),
      buildScribble(size, INSET, WIDTH, 13, kind),
      kind
    );
  }
});

test('the kinds take different paths', () => {
  const size = { width: 40, height: 44 };
  const paths = SCRIBBLE_KINDS.map((kind) =>
    JSON.stringify(buildScribble(size, INSET, WIDTH, 3, kind).paths)
  );
  assert.equal(new Set(paths).size, SCRIBBLE_KINDS.length);
});

test('every kind stays inside the inset at every box size', () => {
  for (const kind of SCRIBBLE_KINDS) {
    for (const size of SIZES) {
      const { width } = size;
      for (let seed = 1; seed <= 31; seed++) {
        const { minX, minY, maxX, maxY } = boundsOf(
          buildScribble(size, INSET, WIDTH, seed, kind).paths
        );
        const where = `${kind} ${width}/${seed}`;
        assert.ok(minX >= INSET - 1e-9 && minY >= INSET - 1e-9, `${where}: ${minX}, ${minY}`);
        assert.ok(
          maxX <= size.width - INSET + 1e-9 && maxY <= size.height - INSET + 1e-9,
          `${where}: ${maxX}, ${maxY}`
        );
      }
    }
  }
});

test('every kind covers the whole inset area at every box size', () => {
  for (const kind of SCRIBBLE_KINDS) {
    for (const size of SIZES) {
      const { width } = size;
      for (let seed = 1; seed <= 10; seed++) {
        const points = sample(buildScribble(size, INSET, WIDTH, seed, kind).paths);
        // Every spot inside the inset, half a point apart, is under the pen (within half a line).
        // Each sampled point marks the spots it covers, rather than searching all points per spot.
        const columns = Math.floor((size.width - INSET * 2) / GRID) + 1;
        const rows = Math.floor((size.height - INSET * 2) / GRID) + 1;
        const covered = new Uint8Array(columns * rows);
        const reach = WIDTH / 2;
        for (const [px, py] of points) {
          const x = px - INSET;
          const y = py - INSET;
          const x0 = Math.max(0, Math.ceil((x - reach) / GRID));
          const x1 = Math.min(columns - 1, Math.floor((x + reach) / GRID));
          const y0 = Math.max(0, Math.ceil((y - reach) / GRID));
          const y1 = Math.min(rows - 1, Math.floor((y + reach) / GRID));
          for (let column = x0; column <= x1; column++) {
            for (let row = y0; row <= y1; row++) {
              if (Math.hypot(x - column * GRID, y - row * GRID) <= reach) {
                covered[row * columns + column] = 1;
              }
            }
          }
        }
        const gap = covered.indexOf(0);
        assert.equal(
          gap,
          -1,
          `${kind} ${width}/${seed}: gap at ${INSET + (gap % columns) * GRID}, ${INSET + Math.floor(gap / columns) * GRID}`
        );
      }
    }
  }
});

test('a box too small for its inset gets no scribble', () => {
  for (const kind of SCRIBBLE_KINDS) {
    assert.deepEqual(buildScribble({ width: 10, height: 10 }, INSET, WIDTH, 1, kind), {
      paths: [],
      length: 0,
    });
  }
});

test('the length is the length of the path', () => {
  for (const kind of SCRIBBLE_KINDS) {
    const scribble = buildScribble({ width: 40, height: 44 }, INSET, WIDTH, 3, kind);
    assert.equal(scribble.length, pathLength(scribble.paths));
    assert.ok(scribble.length > 0);
  }
});
