/// <reference types="node" />
// Run with `npm test` (Node's built-in test runner; Node strips the types).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { SKELETONS } from './art.generated.ts';
import {
  boundsOf,
  buildPath,
  fitCorners,
  fitSpan,
  fitUniform,
  insetsOf,
  parsePath,
  type Point,
  type Skeleton,
} from './skeleton.ts';

// Path strings and insets produced by ScreenBorder.tsx and SeparatingLine.tsx before they moved
// onto this module. Any change to them is a change to how the border or separator looks.
const GOLDEN = JSON.parse(
  fs.readFileSync(new URL('./skeleton.golden.json', import.meta.url), 'utf8')
) as {
  border: Record<string, string>;
  line: Record<string, string>;
  inset: { top: number; right: number; bottom: number; left: number };
};

const BORDER_CORNER = 115;

function close(actual: Point, expected: Point, message?: string) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) < 1e-9 && Math.abs(actual[1] - expected[1]) < 1e-9,
    `${message ?? ''} expected ${expected}, got ${actual}`
  );
}

test('parsePath reads absolute cubics unchanged', () => {
  assert.deepEqual(parsePath('M1 2C3 4 5 6 7 8'), [[[1, 2], [3, 4], [5, 6], [7, 8]]]);
});

test('parsePath turns lines, H, V and Z into cubics and handles relative commands', () => {
  const [path] = parsePath('m10 10h30v30l-30 0z');
  const anchors = path.filter((_, i) => i % 3 === 0);
  assert.deepEqual(anchors, [[10, 10], [40, 10], [40, 40], [10, 40], [10, 10]]);
  // A straight segment's control points sit at 1/3 and 2/3 of the way.
  close(path[1], [20, 10]);
  close(path[2], [30, 10]);
});

test('parsePath reads exponents instead of splitting them into two numbers', () => {
  const [path] = parsePath('M0 1.8801e-08H10');
  close(path[0], [0, 1.8801e-8]);
  close(path[3], [10, 1.8801e-8]);
});

test('parsePath expands S, Q and T', () => {
  const [s] = parsePath('M0 0C0 10 10 10 10 0S20 -10 20 0');
  close(s[4], [10, -10], 'S reflects the previous control point:');
  const [q] = parsePath('M0 0Q15 30 30 0T60 0');
  close(q[1], [10, 20]);
  close(q[2], [20, 20]);
  close(q[4], [40, -20], 'T reflects the previous quadratic point:');
});

test('parsePath refuses arcs rather than producing wrong geometry', () => {
  assert.throws(() => parsePath('M0 0A5 5 0 0 1 10 0'), /Unsupported path command "A"/);
});

test('buildPath round-trips through parsePath', () => {
  const d = 'M2.50 2.50C11.19 2.50 19.87 2.50 28.56 2.50';
  assert.equal(buildPath(parsePath(d)), d);
});

test('screen border is unchanged from the original ScreenBorder.tsx', () => {
  for (const [size, expected] of Object.entries(GOLDEN.border)) {
    const [width, height] = size.split('x').map(Number);
    assert.equal(buildPath(fitCorners(SKELETONS.screenBorder, { width, height }, BORDER_CORNER)), expected);
  }
  const inset = insetsOf(SKELETONS.screenBorder, BORDER_CORNER, 5 / 2 + 12);
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    assert.ok(Math.abs(inset[side] - GOLDEN.inset[side]) < 1e-9, side);
  }
});

test('separator is unchanged from the original SeparatingLine.tsx', () => {
  for (const [width, expected] of Object.entries(GOLDEN.line)) {
    assert.equal(buildPath(fitSpan(SKELETONS.separator, Number(width))), expected);
  }
});

test('fitSpan puts the ends on both edges and keeps the height', () => {
  for (const width of [200, 348, 808]) {
    const [path] = fitSpan(SKELETONS.separator, width);
    assert.equal(path[0][0], 0);
    assert.ok(Math.abs(path[path.length - 1][0] - width) < 1e-9);
    path.forEach((point, i) => assert.equal(point[1], SKELETONS.separator.paths[0][i][1]));
  }
});

