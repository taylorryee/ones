// Pen scribbles that color in a box. Worked out from the box size and line width rather than drawn
// in Figma, so the strokes keep the same spacing, and the box the same coverage, at every size.
// No React Native imports, so Node can run the tests.

import { pathLength, type Point, type Size } from './skeleton.ts';

// The ways a hand colors a box in. Each covers the whole box; they differ in the path the pen
// takes, and so in how the fill grows while it draws in.
export const SCRIBBLE_KINDS = ['rows', 'columns', 'hatch', 'spiral'] as const;
export type ScribbleKind = (typeof SCRIBBLE_KINDS)[number];

// How long each kind takes to draw in, the same on every phone. The spiral's path is longer, so
// it gets a little more time.
export const SCRIBBLE_DURATION: Record<ScribbleKind, number> = {
  rows: 700,
  columns: 650,
  hatch: 750,
  spiral: 900,
};

// Rise from one zig-zag stroke to the next, as a share of the line width. Neighbouring strokes are
// twice this far apart at their open ends, so below 0.5 they always overlap.
const RISE = 0.4;
// The same for the diagonal hatch, a little closer: where its strokes meet an edge at an angle,
// the gaps between them open wider.
const HATCH_RISE = 0.35;
// Greatest distance between neighbouring rings of the spiral, which run parallel, as a share of
// the line width; below 1 they overlap.
const RING = 0.8;
// How far a turn can fall short of the edge, and how much a stroke can bow, as shares of the line
// width. Enough to look hand drawn without opening gaps.
const WANDER = 0.2;
const BOW = 0.1;

type Rect = { left: number; right: number; top: number; bottom: number };

// Seeded numbers in [0, 1) (mulberry32), so the same seed always gives the same scribble.
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Strokes back and forth across the box, turns alternating between its two sides. `across` is the
// axis the strokes run along (0 = x for rows, 1 = y for columns).
function zigZag(rect: Rect, strokeWidth: number, next: () => number, across: 0 | 1): Point[] {
  const [lo, hi, start, end] =
    across === 0
      ? [rect.left, rect.right, rect.top, rect.bottom]
      : [rect.top, rect.bottom, rect.left, rect.right];
  const strokes = Math.max(1, Math.ceil((end - start) / (strokeWidth * RISE)));
  const rise = (end - start) / strokes;
  const wander = Math.min(strokeWidth * WANDER, (hi - lo) / 4);
  const turns: Point[] = [];
  for (let i = 0; i <= strokes; i++) {
    const along = i % 2 === 0 ? lo + next() * wander : hi - next() * wander;
    const step = start + i * rise;
    turns.push(across === 0 ? [along, step] : [step, along]);
  }
  return turns;
}

// Diagonal strokes, each from the bottom-left edge to the top-right edge, working from the top-left
// corner to the bottom-right one. Strokes are HATCH_RISE apart measured square to them.
function hatch(rect: Rect, strokeWidth: number, next: () => number): Point[] {
  const first = rect.left + rect.top;
  const last = rect.right + rect.bottom;
  const strokes = Math.max(1, Math.ceil((last - first) / (strokeWidth * HATCH_RISE * Math.SQRT2)));
  const step = (last - first) / strokes;
  // Where the strokes' top-right ends move from the top edge to the right one, and their
  // bottom-left ends from the left edge to the bottom one.
  const cornerAt = [rect.right + rect.top, rect.left + rect.bottom];
  const turns: Point[] = [];
  for (let i = 0; i <= strokes; i++) {
    // Every point on this stroke has x + y = c.
    const c = first + step * i;
    const upperX = Math.min(rect.right, c - rect.top);
    const lowerY = Math.min(rect.bottom, c - rect.left);
    const upper: Point = [upperX, c - upperX];
    const lower: Point = [c - lowerY, lowerY];
    const [from, to] = i % 2 === 0 ? [lower, upper] : [upper, lower];
    // This end is two strokes on from the last turn on its side; if a corner lies between them,
    // the pen goes into it first, since cutting across would leave it bare.
    const corner = cornerAt[i % 2];
    if (c - step * 2 < corner && corner < c) {
      turns.push(i % 2 === 0 ? [rect.right, rect.top] : [rect.left, rect.bottom]);
    }
    // Turns fall short of the edge by sliding back along their stroke, which keeps them inside.
    // Only half as far as in zigZag: sliding diagonally opens a wider gap at the edge.
    const span = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const t = span > 0 ? (Math.min((strokeWidth * WANDER) / 2, span / 4) * next()) / span : 0;
    turns.push([to[0] + (from[0] - to[0]) * t, to[1] + (from[1] - to[1]) * t]);
  }
  return turns;
}