test('fitCorners keeps corner points at the same distance from their edges', () => {
  const border = SKELETONS.screenBorder;
  for (const target of [{ width: 348, height: 655 }, { width: 808, height: 1168 }]) {
    const fitted = fitCorners(border, target, BORDER_CORNER).flat();
    border.paths.flat().forEach(([x, y], i) => {
      const [fx, fy] = fitted[i];
      if (x <= BORDER_CORNER) assert.equal(fx, x);
      if (x >= border.width - BORDER_CORNER) assert.ok(Math.abs(target.width - fx - (border.width - x)) < 1e-9);
      if (y <= BORDER_CORNER) assert.equal(fy, y);
      if (y >= border.height - BORDER_CORNER) assert.ok(Math.abs(target.height - fy - (border.height - y)) < 1e-9);
    });
  }
});

test('fitCorners never folds the path, including below 2 × corner', () => {
  const border = SKELETONS.screenBorder;
  const source = border.paths.flat();
  for (let size = 180; size <= 1200; size += 20) {
    const fitted = fitCorners(border, { width: size, height: size }, BORDER_CORNER).flat();
    // The mapping must preserve the order of every coordinate on both axes.
    for (const axis of [0, 1] as const) {
      const order = source.map((p, i) => i).sort((a, b) => source[a][axis] - source[b][axis]);
      for (let k = 1; k < order.length; k++) {
        assert.ok(fitted[order[k]][axis] >= fitted[order[k - 1]][axis], `folded at ${size}`);
      }
    }
  }
});

test('fitUniform keeps the whole stroke inside the box', () => {
  const stroke = 4;
  for (const box of [SKELETONS.dayBox1, SKELETONS.dayBox2, SKELETONS.dayBox3] as Skeleton[]) {
    for (let width = 30; width <= 110; width += 4) {
      const height = (width * box.height) / box.width;
      const { minX, minY, maxX, maxY } = boundsOf(fitUniform(box, { width, height }, stroke / 2));
      const slack = 1e-6;
      assert.ok(minX - stroke / 2 >= -slack && minY - stroke / 2 >= -slack, `${width}: past top/left`);
      assert.ok(maxX + stroke / 2 <= width + slack && maxY + stroke / 2 <= height + slack, `${width}: past bottom/right`);
    }
  }
});

test('fitUniform fits all three day boxes to the same size', () => {
  const sizes = [SKELETONS.dayBox1, SKELETONS.dayBox2, SKELETONS.dayBox3].map((box) => {
    const b = boundsOf(fitUniform(box, { width: 40, height: 40 * (45 / 55) }, 2));
    return [b.maxX - b.minX, b.maxY - b.minY];
  });
  // Each fills the box on at least one axis.
  for (const [w, h] of sizes) {
    assert.ok(Math.abs(w - 36) < 1e-6 || Math.abs(h - (40 * 45) / 55 + 4) < 1e-6);
  }
});

test('fitUniform collapses instead of mirroring when the box is smaller than the padding', () => {
  const { minX, maxX } = boundsOf(fitUniform(SKELETONS.dayBox1, { width: 0, height: 0 }, 2));
  assert.equal(minX, maxX);
});

test('popup border stays inside the popup at every phone size', () => {
  const frame = SKELETONS.popupBorder;
  for (let width = 220; width <= 400; width += 10) {
    const height = (width * frame.height) / frame.width;
    const { minX, minY, maxX, maxY } = boundsOf(fitCorners(frame, { width, height }, 55));
    const half = frame.strokeWidth / 2;
    const slack = 0.01;
    assert.ok(minX - half >= -slack && minY - half >= -slack, `${width}: past top/left`);
    assert.ok(maxX + half <= width + slack && maxY + half <= height + slack, `${width}: past bottom/right`);
  }
});