// Round the inside edge from the top-left corner, each ring at most RING further in, then down
// the line through the middle that a spiral in a rectangle closes onto. The rings are spaced so
// that line is one ring in from the innermost. Worked out for a box taller than wide, where the
// last ring ends next to that line; a wider box is drawn on swapped axes, which also turns the
// spiral the other way.
function spiral(rect: Rect, strokeWidth: number): Point[] {
  if (rect.right - rect.left > rect.bottom - rect.top) {
    const swapped = { left: rect.top, right: rect.bottom, top: rect.left, bottom: rect.right };
    return spiral(swapped, strokeWidth).map(([x, y]): Point => [y, x]);
  }
  const width = rect.right - rect.left;
  const rings = Math.ceil(width / (2 * strokeWidth * RING));
  const gap = width / (2 * rings);
  let { left, right, top, bottom } = rect;
  const turns: Point[] = [[left, top]];
  // The small margin stops rounding error from adding a ring of zero width.
  for (let side = 0; right - left > 1e-6; side = (side + 1) % 4) {
    if (side === 0) {
      turns.push([right, top]);
      top += gap;
    } else if (side === 1) {
      turns.push([right, bottom]);
      right -= gap;
    } else if (side === 2) {
      turns.push([left, bottom]);
      bottom -= gap;
    } else {
      turns.push([left, top]);
      left += gap;
    }
  }
  // The last ring ends level with the top of the middle line.
  const middle = (rect.left + rect.right) / 2;
  turns.push([middle, rect.top + width / 2], [middle, rect.bottom - width / 2]);
  return turns;
}

// Joins the turns into one cubic chain (see skeleton.ts). Each stroke bows a little to one side;
// its control points are clamped to the rect, and the curve stays inside its control points.
function strokesThrough(turns: Point[], rect: Rect, strokeWidth: number, next: () => number) {
  const clampX = (x: number) => Math.min(rect.right, Math.max(rect.left, x));
  const clampY = (y: number) => Math.min(rect.bottom, Math.max(rect.top, y));
  const path: Point[] = [turns[0]];
  for (let i = 1; i < turns.length; i++) {
    const [x0, y0] = turns[i - 1];
    const [x1, y1] = turns[i];
    const length = Math.hypot(x1 - x0, y1 - y0) || 1;
    const bow = (next() - 0.5) * 2 * strokeWidth * BOW;
    // Square to the stroke.
    const nx = (-(y1 - y0) / length) * bow;
    const ny = ((x1 - x0) / length) * bow;
    path.push(
      [clampX(x0 + (x1 - x0) / 3 + nx), clampY(y0 + (y1 - y0) / 3 + ny)],
      [clampX(x0 + ((x1 - x0) * 2) / 3 + nx), clampY(y0 + ((y1 - y0) * 2) / 3 + ny)],
      [x1, y1]
    );
  }
  return path;
}

// A `kind` of scribble's centreline inside `size`, `inset` in from every edge, as one cubic chain,
// plus its length for the draw-on animation. Every point stays inside the inset; the same seed
// gives the same wobble.
export function buildScribble(
  size: Size,
  inset: number,
  strokeWidth: number,
  seed: number,
  kind: ScribbleKind = 'rows'
) {
  const rect = { left: inset, right: size.width - inset, top: inset, bottom: size.height - inset };
  if (rect.right <= rect.left || rect.bottom <= rect.top) {
    return { paths: [] as Point[][], length: 0 };
  }

  const next = random(seed);
  const turns =
    kind === 'rows'
      ? zigZag(rect, strokeWidth, next, 0)
      : kind === 'columns'
        ? zigZag(rect, strokeWidth, next, 1)
        : kind === 'hatch'
          ? hatch(rect, strokeWidth, next)
          : spiral(rect, strokeWidth);

  const paths = [strokesThrough(turns, rect, strokeWidth, next)];
  return { paths, length: pathLength(paths) };
}
